import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Hero, Item, SharedBag, DungeonRun, NPCQuestState, HeroClass, TemperamentType, EquipmentSlot, LivingHeroStatus, CompletedRunSummary, DialogueLine } from '../types/game';

// Helper to generate UUIDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to generate items
export const generateRandomItem = (level: number, forceRarity?: Item['rarity']): Item => {
  const types: EquipmentSlot[] = ['helm', 'shoulders', 'chest', 'pants', 'boots', 'gloves', 'weapon'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  // const rarities: Item['rarity'][] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  let rarity: Item['rarity'] = 'Common';
  if (forceRarity) {
    rarity = forceRarity;
  } else {
    const roll = Math.random() * 100;
    if (roll > 95) rarity = 'Legendary';
    else if (roll > 80) rarity = 'Epic';
    else if (roll > 60) rarity = 'Rare';
    else if (roll > 30) rarity = 'Uncommon';
  }

  const suffixes: Record<Item['rarity'], string[]> = {
    Common: [''],
    Uncommon: ['of Vitality', 'of Defiance', 'of Haste', 'of Striking'],
    Rare: ['of Vampirism', 'of Fortune', 'of Cleansing', 'of Focus'],
    Epic: ['of Chain Lightning', 'of Frozen Ice', 'of Burning Embers'],
    Legendary: ['of the Arch-Mage', 'of the Warlord', 'of the Shadow Assassin', 'of the Holy Protector']
  };

  const suffixList = suffixes[rarity];
  const suffix = suffixList[Math.floor(Math.random() * suffixList.length)];
  
  const weight = type === 'weapon' ? 'none' : (Math.random() > 0.5 ? 'heavy' : 'light');

  const nameMap: Record<EquipmentSlot, string> = {
    helm: weight === 'heavy' ? 'Plate Greathelm' : 'Leather Hood',
    shoulders: weight === 'heavy' ? 'Steel Pauldrons' : 'Cloth Shoulders',
    chest: weight === 'heavy' ? 'Cuirass of Iron' : 'Ranger Tunic',
    pants: weight === 'heavy' ? 'Iron Greaves' : 'Cloth Leggings',
    boots: weight === 'heavy' ? 'Sabatons' : 'Swift Boots',
    gloves: weight === 'heavy' ? 'Gauntlets' : 'Vagrant Gloves',
    weapon: 'Slayer Blade' // will be customized below
  };

  let name = nameMap[type];
  if (type === 'weapon') {
    const weapons = ['Greatsword', 'Composite Bow', 'Glow Staff', 'Twin Daggers', 'Heavy Shield', 'Druid Branch', 'Skull Wand'];
    name = weapons[Math.floor(Math.random() * weapons.length)];
  }

  name = suffix ? `${name} ${suffix}` : name;

  // Base Stats
  const stats: Item['stats'] = {};
  const scalar = level * 1.2;

  if (type === 'weapon') {
    stats.damage = Math.round((10 + Math.random() * 8) * scalar);
    stats.atkSpeed = parseFloat((0.9 + Math.random() * 0.4).toFixed(2));
  } else {
    stats.armor = Math.round((2 + Math.random() * 4) * scalar * (weight === 'heavy' ? 1.5 : 0.8));
    stats.hp = Math.round((15 + Math.random() * 20) * scalar * (weight === 'heavy' ? 1.3 : 0.9));
  }

  // Suffix/Rarity Stats
  const affixes: string[] = [];
  if (rarity !== 'Common') {
    stats.critChance = Math.round(3 + Math.random() * 5);
    affixes.push(`+${stats.critChance}% Critical Strike Chance`);
  }
  if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary') {
    stats.lifeSteal = parseFloat((0.03 + Math.random() * 0.05).toFixed(3));
    affixes.push(`+${Math.round(stats.lifeSteal * 100)}% Life Steal on Hit`);
  }
  if (rarity === 'Epic' || rarity === 'Legendary') {
    stats.chainChance = parseFloat((0.10 + Math.random() * 0.15).toFixed(2));
    affixes.push(`${Math.round(stats.chainChance * 100)}% Chain Lightning Chance on Hit`);
  }
  if (rarity === 'Legendary') {
    stats.magic = Math.round(15 + Math.random() * 15);
    affixes.push(`+${stats.magic} Magic Power (Signature Trait)`);
  }

  return {
    id: generateId(),
    name,
    type,
    rarity,
    stats,
    weight,
    affixes
  };
};

interface GameContextProps {
  roster: Hero[];
  setRoster: React.Dispatch<React.SetStateAction<Hero[]>>;
  sharedBag: SharedBag;
  gold: number;
  runsCount: number;
  squad: string[]; // hero IDs
  temperaments: Record<string, TemperamentType>;
  shopInventory: Item[];
  activeRun: DungeonRun | null;
  questState: NPCQuestState;
  
  // Roster Management
  addToSquad: (heroId: string) => void;
  removeFromSquad: (heroId: string) => void;
  assignHeroToSlot: (slotIndex: number, heroId: string | null) => void;
  setHeroTemperament: (heroId: string, temp: TemperamentType) => void;
  equipItem: (heroId: string, slot: EquipmentSlot, item: Item | null) => void;
  
  // Blacksmith Actions
  upgradeItem: (itemId: string, location: 'bag' | 'hero', heroId?: string) => void;
  rerollAffix: (itemId: string, affixIndex: number, location: 'bag' | 'hero', heroId?: string) => { newAffix: string; commit: (accept: boolean) => void };
  craftRarity: (itemId: string, location: 'bag' | 'hero', heroId?: string) => void;
  
  // Shop Actions
  buyShopItem: (index: number) => void;
  restockShop: () => void;
  buyConsumableBuff: (buffType: 'hp' | 'damage' | 'speed') => void;
  buyScrollOfResurrection: () => void;
  
  // Run Lifecycle
  startRun: () => void;
  advanceChamber: () => void;
  triggerDraftChoice: (choiceIndex: number) => void;
  campHealHero: (heroId: string) => void;
  campHealAllHeroes: () => void;
  campReviveHero: (heroId: string) => void;
  addRunLootToBag: (item: Item) => void;
  addRunGold: (amount: number) => void;
  addRunXp: (amount: number) => void;
  terminateRun: (success: boolean) => void;
  
  completedRunSummary: CompletedRunSummary | null;
  setCompletedRunSummary: (summary: CompletedRunSummary | null) => void;
  closeRunSummary: () => void;
  
  activeDialogue: DialogueLine[] | null;
  enqueueDialogue: (lines: DialogueLine[]) => void;
  showNextDialogue: () => void;
  
  // NPC quest triggers
  talkToTownChef: () => void;
  
