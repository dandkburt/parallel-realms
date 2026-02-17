import { Injectable, signal, computed, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Player, Position, Monster, InventoryItem, Building, Territory, ResourceNode, City, BuildingType, BuildingInfo, EquipmentSlots, PlayerSkill, LootItem, SkillTree, Resource } from '../../models/game.models';
import { AuthService } from '../auth/auth.service';
import { GameApiService } from './game-api.service';

interface AnvilRecipe {
  id: string;
  name: string;
  type: InventoryItem['type'];
  rarity: InventoryItem['rarity'];
  icon: string;
  stats?: InventoryItem['stats'];
  gemElement?: InventoryItem['gemElement'];
  abilityName?: string;
  abilityDescription?: string;
  costs: Resource[];
}

@Injectable({
  providedIn: 'root'
})
export class GameService implements OnDestroy {
  readonly territoryRadiusMeters = 200;
  readonly territoryEdgeBufferMeters = 20;
  readonly placementMinDistanceMeters = 10;
  readonly worldChunkSizeKm = 2;
  readonly worldChunksRadius = 0;
  readonly monstersPerChunk = 3;
  readonly resourcesPerChunk = 3;
  private readonly generatedChunks = new Set<string>();
  private lastWorldChunkKey: string | null = null;

  // Player state using Signals
  player = signal<Player>({
    id: 'player-1',
    name: 'Hero',
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
    position: { x: 0, y: 0, realm: 'real-world' }, // Will be set by GPS
    inventory: [
      { id: 'sword-1', name: 'Iron Sword', type: 'weapon', rarity: 'common', quantity: 1, stats: { attack: 5 }, icon: '⚔️' },
      { id: 'potion-1', name: 'Health Potion', type: 'potion', rarity: 'common', quantity: 5, stats: { healthBoost: 50 }, icon: '🧪' },
      { id: 'dog-whistle', name: 'Dog Whistle', type: 'quest', rarity: 'common', quantity: 1, icon: '🦴' }
    ],
    equipment: {}, // Equipment slots
    skills: [], // Learned skills
    territory: [],
    cities: [],
    alliance: null,
    movementFlag: null,
    autoWalking: false,
    companion: null
  });

  // Game state
  hasPlacedFirstFlag = signal(false);
  visibleRadius = 0.0005; // ~50 meters in lat/lng degrees
  ownerBankGold = signal(0);

  // Monsters in the world
  monsters = signal<Monster[]>([]);

  // Buildings and territories
  buildings = signal<Building[]>([]);
  territories = signal<Territory[]>([]);
  resourceNodes = signal<ResourceNode[]>([]);
  
  // Loot items
  lootItems = signal<LootItem[]>([]);
  
  // Skill trees
  skillTrees = signal<SkillTree[]>([]);

  // Combat state
  inCombat = signal(false);
  currentEnemy = signal<Monster | null>(null);

  // UI state
  selectedTile = signal<Position | null>(null);
  showBuildingMenu = signal(false);
  selectedCity = signal<City | null>(null);
  showCityMenu = signal(false);
  showHouseInterior = signal(false);
  currentRoom = signal<'hall' | 'bedroom' | 'storage' | 'workshop' | 'vault'>('hall');

  // Auto walk interval
  private autoWalkInterval: ReturnType<typeof setInterval> | null = null;

  // Player colors for multi-player territory visualization (no defaults - random selection)
  private readonly playerColors = [
    '#4169e1', // Blue
    '#ff4444', // Red
    '#00cc00', // Green
    '#ffaa00', // Orange
    '#cc00cc', // Purple
    '#00cccc', // Cyan
    '#ff6b9d', // Pink
    '#8b4513', // Brown
    '#ff1493', // Deep Pink
    '#00fa9a', // Medium Spring Green
    '#32cd32', // Lime Green
    '#ff6347', // Tomato
    '#daa520'  // Goldenrod
  ];
  private readonly playerColorMap: Map<string, string> = new Map();

  // Computed properties
  experienceToNextLevel = computed(() => this.player().level * 100);
  canLevelUp = computed(() => this.player().experience >= this.experienceToNextLevel());

  // Building catalog
  buildingCatalog: BuildingInfo[] = [
    {
      type: 'house',
      name: 'House',
      description: 'Increases population capacity',
      icon: '🏠',
      costs: [
        { type: 'wood', amount: 50 },
        { type: 'stone', amount: 30 }
      ],
      buildTime: 30,
      requirements: [],
      benefits: ['+5 Population']
    },
    {
      type: 'tower',
      name: 'Tower',
      description: 'Defensive structure, increases territory defense',
      icon: '🗼',
      costs: [
        { type: 'stone', amount: 100 },
        { type: 'iron', amount: 50 }
      ],
      buildTime: 60,
      requirements: [],
      benefits: ['+10 Defense', 'Claims Territory']
    },
    {
      type: 'barracks',
      name: 'Barracks',
      description: 'Train troops and increase military power',
      icon: '⚔️',
      costs: [
        { type: 'wood', amount: 80 },
        { type: 'iron', amount: 40 }
      ],
      buildTime: 45,
      requirements: [],
      benefits: ['Train Units', '+5 Attack']
    },
    {
      type: 'farm',
      name: 'Farm',
      description: 'Produces food over time',
      icon: '🌾',
      costs: [
        { type: 'wood', amount: 40 },
        { type: 'stone', amount: 20 }
      ],
      buildTime: 30,
      requirements: [],
      benefits: ['+10 Food/hour']
    },
    {
      type: 'mine',
      name: 'Mine',
      description: 'Produces stone and iron',
      icon: '⛏️',
      costs: [
        { type: 'wood', amount: 60 },
        { type: 'stone', amount: 40 }
      ],
      buildTime: 40,
      requirements: [],
      benefits: ['+5 Stone/hour', '+3 Iron/hour']
    },
    {
      type: 'lumbermill',
      name: 'Lumbermill',
      description: 'Produces wood over time',
      icon: '🪵',
      costs: [
        { type: 'wood', amount: 30 },
        { type: 'stone', amount: 20 }
      ],
      buildTime: 25,
      requirements: [],
      benefits: ['+8 Wood/hour']
    },
    {
      type: 'market',
      name: 'Market',
      description: 'Trade resources and goods',
      icon: '🏪',
      costs: [
        { type: 'wood', amount: 70 },
        { type: 'stone', amount: 50 },
        { type: 'gold', amount: 100 }
      ],
      buildTime: 50,
      requirements: [],
      benefits: ['Enable Trading', '+20 Gold/hour']
    },
    {
      type: 'fortress',
      name: 'Fortress',
      description: 'Powerful defensive structure',
      icon: '🏰',
      costs: [
        { type: 'stone', amount: 200 },
        { type: 'iron', amount: 100 },
        { type: 'gold', amount: 200 }
      ],
      buildTime: 120,
      requirements: [{ type: 'cityLevel', value: 3 }],
      benefits: ['+50 Defense', 'Large Territory Claim']
    }
  ];

