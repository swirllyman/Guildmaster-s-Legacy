export type HeroClass = 'RANGER' | 'WARRIOR' | 'WIZARD' | 'ROGUE' | 'PALADIN' | 'DRUID' | 'NECROMANCER';

export type EquipmentSlot = 'helm' | 'shoulders' | 'chest' | 'pants' | 'boots' | 'gloves' | 'weapon';

export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export type TemperamentType = 'AGGRESSIVE' | 'DEFENSIVE' | 'EXPLORATORY' | 'PASSIVE';

export interface ItemStats {
  hp?: number;
  armor?: number;
  damage?: number;
  atkSpeed?: number;   // multiplier or flat speed percentage
  speed?: number;      // move speed modification percentage
  magic?: number;      // magical power scaling
  critChance?: number; // critical strike percentage (e.g. +5%)
  lifeSteal?: number;  // status trigger (e.g. 0.05 for 5%)
  chainChance?: number; // proc-on-hit chain lightning chance
}

export interface Item {
  id: string;
  name: string;
  type: EquipmentSlot | 'consumable';
  rarity: ItemRarity;
  stats: ItemStats;
  weight: 'light' | 'heavy' | 'none';
  affixes: string[];
  rerolledSlot?: number; // index of the affix line that is rerollable, locking others
  rerollCount?: number;
}

export interface HeroBaseStats {
  hp: number;
  armor_mult: number;
  speed_mult: number;
  atk_speed_mult: number;
}

export interface Hero {
  character_id: string;
  class: HeroClass;
  unlocked: boolean;
  base_stats: HeroBaseStats;
  equipment: Record<EquipmentSlot, Item | null>;
}

export interface SharedBag {
  max_slots: number;
  slots_used: number;
  items: Item[];
}

export interface LivingHeroStatus {
  character_id: string;
  hp: number;
  maxHp: number;
  tempBuffs: string[];
}

export interface DraftCard {
  id: string;
  title: string;
  description: string;
  classTag?: HeroClass; // cards could be specific to a class
  rarity: ItemRarity;
  effect: (status: LivingHeroStatus[], roster: Hero[]) => void;
}

export interface DungeonRun {
  currentBiome: number;
  currentChamber: number; // 1-5
  livingSquad: Record<string, LivingHeroStatus>; // keyed by character_id
  runBag: Item[];
  runGold: number;
  teamXp: number;
  teamLevel: number;
  teamXpThreshold: number;
  drafting: boolean;
  draftChoices: {
    id: string;
    title: string;
    description: string;
    classTag?: HeroClass;
    type: 'stat' | 'skill' | 'heal';
    value: number;
  }[];
  scrollOfResurrectionCount: number;
  bossDefeated: boolean;
  active: boolean;
  selectedPowerups: string[];
}

export interface CompletedRunSummary {
  success: boolean;
  goldScavenged: number;
  itemsAcquired: Item[];
  powerupsSelected: string[];
  currentBiome: number;
  currentChamber: number;
}

export interface NPCQuestState {
  chefQuestStep: number; // 0, 1, 2, 3 (Warrior unlock steps)
}

export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
}

