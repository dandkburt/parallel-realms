# 🎮 Parallel Realms

A location-based MMORPG inspired by Parallel Kingdom, built with Angular v17. Explore vast realms, battle monsters, gather resources, build territories, and level up your character!


## 🌟 Features

### Core Gameplay
- **🗺️ Dynamic World Map**: Procedurally generated 50x50 grid-based world with multiple terrain types
- **⚔️ Real-time Combat**: Turn-based combat system with attack/defense mechanics
- **📦 Inventory System**: Collect weapons, armor, potions, and resources with rarity tiers
- **📈 Character Progression**: Level up system with stat improvements (HP, Energy, Attack, Defense)
- **👾 Monster Encounters**: Various enemy types with different difficulty levels
- **💰 Resource Management**: Gold, energy, and health management
- **🏰 Territory Control**: Claim and build territories across the map (Coming Soon)
- **📱 Mobile Responsive**: Fully playable on both desktop and mobile devices

### Game Mechanics

#### Terrain Types
- 🌱 **Grass**: Common safe areas
- 🌲 **Forest**: Moderate difficulty zones
- ⛰️ **Mountain**: Challenging terrain
- 🌊 **Water**: Impassable or special areas
- 🏜️ **Desert**: Resource-rich but dangerous
- 🏰 **Dungeon**: High-level content with rare loot

#### Combat System
- Player and monster stats determine battle outcomes
- Attack and defense calculations with randomness
- Turn-based combat with counter-attacks
- Death penalty: respawn at starting location
- XP and gold rewards for victories

#### Inventory & Items
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary
- **Item Types**: Weapons, Armor, Potions, Resources, Quest Items
- **Item Stats**: Attack bonuses, defense bonuses, health restoration
- **Stackable Items**: Potions and resources stack automatically

#### Character Stats
- **Level**: Increases through experience points
- **Health (HP)**: Determines survival in combat
- **Energy**: Required for movement across the map
- **Attack**: Offensive power against enemies
- **Defense**: Damage reduction from enemy attacks
- **Gold**: Currency for trading (future feature)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Angular CLI v21+ (or use npx)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Navigate to project directory
cd "c:\Users\dandk\source\Parallel-Realms"

# Start development server
npm start
```

### Running the Game

```bash
# Development server with hot reload
npm start
# or
ng serve

# Open in browser
# Navigate to: http://localhost:4200/
```

The game will automatically open in your default browser. You can also access it from any device on your local network.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run serve:ssr:Parallel-Realms
```

## 🎯 How to Play

### Movement
- Use the **directional buttons** (North, South, East, West) to navigate the map
- Each movement costs **1 Energy**
- Press **Rest** to fully restore health and energy

### Combat
When you encounter a monster (👹 👺 🧌 🐉):
1. Combat automatically initiates
2. Click **Attack** to damage the enemy
3. Enemy counter-attacks after your turn
4. Defeat enemies to earn **XP** and **Gold**
5. Level up when you gain enough experience!

### Inventory Management
- Potions can be **used** during or outside combat
- Items display their stats and rarity
- Defeated monsters drop loot automatically

### Exploration
- Fog of war system: only nearby tiles are visible
- Discover new areas as you explore
- Different terrains provide unique challenges

## 🛠️ Technology Stack

### Angular v17 Features Showcase
- ✨ **Standalone Components**: No NgModules required
- 🔄 **Signals**: Reactive state management (`signal()`, `computed()`)
- 🎯 **New Control Flow**: `@if`, `@for`, `@empty` syntax
- 💉 **inject() Function**: Modern dependency injection
- 🚀 **Lazy Loading**: Efficient code splitting
- 🖥️ **Server-Side Rendering (SSR)**: Enabled by default

### Architecture
```
src/app/
├── models/
│   └── game.models.ts         # TypeScript interfaces for game entities
├── services/
│   └── game.service.ts        # Core game logic and state management
└── components/
    └── game/
        ├── game.component.ts   # Main game controller
        ├── game.component.html # Game UI template
        └── game.component.scss # Styling and animations
```

## 📋 Game Data Models

### Player
```typescript
interface Player {
  id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  gold: number;
  position: Position;
  inventory: InventoryItem[];
  territory: Territory[];
}
```

### Monster Types
- **Goblin** (Lvl 1): Attack 8, Defense 3 👹
- **Orc** (Lvl 3): Attack 15, Defense 8 👺
- **Troll** (Lvl 5): Attack 25, Defense 15 🧌
- **Dragon** (Lvl 10): Attack 50, Defense 30 🐉

## 🎨 UI/UX Features

- **Gradient Backgrounds**: Immersive dark fantasy theme
- **Animated Elements**: Smooth transitions and hover effects
- **Responsive Grid**: Adapts to any screen size
- **Color-Coded Stats**: Health (red), Energy (cyan), XP (gold)
- **Rarity Colors**: Visual distinction for item quality
- **Fog of War**: Undiscovered tiles appear dark
- **Player Pulse Effect**: Gold glow animation on player position

## 🔮 Upcoming Features

### Phase 2: Territory System
- [ ] Build towns, fortresses, mines, and farms
- [ ] Resource generation from territories
- [ ] Territory defense mechanics
- [ ] NPC workers and upgrades

### Phase 3: Multiplayer
- [ ] Real-time player interactions
- [ ] PvP combat system
- [ ] Guilds/Alliances
- [ ] Trading system
- [ ] Global leaderboards

### Phase 4: Advanced Features
- [ ] Quest system with storylines
- [ ] Crafting and equipment forging
- [ ] Skill trees and specializations
- [ ] Weather and day/night cycle
- [ ] Special events and raids
- [ ] GPS integration for true location-based gameplay

## 🐛 Known Issues

- Enemy counter-attack timing is fixed (500ms delay)
- No save/load system yet (game resets on refresh)
- Limited mobile touch optimization
- No sound effects or music

## 📱 Mobile Compatibility

The game is fully responsive and works on:
- ✅ Modern smartphones (iOS/Android)
- ✅ Tablets
- ✅ Desktop browsers
- ✅ Touch and click controls

### Mobile Performance Tips
- Use Chrome or Safari for best performance
- Close other apps to free up memory
- Enable desktop site mode for larger map view

## 🤝 Contributing

This is a learning project demonstrating Angular v17 features. Feel free to:
- Report bugs or suggest features
- Fork and experiment with the codebase
- Use as reference for Angular learning

## 📖 Learning Resources

This project demonstrates:
- Component-based architecture
- State management with Signals
- Procedural generation algorithms
- Game loop implementation
- Responsive design patterns

## 🎓 Angular v17 Learning Notes

### Key Concepts Demonstrated

1. **Signals for State Management**
   ```typescript
   player = signal<Player>({...}); // Reactive state
   experienceToNextLevel = computed(() => this.player().level * 100);
   ```

2. **New Control Flow Syntax**
   ```html
   @if (gameService.inCombat()) {
     <div>Combat UI</div>
   }
   @for (item of inventory; track item.id) {
     <div>{{ item.name }}</div>
   }
   ```

3. **Standalone Components**
   ```typescript
   @Component({
     selector: 'app-game',
     standalone: true,  // No NgModule needed!
     imports: [CommonModule]
   })
   ```

4. **Modern Dependency Injection**
   ```typescript
   gameService = inject(GameService); // Clean DI without constructor
   ```

---

## 🎮 Start Your Adventure!

```bash
npm start
```

Open http://localhost:4200/ and begin your journey through the Parallel Realms!

---

**Built with ❤️ using Angular v17**  
**Inspired by Parallel Kingdom**

## Additional Resources

For more information on using the Angular CLI, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
