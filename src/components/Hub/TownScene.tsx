import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Shop } from './Shop';
import { Blacksmith } from './Blacksmith';
import { TownChef } from './TownChef';
import type { EquipmentSlot, Item, HeroClass } from '../../types/game';
import { POWERUP_DESCRIPTIONS } from '../../types/game';
import { Sword, Shield, Crown, Footprints, ShieldAlert, Award, ShieldCheck, HelpCircle, BookOpen, Users } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

const COMPENDIUM_HEROES = [
  {
    class: 'RANGER' as HeroClass,
    displayName: 'RANGER',
    passiveName: 'Fleet-Footed',
    passiveDesc: 'Ranger receives +20% movement speed (1.2x multiplier) and fires high-velocity arrows from a safe distance.',
    description: 'An agile marksman skilled in quick movement and ranged physical attacks.',
    baseAttackRange: '4.5 (Ranged)',
    baseAttackCooldown: '1.0s',
  },
  {
    class: 'WARRIOR' as HeroClass,
    displayName: 'WARRIOR',
    passiveName: 'Shield Block & Vampirism',
    passiveDesc: 'Warrior has a 25% chance to block incoming melee attacks (reducing damage taken by 75%), starts with +2% base Life Steal, and commands high combat threat.',
    description: 'A heavily armored frontline fighter who absorbs damage and retaliates with devastating blows.',
    baseAttackRange: '1.2 (Melee)',
    baseAttackCooldown: '1.2s',
  },
  {
    class: 'WIZARD' as HeroClass,
    displayName: 'SORCERESS',
    passiveName: 'Arcane Mastery',
    passiveDesc: 'Casts powerful area-of-effect spells from a long distance. Spells scale heavily with Magical Power.',
    description: 'A glass-cannon spellcaster wielding destructive elemental and explosion magic.',
    baseAttackRange: '3.5 (Ranged)',
    baseAttackCooldown: '1.8s',
  },
  {
    class: 'ROGUE' as HeroClass,
    displayName: 'ROGUE',
    passiveName: 'Stealth & Shadow Arts',
    passiveDesc: 'Starts each chamber in Stealth. Attacks from Stealth deal 2.5x damage (Shadowstrike). Automatically Vanishes back into Stealth for 6 seconds when health drops below 50% for the first time in a chamber.',
    description: 'A stealthy assassin capable of striking from the shadows and escaping death.',
    baseAttackRange: '1.2 (Melee)',
    baseAttackCooldown: '0.9s',
  },
  {
    class: 'PALADIN' as HeroClass,
    displayName: 'PALADIN',
    passiveName: 'Devotion Aura',
    passiveDesc: 'Radiates a protective holy aura that grants the Paladin and nearby allies +10% base damage reduction.',
    description: 'A holy protector who bolsters the squad\'s defenses while dealing solid melee damage.',
    baseAttackRange: '1.2 (Melee)',
    baseAttackCooldown: '1.2s',
  },
  {
    class: 'DRUID' as HeroClass,
    displayName: 'DRUID',
    passiveName: 'Wild Shape Cycle',
    passiveDesc: 'Shapeshifts every 8 seconds, cycling through Bear Form (tanky, +20% Block Chance), Werewolf Form (fast, 0.8s attack cooldown), and Owl Form (ranged, 3.2 range, 1.6s attack cooldown).',
    description: 'A versatile shape-shifter who adapts to the battlefield by morphing into beast forms.',
    baseAttackRange: '1.2 / 3.2',
    baseAttackCooldown: '0.8s / 1.4s / 1.6s',
  },
  {
    class: 'NECROMANCER' as HeroClass,
    displayName: 'NECROMANCER',
    passiveName: 'Minion Reanimation',
    passiveDesc: 'Defeating a hostile enemy automatically raises them as a skeletal minion to fight alongside the squad (max 5 active skeleton minions by default).',
    description: 'A dark commander of the dead who summons skeletal minions to overwhelm foes.',
    baseAttackRange: '3.0 (Ranged)',
    baseAttackCooldown: '1.5s',
  }
];

const getPowerupCategory = (name: string): string => {
  const warriorPups = ['Divine Shield', 'Shield Slam', 'Vampiric Blade', 'Second Wind', 'Block Mastery', 'Charge'];
  const rangerPups = ['Sharpshooter', 'Double Shot', 'Poison Arrow'];
  const wizardPups = ['Mana Flow', 'Fireball Strike'];
  const roguePups = ['Dagger Poisoning', 'Shadowstep', 'Evasive Maneuvers', 'Adrenaline Rush'];
  const paladinPups = ['Devotion Aura', 'Retribution Aura', 'Aura Mastery'];
  const druidPups = ['Feral Swiftness', 'Ursine Fortitude', 'Owl Clarity', 'Quick Shift', 'Wolf Pack'];
  const necroPups = ['Increase Horde', 'Skeleton Magi', 'Skeletal Detonation'];
  const synergyPups = ['Marked for Death', 'Quick Burn', 'Fire Armor'];

  if (warriorPups.includes(name)) return 'WARRIOR';
  if (rangerPups.includes(name)) return 'RANGER';
  if (wizardPups.includes(name)) return 'WIZARD';
  if (roguePups.includes(name)) return 'ROGUE';
  if (paladinPups.includes(name)) return 'PALADIN';
  if (druidPups.includes(name)) return 'DRUID';
  if (necroPups.includes(name)) return 'NECROMANCER';
  if (synergyPups.includes(name)) return 'SYNERGY';
  return 'GENERAL';
};

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    WARRIOR: '#3b82f6',
    RANGER: '#10b981',
    WIZARD: '#a855f7',
    ROGUE: '#f43f5e',
    PALADIN: '#eab308',
    DRUID: '#06b6d4',
    NECROMANCER: '#ec4899',
    SYNERGY: '#f97316',
    GENERAL: '#cbd5e1',
  };
  return colorMap[category] || '#fff';
};