  // Bench / Barracks management
  buyLateGameMercenary: (heroClass: HeroClass) => void;

  // Save Slots & Main Menu
  activeSlot: number | null;
  loadSaveSlot: (slotNum: number) => void;
  deleteSaveSlot: (slotNum: number) => void;
  returnToMainMenu: () => void;
  getSaveSlotSummary: (slotNum: number) => {
    empty: boolean;
    gold: number;
    runsCount: number;
    unlockedHeroesCount: number;
    totalHeroesCount: number;
    squadClasses: string[];
  };
}

const INITIAL_ROSTER: Hero[] = [
  {
    character_id: 'hero_ranger',
    class: 'RANGER',
    unlocked: true,
    base_stats: { hp: 120, armor_mult: 1.0, speed_mult: 1.15, atk_speed_mult: 1.15 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_warrior',
    class: 'WARRIOR',
    unlocked: false,
    base_stats: { hp: 200, armor_mult: 1.25, speed_mult: 1.02, atk_speed_mult: 0.85 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_wizard',
    class: 'WIZARD',
    unlocked: false,
    base_stats: { hp: 90, armor_mult: 0.8, speed_mult: 1.0, atk_speed_mult: 1.05 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_rogue',
    class: 'ROGUE',
    unlocked: false,
    base_stats: { hp: 105, armor_mult: 0.9, speed_mult: 1.20, atk_speed_mult: 1.25 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_paladin',
    class: 'PALADIN',
    unlocked: false,
    base_stats: { hp: 145, armor_mult: 1.20, speed_mult: 0.88, atk_speed_mult: 0.90 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_druid',
    class: 'DRUID',
    unlocked: false,
    base_stats: { hp: 115, armor_mult: 1.0, speed_mult: 1.0, atk_speed_mult: 1.0 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  },
  {
    character_id: 'hero_necromancer',
    class: 'NECROMANCER',
    unlocked: false,
    base_stats: { hp: 100, armor_mult: 0.85, speed_mult: 0.95, atk_speed_mult: 0.95 },
    equipment: { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null }
  }
];

const GameContext = createContext<GameContextProps | undefined>(undefined);

const sanitizeItem = (item: Item): Item => {
  if (!item || !item.name) return item;
  
  const name = item.name.toLowerCase();
  let correctedType = item.type;

  if (name.includes('greatsword') || name.includes('bow') || name.includes('staff') || name.includes('daggers') || name.includes('shield') || name.includes('branch') || name.includes('wand') || name.includes('blade')) {
    correctedType = 'weapon';
  } else if (name.includes('greathelm') || name.includes('hood') || name.includes('cap')) {
    correctedType = 'helm';
  } else if (name.includes('pauldrons') || name.includes('shoulders')) {
    correctedType = 'shoulders';
  } else if (name.includes('cuirass') || name.includes('tunic') || name.includes('chest')) {
    correctedType = 'chest';
  } else if (name.includes('greaves') || name.includes('leggings') || name.includes('pants')) {
    correctedType = 'pants';
  } else if (name.includes('sabatons') || name.includes('boots')) {
    correctedType = 'boots';
  } else if (name.includes('gauntlets') || name.includes('gloves')) {
    correctedType = 'gloves';
  }

  return {
    ...item,
    type: correctedType
  };
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Save slots state
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  // Permanent state defaults
  const [roster, setRoster] = useState<Hero[]>(INITIAL_ROSTER);
  const [sharedBag, setSharedBag] = useState<SharedBag>(() => {
    const starterWeapon: Item = {
      id: 'item_start_bow',
      name: 'Old Recurve Bow',
      type: 'weapon',
      rarity: 'Common',
      stats: { damage: 8, atkSpeed: 1.1 },
      weight: 'none',
      affixes: []
    };
    const starterHelm: Item = {
      id: 'item_start_helm',
      name: 'Worn Leather Cap',
      type: 'helm',
      rarity: 'Common',
      stats: { armor: 2, hp: 15 },
      weight: 'light',
      affixes: []
    };
    return {
      max_slots: 30,
      slots_used: 2,
      items: [starterWeapon, starterHelm]
    };
  });
  const [gold, setGold] = useState<number>(350);
  const [runsCount, setRunsCount] = useState<number>(0);
  const [squad, setSquad] = useState<string[]>(['hero_ranger']);
  const [temperaments, setTemperaments] = useState<Record<string, TemperamentType>>({ hero_ranger: 'EXPLORATORY' });
  const [shopInventory, setShopInventory] = useState<Item[]>([]);
  const [questState, setQuestState] = useState<NPCQuestState>({ chefQuestStep: 0 });
  const [activeRun, setActiveRun] = useState<DungeonRun | null>(null);
  const [completedRunSummary, setCompletedRunSummary] = useState<CompletedRunSummary | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<DialogueLine[] | null>(null);
  const dialogueQueue = useRef<DialogueLine[][]>([]);

  // Shop temporary buffs applied to the next run
  const [nextRunBuffs, setNextRunBuffs] = useState<string[]>([]);
  const [nextRunScrolls, setNextRunScrolls] = useState<number>(0);

  // Sync to localStorage
  useEffect(() => {
    if (activeSlot === null) return;
    
    const slotPrefix = `slot_${activeSlot}_`;
    localStorage.setItem(`${slotPrefix}gl_roster`, JSON.stringify(roster));
    localStorage.setItem(`${slotPrefix}gl_sharedBag`, JSON.stringify(sharedBag));
    localStorage.setItem(`${slotPrefix}gl_gold`, String(gold));
    localStorage.setItem(`${slotPrefix}gl_runsCount`, String(runsCount));
    localStorage.setItem(`${slotPrefix}gl_squad`, JSON.stringify(squad));
    localStorage.setItem(`${slotPrefix}gl_temperaments`, JSON.stringify(temperaments));
    localStorage.setItem(`${slotPrefix}gl_shopInventory`, JSON.stringify(shopInventory));
    localStorage.setItem(`${slotPrefix}gl_questState`, JSON.stringify(questState));
    if (activeRun) {
      localStorage.setItem(`${slotPrefix}gl_activeRun`, JSON.stringify(activeRun));
    } else {
      localStorage.removeItem(`${slotPrefix}gl_activeRun`);
    }
  }, [roster, sharedBag, gold, runsCount, squad, temperaments, shopInventory, questState, activeRun, activeSlot]);

  // Initial shop roll
  useEffect(() => {
    if (activeSlot !== null && shopInventory.length === 0) {
      restockShop();
    }
  }, [activeSlot, shopInventory]);

  // Save Slots Management Functions
  const loadSaveSlot = (slotNum: number) => {
    const slotPrefix = `slot_${slotNum}_`;
    
    // 1. Gold
    const savedGold = localStorage.getItem(`${slotPrefix}gl_gold`);
    setGold(savedGold ? Number(savedGold) : 350);

    // 2. Runs count
    const savedRuns = localStorage.getItem(`${slotPrefix}gl_runsCount`);
    setRunsCount(savedRuns ? Number(savedRuns) : 0);

    // 3. Squad
    const savedSquad = localStorage.getItem(`${slotPrefix}gl_squad`);
    setSquad(savedSquad ? JSON.parse(savedSquad) : ['hero_ranger']);

    // 4. Temperaments
    const savedTemps = localStorage.getItem(`${slotPrefix}gl_temperaments`);
    setTemperaments(savedTemps ? JSON.parse(savedTemps) : { hero_ranger: 'EXPLORATORY' });

    // 5. Shared Bag & Roster (processed together to handle slot mismatches)
    const savedBag = localStorage.getItem(`${slotPrefix}gl_sharedBag`);
    let loadedBag: SharedBag;
    if (savedBag) {
      try {
        const parsed = JSON.parse(savedBag) as SharedBag;
        loadedBag = {
          ...parsed,
          items: parsed.items.map(sanitizeItem),
          slots_used: parsed.items.length
        };
      } catch (e) {
        loadedBag = { max_slots: 30, slots_used: 0, items: [] };
      }
    } else {
      const starterWeapon: Item = {
        id: 'item_start_bow',
        name: 'Old Recurve Bow',
        type: 'weapon',
        rarity: 'Common',
        stats: { damage: 8, atkSpeed: 1.1 },
        weight: 'none',
        affixes: []
      };
      const starterHelm: Item = {
        id: 'item_start_helm',
        name: 'Worn Leather Cap',
        type: 'helm',
        rarity: 'Common',
        stats: { armor: 2, hp: 15 },
        weight: 'light',
        affixes: []
      };
      loadedBag = {
        max_slots: 30,
        slots_used: 2,
        items: [starterWeapon, starterHelm]
      };
    }

    const savedRoster = localStorage.getItem(`${slotPrefix}gl_roster`);
    let loadedRoster: Hero[];
    if (savedRoster) {
      try {
        const parsed = JSON.parse(savedRoster) as Hero[];
        loadedRoster = parsed.map(hero => {
          const defaultEquip = { helm: null, shoulders: null, chest: null, pants: null, boots: null, gloves: null, weapon: null };
          const sanitizedEquipment = { ...hero.equipment };
          
          for (const key in sanitizedEquipment) {
            const slot = key as EquipmentSlot;
            const it = sanitizedEquipment[slot];
            if (it) {
              const sanitized = sanitizeItem(it);
              if (sanitized.type !== slot) {
                // Mismatch! Unequip and move to bag
                sanitizedEquipment[slot] = null;
                if (!loadedBag.items.some(i => i.id === sanitized.id)) {
                  loadedBag.items.push(sanitized);
                }
              } else {
                sanitizedEquipment[slot] = sanitized;
              }
            }
          }

          const defaultHero = INITIAL_ROSTER.find(h => h.character_id === hero.character_id) || INITIAL_ROSTER[0];
          return {
            ...defaultHero,
            ...hero,
            base_stats: defaultHero.base_stats,
            equipment: { ...defaultEquip, ...sanitizedEquipment }
          };
        });
      } catch (e) {
        loadedRoster = INITIAL_ROSTER;
      }
    } else {
      loadedRoster = INITIAL_ROSTER;
    }

    loadedBag.slots_used = loadedBag.items.length;
    
    setRoster(loadedRoster);
    setSharedBag(loadedBag);

    // 6. Shop Inventory
    const savedShop = localStorage.getItem(`${slotPrefix}gl_shopInventory`);
    setShopInventory(savedShop ? JSON.parse(savedShop) : []);

    // 7. Quest State
    const savedQuest = localStorage.getItem(`${slotPrefix}gl_questState`);
    setQuestState(savedQuest ? JSON.parse(savedQuest) : { chefQuestStep: 0 });

    // 8. Active Run
    const savedRun = localStorage.getItem(`${slotPrefix}gl_activeRun`);
    setActiveRun(savedRun ? JSON.parse(savedRun) : null);

    setCompletedRunSummary(null);

    // Set slot active
    setActiveSlot(slotNum);
  };

  const deleteSaveSlot = (slotNum: number) => {
    const slotPrefix = `slot_${slotNum}_`;
    localStorage.removeItem(`${slotPrefix}gl_roster`);
    localStorage.removeItem(`${slotPrefix}gl_sharedBag`);
    localStorage.removeItem(`${slotPrefix}gl_gold`);
    localStorage.removeItem(`${slotPrefix}gl_runsCount`);
    localStorage.removeItem(`${slotPrefix}gl_squad`);
    localStorage.removeItem(`${slotPrefix}gl_temperaments`);
    localStorage.removeItem(`${slotPrefix}gl_shopInventory`);
    localStorage.removeItem(`${slotPrefix}gl_questState`);
    localStorage.removeItem(`${slotPrefix}gl_activeRun`);

    if (activeSlot === slotNum) {
      setActiveSlot(null);
    }
  };

  const returnToMainMenu = () => {
    setActiveSlot(null);
  };

  const getSaveSlotSummary = (slotNum: number) => {
    const slotPrefix = `slot_${slotNum}_`;
    const goldVal = localStorage.getItem(`${slotPrefix}gl_gold`);
    
    if (goldVal === null) {
      return {
        empty: true,
        gold: 0,
        runsCount: 0,
        unlockedHeroesCount: 0,
        totalHeroesCount: INITIAL_ROSTER.length,
        squadClasses: []
      };
    }

    const gold = Number(goldVal);
    const runsCount = Number(localStorage.getItem(`${slotPrefix}gl_runsCount`) || '0');
    
    let unlockedHeroesCount = 1;
    const savedRoster = localStorage.getItem(`${slotPrefix}gl_roster`);
    if (savedRoster) {
      try {
        const parsed = JSON.parse(savedRoster) as Hero[];
        unlockedHeroesCount = parsed.filter(h => h.unlocked).length;
      } catch (e) {}
    }

    let squadClasses: string[] = [];
    const savedSquad = localStorage.getItem(`${slotPrefix}gl_squad`);
    if (savedSquad && savedRoster) {
      try {
        const parsedSquad = JSON.parse(savedSquad) as string[];
        const parsedRoster = JSON.parse(savedRoster) as Hero[];
        squadClasses = parsedSquad
          .map(id => parsedRoster.find(h => h.character_id === id)?.class)
          .filter(Boolean) as string[];
      } catch (e) {}
    } else {
      squadClasses = ['RANGER'];
    }

    return {
      empty: false,
      gold,
      runsCount,
      unlockedHeroesCount,
      totalHeroesCount: INITIAL_ROSTER.length,
      squadClasses
    };
  };

  // Roster / Squad management
  const addToSquad = (heroId: string) => {
    const maxSlots = runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3;
    if (squad.length >= maxSlots) return;
    if (squad.includes(heroId)) return;
    
    const hero = roster.find(h => h.character_id === heroId);
    if (!hero || !hero.unlocked) return;

    setSquad([...squad, heroId]);
    if (!temperaments[heroId]) {
      setTemperaments({ ...temperaments, [heroId]: 'EXPLORATORY' });
    }
  };

  const removeFromSquad = (heroId: string) => {
    if (squad.length === 1 && squad[0] === heroId) return; // must have at least one hero
    setSquad(squad.filter(id => id !== heroId));
  };

  const assignHeroToSlot = (slotIndex: number, heroId: string | null) => {
    const maxSlots = runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3;
    if (slotIndex >= maxSlots) return; // locked

    let newSquad = [...squad];
    // Fill up array to ensure we can set slotIndex
    while (newSquad.length < maxSlots) {
      newSquad.push('');
    }

    if (heroId === null) {
      // Remove hero at slotIndex
      newSquad[slotIndex] = '';
      newSquad = newSquad.filter(Boolean);
      if (newSquad.length === 0) {
        const fallback = roster.find(h => h.unlocked);
        if (fallback) newSquad = [fallback.character_id];
      }
      setSquad(newSquad);
      return;
    }

    // Check if hero already in squad at another slot: swap!
    const existingIndex = newSquad.indexOf(heroId);
    if (existingIndex !== -1) {
      const temp = newSquad[slotIndex];
      newSquad[slotIndex] = heroId;
      newSquad[existingIndex] = temp;
    } else {
      newSquad[slotIndex] = heroId;
    }

    newSquad = newSquad.filter(Boolean);
    setSquad(newSquad);
  };

  const setHeroTemperament = (heroId: string, temp: TemperamentType) => {
    setTemperaments({
      ...temperaments,
      [heroId]: temp
    });
  };

  const equipItem = (heroId: string, slot: EquipmentSlot, item: Item | null) => {
    // Type/Slot safety check
    if (item && item.type !== slot) return;

    // Find hero and prevEquipped statically first to prevent nested batching conflicts
    const hero = roster.find(h => h.character_id === heroId);
    if (!hero) return;
    const prevEquipped = hero.equipment[slot];

    // 1. Update roster
    setRoster(prev => prev.map(h => {
      if (h.character_id !== heroId) return h;
      return {
        ...h,
        equipment: {
          ...h.equipment,
          [slot]: item
        }
      };
    }));

    // 2. Update bag contents (conditional on whether a run is active)
    if (activeRun) {
      setActiveRun(prevRun => {
        if (!prevRun) return null;
        let updatedRunBag = [...prevRun.runBag];
        if (item) {
          updatedRunBag = updatedRunBag.filter(i => i.id !== item.id);
        }
        if (prevEquipped) {
          // Avoid duplicate entry if StrictMode runs twice
          if (!updatedRunBag.some(i => i.id === prevEquipped.id)) {
            updatedRunBag.push(prevEquipped);
          }
        }
        return {
          ...prevRun,
          runBag: updatedRunBag
        };
      });
    } else {
      setSharedBag(bag => {
        let updatedItems = [...bag.items];
        if (item) {
          updatedItems = updatedItems.filter(i => i.id !== item.id);
        }
        if (prevEquipped) {
          // Avoid duplicate entry if StrictMode runs twice
          if (!updatedItems.some(i => i.id === prevEquipped.id)) {
            updatedItems.push(prevEquipped);
          }
        }
        return {
          ...bag,
          items: updatedItems,
          slots_used: updatedItems.length
        };
      });
    }
  };

  // Blacksmith Actions
  const getItemRef = (itemId: string, location: 'bag' | 'hero', heroId?: string): Item | null => {
    if (location === 'bag') {
      return sharedBag.items.find(i => i.id === itemId) || null;
    } else if (heroId) {
      const hero = roster.find(h => h.character_id === heroId);
      if (!hero) return null;
      for (const slot in hero.equipment) {
        const item = hero.equipment[slot as EquipmentSlot];
        if (item && item.id === itemId) return item;
      }
    }
    return null;
  };

  const updateItemInLocation = (updatedItem: Item, location: 'bag' | 'hero', heroId?: string) => {
    if (location === 'bag') {
      setSharedBag(bag => ({
        ...bag,
        items: bag.items.map(i => i.id === updatedItem.id ? updatedItem : i)
      }));
    } else if (heroId) {
      setRoster(prev => prev.map(hero => {
        if (hero.character_id !== heroId) return hero;
        const updatedEquipment = { ...hero.equipment };
        for (const slot in updatedEquipment) {
          const item = updatedEquipment[slot as EquipmentSlot];
          if (item && item.id === updatedItem.id) {
            updatedEquipment[slot as EquipmentSlot] = updatedItem;
          }
        }
        return { ...hero, equipment: updatedEquipment };
      }));
    }
  };

  const upgradeItem = (itemId: string, location: 'bag' | 'hero', heroId?: string) => {
    const item = getItemRef(itemId, location, heroId);
    if (!item) return;

    // Upgrades cost scales with the level (+25 gold per upgrade level)
    const match = item.name.match(/\+(\d+)/);
    const level = match ? parseInt(match[1], 10) : 0;
    const cost = 50 + level * 25;
    if (gold < cost) return;

    const stats = { ...item.stats };
    if (stats.damage) stats.damage += 3;
    if (stats.armor) stats.armor += 1;
    if (stats.hp) stats.hp += 8;

    const updatedItem = {
      ...item,
      name: item.name.includes('+') 
        ? item.name.replace(/\+(\d+)/, (_, n) => `+${Number(n) + 1}`) 
        : `${item.name} +1`,
      stats
    };

    setGold(g => g - cost);
    updateItemInLocation(updatedItem, location, heroId);
  };

  const rerollAffix = (itemId: string, affixIndex: number, location: 'bag' | 'hero', heroId?: string) => {
    const item = getItemRef(itemId, location, heroId);
    if (!item) throw new Error("Item not found");

    const rerollCount = item.rerollCount || 0;
    
    // Scaling Cost Formula: Base * (1.5 ^ rerolls)
    const baseRarityCosts: Record<Item['rarity'], number> = {
      Common: 0,
      Uncommon: 30,
      Rare: 60,
      Epic: 120,
      Legendary: 250
    };
    
    const baseCost = baseRarityCosts[item.rarity];
    const cost = Math.round(baseCost * Math.pow(1.5, rerollCount));
    
    if (gold < cost) throw new Error("Not enough gold");

    // Reroll slot locking mechanism
    if (item.rerolledSlot !== undefined && item.rerolledSlot !== affixIndex) {
      throw new Error("This affix slot is locked. You can only reroll the previously rerolled slot.");
    }

    setGold(g => g - cost);

    // Roll a new affix based on slot
    const possibleAffixes = [
      `+${Math.round(4 + Math.random() * 4)}% Critical Strike Chance`,
      `+${Math.round(3 + Math.random() * 4)}% Life Steal on Hit`,
      `+${Math.round(8 + Math.random() * 10)}% Attack Speed`,
      `+${Math.round(5 + Math.random() * 10)}% Movement Speed`,
      `+${Math.round(10 + Math.random() * 15)} Max Health`,
      `+${Math.round(2 + Math.random() * 4)} Armor Rating`
    ];
    
    const newAffix = possibleAffixes[Math.floor(Math.random() * possibleAffixes.length)];
    // originalAffixes unused
    
    // Accept or reject closure
    const commit = (accept: boolean) => {
      const finalAffixes = [...item.affixes];
      if (accept) {
        finalAffixes[affixIndex] = newAffix;
      }
      
      const updatedItem: Item = {
        ...item,
        affixes: finalAffixes,
        rerolledSlot: affixIndex,
        rerollCount: rerollCount + 1
      };
      
      // Update item stats object accordingly if stats were modified
      if (accept) {
        const stats = { ...item.stats };
        if (newAffix.includes("Critical")) {
          stats.critChance = Math.round(5 + Math.random() * 4);
        } else if (newAffix.includes("Life Steal")) {
          stats.lifeSteal = 0.05;
        } else if (newAffix.includes("Attack Speed")) {
          stats.atkSpeed = 1.10;
        }
        updatedItem.stats = stats;
      }

      updateItemInLocation(updatedItem, location, heroId);
    };

    return {
      newAffix,
      commit
    };
  };

  const craftRarity = (itemId: string, location: 'bag' | 'hero', heroId?: string) => {
    const item = getItemRef(itemId, location, heroId);
    if (!item) return;

    const rarityOrder: Item['rarity'][] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const currentIndex = rarityOrder.indexOf(item.rarity);
    if (currentIndex === rarityOrder.length - 1) return; // already legendary
    
    const nextRarity = rarityOrder[currentIndex + 1];
    
    // Gold and material cost. Let's make it gold only for simplicity, scaling by rarity.
    const costs: Record<Item['rarity'], number> = {
      Common: 40,      // Common -> Uncommon
      Uncommon: 80,    // Uncommon -> Rare
      Rare: 160,       // Rare -> Epic
      Epic: 300,       // Epic -> Legendary
      Legendary: 9999
    };
    
    const cost = costs[item.rarity];
    if (gold < cost) return;

    setGold(g => g - cost);

    // Roll new trait based on next rarity
    const traitMap: Record<Item['rarity'], string> = {
      Common: '',
      Uncommon: `+${Math.round(3 + Math.random() * 4)}% Critical Strike Chance`,
      Rare: `+${Math.round(4 + Math.random() * 5)}% Life Steal on Hit`,
      Epic: `+12% Chain Lightning Chance on Hit`,
      Legendary: `+20 Magic Power (Signature Trait)`
    };

    const newTrait = traitMap[nextRarity];
    const updatedItem: Item = {
      ...item,
      rarity: nextRarity,
      affixes: [...item.affixes, newTrait]
    };

    // Update internal stats structure
    if (nextRarity === 'Uncommon') updatedItem.stats.critChance = 5;
    if (nextRarity === 'Rare') updatedItem.stats.lifeSteal = 0.06;
    if (nextRarity === 'Epic') updatedItem.stats.chainChance = 0.12;
    if (nextRarity === 'Legendary') updatedItem.stats.magic = 20;

    updateItemInLocation(updatedItem, location, heroId);
  };

  // Shop Actions
  const buyShopItem = (index: number) => {
    const item = shopInventory[index];
    if (!item) return;
    
    const cost = item.rarity === 'Legendary' ? 400 : item.rarity === 'Epic' ? 200 : item.rarity === 'Rare' ? 100 : item.rarity === 'Uncommon' ? 50 : 25;
    if (gold < cost) return;

    // Handle consumables via their dedicated systems
    if (item.type === 'consumable') {
      if (item.name === 'Scroll of Resurrection') {
        setGold(g => g - cost);
        setNextRunScrolls(prev => prev + 1);
        setShopInventory(prev => prev.filter((_, idx) => idx !== index));
        return;
      }
      if (item.name === 'Elixir of Wrath') {
        setGold(g => g - cost);
        setNextRunBuffs(prev => [...prev, 'damage']);
        setShopInventory(prev => prev.filter((_, idx) => idx !== index));
        return;
      }
    }

    if (sharedBag.items.length >= sharedBag.max_slots) return;

    setGold(g => g - cost);
    setSharedBag(bag => {
      const updated = [...bag.items, item];
      return {
        ...bag,
        items: updated,
        slots_used: updated.length
      };
    });
    setShopInventory(prev => prev.filter((_, idx) => idx !== index));
  };

  const restockShop = () => {
    // Generate 4 items and 2 consumables
    const items: Item[] = [];
    const level = Math.max(1, Math.floor(runsCount / 2) + 1);
    for (let i = 0; i < 4; i++) {
      items.push(generateRandomItem(level));
    }
    // Add two slots for consumables:
    // Scroll of Resurrection
    const scroll: Item = {
      id: generateId(),
      name: 'Scroll of Resurrection',
      type: 'consumable',
      rarity: 'Common',
      stats: {},
      weight: 'none',
      affixes: ['Single-use. Revives a deceased hero at 50% HP during Camp Intermission.']
    };
    // Elixir of Wrath (+10% damage temporary next run)
    const potion: Item = {
      id: generateId(),
      name: 'Elixir of Wrath',
      type: 'consumable',
      rarity: 'Uncommon',
      stats: {},
      weight: 'none',
      affixes: ['Single-use. Adds +10% Damage to the squad for the next run.']
    };
    
    items.push(scroll);
    items.push(potion);
    setShopInventory(items);
  };

  const buyConsumableBuff = (buffType: 'hp' | 'damage' | 'speed') => {
    const cost = 40;
    if (gold < cost) return;
    setGold(g => g - cost);
    setNextRunBuffs([...nextRunBuffs, buffType]);
  };

  const buyScrollOfResurrection = () => {
    const cost = 80;
    if (gold < cost) return;
    setGold(g => g - cost);
    setNextRunScrolls(prev => prev + 1);
  };

  // Run Lifecycle
  const startRun = () => {
    if (squad.length === 0) return;

    // Build run-time squad stats
    const livingSquad: Record<string, LivingHeroStatus> = {};
    
    squad.forEach(id => {
      const hero = roster.find(h => h.character_id === id);
      if (!hero) return;

      // Calculate HP and stats from equipment
      let equipmentHp = 0;
      let armorWeightPenalty = 0; // Heavy armor decreases speed

      for (const key in hero.equipment) {
        const item = hero.equipment[key as EquipmentSlot];
        if (item) {
          if (item.stats.hp) equipmentHp += item.stats.hp;
          if (item.weight === 'heavy') armorWeightPenalty += 0.05; // 5% penalty per heavy piece
        }
      }

      // Warrior Class Armor bonus
      let classArmorMult = hero.base_stats.armor_mult;
      if (hero.class === 'WARRIOR') {
        classArmorMult *= 1.20;
      }

      // Ranger Class Speed bonus
      let classSpeedMult = hero.base_stats.speed_mult;
      if (hero.class === 'RANGER') {
        // checks if wearing light gear
        let hasHeavy = false;
        for (const key in hero.equipment) {
          const item = hero.equipment[key as EquipmentSlot];
          if (item && item.weight === 'heavy') hasHeavy = true;
        }
        if (!hasHeavy) classSpeedMult *= 1.15;
      }

      const totalHp = hero.base_stats.hp + equipmentHp;
      
      livingSquad[id] = {
        character_id: id,
        hp: totalHp,
        maxHp: totalHp,
        tempBuffs: [...nextRunBuffs]
      };
    });

    const initialRun: DungeonRun = {
      currentBiome: 1,
      currentChamber: 1, // 1: Intro, 2: Corridors/Maze, 3: Loot Chest, 4: Loot Chest, 5: Boss
      livingSquad,
      runBag: [],
      runGold: 0,
      teamXp: 0,
      teamLevel: 1,
      teamXpThreshold: 100,
      drafting: false,
      draftChoices: [],
      scrollOfResurrectionCount: nextRunScrolls,
      bossDefeated: false,
      active: true,
      selectedPowerups: []
    };

    setActiveRun(initialRun);
    setNextRunBuffs([]);
    setNextRunScrolls(0);
  };

  const advanceChamber = () => {
    setActiveRun(prev => {
      if (!prev) return null;
      let nextChamber = prev.currentChamber + 1;
      let nextBiome = prev.currentBiome;

      if (nextChamber > 5) {
        nextChamber = 1;
        nextBiome += 1;
      }

      // Check if game is cleared
      if (nextBiome > 5) {
        // Can't invoke terminateRun inside state update directly, so we schedule it
        setTimeout(() => terminateRun(true), 0);
        return prev;
      }

      return {
        ...prev,
        currentBiome: nextBiome,
        currentChamber: nextChamber,
        bossDefeated: false
      };
    });
  };

  const triggerDraftChoice = (choiceIndex: number) => {
    setActiveRun(prev => {
      if (!prev) return null;
      const choice = prev.draftChoices[choiceIndex];
      if (!choice) return prev;

      // Apply the chosen stat increase to all living squad members matching the classTag (or all if general)
      const updatedSquad: Record<string, any> = {};
      for (const key in prev.livingSquad) {
        const h = { ...prev.livingSquad[key] };
        const rosterHero = roster.find(rh => rh.character_id === h.character_id);
        if (!rosterHero) {
          updatedSquad[key] = h;
          continue;
        }

        if (!choice.classTag || rosterHero.class === choice.classTag) {
          if (choice.type === 'stat') {
            // Increase max HP
            h.maxHp = Math.round(h.maxHp * (1 + choice.value));
            h.hp = Math.round(h.hp * (1 + choice.value));
          } else if (choice.type === 'heal') {
            if (h.hp > 0) {
              h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * choice.value));
            }
          } else if (choice.type === 'skill') {
            h.tempBuffs = [...h.tempBuffs, `${choice.title} Buff`];
          }
        }
        updatedSquad[key] = h;
      }

      return {
        ...prev,
        drafting: false,
        draftChoices: [],
        livingSquad: updatedSquad,
        // 'heal' cards are instant-use — don't show them as persistent active powerups
        selectedPowerups: choice.type === 'heal'
          ? (prev.selectedPowerups ?? [])
          : [...(prev.selectedPowerups ?? []), choice.title]
      };
    });
  };

  const campHealHero = (heroId: string) => {
    setActiveRun(prev => {
      if (!prev) return null;
      const squadHero = prev.livingSquad[heroId];
      if (!squadHero || squadHero.hp <= 0) return prev;

      const updatedSquad = { ...prev.livingSquad };
      updatedSquad[heroId].hp = Math.min(squadHero.maxHp, squadHero.hp + Math.round(squadHero.maxHp * 0.20));

      return {
        ...prev,
        livingSquad: updatedSquad
      };
    });
  };

  const campHealAllHeroes = () => {
    setActiveRun(prev => {
      if (!prev) return null;
      const updatedSquad = { ...prev.livingSquad };
      for (const heroId of Object.keys(updatedSquad)) {
        const hero = updatedSquad[heroId];
        if (hero && hero.hp > 0) {
          hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.20));
        }
      }
      return { ...prev, livingSquad: updatedSquad };
    });
  };

  const campReviveHero = (heroId: string) => {
    setActiveRun(prev => {
      if (!prev || prev.scrollOfResurrectionCount <= 0) return prev;
      const squadHero = prev.livingSquad[heroId];
      if (!squadHero || squadHero.hp > 0) return prev; // must be dead

      const updatedSquad = { ...prev.livingSquad };
      updatedSquad[heroId].hp = Math.round(squadHero.maxHp * 0.5); // revives at 50% HP
      updatedSquad[heroId].tempBuffs = []; // wipes temporary buffs

      return {
        ...prev,
        scrollOfResurrectionCount: prev.scrollOfResurrectionCount - 1,
        livingSquad: updatedSquad
      };
    });
  };

  const addRunLootToBag = (item: Item) => {
    setActiveRun(prev => {
      if (!prev) return null;
      return {
        ...prev,
        runBag: [...prev.runBag, item]
      };
    });
  };

  const addRunGold = (amount: number) => {
    setActiveRun(prev => {
      if (!prev) return null;
      return {
        ...prev,
        runGold: prev.runGold + amount
      };
    });
  };

  const addRunXp = (amount: number) => {
    setActiveRun(prev => {
      if (!prev) return null;

      let xp = prev.teamXp + amount;
      let level = prev.teamLevel;
      let threshold = prev.teamXpThreshold;
      let drafting = prev.drafting;
      let draftChoices = prev.draftChoices;

      if (xp >= threshold) {
        xp -= threshold;
        level += 1;
        threshold = Math.round(threshold * 1.4);
        drafting = true;
        
        // Determine living squad classes to filter drafting card pool
        const livingClasses = Object.keys(prev.livingSquad)
          .filter(id => prev.livingSquad[id].hp > 0)
          .map(id => roster.find(h => h.character_id === id)?.class)
          .filter(Boolean) as HeroClass[];

        // Generate 3 choices
        const allChoices = [
          { title: 'Divine Shield', description: 'Grant Warrior +15% Health', classTag: 'WARRIOR' as HeroClass, type: 'stat' as const, value: 0.15 },
          { title: 'Shield Slam', description: 'Warrior attacks stun targets', classTag: 'WARRIOR' as HeroClass, type: 'skill' as const, value: 1 },
          { title: 'Vampiric Blade', description: 'Warrior gains +3% Life Steal', classTag: 'WARRIOR' as HeroClass, type: 'skill' as const, value: 0.03 },
          { title: 'Sharpshooter', description: 'Grant Ranger +10% Damage', classTag: 'RANGER' as HeroClass, type: 'stat' as const, value: 0.10 },
          { title: 'Double Shot', description: 'Ranger fires twice as fast', classTag: 'RANGER' as HeroClass, type: 'skill' as const, value: 1 },
          { title: 'Mana Flow', description: 'Grant Wizard +20% Magical Power', classTag: 'WIZARD' as HeroClass, type: 'stat' as const, value: 0.20 },
          { title: 'Fireball Strike', description: 'Wizard spells explode in area', classTag: 'WIZARD' as HeroClass, type: 'skill' as const, value: 1 },
          { title: 'Rejuvenate', description: 'Heal all squad members 25% HP', type: 'heal' as const, value: 0.25 },
          { title: 'Iron Will', description: 'Boost All Defense by +10%', type: 'stat' as const, value: 0.10 }
        ];

        // Filter choices to only match living classes (or be generic)
        const filteredChoices = allChoices.filter(c => !c.classTag || livingClasses.includes(c.classTag));
        
        // Pick 3 random
        const selected: typeof draftChoices = [];
        const tempChoices = [...filteredChoices];
        for (let i = 0; i < 3; i++) {
          if (tempChoices.length === 0) break;
          const index = Math.floor(Math.random() * tempChoices.length);
          const choice = tempChoices.splice(index, 1)[0];
          selected.push({
            id: generateId(),
            title: choice.title,
            description: choice.description,
            classTag: choice.classTag,
            type: choice.type,
            value: choice.value
          });
        }

        draftChoices = selected;
      }

      return {
        ...prev,
        teamXp: xp,
        teamLevel: level,
        teamXpThreshold: threshold,
        drafting,
        draftChoices
      };
    });
  };

  const terminateRun = (success: boolean) => {
    if (!activeRun) return;

    // Check if warrior survived boss fight (chamber 5 = boss)
    let warriorSurvived = false;
    if (activeRun.currentBiome === 1 && activeRun.currentChamber === 5 && success) {
      const warriorStatus = activeRun.livingSquad['hero_warrior'];
      if (warriorStatus && warriorStatus.hp > 0) {
        warriorSurvived = true;
      }
    }

    if (activeRun.currentBiome === 1 && activeRun.currentChamber === 5 && success && warriorSurvived) {
      setQuestState(prev => ({ ...prev, warriorSurvivedBoss: true }));
    }

    // Set the completed run summary first!
    setCompletedRunSummary({
      success,
      goldScavenged: activeRun.runGold,
      itemsAcquired: [...activeRun.runBag],
      powerupsSelected: activeRun.selectedPowerups || [],
      currentBiome: activeRun.currentBiome,
      currentChamber: activeRun.currentChamber
    });

    // Return home with loot & gold
    setGold(g => g + activeRun.runGold);
    
    // Add run loot to shared bag, checking limits
    setSharedBag(bag => {
      let updatedItems = [...bag.items];
      activeRun.runBag.forEach(item => {
        if (updatedItems.length < bag.max_slots) {
          updatedItems.push(item);
        }
      });
      return {
        ...bag,
        items: updatedItems,
        slots_used: updatedItems.length
      };
    });

    // Check unlocks
    let newlyUnlockedClasses: string[] = [];

    // Milestone 2: Wizard/Sorceress unlock on Biome 1 boss defeat (chamber 5)
    if (activeRun.currentBiome === 1 && activeRun.currentChamber === 5 && success) {
      newlyUnlockedClasses.push('hero_wizard');
    }

    // Process unlocked classes in roster
    setRoster(prev => prev.map(hero => {
      if (newlyUnlockedClasses.includes(hero.character_id) && !hero.unlocked) {
        return { ...hero, unlocked: true };
      }
      return hero;
    }));

    setRunsCount(r => r + 1);
    setActiveRun(null);
    restockShop(); // restock shop on return
  };

  // NPC quest triggers
  const enqueueDialogue = (dialogue: DialogueLine[]) => {
    if (!activeDialogue) {
      setActiveDialogue(dialogue);
    } else {
      dialogueQueue.current.push(dialogue);
    }
  };

  const showNextDialogue = () => {
    if (dialogueQueue.current.length > 0) {
      const next = dialogueQueue.current.shift();
      setActiveDialogue(next || null);
    } else {
      setActiveDialogue(null);
    }
  };

  const closeRunSummary = () => {
    if (!completedRunSummary) return;

    const { success, currentBiome, currentChamber } = completedRunSummary;
    setCompletedRunSummary(null);

    // 1. Check Chef Quest progression
    const step = questState.chefQuestStep;
    const warriorUnlocked = roster.find(h => h.character_id === 'hero_warrior')?.unlocked;

    if (currentBiome === 1 && currentChamber === 5 && success) {
      // Biome 1 Boss defeated! (chamber 5 = boss fight)
      if (!warriorUnlocked) {
        // Rule 1: Defeated boss before warrior unlocked. Chef is thankful and joins!
        setQuestState({ chefQuestStep: 3, warriorSurvivedBoss: false });
        setRoster(prev => prev.map(hero => {
          if (hero.character_id === 'hero_warrior') return { ...hero, unlocked: true };
          return hero;
        }));
        setSquad(prev => {
          const maxSlots = runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3;
          if (prev.length < maxSlots && !prev.includes('hero_warrior')) {
            return [...prev, 'hero_warrior'];
          }
          return prev;
        });

        enqueueDialogue([
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "Guildmaster! You... you defeated the boss and saved my daughter! She returned safely to the tavern."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "I was worried sick. She told me your squad braved the depths and vanquished the Gorgon Overlord to free her."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "I used to be a Frontline Shield-Bearer of the Iron Vanguard. I'm hanging up my chef apron and joining your barracks right now. My seasoned shield is at your service!"
          }
        ]);
      } else {
        // Warrior was already unlocked.
        setQuestState(prev => ({ ...prev, chefQuestStep: 3 }));
      }
    } else {
      // Normal runs progression (not the boss run)
      if (step === 0) {
        setQuestState(prev => ({ ...prev, chefQuestStep: 1 }));
        enqueueDialogue([
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "Welcome back from the depths, Guildmaster! You look like you've been seasoned, tenderized, and lightly seared out there."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "By the way... my beloved daughter went missing in the forest biome. She went out to pick wild rosemary for our garlic bread stews, and she hasn't come back yet."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "If you could keep a look out while you're down there, that would be gr-ate... get it? Like a cheese grater? Sorry, bad dad joke. But seriously, please find her!"
          }
        ]);
      } else if (step === 1) {
        setQuestState(prev => ({ ...prev, chefQuestStep: 2 }));
        enqueueDialogue([
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "You're back! Still no sign of my daughter? Oh, my stews are tasting like sadness and over-salted worry."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "I heard rumors from other adventurers that the monsters have locked cages deep within the ruins. I pray she's holding on."
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "Please, check the cages in the dungeon ruins! I'll keep the stoves warm for you."
          }
        ]);
      } else if (step === 2) {
        // Normal rescue run complete (if they unlock him through the cages step)
        setQuestState(prev => ({ ...prev, chefQuestStep: 3 }));
        
        enqueueDialogue([
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "I'm really worried about my daughter, mind if I join you? If you think my cooking skills are good, just wait till you see what I can do in battle!"
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "Before I retired to run this tavern, I was a Frontline WARRIOR of the Iron Vanguard. My shield is seasoned and ready to serve!"
          },
          {
            speaker: "Town Chef",
            portrait: import.meta.env.BASE_URL + "warrior_chef.png",
            text: "Let's go crack some monster skulls like eggs for a morning omelet! Let's get cooking!"
          }
        ]);

        setRoster(prev => prev.map(hero => {
        if (hero.character_id === 'hero_warrior') {
          return { ...hero, unlocked: true };
        }
        return hero;
      }));

      }
    }

    // 2. Sorceress unlock dialogue now handled in-dungeon (CombatSimulation boss death)
  };

  const talkToTownChef = () => {
    const step = questState.chefQuestStep;
    if (step === 0) {
      enqueueDialogue([
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "Ah, welcome to my tavern, traveler! I'm the Chef here, but my friends call me 'The Ladle of Justice.' Just kidding, they call me Bob."
        },
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "If you're looking for the finest stew in the kingdom, you've come to the right place. I always say: a good soup is like a good shield—it keeps you warm and absorbs all the hits!"
        },
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "You should try my signature spicy mushroom stew sometime. It's so hot it'll clean your armor for you! Seriously, come by later when the hearth is ready."
        }
      ]);
    } else if (step === 1) {
      enqueueDialogue([
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "Any sign of my little helper? She went out to gather wild rosemary and hasn't returned yet."
        },
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "I heard rumors adventurers heard crying near a locked cage deep in the ruins. If you find her, I'll bake you the biggest garlic bread you've ever seen!"
        }
      ]);
    } else if (step === 2) {
      setQuestState({ chefQuestStep: 3 });
      setRoster(prev => prev.map(hero => {
        if (hero.character_id === 'hero_warrior') {
          return { ...hero, unlocked: true };
        }
        return hero;
      }));
      setSquad(prev => {
        const maxSlots = runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3;
        if (prev.length < maxSlots && !prev.includes('hero_warrior')) {
          return [...prev, 'hero_warrior'];
        }
        return prev;
      });
      enqueueDialogue([
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "I'm really worried about my daughter, mind if I join you? If you think my cooking skills are good, just wait till you see what I can do in battle!"
        },
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "Before I retired to run this tavern, I was a Frontline Shield-Bearer of the Iron Vanguard. My shield is seasoned and ready to serve!"
        },
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "Let's go crack some monster skulls like eggs for a morning omelet! Let's get cooking!"
        }
      ]);
    } else {
      enqueueDialogue([
        {
          speaker: "Town Chef",
          portrait: "/warrior_chef.png",
          text: "Ah, Guildmaster! The stews are bubbling and my shield is polished."
        },
        {
          speaker: "Warrior Chef",
          portrait: "/warrior_chef.png",
          text: "Ready to absorb some hits whenever you command!"
        }
      ]);
    }
  };

  const buyLateGameMercenary = (heroClass: HeroClass) => {
    // Mercenary board costs 300 gold
    const cost = 300;
    if (gold < cost) return;

    const heroToUnlock = roster.find(h => h.class === heroClass && !h.unlocked);
    if (!heroToUnlock) return;

    setGold(g => g - cost);
    setRoster(prev => prev.map(hero => {
      if (hero.class === heroClass) {
        return { ...hero, unlocked: true };
      }
      return hero;
    }));
  };

  return (
    <GameContext.Provider value={{
      roster,
      setRoster,
      sharedBag,
      gold,
      runsCount,
      squad,
      temperaments,
      shopInventory,
      activeRun,
      questState,
      
      addToSquad,
      removeFromSquad,
      assignHeroToSlot,
      setHeroTemperament,
      equipItem,
      
      upgradeItem,
      rerollAffix,
      craftRarity,
      
      buyShopItem,
      restockShop,
      buyConsumableBuff,
      buyScrollOfResurrection,
      
      startRun,
      advanceChamber,
      triggerDraftChoice,
      campHealHero,
      campHealAllHeroes,
      campReviveHero,
      addRunLootToBag,
      addRunGold,
      addRunXp,
      terminateRun,
      
      talkToTownChef,
      buyLateGameMercenary,
      completedRunSummary,
      setCompletedRunSummary,
      closeRunSummary,
      
      activeDialogue,
      enqueueDialogue,
      showNextDialogue,

      activeSlot,
      loadSaveSlot,
      deleteSaveSlot,
      returnToMainMenu,
      getSaveSlotSummary
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
