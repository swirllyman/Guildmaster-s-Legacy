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
  atkCooldownReduction?: number; // attack cooldown reduction percentage (e.g. 0.10 for 10%)
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
    synergyClasses?: HeroClass[];
  }[];
  scrollOfResurrectionCount: number;
  bossDefeated: boolean;
  active: boolean;
  selectedPowerups: string[];
  heroDamageDealt?: Record<string, number>;
}

export interface CompletedRunSummary {
  success: boolean;
  goldScavenged: number;
  itemsAcquired: Item[];
  powerupsSelected: string[];
  currentBiome: number;
  currentChamber: number;
  heroDamageDealt?: Record<string, number>;
}

export interface NPCQuestState {
  chefQuestStep: number; // 0, 1, 2, 3 (Warrior unlock steps)
  warriorSurvivedBoss?: boolean;
  townTutorialStep: number; // 0=not started, 1-5=active step, -1=complete
}

export interface DialogueLine {
  speaker: string;
  portrait: string;
  text: string;
}

export const POWERUP_DESCRIPTIONS: Record<string, string> = {
  'Divine Shield': 'Grant Warrior +15% Health per stack',
  'Shield Slam': 'Warrior attacks stun targets for 1.5s per stack',
  'Vampiric Blade': 'Warrior gains +3% Life Steal per stack',
  'Second Wind': 'Warrior heals 2% max HP per second per stack (only under 50% HP)',
  'Sharpshooter': 'Grant Ranger +10% Damage per stack',
  'Double Shot': 'Ranger attack speed +30% per stack (diminishing, capped at 75%)',
  'Mana Flow': 'Grant Sorceress +20% Magical Power per stack',
  'Fireball Strike': 'Increases spell explosion radius per stack',
  'Rejuvenate': 'Heal all squad members 25% HP (instant)',
  'Iron Will': 'Boost All Defense by +10% per stack',
  'Charge': 'Warrior charges nearest enemy (no melee threats). Cooldown 20s (-2s/level, min 5s)',
  'Block Mastery': 'Warrior gains +7% Block Chance per stack',
  'Poison Arrow': 'Ranger arrows poison target (stacks x5, 1+1.5/level dmg per 2s, max 10)',
  'Marked for Death': 'Enemies hit by Warrior are marked (max 3, +1 per stack); Ranger attacks hit all marked enemies.',
  'Quick Burn': 'Sorceress benefits from 50% (+10% per stack) of Ranger\'s Double Shot CDR.',
  'Fire Armor': 'Sorceress shields Warrior; enemies hitting Warrior take 15 (+10 per stack) fire dmg.',
  'Increase Horde': 'Adds +3 minions that can be revived to fight alongside per stack',
  'Skeleton Magi': 'Revived minions have a 50% (+10% per stack) chance to be a skeletal magi (ranged light AoE)',
  'Skeletal Detonation': 'Explodes any minion in melee range of an enemy causing 50 (+50/lvl) AoE damage. Cooldown: 20s (-2s/lvl, min 10s)',
  'Devotion Aura': 'Paladin\'s aura grants +10% damage reduction (armor) to nearby allies per stack',
  'Retribution Aura': 'Allies inside Paladin\'s aura reflect 15% (+10% per stack) of damage taken back to attackers',
  'Aura Mastery': 'Paladin\'s aura radius is increased and grants +5% bonus damage and defense per stack',
  'Feral Swiftness': 'Werewolf attack speed increased by 25% per stack',
  'Ursine Fortitude': 'Bear max HP increased by 20% and block chance +10% per stack',
  'Owl Clarity': 'Owl spell damage (AoE attacks) increased by 20% per stack',
  'Quick Shift': 'Druid shapeshifts 25% faster and heals 5% max HP per stack on shifting',
  'Wolf Pack': 'Summons 2 wolves (+2 per stack) on a 1 min cd. If max wolves are alive, queues up the summon.',
  'Dagger Poisoning': 'Rogue melee attacks apply a stack of poison per stack',
  'Shadowstep': 'Rogue teleports behind current target every 10s (-2s per level, min 4s) dealing double damage',
  'Evasive Maneuvers': 'Rogue gains +15% dodge chance per stack',
  'Adrenaline Rush': 'Rogue gains +30% attack and movement speed for 4s after a kill per stack'
};

