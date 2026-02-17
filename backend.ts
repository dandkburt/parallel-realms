import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = process.env['PORT'] || 3000;
const prisma = new PrismaClient();
const stripeSecret = process.env['STRIPE_SECRET_KEY'];
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2026-01-28.clover' }) : null;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-user-id', 'X-Admin-User-Id'],
  credentials: false
}));
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return express.json({ limit: '50mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
});

const goldPackages = [
  { id: 'gold-2k', name: '2,000 Gold', gold: 2000, priceUsd: 1.99 },
  { id: 'gold-6k', name: '6,000 Gold', gold: 6000, priceUsd: 4.99 },
  { id: 'gold-14k', name: '14,000 Gold', gold: 14000, priceUsd: 9.99 },
  { id: 'gold-32k', name: '32,000 Gold', gold: 32000, priceUsd: 19.99 },
  { id: 'gold-90k', name: '90,000 Gold', gold: 90000, priceUsd: 49.99 },
  { id: 'gold-200k', name: '200,000 Gold', gold: 200000, priceUsd: 99.99 }
];

// Interfaces
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: string;
}

interface GameState {
  userId: string;
  player: any;
  territories: any[];
  buildings: any[];
  monsters: any[];
  resourceNodes: any[];
  hasPlacedFirstFlag: boolean;
  lastSaved: string;
}

function createDefaultGameState(user: { id: string; username: string }): GameState {
  return {
    userId: user.id,
    player: {
      id: `player-${user.id}`,
      name: user.username,
      level: 1,
      experience: 0,
      nextLevelExp: 100,
      health: 100,
      maxHealth: 100,
      energy: 50,
      maxEnergy: 50,
      attack: 10,
      defense: 5,
      gold: 500,
      position: { x: 0, y: 0, realm: 'real-world' },
      inventory: [
        { id: 'sword-1', name: 'Iron Sword', type: 'weapon', rarity: 'common', quantity: 1, stats: { attack: 5 }, icon: '⚔️' },
        { id: 'potion-1', name: 'Health Potion', type: 'potion', rarity: 'common', quantity: 5, stats: { healthBoost: 50 }, icon: '🧪' },
        { id: 'dog-whistle', name: 'Dog Whistle', type: 'quest', rarity: 'common', quantity: 1, icon: '🦴' }
      ],
      equipment: {},
      skills: [],
      territory: [],
      cities: [],
      alliance: null,
      movementFlag: null,
      autoWalking: false,
      companion: null
    },
    territories: [],
    buildings: [],
    monsters: [],
    resourceNodes: [],
    hasPlacedFirstFlag: false,
    lastSaved: new Date().toISOString()
  };
}

// Helper functions
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication Routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const adminEmail = process.env['ADMIN_EMAIL']?.toLowerCase();
    const adminUsername = process.env['ADMIN_USERNAME']?.toLowerCase();
    const existingAdmin = await prisma.user.findFirst({ where: { isAdmin: true } });
    const shouldBeAdmin =
      !existingAdmin ||
      (!!adminEmail && email?.toLowerCase() === adminEmail) ||
      (!!adminUsername && username?.toLowerCase() === adminUsername);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        isAdmin: shouldBeAdmin
      }
    });

    return res.json({
      success: true,
      message: 'Registration successful!',
      user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful!',
      user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/auth/status/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const usernameQuery = Array.isArray(req.query['username'])
      ? (req.query['username'] as string[])[0]
      : (req.query['username'] as string | undefined);

    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user && usernameQuery) {
      user = await prisma.user.findUnique({ where: { username: usernameQuery } });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: { id: user.id, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Game Data Routes
app.post('/api/game/save', async (req: Request, res: Response) => {
  try {
    const gameState: GameState = req.body;

    if (!gameState.userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    await prisma.gameState.upsert({
      where: { userId: gameState.userId },
      update: {
        data: gameState as any
      },
      create: {
        userId: gameState.userId,
        data: gameState as any
      }
    });

    return res.json({
      success: true,
      message: 'Game saved successfully'
    });
  } catch (error) {
    console.error('Save game error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save game' });
  }
});

app.get('/api/game/load/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const gameState = await prisma.gameState.findUnique({ where: { userId } });

    if (!gameState) {
      return res.status(404).json({ success: false, message: 'No saved game found' });
    }

    return res.json(gameState.data);
  } catch (error) {
    console.error('Load game error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load game' });
  }
});

app.delete('/api/game/delete/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const existing = await prisma.gameState.findUnique({ where: { userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    await prisma.gameState.delete({ where: { userId } });

    return res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Delete game error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete game' });
  }
});

app.get('/api/game/list/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const gameState = await prisma.gameState.findUnique({ where: { userId } });

    return res.json({
      userId,
      gameExists: !!gameState,
      lastSaved: gameState?.lastSaved ?? null
    });
  } catch (error) {
    console.error('List games error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list games' });
  }
});