  readonly anvilRecipes: AnvilRecipe[] = [
    {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'weapon',
      rarity: 'common',
      icon: '⚔️',
      stats: { attack: 5 },
      costs: [
        { type: 'wood', amount: 10 },
        { type: 'iron', amount: 15 },
        { type: 'gold', amount: 25 }
      ]
    },
    {
      id: 'hunter-bow',
      name: 'Huntsman Bow',
      type: 'weapon',
      rarity: 'common',
      icon: '🏹',
      stats: { attack: 4 },
      costs: [
        { type: 'wood', amount: 18 },
        { type: 'iron', amount: 6 },
        { type: 'gold', amount: 20 }
      ]
    },
    {
      id: 'leather-armor',
      name: 'Leather Armor',
      type: 'armor',
      rarity: 'common',
      icon: '🧥',
      stats: { defense: 4 },
      costs: [
        { type: 'wood', amount: 8 },
        { type: 'stone', amount: 12 },
        { type: 'gold', amount: 20 }
      ]
    },
    {
      id: 'bronze-shield',
      name: 'Bronze Shield',
      type: 'armor',
      rarity: 'common',
      icon: '🛡️',
      stats: { defense: 5 },
      costs: [
        { type: 'wood', amount: 6 },
        { type: 'iron', amount: 10 },
        { type: 'gold', amount: 18 }
      ]
    },
    {
      id: 'silver-ring',
      name: 'Silver Ring',
      type: 'accessory',
      rarity: 'common',
      icon: '💍',
      stats: { attack: 1, defense: 1 },
      costs: [
        { type: 'iron', amount: 6 },
        { type: 'gold', amount: 30 }
      ]
    },
    {
      id: 'ruby-gem',
      name: 'Ruby',
      type: 'gem',
      rarity: 'uncommon',
      icon: '🔴',
      stats: { attack: 3 },
      abilityName: 'Ignite',
      abilityDescription: 'Adds a chance to burn enemies over time.',
      gemElement: 'fire',
      costs: [
        { type: 'stone', amount: 20 },
        { type: 'gold', amount: 40 }
      ]
    },
    {
      id: 'sapphire-gem',
      name: 'Sapphire',
      type: 'gem',
      rarity: 'uncommon',
      icon: '🔵',
      stats: { defense: 3 },
      abilityName: 'Frostbite',
      abilityDescription: 'Chills foes, slightly reducing their speed.',
      gemElement: 'water',
      costs: [
        { type: 'stone', amount: 20 },
        { type: 'gold', amount: 40 }
      ]
    }
  ];

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly authService = inject(AuthService);
  private readonly gameApiService = inject(GameApiService);
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SAVE_KEY = 'parallel-realms-game-save';
  private lastSaveTime = 0;
  private readonly SAVE_INTERVAL = 30000; // Auto-save every 30 seconds

  constructor() {
    // Don't generate world - use real GPS coordinates
    // Wait for GPS to initialize player position

    // Setup auto-save
    if (this.isBrowser) {
      this.startAutoSave();
    }
  }

  // GPS Distance Calculation (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Initialize player with GPS position
  initializePlayerPosition(lat: number, lng: number): void {
    this.player.update(p => ({
      ...p,
      position: { x: lat, y: lng, realm: 'real-world' }
    }));
  }

  // Check if location is already claimed by someone
  isLocationClaimed(lat: number, lng: number): boolean {
    return this.territories().some(t => {
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance < 25; // 25 meters radius
    });
  }

  // Place first flag at current GPS location
  placeFirstFlag(lat: number, lng: number): boolean {
    if (this.hasPlacedFirstFlag()) return false;
    if (this.isLocationClaimed(lat, lng)) {
      return false; // Location already claimed
    }

    // Create starting city at GPS location
    const startCity: City = {
      id: 'city-1',
      name: 'Haven',
      position: { x: lat, y: lng, realm: 'real-world' },
      level: 1,
      population: 10,
      maxPopulation: 50,
      resources: [
        { type: 'wood', amount: 200, maxAmount: 1000 },
        { type: 'stone', amount: 150, maxAmount: 1000 },
        { type: 'iron', amount: 50, maxAmount: 500 },
        { type: 'food', amount: 300, maxAmount: 1000 },
        { type: 'gold', amount: 500, maxAmount: 5000 }
      ],
      buildings: [],
      productionRates: {
        food: 5,
        wood: 3,
        stone: 2,
        iron: 1,
        gold: 2
      }
    };

    this.player.update(p => ({
      ...p,
      cities: [startCity]
    }));

    this.claimTerritory(lat, lng);
    
    // Create initial house building at the flag center
    const houseOffsetLat = lat;
    const houseOffsetLng = lng;
    
    const initialHouse: Building = {
      id: `building-${Date.now()}`,
      type: 'house',
      position: { x: houseOffsetLat, y: houseOffsetLng, realm: 'real-world' },
      level: 1,
      health: 100,
      maxHealth: 100,
      owner: this.player().id,
      isUnderConstruction: false,
      constructionTime: 0
    };
    
    this.buildings.set([initialHouse]);
    
    this.hasPlacedFirstFlag.set(true);
    this.spawnNearbyEntities(lat, lng);
    
    return true;
  }

  private spawnNearbyEntities(centerLat: number, centerLng: number): void {
    this.ensureWorldEntitiesNear(centerLat, centerLng);
  }

  private ensureWorldEntitiesNear(lat: number, lng: number): void {
    const { key, chunkX, chunkY } = this.getChunkForLatLng(lat, lng);
    if (this.lastWorldChunkKey === key) return;
    this.lastWorldChunkKey = key;

    for (let dx = -this.worldChunksRadius; dx <= this.worldChunksRadius; dx++) {
      for (let dy = -this.worldChunksRadius; dy <= this.worldChunksRadius; dy++) {
        this.generateChunk(chunkX + dx, chunkY + dy, lat, lng);
      }
    }
  }

  private getChunkForLatLng(lat: number, lng: number): { key: string; chunkX: number; chunkY: number } {
    const chunkSizeDeg = this.worldChunkSizeKm / 111;
    const chunkX = Math.floor(lat / chunkSizeDeg);
    const chunkY = Math.floor(lng / chunkSizeDeg);
    return { key: `${chunkX}:${chunkY}`, chunkX, chunkY };
  }

  private generateChunk(chunkX: number, chunkY: number, centerLat: number, centerLng: number): void {
    const key = `${chunkX}:${chunkY}`;
    if (this.generatedChunks.has(key)) return;
    this.generatedChunks.add(key);

    const chunkSizeDeg = this.worldChunkSizeKm / 111;
    const minLat = chunkX * chunkSizeDeg;
    const maxLat = minLat + chunkSizeDeg;
    const minLng = chunkY * chunkSizeDeg;
    const maxLng = minLng + chunkSizeDeg;

    const newMonsters = this.spawnMonstersInBounds({
      minLat,
      maxLat,
      minLng,
      maxLng,
      centerLat,
      centerLng,
      chunkKey: key,
      count: this.monstersPerChunk
    });
    const newResources = this.spawnResourcesInBounds(minLat, maxLat, minLng, maxLng, key, this.resourcesPerChunk);

    if (newMonsters.length) {
      this.monsters.update(list => [...list, ...newMonsters]);
    }
    if (newResources.length) {
      this.resourceNodes.update(list => [...list, ...newResources]);
    }
  }

