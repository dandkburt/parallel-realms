// Game Models with Map Coordinate Support
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  experience: number;
  nextLevelExp: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  gold: number;
  position: Position;
  gridPosition?: { x: number; y: number }; // Local grid coords
  inventory: InventoryItem[];
  equipment: EquipmentSlots; // NEW: Equipment slots
  skills: PlayerSkill[]; // NEW: Learned skills
  territory: Territory[];
  cities: City[];
  alliance: string | null;
  movementFlag: Position | null;
  autoWalking: boolean;
  mapAnchor?: Position; // First flag placement locks territory origin
  companion?: Companion | null;
}

export interface Companion {
  id: string;
  type: 'dog';
  name: string;
  icon: string;
  active: boolean;
  ability: string;
  lastPing?: Date;
}

export interface Position {
  x: number;
  y: number;
  realm: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'gem' | 'potion' | 'resource' | 'quest';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  stats?: ItemStats;
  icon: string;
  maxSockets?: number;
  socketedGems?: InventoryItem[];
  gemElement?: 'earth' | 'fire' | 'water' | 'wind';
  abilityName?: string;
  abilityDescription?: string;
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  healthBoost?: number;
  energyBoost?: number;
}

export interface Territory {
  id: string;
  position: Position;
  ownerId: string;
  ownerName: string;
  buildings: Building[];
  lastClaimed: Date;
  color?: string; // Hex color for this territory's flag
  isActive?: boolean; // False = black flag (capturable, double energy cost)
}

export interface City {
  id: string;
  name: string;
  position: Position;
  level: number;
  population: number;
  maxPopulation: number;
  resources: Resource[];
  buildings: Building[];
  productionRates: ResourceProduction;
}

export interface Building {
  id: string;
  type: BuildingType;
  position: Position;
  level: number;
  health: number;
  maxHealth: number;
  owner: string;
  constructionTime?: number;
  isUnderConstruction: boolean;
}

export type BuildingType = 
  | 'house'
  | 'tower' 
  | 'barracks'
  | 'market'
  | 'farm'
  | 'mine'
  | 'lumbermill'
  | 'fortress'
  | 'wall'
  | 'warehouse';

export interface ResourceProduction {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
}

export interface Resource {
  type: 'wood' | 'stone' | 'iron' | 'food' | 'gold';
  amount: number;
  maxAmount?: number;
}

export interface ResourceNode {
  id: string;
  type: 'wood' | 'stone' | 'iron' | 'food';
  position: Position;
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  icon: string;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  position: Position;
  icon: string;
  loot: InventoryItem[];
}

export interface TileOverlay {
  color: string;
  opacity: number;
  ownerName?: string;
  territoryType?: string;
}

export interface MapTile {
  position: Position;
  terrain: 'grass' | 'forest' | 'mountain' | 'water' | 'desert' | 'dungeon';
  occupied: boolean;
  discovered: boolean;
  overlay?: TileOverlay;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'kill' | 'gather' | 'explore' | 'build';
  target: number;
  progress: number;
  rewards: QuestReward;
  completed: boolean;
}

export interface QuestReward {
  experience: number;
  gold: number;
  items: InventoryItem[];
}

export interface Alliance {
  id: string;
  name: string;
  tag: string;
  leader: string;
  members: string[];
  description: string;
  color: string;
}

export interface BuildingInfo {
  type: BuildingType;
  name: string;
  description: string;
  icon: string;
  costs: Resource[];
  buildTime: number;
  requirements: BuildingRequirement[];
  benefits: string[];
}

export interface BuildingRequirement {
  type: 'cityLevel' | 'building' | 'resource';
  value: number | string;
}

export interface CombatLog {
  timestamp: Date;
  attacker: string;
  defender: string;
  damage: number;
  critical: boolean;
}

// NEW: Equipment System
export interface EquipmentSlots {
  head?: InventoryItem;      // Helmet/crown
  chest?: InventoryItem;     // Armor/tunic
  hands?: InventoryItem;     // Gloves/gauntlets
  feet?: InventoryItem;      // Boots
  weapon?: InventoryItem;    // Sword/staff/bow
  shield?: InventoryItem;    // Shield/off-hand
  ring?: InventoryItem;      // Ring (future)
  amulet?: InventoryItem;    // Amulet (future)
}

export interface LootItem extends InventoryItem {
  position: Position;
  spawnTime: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level: number; // Item level affects stats
}

export interface PlayerSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  type: 'passive' | 'active';
  stats?: {
    attack?: number;
    defense?: number;
    healthBoost?: number;
  };
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  icon: string;
  nodes: SkillNode[];
}

export interface SkillNode {
  id: string;
  skill: PlayerSkill;
  prerequisites: string[]; // Skill IDs required before learning this
  cost: number; // Skill points required
  position: { x: number; y: number }; // Position in tree UI
}

export interface Settlement {
  id: string;
  name: string;
  position: Position;
  level: number;
  city: City;
  mainFlag: Territory;
  expansionFlags: Territory[];
  foundedAt: Date;
}