export const TownScene: React.FC = () => {
  const {
    roster,
    sharedBag,
    squad,
    temperaments,
    runsCount,
    setHeroTemperament,
    equipItem,
    assignHeroToSlot,
    sellItem,
    gold,
    startRun,
    returnToMainMenu,
    townTutorialStep,
    advanceTownTutorial,
    skipTownTutorial,
  } = useGame();

  const [activeDistrict, setActiveDistrict] = useState<'strategy' | 'blacksmith' | 'shop' | 'roster' | 'none'>('strategy');
  const [selectedSquadSlot, setSelectedSquadSlot] = useState<number | null>(0);
  const [activeHeroId, setActiveHeroId] = useState<string | null>('hero_ranger');
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>('weapon');
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);

  // Compendium states
  const [showLexiconModal, setShowLexiconModal] = useState<boolean>(false);
  const [showHeroCompendiumModal, setShowHeroCompendiumModal] = useState<boolean>(false);
  const [lexiconActiveTab, setLexiconActiveTab] = useState<string>('ALL');
  const [heroCompendiumSelectedClass, setHeroCompendiumSelectedClass] = useState<HeroClass>('RANGER');

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseCoords({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnterItem = (item: Item, e: React.MouseEvent) => {
    setHoveredItem(item);
    setMouseCoords({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeaveItem = () => {
    setHoveredItem(null);
    setMouseCoords(null);
  };

  const warriorUnlocked = roster.find(h => h.character_id === 'hero_warrior')?.unlocked;
  const maxSquadSlots = warriorUnlocked ? Math.max(2, runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3) : (runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3);

  const activeHero = roster.find(h => h.character_id === activeHeroId) || null;
  const equippedItem = (activeHero && selectedSlot && activeHero.equipment) ? activeHero.equipment[selectedSlot] : null;

  // Combined stats calculator
  const getCombinedStats = (heroId: string) => {
    const hero = roster.find(h => h.character_id === heroId);
    if (!hero) return { hp: 0, damage: 0, armor: 0, speed: 1, atkSpeed: 1, magic: 0, atkCdReduction: 0 };

    const classBaseDmg = hero.class === 'WARRIOR' ? 12 : hero.class === 'WIZARD' ? 16 : 9;

    let hp = hero.base_stats.hp;
    let damage = classBaseDmg;
    let armor = 0;
    let speed = 1.0;
    let atkSpeed = 1.0;
    let magic = 0;
    let atkCdReduction = 0;

    if (hero.equipment) {
      for (const key in hero.equipment) {
        const item = hero.equipment[key as EquipmentSlot];
        if (item) {
          if (item.stats.hp) hp += item.stats.hp;
          if (item.stats.damage) damage += item.stats.damage;
          if (item.stats.armor) armor += item.stats.armor;
          if (item.stats.magic) magic += item.stats.magic;
          if (item.stats.atkSpeed) atkSpeed *= item.stats.atkSpeed;
          if (item.stats.speed) speed *= (1 + item.stats.speed / 100);
          if (item.stats.atkCooldownReduction) atkCdReduction += item.stats.atkCooldownReduction;
        }
      }
    }

    if (hero.class === 'WARRIOR') {
      armor = Math.round(armor * 1.20);
    }
    if (hero.class === 'RANGER') {
      let hasHeavy = false;
      for (const key in hero.equipment) {
        const item = hero.equipment[key as EquipmentSlot];
        if (item && item.weight === 'heavy') hasHeavy = true;
      }
      if (!hasHeavy) {
        speed *= 1.15;
        atkSpeed *= 1.15;
      }
    }

    return {
      hp,
      damage,
      armor,
      speed: parseFloat((speed * hero.base_stats.speed_mult).toFixed(2)),
      atkSpeed: parseFloat((atkSpeed * hero.base_stats.atk_speed_mult).toFixed(2)),
      magic,
      atkCdReduction: Math.min(parseFloat((atkCdReduction * 100).toFixed(1)), 40)
    };
  };

  const getAvatarPath = (heroClass: string) => {
    const pathMap: Record<string, string> = {
      RANGER: 'ranger.png',
      WARRIOR: 'warrior_chef.png',
      WIZARD: 'sorceress.png',
      ROGUE: 'rogue.png',
      PALADIN: 'warrior.png',
      DRUID: 'druid.png',
      NECROMANCER: 'wizard.png'
    };
    const path = pathMap[heroClass] || 'ranger.png';
    return import.meta.env.BASE_URL + path;
  };

  const getClassName = (heroClass: string) => {
    if (heroClass === 'WIZARD') return 'SORCERESS';
    return heroClass;
  };

  // Find slot-appropriate items in shared bag + other heroes
  const getSlotFilteredItems = () => {
    if (!selectedSlot) return [];
    
    // 1. From shared bag
    const bagItems = sharedBag.items
      .filter(item => item.type === selectedSlot)
      .map(item => ({ item, owner: null, selectable: true }));

    // 2. From other characters
    const otherEquipped: { item: Item; owner: string; selectable: boolean }[] = [];
    roster.forEach(hero => {
      if (hero.character_id === activeHeroId || !hero.unlocked) return;
      const item = hero.equipment ? hero.equipment[selectedSlot] : null;
      if (item) {
        otherEquipped.push({
          item,
          owner: hero.class,
          selectable: false
        });
      }
    });

    return [...bagItems, ...otherEquipped];
  };

  const slotItems = getSlotFilteredItems();

  const getPowerScore = (item: Item) => {
    if (!item || !item.stats) return 0;
    return (item.stats.hp || 0) * 0.5 + 
           (item.stats.damage || 0) * 1.5 + 
           (item.stats.armor || 0) * 2.0 + 
           (item.stats.critChance || 0) * 2.0 + 
           (item.stats.lifeSteal || 0) * 100.0 + 
           (item.stats.magic || 0) * 1.5;
  };

  const hasUpgradeInBag = (slot: EquipmentSlot) => {
    if (!activeHero) return false;
    const equipped = activeHero.equipment?.[slot] || null;
    
    // Find items in bag for this slot
    const bagItemsForSlot = sharedBag.items.filter(item => item.type === slot);
    if (bagItemsForSlot.length === 0) return false;

    if (!equipped) {
      // If slot is empty and bag has an item, it's an upgrade!
      return true;
    }

    const equippedScore = getPowerScore(equipped);
    return bagItemsForSlot.some(bagItem => getPowerScore(bagItem) > equippedScore);
  };

  const handleEquipItem = (item: Item | null) => {
    if (!activeHeroId || !selectedSlot) return;
    equipItem(activeHeroId, selectedSlot, item);
  };

  const handleSquadSlotClick = (index: number) => {
    const isLocked = index >= maxSquadSlots;
    if (isLocked) return;

    setSelectedSquadSlot(index);
    setActiveDistrict('roster');

    const slotHeroId = squad[index];
    if (slotHeroId) {
      setActiveHeroId(slotHeroId);
    }
  };

  const handleSelectRosterHero = (heroId: string) => {
    if (selectedSquadSlot === null) return;
    assignHeroToSlot(selectedSquadSlot, heroId);
    setActiveHeroId(heroId);
  };

  // Tutorial helpers
  const isTutorialActive = townTutorialStep > 0 && townTutorialStep !== -1;

  const handleShopBuildingClick = () => {
    setActiveDistrict('shop');
    // Gate: when tutorial is on step 2 (shop highlight), clicking the shop advances to step 3
    if (townTutorialStep === 2) {
      advanceTownTutorial(3);
    }
  };

  const handleForgeBuildingClick = () => {
    setActiveDistrict('blacksmith');
    // Gate: when tutorial is on step 4 (forge building highlighted), clicking forge fires step 4 dialogue
    if (townTutorialStep === 4) {
      advanceTownTutorial(4);
    }
  };

  const handleStrategyBuildingClick = () => {
    setActiveDistrict('strategy');
    // Gate: when tutorial is on step 5 (war table highlighted), clicking it fires step 5 dialogue
    if (townTutorialStep === 5) {
      advanceTownTutorial(5);
    }
  };

  return (
    <div className="town-scene-layout">
      {/* 1. Town District Interactive Building Headers */}
      <div className="town-buildings-row">
        {/* Shop Building */}
        <div 
          onClick={handleShopBuildingClick}
          className={`building-card building-purple ${activeDistrict === 'shop' ? 'active' : ''} ${townTutorialStep === 2 ? 'tutorial-highlight' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src={import.meta.env.BASE_URL + "shop_stall.png"} alt="Merchant Bazaar" className="building-img" />
            <div className="building-overlay" />
            <span className="building-title title-purple">Merchant Shop</span>
          </div>
          <div className="building-desc">Buy Elixirs, Scrolls, and Equipment</div>
        </div>

        {/* Blacksmith Forge */}
        <div 
          onClick={handleForgeBuildingClick}
          className={`building-card building-red ${activeDistrict === 'blacksmith' ? 'active' : ''} ${townTutorialStep === 4 ? 'tutorial-highlight' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src={import.meta.env.BASE_URL + "blacksmith_forge.png"} alt="Blacksmith Forge" className="building-img" />
            <div className="building-overlay" />
            <span className="building-title title-red">Blacksmith Forge</span>
          </div>
          <div className="building-desc">Reinforce, Upgrade, and Reroll traits</div>
        </div>

        {/* Strategy Table */}
        <div 
          onClick={handleStrategyBuildingClick}
          className={`building-card building-gold ${activeDistrict === 'strategy' ? 'active' : ''} ${townTutorialStep === 5 ? 'tutorial-highlight' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src={import.meta.env.BASE_URL + "war_table.png"} alt="Strategy Table" className="building-img" />
            <div className="building-overlay" />
            <span className="building-title title-gold">Tactical War Table</span>
          </div>
          <div className="building-desc">Modify team behavior temperaments</div>
        </div>
      </div>

      {/* 2. Interactive Lobby Board */}
      <div className="town-board">
        {/* Left: Contextual Item stats (Green Box) */}
        <div className="stats-panel-green">
          <h3 className="panel-title-green">
            <Award size={14} /> Item Inscription
          </h3>

          {equippedItem ? (
            <div className="item-detail-container">
              <div className="item-detail-header">
                <span className={`item-detail-name ${
                  equippedItem.rarity === 'Legendary' ? 'text-legendary'
                    : equippedItem.rarity === 'Epic' ? 'text-epic'
                    : equippedItem.rarity === 'Rare' ? 'text-rare'
                    : equippedItem.rarity === 'Uncommon' ? 'text-uncommon'
                    : 'text-white'
                }`}>{equippedItem.name}</span>
                <span className="item-detail-rarity-badge">{equippedItem.rarity}</span>

                <div className="item-detail-stats">
                  {equippedItem.stats.hp && <div>+{equippedItem.stats.hp} Health capacity</div>}
                  {equippedItem.stats.damage && <div>+{equippedItem.stats.damage} Flat Damage</div>}
                  {equippedItem.stats.armor && <div>+{equippedItem.stats.armor} Armor Rating</div>}
                  {equippedItem.stats.atkSpeed && <div>+{Math.round((equippedItem.stats.atkSpeed - 1) * 100)}% Attack rate</div>}
                  {equippedItem.stats.speed && <div>+{equippedItem.stats.speed}% Movement Speed</div>}
                  {equippedItem.stats.atkCooldownReduction && <div>+{Math.round(equippedItem.stats.atkCooldownReduction * 100)}% Attack Cooldown Reduction</div>}
                </div>

                {equippedItem.affixes.length > 0 && (
                  <div className="item-detail-affixes">
                    {equippedItem.affixes.map((aff, i) => (
                      <div key={i}>* {aff}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="item-detail-footer">
                <span>Weight: <span className="item-detail-weight-val">{equippedItem.weight}</span></span>
                <button
                  className="item-detail-unequip-btn"
                  onClick={() => {
                    handleEquipItem(null);
                    handleMouseLeaveItem();
                  }}
                >
                  Unequip
                </button>
              </div>
            </div>
          ) : (
            <div className="item-detail-empty">
              <HelpCircle size={28} className="empty-icon" />
              {selectedSlot ? (
                <>
                  <h4 className="empty-title">Empty Slot ({selectedSlot})</h4>
                  <p className="empty-desc">Select an item from the list below to equip.</p>
                </>
              ) : (
                <>
                  <h4 className="empty-title">General stats</h4>
                  {activeHero && (
                    <div className="general-stats-list">
                      <div className="stat-row"><span>Max HP:</span><span className="val-white">{getCombinedStats(activeHeroId!).hp}</span></div>
                      <div className="stat-row"><span>Damage:</span><span className="val-white">+{getCombinedStats(activeHeroId!).damage}</span></div>
                      <div className="stat-row"><span>Armor:</span><span className="val-white">+{getCombinedStats(activeHeroId!).armor}</span></div>
                      <div className="stat-row"><span>Speed:</span><span className="val-white">x{getCombinedStats(activeHeroId!).speed}</span></div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Paperdoll character loadout & Inventory picker */}
        <div className={`paperdoll-column ${townTutorialStep === 1 ? 'tutorial-highlight' : ''}`}>
          <div className="paperdoll-board">
            {/* Faded Background Logo */}
            <div className="paperdoll-bg-logo" />

            {/* Board Title & Expedition Deployment */}
            <div className="paperdoll-board-header-pronounced">
              <h2 className="board-header-title-pronounced">Guildmasters Legacy</h2>
              <div className="board-header-stats-pronounced">
                <span className="gold-badge">
                  <span className="gold-icon-circle">g</span> {gold}
                </span>
                <span className="stats-badge">
                  <span>Crawls:</span> <strong>{runsCount}</strong>
                </span>
                <span className="stats-badge">
                  <span>Squad:</span> <strong className={squad.length > 0 ? 'text-green-active' : ''}>{squad.length}/3</strong>
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={returnToMainMenu}
                  className="exit-btn-pronounced"
                >
                  Save &amp; Exit
                </button>
                <button 
                  disabled={squad.length === 0} 
                  onClick={startRun}
                  className={`deploy-btn-pronounced ${townTutorialStep === 6 ? 'tutorial-highlight' : ''}`}
                >
                  <Sword size={12} className="inline mr-1" /> Deploy Expedition
                </button>
              </div>
            </div>

            {/* Equipment Loadout + Stats Panel */}
            <div className="loadout-and-stats-row">
              {/* Left Side: Title + Slots */}
              <div className="paperdoll-left-side">
                <h3 className="paperdoll-header">
                  Loadout: {activeHero ? getClassName(activeHero.class) : 'Ranger'}
                </h3>

                {/* Symmetric Body Equipment Slots Layout */}
                <div className="paperdoll-columns-container">
                {/* Left Column: Shoulders & Gloves */}
                <div className="paperdoll-side-column">
                  <div 
                    onClick={() => setSelectedSlot('shoulders')}
                    onMouseEnter={(e) => activeHero?.equipment?.shoulders && handleMouseEnterItem(activeHero.equipment.shoulders, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot ${selectedSlot === 'shoulders' ? 'active' : ''} ${hasUpgradeInBag('shoulders') ? 'upgrade-glow' : ''}`}
                  >
                    <ShieldAlert size={20} className={activeHero?.equipment?.shoulders ? 'occupied' : 'empty'} />
                    <span className="slot-label">Shoulders</span>
                    {hasUpgradeInBag('shoulders') && <span className="upgrade-dot" />}
                  </div>

                  <div 
                    onClick={() => setSelectedSlot('gloves')}
                    onMouseEnter={(e) => activeHero?.equipment?.gloves && handleMouseEnterItem(activeHero.equipment.gloves, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot ${selectedSlot === 'gloves' ? 'active' : ''} ${hasUpgradeInBag('gloves') ? 'upgrade-glow' : ''}`}
                  >
                    <ShieldAlert size={20} className={activeHero?.equipment?.gloves ? 'occupied' : 'empty'} />
                    <span className="slot-label">Gloves</span>
                    {hasUpgradeInBag('gloves') && <span className="upgrade-dot" />}
                  </div>
                </div>

                {/* Center Column: Helm, Chest, Pants */}
                <div className="paperdoll-center-column">
                  <div 
                    onClick={() => setSelectedSlot('helm')}
                    onMouseEnter={(e) => activeHero?.equipment?.helm && handleMouseEnterItem(activeHero.equipment.helm, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot helm-slot ${selectedSlot === 'helm' ? 'active' : ''} ${hasUpgradeInBag('helm') ? 'upgrade-glow' : ''}`}
                  >
                    <Crown size={20} className={activeHero?.equipment?.helm ? 'occupied' : 'empty'} />
                    <span className="slot-label">Helm</span>
                    {hasUpgradeInBag('helm') && <span className="upgrade-dot" />}
                  </div>

                  <div 
                    onClick={() => setSelectedSlot('chest')}
                    onMouseEnter={(e) => activeHero?.equipment?.chest && handleMouseEnterItem(activeHero.equipment.chest, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot chest-slot ${selectedSlot === 'chest' ? 'active' : ''} ${hasUpgradeInBag('chest') ? 'upgrade-glow' : ''}`}
                  >
                    <Shield size={22} className={activeHero?.equipment?.chest ? 'occupied' : 'empty'} />
                    <span className="slot-label">Chest</span>
                    {hasUpgradeInBag('chest') && <span className="upgrade-dot" />}
                  </div>

                  <div 
                    onClick={() => setSelectedSlot('pants')}
                    onMouseEnter={(e) => activeHero?.equipment?.pants && handleMouseEnterItem(activeHero.equipment.pants, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot pants-slot ${selectedSlot === 'pants' ? 'active' : ''} ${hasUpgradeInBag('pants') ? 'upgrade-glow' : ''}`}
                  >
                    <ShieldCheck size={20} className={activeHero?.equipment?.pants ? 'occupied' : 'empty'} />
                    <span className="slot-label">Pants</span>
                    {hasUpgradeInBag('pants') && <span className="upgrade-dot" />}
                  </div>
                </div>

                {/* Right Column: Weapon & Boots */}
                <div className="paperdoll-side-column">
                  <div 
                    onClick={() => setSelectedSlot('weapon')}
                    onMouseEnter={(e) => activeHero?.equipment?.weapon && handleMouseEnterItem(activeHero.equipment.weapon, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot ${selectedSlot === 'weapon' ? 'active' : ''} ${hasUpgradeInBag('weapon') ? 'upgrade-glow' : ''}`}
                  >
                    <Sword size={20} className={activeHero?.equipment?.weapon ? 'occupied' : 'empty'} />
                    <span className="slot-label">Weapon</span>
                    {hasUpgradeInBag('weapon') && <span className="upgrade-dot" />}
                  </div>

                  <div 
                    onClick={() => setSelectedSlot('boots')}
                    onMouseEnter={(e) => activeHero?.equipment?.boots && handleMouseEnterItem(activeHero.equipment.boots, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`paperdoll-slot boots-slot ${selectedSlot === 'boots' ? 'active' : ''} ${hasUpgradeInBag('boots') ? 'upgrade-glow' : ''}`}
                  >
                    <Footprints size={20} className={activeHero?.equipment?.boots ? 'occupied' : 'empty'} />
                    <span className="slot-label">Boots</span>
                    {hasUpgradeInBag('boots') && <span className="upgrade-dot" />}
                  </div>
                </div>

              </div>
            </div>

              {/* Hero Stats Panel */}
              {activeHero && (
                <div className="hero-stats-panel">
                  <h4 className="hero-stats-title">Hero Statistics</h4>
                  {(() => {
                    const stats = getCombinedStats(activeHero.character_id);
                    const armorReduction = Math.round((stats.armor / (stats.armor + 100)) * 100);
                    const baseAtkCooldown = activeHero.class === 'RANGER' ? 1.0 : activeHero.class === 'WIZARD' ? 1.8 : 1.2;
                    const atkCooldown = (baseAtkCooldown / stats.atkSpeed).toFixed(2);
                    const dmgPerHit = stats.damage || 0;
                    const classBaseDmg = activeHero.class === 'WARRIOR' ? 12 : activeHero.class === 'WIZARD' ? 16 : 9;

                    return (
                      <div className="hero-stats-list">
                        <div className="hero-stat-row">
                          <span className="hero-stat-label">Max Health</span>
                          <span className="hero-stat-value green">
                            {stats.hp}
                            <span className="stat-base-label">(Base: {activeHero.base_stats.hp})</span>
                          </span>
                        </div>
                        <div className="hero-stat-row">
                          <span className="hero-stat-label">Damage / Hit</span>
                          <span className="hero-stat-value gold">
                            {dmgPerHit}
                            <span className="stat-base-label">(Base: {classBaseDmg})</span>
                          </span>
                        </div>
                        <div className="hero-stat-row has-tooltip">
                          <span className="hero-stat-label">Attack Speed</span>
                          <span className="hero-stat-value gold">
                            {stats.atkSpeed}x
                            <span className="stat-base-label">(Base: {activeHero.base_stats.atk_speed_mult.toFixed(2)}x)</span>
                          </span>
                          <div className="tooltip-box">
                            Attack Cooldown: {atkCooldown}s <span className="tooltip-base-label">(Base: {baseAtkCooldown.toFixed(1)}s)</span>
                          </div>
                        </div>
                        <div className="hero-stat-row has-tooltip">
                          <span className="hero-stat-label">Armor Rating</span>
                          <span className="hero-stat-value blue">{stats.armor}</span>
                          <div className="tooltip-box">
                            Damage Reduction: {armorReduction}%
                          </div>
                        </div>
                        <div className="hero-stat-row">
                          <span className="hero-stat-label">Move Speed</span>
                          <span className="hero-stat-value white">
                            {stats.speed}x
                            <span className="stat-base-label">(Base: {activeHero.base_stats.speed_mult.toFixed(2)}x)</span>
                          </span>
                        </div>
                        {stats.magic > 0 && (
                          <div className="hero-stat-row">
                            <span className="hero-stat-label">Magic Power</span>
                            <span className="hero-stat-value purple">
                              {stats.magic}
                            </span>
                          </div>
                        )}
                        {stats.atkCdReduction > 0 && (
                          <div className="hero-stat-row">
                            <span className="hero-stat-label">Attack CDR</span>
                            <span className="hero-stat-value gold">
                              +{stats.atkCdReduction}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* List panel (Green Box below Paperdoll) */}
          <div className="list-panel-green">
            <h4 className="panel-title-green">
              Available Gear: {selectedSlot || 'None Selected'}
            </h4>

            {selectedSlot ? (
              <div className="scrollable-item-list">
                {slotItems.length === 0 ? (
                  <div className="list-empty-text">No items in bag for this slot.</div>
                ) : (
                  slotItems.map(({ item, owner, selectable }) => {
                    return (
                      <div 
                        key={item.id}
                        onClick={() => selectable && handleEquipItem(item)}
                        onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeaveItem}
                        className={`list-item-card ${selectable ? 'selectable' : 'disabled'}`}
                        style={{ position: 'relative' }}
                      >
                        <div className="item-card-info">
                          <div className={`item-card-name ${
                            item.rarity === 'Legendary' ? 'text-legendary'
                              : item.rarity === 'Epic' ? 'text-epic'
                              : item.rarity === 'Rare' ? 'text-rare'
                              : item.rarity === 'Uncommon' ? 'text-uncommon'
                              : 'text-white'
                          }`}>{item.name}</div>
                          <div className="item-card-sub">{item.rarity} | {item.weight}</div>
                        </div>

                        {owner && (
                          <span className="item-card-owner-badge">Equipped by {owner}</span>
                        )}

                        {selectable && (
                          <button className="item-card-equip-btn">Equip</button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="list-empty-prompt">Click a slot on the body outline above.</div>
            )}
          </div>
        </div>

        {/* Right: Designated Dynamic UI Space (Yellow Box) */}
        <div className="dynamic-ui-space">
          {activeDistrict === 'shop' && <Shop />}
          {activeDistrict === 'blacksmith' && <Blacksmith />}
          
          {/* Strategy table: temperament selector */}
          {activeDistrict === 'strategy' && (
            <div className="strategy-table-panel">
              <h3 className="dynamic-panel-title">War Temperaments</h3>
              <p className="dynamic-panel-desc">Configure squad automated pathfinding rules:</p>
              
              <div className="temperament-list">
                {squad.map((id, index) => {
                  const hero = roster.find(h => h.character_id === id);
                  if (!hero) return null;

                  return (
                    <div key={id} className="temperament-card">
                      <div className="temperament-card-header">Slot #{index+1}: {hero.class}</div>
                      <select 
                        value={temperaments[id] || 'EXPLORATORY'}
                        className="temperament-select"
                        onChange={(e) => setHeroTemperament(id, e.target.value as any)}
                      >
                        <option value="EXPLORATORY">Exploratory (Chests/Cages)</option>
                        <option value="AGGRESSIVE">Aggressive (Attack closest)</option>
                        <option value="DEFENSIVE">Defensive (Keep distance)</option>
                        <option value="PASSIVE">Passive (Avoid threats)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Roster Character Assignment Selector */}
          {activeDistrict === 'roster' && (
            <div className="roster-assign-panel">
              <h3 className="dynamic-panel-title">Assign Slot #{selectedSquadSlot! + 1}</h3>
              <p className="dynamic-panel-desc">Deploy an unlocked hero class to this position:</p>

              <div className="roster-assign-list">
                {roster.map(hero => {
                  const squadIndex = squad.indexOf(hero.character_id);
                  const isAssignedToThisSlot = squadIndex === selectedSquadSlot;
                  
                  return (
                    <div 
                      key={hero.character_id}
                      className={`roster-assign-card ${hero.unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="roster-card-left">
                        <div className="roster-card-avatar-wrapper">
                          <img src={getAvatarPath(hero.class)} alt={hero.class} className="roster-card-avatar" />
                        </div>
                        <div>
                          <div className="roster-card-class">{getClassName(hero.class)}</div>
                          {squadIndex !== -1 ? (
                            <span className="roster-card-assigned-label">Slot #{squadIndex+1}</span>
                          ) : (
                            <span className="roster-card-available-label">Available</span>
                          )}
                        </div>
                      </div>

                      {hero.unlocked ? (
                        <button
                          className={`roster-assign-btn ${isAssignedToThisSlot ? 'remove' : 'assign'}`}
                          onClick={() => {
                            if (isAssignedToThisSlot) {
                              assignHeroToSlot(selectedSquadSlot!, null);
                            } else {
                              handleSelectRosterHero(hero.character_id);
                            }
                          }}
                        >
                          {isAssignedToThisSlot ? 'Remove' : 'Assign'}
                        </button>
                      ) : (
                        <span className="roster-card-locked-label">Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeDistrict === 'none' && (
            <div className="default-kitchen-panel">
              <TownChef />
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Row: Squad Formation + Inventory */}
      <div className="bottom-split-row">
        {/* Left: Gameplay Info / Compendiums */}
        <div className="gameplay-info-panel">
          <h3 className="gameplay-info-panel-title">Gameplay Compendium</h3>
          <div className="gameplay-info-buttons">
            <button 
              className="btn-fantasy-compendium"
              onClick={() => {
                setLexiconActiveTab('ALL');
                setShowLexiconModal(true);
              }}
            >
              <BookOpen size={13} style={{ marginRight: '6px' }} />
              Powerup Lexicon
            </button>
            <button 
              className="btn-fantasy-compendium"
              onClick={() => {
                setHeroCompendiumSelectedClass('RANGER');
                setShowHeroCompendiumModal(true);
              }}
            >
              <Users size={13} style={{ marginRight: '6px' }} />
              Hero Compendium
            </button>
          </div>
        </div>

        {/* Center: Squad Formation */}
        <div className="squad-display-panel">
          <h3 className="squad-display-title">Active Squad Formation</h3>

          <div className="squad-slots-container">
            {/* Ordered 2, 1, 3 in layout view */}
            {[1, 0, 2].map(slotIdx => {
              const squadHeroId = squad[slotIdx];
              const hero = roster.find(h => h.character_id === squadHeroId);
              const isLocked = slotIdx >= maxSquadSlots;
              const isSelected = selectedSquadSlot === slotIdx;

              if (isLocked) {
                return (
                  <div key={slotIdx} className="squad-slot-wrapper locked">
                    <div className="squad-avatar-placeholder">
                      <span className="lock-icon">Locked</span>
                    </div>
                    <button disabled className="squad-num-btn locked">
                      {slotIdx + 1}
                    </button>
                  </div>
                );
              }

              return (
                <div key={slotIdx} className="squad-slot-wrapper">
                  <div className="squad-avatar-relative">
                    {hero ? (
                      <div 
                        onClick={() => handleSquadSlotClick(slotIdx)}
                        className={`squad-avatar-card ${isSelected ? 'active' : ''}`}
                      >
                        <img 
                          src={getAvatarPath(hero.class)} 
                          alt={hero.class} 
                          className="squad-avatar-img" 
                        />
                        <div className="squad-avatar-overlay" />
                        <span className="squad-avatar-label">{getClassName(hero.class)}</span>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleSquadSlotClick(slotIdx)}
                        className={`squad-avatar-empty ${isSelected ? 'active' : ''}`}
                      >
                        <span>Empty Slot</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleSquadSlotClick(slotIdx)}
                    className={`squad-num-btn ${isSelected ? 'active' : ''}`}
                  >
                    {slotIdx + 1}
                  </button>
                </div>
              );
            })}
          </div>

          {isTutorialActive && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button onClick={skipTownTutorial} className="tutorial-skip-btn">
                Skip Tutorial
              </button>
            </div>
          )}
        </div>

        {/* Right: Inventory */}
        <div className="inventory-panel">
          <h3 className="inventory-panel-title">
            Inventory ({sharedBag.items.length}/{sharedBag.max_slots})
          </h3>
          <div className="inventory-items-list">
            {sharedBag.items.length === 0 && (
              <div className="inventory-empty">No items</div>
            )}
            {sharedBag.items.map(item => {
              const rarityColor: Record<string, string> = {
                Legendary: '#ff8000',
                Epic: '#a335ee',
                Rare: '#0070dd',
                Uncommon: '#1eff00',
                Common: '#ffffff',
              };
              const sellPrices: Record<string, number> = {
                Common: 12, Uncommon: 25, Rare: 75, Epic: 200, Legendary: 400,
              };
              return (
                <div
                  key={item.id}
                  className="inventory-item-row"
                  onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                  onMouseLeave={handleMouseLeaveItem}
                >
                  <span className="inventory-item-name" style={{ color: rarityColor[item.rarity] ?? '#fff' }}>
                    {item.name}
                  </span>
                  <span className="inventory-item-type">{item.type}</span>
                  <button
                    className="inventory-sell-btn"
                    onClick={() => sellItem(item.id)}
                  >
                    Sell ({sellPrices[item.rarity] ?? 12}g)
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}

      {/* Powerup Lexicon Modal */}
      {showLexiconModal && (
        <div className="compendium-modal-overlay" onClick={() => setShowLexiconModal(false)}>
          <div className="compendium-modal-card" onClick={e => e.stopPropagation()}>
            <button className="compendium-modal-close-btn" onClick={() => setShowLexiconModal(false)}>✕</button>
            <h2 className="compendium-modal-title">Powerup Lexicon</h2>
            <p className="compendium-modal-subtitle">Overview of all powerups available in the game, categorized by class.</p>
            
            {/* Category Tabs */}
            <div className="compendium-tabs">
              {['ALL', 'WARRIOR', 'RANGER', 'WIZARD', 'ROGUE', 'PALADIN', 'DRUID', 'NECROMANCER', 'GENERAL', 'SYNERGY'].map(tab => (
                <button 
                  key={tab} 
                  className={`compendium-tab-btn ${lexiconActiveTab === tab ? 'active' : ''}`}
                  onClick={() => setLexiconActiveTab(tab)}
                >
                  {tab === 'WIZARD' ? 'SORCERESS' : tab}
                </button>
              ))}
            </div>

            {/* Grid display */}
            <div className="compendium-content-scroll">
              <div className="compendium-grid">
                {Object.entries(POWERUP_DESCRIPTIONS)
                  .filter(([name]) => {
                    if (lexiconActiveTab === 'ALL') return true;
                    return getPowerupCategory(name) === lexiconActiveTab;
                  })
                  .map(([name, desc]) => {
                    const category = getPowerupCategory(name);
                    const classColor = getCategoryColor(category);
                    return (
                      <div key={name} className="powerup-card" style={{ borderLeft: `3px solid ${classColor}` }}>
                        <span className="powerup-card-title" style={{ color: classColor }}>{name}</span>
                        <span className="powerup-card-class-tag">{category === 'WIZARD' ? 'SORCERESS' : category}</span>
                        <span className="powerup-card-desc">{desc}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Compendium Modal */}
      {showHeroCompendiumModal && (
        <div className="compendium-modal-overlay" onClick={() => setShowHeroCompendiumModal(false)}>
          <div className="compendium-modal-card" onClick={e => e.stopPropagation()}>
            <button className="compendium-modal-close-btn" onClick={() => setShowHeroCompendiumModal(false)}>✕</button>
            <h2 className="compendium-modal-title">Hero Compendium</h2>
            <p className="compendium-modal-subtitle">Detailed breakdown of each hero class, their base attributes, and unique passives.</p>

            <div className="hero-compendium-layout">
              {/* Sidebar: Hero List */}
              <div className="hero-compendium-sidebar">
                {COMPENDIUM_HEROES.map(heroDef => {
                  const rHero = roster.find(h => h.class === heroDef.class);
                  const isUnlocked = rHero?.unlocked ?? false;
                  const isActive = heroCompendiumSelectedClass === heroDef.class;
                  return (
                    <div 
                      key={heroDef.class}
                      className={`hero-sidebar-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                      onClick={() => setHeroCompendiumSelectedClass(heroDef.class)}
                    >
                      <img 
                        src={getAvatarPath(heroDef.class)} 
                        alt={heroDef.displayName} 
                        className="hero-sidebar-avatar" 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="hero-sidebar-name">{heroDef.displayName}</span>
                        <span className="hero-sidebar-status">
                          {isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Main Area: Selected Hero Details */}
              {(() => {
                const selectedHeroDef = COMPENDIUM_HEROES.find(h => h.class === heroCompendiumSelectedClass);
                const selectedRosterHero = roster.find(h => h.class === heroCompendiumSelectedClass);
                if (!selectedHeroDef || !selectedRosterHero) return null;

                const isUnlocked = selectedRosterHero.unlocked;

                return (
                  <div className="hero-compendium-details">
                    <div className="hero-details-header">
                      <img 
                        src={getAvatarPath(selectedHeroDef.class)} 
                        alt={selectedHeroDef.displayName} 
                        className="hero-details-avatar" 
                      />
                      <div className="hero-details-title-area">
                        <h3 className="hero-details-class-name">{selectedHeroDef.displayName}</h3>
                        <span className={`hero-details-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`}>
                          {isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#cbd5e0', fontStyle: 'italic', margin: '0' }}>
                      {selectedHeroDef.description}
                    </p>

                    {/* Stats Section */}
                    <div className="hero-details-stats-section">
                      <h4 className="hero-details-section-title">Base Attributes</h4>
                      <div className="hero-stats-grid">
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Max HP</span>
                          <span className="hero-stat-box-value">{selectedRosterHero.base_stats.hp}</span>
                        </div>
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Armor Mult</span>
                          <span className="hero-stat-box-value">{selectedRosterHero.base_stats.armor_mult.toFixed(2)}x</span>
                        </div>
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Speed Mult</span>
                          <span className="hero-stat-box-value">{selectedRosterHero.base_stats.speed_mult.toFixed(2)}x</span>
                        </div>
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Atk Speed Mult</span>
                          <span className="hero-stat-box-value">{selectedRosterHero.base_stats.atk_speed_mult.toFixed(2)}x</span>
                        </div>
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Atk Range</span>
                          <span className="hero-stat-box-value" style={{ fontSize: '0.8rem' }}>{selectedHeroDef.baseAttackRange}</span>
                        </div>
                        <div className="hero-stat-box">
                          <span className="hero-stat-box-title">Base Attack CD</span>
                          <span className="hero-stat-box-value" style={{ fontSize: '0.8rem' }}>{selectedHeroDef.baseAttackCooldown}</span>
                        </div>
                      </div>
                    </div>

                    {/* Passive Section */}
                    <div className="hero-details-passive-section">
                      <h4 className="hero-details-section-title" style={{ color: '#f87171' }}>Passive Ability</h4>
                      <div className="hero-passive-name">{selectedHeroDef.passiveName}</div>
                      <div className="hero-passive-desc">{selectedHeroDef.passiveDesc}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