// Admin middleware
async function requireAdmin(req: Request, res: Response, next: () => void) {
  const adminUserId = req.header('x-admin-user-id');
  if (!adminUserId) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
  if (!adminUser?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access denied' });
  }

  (req as any).adminUser = adminUser;

  return next();
}

function requireOwner(req: Request, res: Response, next: () => void) {
  const adminUser = (req as any).adminUser as { username?: string } | undefined;
  const ownerUsername = process.env['ADMIN_USERNAME'] || 'DonaldBurt';
  if (!adminUser?.username || adminUser.username.toLowerCase() !== ownerUsername.toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Owner access denied' });
  }

  return next();
}

async function getGlobalEconomy() {
  const economyClient = (prisma as any).globalEconomy;
  const existing = await economyClient.findFirst();
  if (existing) return existing;
  return economyClient.create({ data: { ownerBankGold: 0 } });
}

async function grantGoldToUser(userId: string, gold: number): Promise<void> {
  const existing = await prisma.gameState.findUnique({ where: { userId } });
  if (existing?.data) {
    const data = existing.data as any;
    const currentGold = Number(data?.player?.gold ?? 0);
    data.player = { ...data.player, gold: currentGold + gold };
    await prisma.gameState.update({
      where: { userId },
      data: { data }
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const gameState = createDefaultGameState({ id: user.id, username: user.username });
  gameState.player.gold = (gameState.player.gold ?? 0) + gold;
  await prisma.gameState.create({
    data: {
      userId: user.id,
      data: gameState as any
    }
  });
}

// Payments
app.get('/api/payments/packages', (_req: Request, res: Response) => {
  return res.json({ success: true, packages: goldPackages });
});

app.post('/api/payments/checkout', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }

    const { packageId, userId } = req.body as { packageId?: string; userId?: string };
    if (!packageId || !userId) {
      return res.status(400).json({ success: false, message: 'packageId and userId required' });
    }

    const pkg = goldPackages.find(p => p.id === packageId);
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'Invalid package' });
    }

    const successUrl = process.env['STRIPE_SUCCESS_URL'] || 'http://localhost:4200/';
    const cancelUrl = process.env['STRIPE_CANCEL_URL'] || 'http://localhost:4200/';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: pkg.name },
            unit_amount: Math.round(pkg.priceUsd * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        userId,
        gold: String(pkg.gold),
        packageId: pkg.id
      }
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
});

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!signature || !webhookSecret) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.['userId'];
      const gold = Number(session.metadata?.['gold'] ?? 0);
      if (userId && gold > 0) {
        await grantGoldToUser(userId, gold);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ success: false, message: 'Webhook error' });
  }
});

// Economy Routes
app.post('/api/economy/spend', async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const economy = await getGlobalEconomy();
    const economyClient = (prisma as any).globalEconomy;
    const updated = await economyClient.update({
      where: { id: economy.id },
      data: { ownerBankGold: { increment: Math.floor(amount) } }
    });

    return res.json({ success: true, ownerBankGold: updated.ownerBankGold });
  } catch (error) {
    console.error('Economy spend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record spend' });
  }
});

app.get('/api/economy/bank', requireAdmin, requireOwner, async (_req: Request, res: Response) => {
  try {
    const economy = await getGlobalEconomy();
    return res.json({ success: true, ownerBankGold: economy.ownerBankGold });
  } catch (error) {
    console.error('Economy bank error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load bank' });
  }
});

// Admin Routes
app.get('/api/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        gameState: {
          select: {
            lastSaved: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const results = users.map((user: {
      id: string;
      username: string;
      email: string;
      isAdmin: boolean;
      createdAt: Date;
      gameState?: { lastSaved: Date } | null;
    }) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      gameExists: !!user.gameState,
      lastSaved: user.gameState?.lastSaved ?? null
    }));

    return res.json({ success: true, users: results });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

app.delete('/api/admin/users/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

app.delete('/api/admin/users/:userId/game', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const existing = await prisma.gameState.findUnique({ where: { userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    await prisma.gameState.delete({ where: { userId } });

    return res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    console.error('Admin delete game error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete game' });
  }
});

app.post('/api/admin/users/:userId/game', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params['userId']) ? (req.params['userId'] as string[])[0] : (req.params['userId'] as string);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existing = await prisma.gameState.findUnique({ where: { userId } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Game already exists' });
    }

    const gameState = createDefaultGameState({ id: user.id, username: user.username });

    await prisma.gameState.create({
      data: {
        userId: user.id,
        data: gameState as any
      }
    });

    return res.json({ success: true, message: 'Character created' });
  } catch (error) {
    console.error('Admin create game error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create character' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Parallel Realms Backend Server running on port ${PORT}`);
  console.log('📦 Database storage enabled');
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