  private spawnMonstersInBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    centerLat: number;
    centerLng: number;
    chunkKey: string;
    count: number;
  }): Monster[] {
    const monsterTypes = [
      { name: 'Rat', level: 1, icon: '🐀', attack: 6, defense: 2, minTier: 0 },
      { name: 'Spider', level: 2, icon: '🕷️', attack: 10, defense: 3, minTier: 0 },
      { name: 'Deer', level: 2, icon: '🦌', attack: 4, defense: 2, minTier: 0 },
      { name: 'Wolf', level: 3, icon: '🐺', attack: 12, defense: 4, minTier: 0 },
      { name: 'Goblin', level: 4, icon: '👹', attack: 14, defense: 5, minTier: 0 },
      { name: 'Orc', level: 6, icon: '👺', attack: 18, defense: 7, minTier: 0 },
      { name: 'Bandit', level: 8, icon: '🗡️', attack: 20, defense: 8, minTier: 0 },

      { name: 'Troll', level: 12, icon: '🧌', attack: 28, defense: 14, minTier: 1 },
      { name: 'Ogre', level: 14, icon: '👹', attack: 30, defense: 16, minTier: 1 },
      { name: 'Harpy', level: 16, icon: '🦅', attack: 32, defense: 12, minTier: 1 },
      { name: 'Wraith', level: 18, icon: '👻', attack: 35, defense: 14, minTier: 1 },

      { name: 'Golem', level: 22, icon: '🪨', attack: 40, defense: 24, minTier: 2 },
      { name: 'Vampire', level: 24, icon: '🧛', attack: 42, defense: 20, minTier: 2 },
      { name: 'Wyvern', level: 26, icon: '🐉', attack: 46, defense: 22, minTier: 2 },
      { name: 'Giant', level: 28, icon: '🦣', attack: 50, defense: 26, minTier: 2 },

      { name: 'Demon', level: 32, icon: '😈', attack: 55, defense: 28, minTier: 3 },
      { name: 'Hydra', level: 34, icon: '🐍', attack: 60, defense: 30, minTier: 3 },
      { name: 'Lich', level: 36, icon: '☠️', attack: 62, defense: 32, minTier: 3 },
      { name: 'Dragon', level: 40, icon: '🐉', attack: 70, defense: 36, minTier: 3 }
    ];

    const playerLevel = this.player().level;
    const maxTier = Math.floor((playerLevel - 1) / 10);
    const eligible = monsterTypes.filter(m => m.minTier <= maxTier);
    const spawnPool = eligible.length ? eligible : monsterTypes.filter(m => m.minTier === 0);

    const monsterList: Monster[] = [];
    const player = this.player();
    const basePlayerHp = player.maxHealth;

    for (let i = 0; i < bounds.count; i++) {
      const type = spawnPool[Math.floor(Math.random() * spawnPool.length)];
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);

      // Don't spawn too close to player (50m minimum)
      const distanceToPlayer = this.calculateDistance(bounds.centerLat, bounds.centerLng, lat, lng);
      if (distanceToPlayer < 50) continue;

      const monsterMaxHealth = Math.max(
        30,
        Math.round(basePlayerHp * 0.8 + (type.level - player.level) * 5)
      );

      monsterList.push({
        id: `monster-${bounds.chunkKey}-${Date.now()}-${i}`,
        name: type.name,
        level: type.level,
        icon: type.icon,
        health: monsterMaxHealth,
        maxHealth: monsterMaxHealth,
        attack: type.attack,
        defense: type.defense,
        position: { x: lat, y: lng, realm: 'real-world' },
        loot: this.generateLoot(type.level)
      });
    }

    return monsterList;
  }

  private spawnResourcesInBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    chunkKey: string,
    count: number
  ): ResourceNode[] {
    const nodes: ResourceNode[] = [];
    const nodeTypes = [
      { type: 'wood' as const, icon: '🌳', max: 500, regen: 10 },
      { type: 'wood' as const, icon: '🌲', max: 500, regen: 10 },
      { type: 'wood' as const, icon: '🌴', max: 500, regen: 10 },
      { type: 'stone' as const, icon: '🪨', max: 300, regen: 5 },
      { type: 'iron' as const, icon: '⛓️', max: 200, regen: 3 },
      { type: 'food' as const, icon: '🍎', max: 400, regen: 15 },
      { type: 'food' as const, icon: '🌿', max: 400, regen: 15 },
      { type: 'food' as const, icon: '🍄', max: 400, regen: 15 }
    ];

    for (let i = 0; i < count; i++) {
      const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);

      nodes.push({
        id: `resource-${chunkKey}-${Date.now()}-${i}`,
        type: nodeType.type,
        position: { x: lat, y: lng, realm: 'real-world' },
        amount: nodeType.max,
        maxAmount: nodeType.max,
        regenerationRate: nodeType.regen,
        icon: nodeType.icon
      });
    }

    return nodes;
  }

  private getMaxSocketsByRarity(rarity: InventoryItem['rarity']): number {
    switch (rarity) {
      case 'epic':
        return 4;
      case 'rare':
        return 3;
      case 'uncommon':
        return 2;
      case 'common':
        return 1;
      default:
        return 0;
    }
  }

  private getRarityFromRoll(roll: number): InventoryItem['rarity'] {
    if (roll < 0.02) return 'epic';
    if (roll < 0.1) return 'rare';
    if (roll < 0.3) return 'uncommon';
    return 'common';
  }

  private scaleStat(value: number | undefined, rarity: InventoryItem['rarity'], rarityScale: Record<InventoryItem['rarity'], number>): number | undefined {
    if (!value) return undefined;
    return Math.max(1, Math.round(value * rarityScale[rarity]));
  }

  private createWeaponLoot(item: { name: string; icon: string; attack: number }, rarity: InventoryItem['rarity'], level: number, rarityScale: Record<InventoryItem['rarity'], number>): InventoryItem {
    return {
      id: `weapon-${Date.now()}`,
      name: item.name,
      type: 'weapon',
      rarity,
      quantity: 1,
      stats: { attack: Math.max(1, Math.round((item.attack + level / 2) * rarityScale[rarity])) },
      icon: item.icon,
      maxSockets: this.getMaxSocketsByRarity(rarity),
      socketedGems: []
    };
  }

  private createArmorLoot(item: { name: string; icon: string; defense: number }, rarity: InventoryItem['rarity'], level: number, rarityScale: Record<InventoryItem['rarity'], number>): InventoryItem {
    return {
      id: `armor-${Date.now()}`,
      name: item.name,
      type: 'armor',
      rarity,
      quantity: 1,
      stats: { defense: Math.max(1, Math.round((item.defense + level / 3) * rarityScale[rarity])) },
      icon: item.icon,
      maxSockets: this.getMaxSocketsByRarity(rarity),
      socketedGems: []
    };
  }

  private createAccessoryLoot(item: { name: string; icon: string; attack?: number; defense?: number }, rarity: InventoryItem['rarity'], rarityScale: Record<InventoryItem['rarity'], number>): InventoryItem {
    return {
      id: `accessory-${Date.now()}`,
      name: item.name,
      type: 'accessory',
      rarity,
      quantity: 1,
      stats: {
        attack: item.attack ? Math.max(1, Math.round(item.attack * rarityScale[rarity])) : undefined,
        defense: item.defense ? Math.max(1, Math.round(item.defense * rarityScale[rarity])) : undefined
      },
      icon: item.icon
    };
  }

  private createGemLoot(gem: { name: string; icon: string; element: InventoryItem['gemElement']; abilityName: string; abilityDescription: string; stats: InventoryItem['stats'] }, rarityScale: Record<InventoryItem['rarity'], number>): InventoryItem {
    const gemRarity: InventoryItem['rarity'] = 'epic';
    const gemStats = gem.stats ?? {};
    return {
      id: `gem-${Date.now()}`,
      name: gem.name,
      type: 'gem',
      rarity: gemRarity,
      quantity: 1,
      stats: {
        attack: this.scaleStat(gemStats.attack, gemRarity, rarityScale),
        defense: this.scaleStat(gemStats.defense, gemRarity, rarityScale),
        healthBoost: this.scaleStat(gemStats.healthBoost, gemRarity, rarityScale),
        energyBoost: this.scaleStat(gemStats.energyBoost, gemRarity, rarityScale)
      },
      icon: gem.icon,
      gemElement: gem.element,
      abilityName: gem.abilityName,
      abilityDescription: gem.abilityDescription
    };
  }

  private createResourceLoot(resource: { name: string; type: string; icon: string }, rarity: InventoryItem['rarity'], quantity: number): InventoryItem {
    return {
      id: `resource-${resource.type}-${Date.now()}`,
      name: resource.name,
      type: 'resource',
      rarity,
      quantity,
      icon: resource.icon
    };
  }



  private generateLoot(level: number): InventoryItem[] {
    const loot: InventoryItem[] = [];
    const rarityRoll = Math.random();
    const rarity = this.getRarityFromRoll(rarityRoll);

    const rarityScale: Record<InventoryItem['rarity'], number> = {
      common: 1,
      uncommon: 0.85,
      rare: 0.5,
      epic: 0.25,
      legendary: 0.15
    };

    const baseResourceAmount = Math.max(5, Math.round(level * 8));
    const scaledAmount = Math.max(1, Math.round(baseResourceAmount * rarityScale[rarity]));

    const weapons = [
      { name: 'Axe', icon: '🪓', attack: 5 },
      { name: 'Dagger', icon: '🗡️', attack: 4 },
      { name: 'Sword', icon: '⚔️', attack: 6 },
      { name: 'Spear', icon: '🗡️', attack: 6 },
      { name: 'Staff', icon: '🪄', attack: 3 },
      { name: 'Crossbow', icon: '🏹', attack: 6 },
      { name: 'Longbow', icon: '🏹', attack: 5 },
      { name: 'Shuriken', icon: '🌀', attack: 4 },
      { name: 'Sling', icon: '🪢', attack: 3 },
      { name: 'Blowdart', icon: '🎯', attack: 3 },
      { name: 'Brass Knuckle', icon: '🥊', attack: 4 }
    ];

    const armor = [
      { name: "Dragon Scalemail", icon: '🐉', defense: 8 },
      { name: "Engineer’s Armor", icon: '🛡️', defense: 6 },
      { name: "Huntsman’s Armor", icon: '🧥', defense: 5 },
      { name: "Nightstalker Cloak", icon: '🧥', defense: 4 },
      { name: "Phalanx Shield", icon: '🛡️', defense: 7 },
      { name: "Shinobi Mask", icon: '🥷', defense: 3 },
      { name: "Fighter’s Mantle", icon: '🧥', defense: 4 }
    ];

    const accessories = [
      { name: 'Ring', icon: '💍', attack: 1, defense: 1 },
      { name: 'Amulet', icon: '📿', attack: 1, defense: 1 },
      { name: 'Crown', icon: '👑', defense: 2 }
    ];

    const gems = [
      {
        name: 'Ruby',
        icon: '🔴',
        element: 'fire' as const,
        abilityName: 'Ignite',
        abilityDescription: 'Adds a chance to burn enemies over time.',
        stats: { attack: 2 }
      },
      {
        name: 'Sapphire',
        icon: '🔵',
        element: 'water' as const,
        abilityName: 'Frostbite',
        abilityDescription: 'Chills foes, slightly reducing their speed.',
        stats: { defense: 2 }
      },
      {
        name: 'Emerald',
        icon: '🟢',
        element: 'earth' as const,
        abilityName: 'Stoneguard',
        abilityDescription: 'Grants a defensive ward when struck.',
        stats: { healthBoost: 10 }
      },
      {
        name: 'Amethyst',
        icon: '🟣',
        element: 'wind' as const,
        abilityName: 'Zephyr Guard',
        abilityDescription: 'Improves evasion and energy recovery.',
        stats: { energyBoost: 6 }
      }
    ];

    const resources = [
      { name: 'Wood Bundle', type: 'wood', icon: '🪵' },
      { name: 'Stone Cache', type: 'stone', icon: '🪨' },
      { name: 'Iron Ingots', type: 'iron', icon: '⛓️' },
      { name: 'Food Crate', type: 'food', icon: '🍎' }
    ];

    if (Math.random() > 0.25) {
      loot.push({
        id: `gold-${Date.now()}`,
        name: 'Gold Coins',
        type: 'resource',
        rarity: 'common',
        quantity: Math.max(5, level * 10),
        icon: '💰'
      });
    }

    const dropTypeRoll = Math.random();
    if (dropTypeRoll < 0.45) {
      const item = weapons[Math.floor(Math.random() * weapons.length)];
      loot.push(this.createWeaponLoot(item, rarity, level, rarityScale));
    } else if (dropTypeRoll < 0.8) {
      const item = armor[Math.floor(Math.random() * armor.length)];
      loot.push(this.createArmorLoot(item, rarity, level, rarityScale));
    } else {
      const item = accessories[Math.floor(Math.random() * accessories.length)];
      loot.push(this.createAccessoryLoot(item, rarity, rarityScale));
    }

    if (Math.random() < 0.02) {
      const gem = gems[Math.floor(Math.random() * gems.length)];
      loot.push(this.createGemLoot(gem, rarityScale));
    }

    if (Math.random() < 0.6) {
      const res = resources[Math.floor(Math.random() * resources.length)];
      loot.push(this.createResourceLoot(res, rarity, scaledAmount));
    }

    return loot;
  }

  // Real-time GPS movement update
  updatePlayerGPSPosition(lat: number, lng: number): void {
    const oldPos = this.player().position;
    const distanceMoved = this.calculateDistance(oldPos.x, oldPos.y, lat, lng);
    
    // Update position
    this.player.update(p => ({
      ...p,
      position: { x: lat, y: lng, realm: 'real-world' },
      energy: Math.max(0, p.energy - Math.floor(distanceMoved / 100)) // 1 energy per 100m
    }));

    this.ensureWorldEntitiesNear(lat, lng);

    // Check for nearby entities
    this.checkForMonster({ x: lat, y: lng, realm: 'real-world' });
    this.checkForResourceNode({ x: lat, y: lng, realm: 'real-world' });
  }

  checkForNearbyEntitiesAt(lat: number, lng: number): void {
    this.checkForMonster({ x: lat, y: lng, realm: 'real-world' });
    this.checkForResourceNode({ x: lat, y: lng, realm: 'real-world' });
  }

  // Resource harvesting
  private checkForResourceNode(pos: Position): void {
    const node = this.resourceNodes().find(n => {
      const distance = this.calculateDistance(pos.x, pos.y, n.position.x, n.position.y);
      return distance <= 25 && n.amount > 0; // Within 25 meters
    });

    if (node) {
      this.harvestResource(node);
    }
  }

  private harvestResource(node: ResourceNode): void {
    const harvestAmount = Math.min(node.amount, 20);
    
    // Update node amount
    this.resourceNodes.update(nodes =>
      nodes.map(n =>
        n.id === node.id
          ? { ...n, amount: Math.max(0, n.amount - harvestAmount) }
          : n
      )
    );

    // Add to city resources
    const city = this.player().cities[0];
    const resource = city.resources.find(r => r.type === node.type);
    if (resource) {
      resource.amount = Math.min(resource.maxAmount ?? 1000, resource.amount + harvestAmount);
    }

    // Regenerate node after delay
    setTimeout(() => {
      this.resourceNodes.update(nodes =>
        nodes.map(n =>
          n.id === node.id
            ? { ...n, amount: Math.min(n.maxAmount, n.amount + n.regenerationRate) }
            : n
        )
      );
    }, 5000);
  }



  private checkForMonster(pos: Position): void {
    const monster = this.monsters().find(m => {
      const distance = this.calculateDistance(pos.x, pos.y, m.position.x, m.position.y);
      return distance <= 25 && m.health > 0; // Within 25 meters
    });

    if (monster) {
      this.startCombat(monster);
    }
  }

  // Combat System
  startCombat(monster: Monster): void {
    this.inCombat.set(true);
    this.currentEnemy.set(monster);
  }

  attack(): void {
    const enemy = this.currentEnemy();
    if (!enemy) return;

    const damage = Math.max(1, this.player().attack - enemy.defense + Math.floor(Math.random() * 5));
    enemy.health = Math.max(0, enemy.health - damage);

    if (enemy.health === 0) {
      this.defeatMonster(enemy);
      return;
    }

    // Enemy counter-attack
    setTimeout(() => {
      const enemyDamage = Math.max(1, enemy.attack - this.player().defense + Math.floor(Math.random() * 5));
      this.player.update(p => ({
        ...p,
        health: Math.max(0, p.health - enemyDamage)
      }));

      if (this.player().health === 0) {
        this.gameOver();
      }
    }, 500);
  }

  private defeatMonster(monster: Monster): void {
    const levelDelta = monster.level - this.player().level;
    const expGain = Math.max(25, (monster.level * 25) + 100 + (levelDelta * 10));
    const goldGain = monster.level * 10;

    // Award experience and loot
    this.gainExperience(expGain);
    this.player.update(p => ({
      ...p,
      gold: p.gold + goldGain,
      inventory: [...p.inventory, ...monster.loot]
    }));

    this.inCombat.set(false);
    this.currentEnemy.set(null);

    // Remove monster from world
    this.monsters.update(list => list.filter(m => m.id !== monster.id));
  }

  rest(): void {
    this.player.update(p => ({
      ...p,
      health: p.maxHealth,
      energy: p.maxEnergy
    }));
  }

  private findUnclaimedSpotNear(lat: number, lng: number, radiusMeters = 300, attempts = 24): Position | null {
    const radiusDeg = radiusMeters / 111000;
    const latRad = lat * Math.PI / 180;

    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radiusDeg * (0.3 + Math.random() * 0.7);
      const candidateLat = lat + Math.cos(angle) * dist;
      const candidateLng = lng + (Math.sin(angle) * dist) / Math.cos(latRad);
      if (!this.isLocationClaimed(candidateLat, candidateLng)) {
        return { x: candidateLat, y: candidateLng, realm: 'real-world' };
      }
    }

    return null;
  }

  private handleDogWhistle(): { success: boolean; message: string } {
    const player = this.player();
    const companion = player.companion ?? {
      id: 'companion-dog',
      type: 'dog' as const,
      name: 'Scout Dog',
      icon: '🐕',
      active: true,
      ability: 'Tracks nearby creatures.'
    };

    const nearest = this.monsters()
      .filter(m => m.health > 0)
      .map(m => ({
        monster: m,
        distance: this.calculateDistance(player.position.x, player.position.y, m.position.x, m.position.y)
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (!nearest || nearest.distance > 1000) {
      return { success: false, message: 'Your dog couldn\'t find any creatures nearby.' };
    }

    this.player.update(p => ({
      ...p,
      movementFlag: nearest.monster.position,
      companion: { ...companion, active: true, lastPing: new Date() }
    }));

    return { success: true, message: `Your dog tracked a ${nearest.monster.name}! Check your movement target.` };
  }

  useItem(itemId: string): { success: boolean; message: string } | null {
    const item = this.player().inventory.find(i => i.id === itemId);
    if (!item || item.quantity === 0) return null;

    if (item.type === 'potion' && item.stats?.healthBoost) {
      this.player.update(p => ({
        ...p,
        health: Math.min(p.maxHealth, p.health + (item.stats?.healthBoost || 0)),
        inventory: p.inventory.map(i => 
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        ).filter(i => i.quantity > 0)
      }));
      return { success: true, message: 'Potion used.' };
    }

    if (item.id === 'dog-whistle') {
      return this.handleDogWhistle();
    }

    return null;
  }

  private gameOver(): void {
    // Reset game - respawn at a city if available
    const city = this.player().cities[0];
    const respawnPos = city ? city.position : this.player().position;
    
    this.player.update(p => ({
      ...p,
      health: p.maxHealth,
      position: respawnPos
    }));
    this.inCombat.set(false);
    this.currentEnemy.set(null);
  }

  // Building System
  canBuildAt(lat: number, lng: number): boolean {
    if (!this.hasPlacedFirstFlag()) return false;
    
    // Must be inside or adjacent to existing territory (within edge buffer)
    const isAdjacent = this.territories().some(t => {
      if (t.ownerId !== this.player().id) return false;
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance <= (this.territoryRadiusMeters + this.territoryEdgeBufferMeters);
    });
    
    if (!isAdjacent) return false;
    
    // Check if location already has a building
    const hasBuilding = this.buildings().some(b => {
      const distance = this.calculateDistance(lat, lng, b.position.x, b.position.y);
      return distance < this.placementMinDistanceMeters; // Too close
    });
    
    // Check if monster nearby
    const hasMonster = this.monsters().some(m => {
      const distance = this.calculateDistance(lat, lng, m.position.x, m.position.y);
      return distance < this.placementMinDistanceMeters && m.health > 0;
    });
    
    return !hasBuilding && !hasMonster;
  }

  buildStructure(type: BuildingType, lat: number, lng: number): boolean {
    if (!this.canBuildAt(lat, lng)) return false;
    
    const buildingInfo = this.buildingCatalog.find(b => b.type === type);
    if (!buildingInfo) return false;
    
    // Check resources
    const city = this.player().cities[0];
    if (!city) return false;
    
    for (const cost of buildingInfo.costs) {
      const resource = city.resources.find(r => r.type === cost.type);
      if (!resource || resource.amount < cost.amount) {
        return false;
      }
    }
    
    // Deduct resources
    let goldSpent = 0;
    for (const cost of buildingInfo.costs) {
      const resource = city.resources.find(r => r.type === cost.type);
      if (resource) {
        resource.amount -= cost.amount;
        if (cost.type === 'gold') {
          goldSpent += cost.amount;
        }
      }
    }

    if (goldSpent > 0) {
      void this.recordGoldSpend(goldSpent);
    }
    
    // Create building
    const newBuilding: Building = {
      id: `building-${Date.now()}`,
      type,
      position: { x: lat, y: lng, realm: 'real-world' },
      level: 1,
      health: 100,
      maxHealth: 100,
      owner: this.player().id,
      isUnderConstruction: true,
      constructionTime: buildingInfo.buildTime
    };
    
    this.buildings.update(buildings => [...buildings, newBuilding]);
    
    // Complete construction after delay (simplified for demo)
    setTimeout(() => {
      this.completeBuilding(newBuilding.id);
    }, buildingInfo.buildTime * 1000);
    
    // Claim territory around building
    this.claimTerritory(lat, lng);
    
    return true;
  }

  private completeBuilding(buildingId: string): void {
    this.buildings.update(buildings =>
      buildings.map(b =>
        b.id === buildingId
          ? { ...b, isUnderConstruction: false }
          : b
      )
    );
  }

  private claimTerritory(lat: number, lng: number): void {
    // Check if already claimed by this player
    const alreadyClaimed = this.territories().some(t => {
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance < 5 && t.ownerId === this.player().id;
    });
    
    if (alreadyClaimed) return;
    
    // Create new territory
    const newTerritory: Territory = {
      id: `territory-${Date.now()}-${lat}-${lng}`,
      position: { x: lat, y: lng, realm: 'real-world' },
      ownerId: this.player().id,
      ownerName: this.player().name,
      buildings: [],
      lastClaimed: new Date(),
      isActive: true, // New territories are always active
      color: '#4169e1' // Default blue color
    };
    
    this.territories.update(territories => [...territories, newTerritory]);
  }

  getBuildingInfo(type: BuildingType): BuildingInfo | undefined {
    return this.buildingCatalog.find(b => b.type === type);
  }

  openBuildingMenu(): void {
    this.showBuildingMenu.set(true);
  }

  closeBuildingMenu(): void {
    this.showBuildingMenu.set(false);
  }

  openCityMenu(cityId: string): void {
    const city = this.player().cities.find(c => c.id === cityId);
    if (city) {
      this.selectedCity.set(city);
      this.showCityMenu.set(true);
    }
  }

  closeCityMenu(): void {
    this.showCityMenu.set(false);
    this.selectedCity.set(null);
  }

  openHouseInterior(): void {
    this.showHouseInterior.set(true);
    this.currentRoom.set('hall');
  }

  closeHouseInterior(): void {
    this.showHouseInterior.set(false);
  }

  goToRoom(room: 'hall' | 'bedroom' | 'storage' | 'workshop' | 'vault'): void {
    this.currentRoom.set(room);
    if (room === 'vault') {
      void this.refreshOwnerBankGold();
    }
  }

  collectCityResources(cityId: string): void {
    const city = this.player().cities.find(c => c.id === cityId);
    if (!city) return;

    // Collect production from city
    const productionAmount = 10; // Base production per collection
    
    city.resources.forEach(resource => {
      const productionRate = city.productionRates[resource.type] || 0;
      const amount = productionRate * productionAmount;
      resource.amount = Math.min(resource.maxAmount ?? 1000, resource.amount + amount);
    });

    // Update player's city
    this.player.update(p => ({
      ...p,
      cities: p.cities.map(c => c.id === cityId ? city : c)
    }));
  }

  private async recordGoldSpend(amount: number): Promise<void> {
    if (amount <= 0) return;
    const response = await this.gameApiService.recordSpend(amount);
    if (response.success && typeof response.ownerBankGold === 'number') {
      this.ownerBankGold.set(response.ownerBankGold);
    }
  }

  async refreshOwnerBankGold(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.isAdmin || user.username?.toLowerCase() !== 'donaldburt') return;
    const response = await this.gameApiService.getOwnerBank(user.id);
    if (response.success && typeof response.ownerBankGold === 'number') {
      this.ownerBankGold.set(response.ownerBankGold);
    }
  }

  craftAtAnvil(recipeId: string): { success: boolean; message: string; itemName?: string } {
    const recipe = this.anvilRecipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, message: 'Recipe not found.' };
    }

    const city = this.player().cities[0];
    if (!city) {
      return { success: false, message: 'You need a city to craft items.' };
    }

    let goldSpent = 0;
    for (const cost of recipe.costs) {
      const resource = city.resources.find(r => r.type === cost.type);
      if (!resource || resource.amount < cost.amount) {
        return { success: false, message: `Not enough ${cost.type}.` };
      }
      if (cost.type === 'gold') {
        goldSpent += cost.amount;
      }
    }

    const updatedResources = city.resources.map(r => {
      const cost = recipe.costs.find(c => c.type === r.type);
      if (!cost) return r;
      return { ...r, amount: r.amount - cost.amount };
    });

    const craftedItem: InventoryItem = {
      id: `crafted-${recipe.id}-${Date.now()}`,
      name: recipe.name,
      type: recipe.type,
      rarity: recipe.rarity,
      quantity: 1,
      stats: recipe.stats,
      icon: recipe.icon,
      gemElement: recipe.gemElement,
      abilityName: recipe.abilityName,
      abilityDescription: recipe.abilityDescription,
      maxSockets: recipe.type === 'weapon' || recipe.type === 'armor' ? this.getMaxSocketsByRarity(recipe.rarity) : undefined,
      socketedGems: recipe.type === 'weapon' || recipe.type === 'armor' ? [] : undefined
    };

    this.player.update(p => ({
      ...p,
      inventory: [...p.inventory, craftedItem],
      cities: p.cities.map(c => c.id === city.id ? { ...city, resources: updatedResources } : c)
    }));

    if (goldSpent > 0) {
      void this.recordGoldSpend(goldSpent);
    }

    return { success: true, message: `Forged ${craftedItem.name}!`, itemName: craftedItem.name };
  }

  socketGem(targetItemId: string, gemId: string): { success: boolean; message: string } {
    const gem = this.player().inventory.find(i => i.id === gemId && i.type === 'gem');
    if (!gem) {
      return { success: false, message: 'Gem not found.' };
    }

    const equipment = this.player().equipment || {};
    const equippedItems = Object.values(equipment).filter((i): i is InventoryItem => !!i);
    const equippedTarget = equippedItems.find(i => i.id === targetItemId);
    const inventoryTarget = this.player().inventory.find(i => i.id === targetItemId);
    const target = equippedTarget ?? inventoryTarget;

    if (!target || (target.type !== 'weapon' && target.type !== 'armor')) {
      return { success: false, message: 'Target item is not socketable.' };
    }

    const maxSockets = target.maxSockets ?? this.getMaxSocketsByRarity(target.rarity);
    const socketed = target.socketedGems ?? [];
    if (maxSockets === 0) {
      return { success: false, message: 'This item cannot be socketed.' };
    }
    if (socketed.length >= maxSockets) {
      return { success: false, message: 'No empty sockets available.' };
    }

    const updatedStats = {
      attack: (target.stats?.attack ?? 0) + (gem.stats?.attack ?? 0),
      defense: (target.stats?.defense ?? 0) + (gem.stats?.defense ?? 0),
      healthBoost: (target.stats?.healthBoost ?? 0) + (gem.stats?.healthBoost ?? 0),
      energyBoost: (target.stats?.energyBoost ?? 0) + (gem.stats?.energyBoost ?? 0)
    };

    const updatedTarget: InventoryItem = {
      ...target,
      stats: updatedStats,
      maxSockets,
      socketedGems: [...socketed, { ...gem, quantity: 1 }]
    };

    this.player.update(p => ({
      ...p,
      inventory: p.inventory
        .map(i => i.id === target.id ? updatedTarget : i)
        .map(i => i.id === gem.id ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0),
      equipment: Object.fromEntries(
        Object.entries(equipment).map(([slot, item]) =>
          item?.id === target.id ? [slot, updatedTarget] : [slot, item]
        )
      ) as EquipmentSlots
    }));

    return { success: true, message: `Socketed ${gem.name} into ${target.name}.` };
  }

  // Check if location is within player's own territory
  isLocationInOwnTerritory(lat: number, lng: number): boolean {
    return this.territories().some(t => {
      if (t.ownerId !== this.player().id) return false;
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance <= this.territoryRadiusMeters; // Territory radius
    });
  }

  // Check if location is in a black flag (inactive) territory that can be captured
  isLocationInBlackFlagTerritory(lat: number, lng: number): boolean {
    return this.territories().some(t => {
      if (t.isActive) return false; // Not a black flag
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance <= this.territoryRadiusMeters; // Territory radius
    });
  }

  // Check if player can move to location (own territory OR black flag territory)
  canMoveToLocation(lat: number, lng: number): boolean {
    return this.isLocationInOwnTerritory(lat, lng) || this.isLocationInBlackFlagTerritory(lat, lng);
  }

  // Check if location is near the edge of own territory (within edgeBuffer meters)
  isNearOwnTerritoryEdge(lat: number, lng: number, edgeBuffer = 30): boolean {
    const territoryRadius = this.territoryRadiusMeters;
    return this.territories().some(t => {
      if (t.ownerId !== this.player().id) return false;
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance >= (territoryRadius - edgeBuffer) && distance <= (territoryRadius + edgeBuffer);
    });
  }

  // Place additional flag to expand territory
  placeAdditionalFlag(lat: number, lng: number): boolean {
    if (!this.hasPlacedFirstFlag()) return false;
    
    // Check if location is already claimed
    if (this.isLocationClaimed(lat, lng)) {
      return false;
    }

    // Must be outside current territory to expand
    if (this.isLocationInOwnTerritory(lat, lng)) {
      return false;
    }
    
    // Check if location is adjacent to player's territory (near the edge)
    const isAdjacent = this.territories().some(t => {
      if (t.ownerId !== this.player().id) return false;
      const distance = this.calculateDistance(lat, lng, t.position.x, t.position.y);
      return distance >= (this.territoryRadiusMeters - this.territoryEdgeBufferMeters)
        && distance <= (this.territoryRadiusMeters + this.territoryEdgeBufferMeters);
    });
    
    if (!isAdjacent) {
      return false;
    }
    
    // Place flag and claim territory
    this.claimTerritory(lat, lng);
    return true;
  }

  removeLastFlag(): boolean {
    const owned = this.territories().filter(t => t.ownerId === this.player().id);
    if (owned.length <= 1) {
      return false;
    }

    const last = owned.reduce((latest, current) =>
      new Date(current.lastClaimed).getTime() > new Date(latest.lastClaimed).getTime() ? current : latest,
      owned[0]
    );

    this.territories.update(list => list.filter(t => t.id !== last.id));
    return true;
  }

  // Clear first flag and reset game
  clearFirstFlag(): void {
    this.hasPlacedFirstFlag.set(false);
    this.territories.set([]);
    this.buildings.set([]);
    this.monsters.set([]);
    this.resourceNodes.set([]);
    this.player.update(p => ({
      ...p,
      cities: [],
      territory: []
    }));
    this.inCombat.set(false);
    this.currentEnemy.set(null);
    this.showBuildingMenu.set(false);
    this.showCityMenu.set(false);
    this.selectedCity.set(null);
    console.log('All territories cleared!');
  }

  stopAutoWalk(): void {
    if (this.autoWalkInterval) {
      clearInterval(this.autoWalkInterval);
      this.autoWalkInterval = null;
    }
    this.player.update(p => ({
      ...p,
      autoWalking: false
    }));
  }

  // Save/Load functionality
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveGameLocal();
    }, this.SAVE_INTERVAL);
  }

  private getSaveKey(): string {
    const userId = this.authService.currentUser()?.id ?? 'anonymous';
    return `${this.SAVE_KEY}:${userId}`;
  }

  private saveGameLocal(): void {
    if (!this.isBrowser) return;

    try {
      const gameState = {
        userId: this.authService.currentUser()?.id || 'anonymous',
        player: this.player(),
        territories: this.territories(),
        buildings: this.buildings(),
        monsters: this.monsters(),
        resourceNodes: this.resourceNodes(),
        hasPlacedFirstFlag: this.hasPlacedFirstFlag(),
        lastSaved: new Date().toISOString()
      };

      // Save to localStorage immediately
      localStorage.setItem(this.getSaveKey(), JSON.stringify(gameState));
      this.lastSaveTime = Date.now();

      // Async save to backend without blocking
      if (this.authService.currentUser()) {
        this.gameApiService.saveGame(gameState as any).catch(err => {
          console.error('Failed to sync to backend:', err);
        });
      }

      console.log('Game auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to auto-save game:', error);
    }
  }

  loadGameLocal(): boolean {
    if (!this.isBrowser) return false;

    try {
      const saveData = localStorage.getItem(this.getSaveKey());
      if (!saveData) {
        return false;
      }

      const gameState = JSON.parse(saveData);
      const currentUserId = this.authService.currentUser()?.id;
      if (currentUserId && gameState.userId && gameState.userId !== currentUserId) {
        return false;
      }

      // Restore game state
      this.player.set(gameState.player);
      this.territories.set(gameState.territories || []);
      this.buildings.set(gameState.buildings || []);
      this.monsters.set(gameState.monsters || []);
      this.resourceNodes.set(gameState.resourceNodes || []);
      this.hasPlacedFirstFlag.set(gameState.hasPlacedFirstFlag || false);

      console.log('Game loaded from save at', new Date(gameState.lastSaved ?? Date.now()).toLocaleTimeString());
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  async loadGameRemote(): Promise<boolean> {
    if (!this.isBrowser) return false;

    const user = this.authService.currentUser();
    if (!user) return false;

    try {
      const gameState = await this.gameApiService.loadGame(user.id);
      if (!gameState) {
        return false;
      }

      this.player.set(gameState.player);
      this.territories.set(gameState.territories || []);
      this.buildings.set(gameState.buildings || []);
      this.monsters.set(gameState.monsters || []);
      this.resourceNodes.set(gameState.resourceNodes || []);
      this.hasPlacedFirstFlag.set(gameState.hasPlacedFirstFlag || false);

      if (this.isBrowser) {
        localStorage.setItem(this.getSaveKey(), JSON.stringify(gameState));
      }

      console.log('Game loaded from server at', new Date().toLocaleTimeString());
      return true;
    } catch (error) {
      console.error('Failed to load game from server:', error);
      return false;
    }
  }

  manualSaveGame(): { success: boolean; message: string } {
    this.saveGameLocal();
    return { success: true, message: 'Game saved successfully!' };
  }

  deleteSaveGame(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.getSaveKey());
      console.log('Game save deleted');
    }
  }

  // ============ PROGRESSION SYSTEM ============

  // Experience and Leveling
  gainExperience(amount: number): void {
    let exp = this.player().experience + amount;
    let levelsGained = 0;
    
    // Calculate how many levels were gained
    while (exp >= this.player().nextLevelExp) {
      exp -= this.player().nextLevelExp;
      levelsGained++;
    }

    // Apply all levels at once
    for (let i = 0; i < levelsGained; i++) {
      this.levelUp();
    }

    // Update experience
    this.player.update(p => ({ ...p, experience: exp }));
  }

  private levelUp(): void {
    const p = this.player();
    const newLevel = p.level + 1;
    const healthIncrease = 20;
    const energyIncrease = 10;
    const attackIncrease = 2;
    const defenseIncrease = 1;

    this.player.update(pl => ({
      ...pl,
      level: newLevel,
      maxHealth: pl.maxHealth + healthIncrease,
      health: pl.maxHealth + healthIncrease,
      maxEnergy: pl.maxEnergy + energyIncrease,
      energy: pl.maxEnergy + energyIncrease,
      attack: pl.attack + attackIncrease,
      defense: pl.defense + defenseIncrease,
      nextLevelExp: Math.floor(100 * Math.pow(1.1, newLevel)) // Exponential growth
    }));

    console.log(`⬆️ LEVEL UP! Now level ${newLevel}`);
  }

  // Equipment System
  equipItem(itemId: string): void {
    const item = this.player().inventory.find(i => i.id === itemId);
    if (!item) return;

    const equipment = this.player().equipment || {};
    
    if (item.type === 'weapon') {
      equipment.weapon = item;
    } else if (item.type === 'armor') {
      // Determine armor slot based on rarity/name (simple heuristic)
      if (item.name.toLowerCase().includes('helmet') || item.name.toLowerCase().includes('crown')) {
        equipment.head = item;
      } else if (item.name.toLowerCase().includes('chest') || item.name.toLowerCase().includes('tunic')) {
        equipment.chest = item;
      } else if (item.name.toLowerCase().includes('glove') || item.name.toLowerCase().includes('gauntlet')) {
        equipment.hands = item;
      } else if (item.name.toLowerCase().includes('boot')) {
        equipment.feet = item;
      } else {
        equipment.chest = item; // Default to chest
      }
    } else if (item.type === 'accessory') {
      if (item.name.toLowerCase().includes('amulet')) {
        equipment.amulet = item;
      } else {
        equipment.ring = item;
      }
    }

    this.player.update(p => ({ ...p, equipment }));
  }

  unequipItem(slot: keyof EquipmentSlots): void {
    const equipment = this.player().equipment || {};
    equipment[slot] = undefined;
    this.player.update(p => ({ ...p, equipment }));
  }

  getEquipmentBonus(): { attack: number; defense: number } {
    const equipment = this.player().equipment || {};
    let bonus = { attack: 0, defense: 0 };

    Object.values(equipment).forEach(item => {
      if (item?.stats) {
        bonus.attack += item.stats.attack || 0;
        bonus.defense += item.stats.defense || 0;
      }
    });

    return bonus;
  }

  // Skills
  learnSkill(skillId: string): boolean {
    const newSkill: PlayerSkill = {
      id: skillId,
      name: `Skill ${skillId}`,
      description: 'A learned skill',
      icon: '⭐',
      level: 1,
      maxLevel: 5,
      type: 'passive',
      stats: { attack: 5 }
    };

    this.player.update(p => ({
      ...p,
      skills: [...(p.skills || []), newSkill]
    }));

    return true;
  }

  upgradeSkill(skillId: string): boolean {
    const skill = this.player().skills?.find(s => s.id === skillId);
    if (!skill || skill.level >= skill.maxLevel) return false;

    this.player.update(p => ({
      ...p,
      skills: p.skills?.map(s =>
        s.id === skillId ? { ...s, level: s.level + 1 } : s
      )
    }));

    return true;
  }

  // Loot Items
  spawnLoot(position: Position, level: number): void {
    const lootTypes = [
      { name: 'Iron Sword', type: 'weapon' as const, icon: '⚔️', stats: { attack: level * 2 } },
      { name: 'Leather Helmet', type: 'armor' as const, icon: '🪖', stats: { defense: level } },
      { name: 'Steel Chest Plate', type: 'armor' as const, icon: '🛡️', stats: { defense: level * 1.5 } },
      { name: 'Bronze Gauntlets', type: 'armor' as const, icon: '🥊', stats: { defense: level } },
      { name: 'Iron Boots', type: 'armor' as const, icon: '👢', stats: { defense: level } }
    ];

    const randomLoot = lootTypes[Math.floor(Math.random() * lootTypes.length)];
    const rarity = Math.random() > 0.7 ? 'rare' : 'common';

    const loot: LootItem = {
      id: `loot-${Date.now()}`,
      ...randomLoot,
      rarity,
      level,
      quantity: 1,
      position,
      spawnTime: new Date()
    };

    this.lootItems.update(items => [...items, loot]);
  }

  pickupLoot(lootId: string): void {
    const loot = this.lootItems().find(l => l.id === lootId);
    if (!loot) return;

    // Add to inventory
    this.player.update(p => ({
      ...p,
      inventory: [...p.inventory, { ...loot, position: undefined, spawnTime: undefined }]
    }));

    // Remove from map
    this.lootItems.update(items => items.filter(l => l.id !== lootId));
  }

  // Check for nearby loot
  checkForLoot(pos: Position): void {
    const items = this.lootItems();
    items.forEach(loot => {
      const distance = this.calculateDistance(pos.x, pos.y, loot.position.x, loot.position.y);
      if (distance < 20) { // 20 meters
        this.pickupLoot(loot.id);
      }
    });
  }

  // Teleport to a flag location
  teleportToFlag(flagId: string): void {
    const territory = this.territories().find(t => t.id === flagId);
    if (territory) {
      this.updatePlayerGPSPosition(territory.position.x, territory.position.y);
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    // Save on exit
    this.saveGameLocal();
  }
}
