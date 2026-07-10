import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { LEGENDARY_TEMPLATES } from '../../context/GameContext';
import { Shop } from './Shop';
import { Blacksmith } from './Blacksmith';

import type { EquipmentSlot, Item, HeroClass } from '../../types/game';
import { POWERUP_DESCRIPTIONS } from '../../types/game';
import { Sword, Shield, Crown, Footprints, ShieldAlert, Award, ShieldCheck, HelpCircle, BookOpen, Users, ShoppingBag, Sparkles } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';
import { useIsMobile } from '../../hooks/useIsMobile';

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
    baseAttackCooldown: '1.4s',
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

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'squad' | 'hero' | 'buildings' | 'lexicon'>('squad');
  const [activeDistrict, setActiveDistrict] = useState<'strategy' | 'blacksmith' | 'shop' | 'roster' | 'none' | 'chef'>(
    window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'none' : 'strategy'
  );
  const [selectedSquadSlot, setSelectedSquadSlot] = useState<number | null>(0);
  const [activeHeroId, setActiveHeroId] = useState<string | null>('hero_ranger');
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>('weapon');
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedForgeItem, setSelectedForgeItem] = useState<Item | null>(null);

  // Compendium states
  const [showLexiconModal, setShowLexiconModal] = useState<boolean>(false);
  const [showHeroCompendiumModal, setShowHeroCompendiumModal] = useState<boolean>(false);
  const [showItemLexiconModal, setShowItemLexiconModal] = useState<boolean>(false);
  const [lexiconActiveTab, setLexiconActiveTab] = useState<string>('ALL');
  const [heroCompendiumSelectedClass, setHeroCompendiumSelectedClass] = useState<HeroClass>('RANGER');
  const [itemLexiconTab, setItemLexiconTab] = useState<string>('ARMOR');

  React.useEffect(() => {
    if (isMobile) {
      setActiveDistrict('none');
    } else {
      setActiveDistrict('strategy');
    }
  }, [isMobile]);

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
  const wizardUnlocked = roster.find(h => h.character_id === 'hero_wizard')?.unlocked;
  const maxSquadSlots = (warriorUnlocked && wizardUnlocked) ? 3 : (warriorUnlocked ? Math.max(2, runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3) : (runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3));
  const availableHeroCount = roster.filter(h => h.unlocked && !squad.includes(h.character_id)).length;

  const activeHero = roster.find(h => h.character_id === activeHeroId) || null;
  const equippedItem = (activeHero && selectedSlot && activeHero.equipment) ? activeHero.equipment[selectedSlot] : null;
  const equippedForTooltip = (activeHero && hoveredItem && hoveredItem.type !== 'consumable')
    ? activeHero.equipment[hoveredItem.type as EquipmentSlot]
    : null;

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
    const isLocked = index >= maxSquadSlots || (!squad[index] && availableHeroCount === 0);
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

  if (isMobile) {
    return (
      <div className="town-scene-layout mobile-town-layout">
        {/* Mobile Header */}
        <div className="mobile-town-header">
          <div className="mobile-header-left">
            <h2 className="mobile-town-title">Guildmasters Legacy</h2>
            <div className="mobile-header-badges">
              <span className="gold-badge">
                <span className="gold-icon-circle">g</span> {gold}
              </span>
              <span className="stats-badge">
                <span>Crawls:</span> <strong>{runsCount}</strong>
              </span>
            </div>
          </div>
          <button onClick={returnToMainMenu} className="exit-btn-pronounced-mobile">
            Exit
          </button>
        </div>

        {/* Mobile Viewport / Content */}
        <div className="mobile-town-content">
          {mobileTab === 'squad' && (
            <div className="mobile-tab-content squad-tab">
              {activeDistrict === 'roster' ? (
                <div className="mobile-roster-assignment">
                  <div className="mobile-roster-header">
                    <h3>Assign Slot #{selectedSquadSlot! + 1}</h3>
                    <button className="mobile-sub-back-btn" onClick={() => setActiveDistrict('none')}>
                      ← Back to Squad
                    </button>
                  </div>
                  {/* Roster Assignment List */}
                  <div className="mobile-roster-list">
                    {[...roster].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map(hero => {
                      const squadIndex = squad.indexOf(hero.character_id);
                      const isAssignedToThisSlot = squadIndex === selectedSquadSlot;
                      return (
                        <div key={hero.character_id} className={`roster-assign-card ${hero.unlocked ? 'unlocked' : 'locked'}`}>
                          <div className="roster-card-left">
                            <div className="roster-card-avatar-wrapper">
                              <img src={getAvatarPath(hero.class)} className="roster-card-avatar" />
                            </div>
                            <div>
                              <div className="roster-card-class">{getClassName(hero.class)}</div>
                              <span className="text-xs text-gray-400">
                                {squadIndex !== -1 ? `Slot #${squadIndex+1}` : 'Available'}
                              </span>
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
                                setActiveDistrict('none');
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
              ) : (
                <div className="mobile-squad-main">
                  <div className="squad-display-panel">
                    <h3 className="squad-display-title">Active Squad Formation</h3>
                    <div className="squad-slots-container">
                      {[0, 1, 2].map(slotIdx => {
                        const squadHeroId = squad[slotIdx];
                        const hero = roster.find(h => h.character_id === squadHeroId);
                        const isLocked = slotIdx >= maxSquadSlots || (!squad[slotIdx] && availableHeroCount === 0);
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
                          <div key={slotIdx} className="squad-slot-wrapper" onClick={() => handleSquadSlotClick(slotIdx)}>
                            <div className="squad-avatar-relative">
                              {hero ? (
                                <div className={`squad-avatar-card ${isSelected ? 'active' : ''}`}>
                                  <img src={getAvatarPath(hero.class)} alt={hero.class} className="squad-avatar-img" />
                                  <div className="squad-avatar-overlay" />
                                  <span className="squad-avatar-label">{getClassName(hero.class)}</span>
                                </div>
                              ) : (
                                <div className={`squad-avatar-empty ${isSelected ? 'active' : ''}`}>
                                  <span>Empty Slot</span>
                                </div>
                              )}
                              {warriorUnlocked && !hero && (
                                <div className="new-slot-indicator">
                                  <Sparkles size={14} className="text-amber-400" />
                                </div>
                              )}
                            </div>
                            <button className={`squad-num-btn ${isSelected ? 'active' : ''}`}>
                              {slotIdx + 1}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mobile-deploy-container">
                    <button 
                      disabled={squad.length === 0} 
                      onClick={startRun}
                      className="deploy-btn-pronounced mobile-wide-deploy"
                    >
                      <Sword size={16} className="inline mr-1" /> Deploy Expedition
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'hero' && (
            <div className="mobile-tab-content hero-tab">
              {/* Squad Hero selector tab-row */}
              <div className="mobile-hero-selector">
                {squad.map(heroId => {
                  const hero = roster.find(h => h.character_id === heroId);
                  if (!hero) return null;
                  const isActive = activeHeroId === heroId;
                  return (
                    <button 
                      key={heroId} 
                      onClick={() => setActiveHeroId(heroId)}
                      className={`mobile-hero-select-btn ${isActive ? 'active' : ''}`}
                    >
                      <img src={getAvatarPath(hero.class)} className="hero-btn-avatar" />
                      <span>{getClassName(hero.class)}</span>
                    </button>
                  );
                })}
                {squad.length === 0 && (
                  <div className="text-gray-500 text-center text-xs py-2 w-full">No squad members assigned.</div>
                )}
              </div>

              {activeHero && (
                <div className="mobile-hero-management">
                  <div className="mobile-gear-row">
                    {/* Paperdoll */}
                    <div className="mobile-paperdoll-section">
                      <div className="paperdoll-columns-container">
                        <div className="paperdoll-side-column">
                          <div 
                            onClick={() => setSelectedSlot('shoulders')}
                            className={`paperdoll-slot ${selectedSlot === 'shoulders' ? 'active' : ''} ${hasUpgradeInBag('shoulders') ? 'upgrade-glow' : ''}`}
                          >
                            <ShieldAlert size={20} className={activeHero?.equipment?.shoulders ? 'occupied' : 'empty'} />
                            <span className="slot-label">Shoulders</span>
                          </div>
                          <div 
                            onClick={() => setSelectedSlot('gloves')}
                            className={`paperdoll-slot ${selectedSlot === 'gloves' ? 'active' : ''} ${hasUpgradeInBag('gloves') ? 'upgrade-glow' : ''}`}
                          >
                            <ShieldAlert size={20} className={activeHero?.equipment?.gloves ? 'occupied' : 'empty'} />
                            <span className="slot-label">Gloves</span>
                          </div>
                        </div>

                        <div className="paperdoll-center-column">
                          <div 
                            onClick={() => setSelectedSlot('helm')}
                            className={`paperdoll-slot helm-slot ${selectedSlot === 'helm' ? 'active' : ''} ${hasUpgradeInBag('helm') ? 'upgrade-glow' : ''}`}
                          >
                            <Crown size={20} className={activeHero?.equipment?.helm ? 'occupied' : 'empty'} />
                            <span className="slot-label">Helm</span>
                          </div>
                          <div 
                            onClick={() => setSelectedSlot('chest')}
                            className={`paperdoll-slot chest-slot ${selectedSlot === 'chest' ? 'active' : ''} ${hasUpgradeInBag('chest') ? 'upgrade-glow' : ''}`}
                          >
                            <Shield size={22} className={activeHero?.equipment?.chest ? 'occupied' : 'empty'} />
                            <span className="slot-label">Chest</span>
                          </div>
                          <div 
                            onClick={() => setSelectedSlot('pants')}
                            className={`paperdoll-slot pants-slot ${selectedSlot === 'pants' ? 'active' : ''} ${hasUpgradeInBag('pants') ? 'upgrade-glow' : ''}`}
                          >
                            <ShieldCheck size={20} className={activeHero?.equipment?.pants ? 'occupied' : 'empty'} />
                            <span className="slot-label">Pants</span>
                          </div>
                        </div>

                        <div className="paperdoll-side-column">
                          <div 
                            onClick={() => setSelectedSlot('weapon')}
                            className={`paperdoll-slot ${selectedSlot === 'weapon' ? 'active' : ''} ${hasUpgradeInBag('weapon') ? 'upgrade-glow' : ''}`}
                          >
                            <Sword size={20} className={activeHero?.equipment?.weapon ? 'occupied' : 'empty'} />
                            <span className="slot-label">Weapon</span>
                          </div>
                          <div 
                            onClick={() => setSelectedSlot('boots')}
                            className={`paperdoll-slot boots-slot ${selectedSlot === 'boots' ? 'active' : ''} ${hasUpgradeInBag('boots') ? 'upgrade-glow' : ''}`}
                          >
                            <Footprints size={20} className={activeHero?.equipment?.boots ? 'occupied' : 'empty'} />
                            <span className="slot-label">Boots</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Slot Stats Panel */}
                    <div className="mobile-slot-stats-panel">
                      {selectedSlot ? (
                        <>
                          {equippedItem ? (
                            <>
                              <div className="mobile-stat-header">
                                <span style={{ color: { Legendary: '#ff8000', Epic: '#a335ee', Rare: '#0070dd', Uncommon: '#1eff00', Common: '#ffffff' }[equippedItem.rarity] ?? '#fff' }}>
                                  {equippedItem.name}
                                </span>
                                <span className="mobile-stat-rarity">{equippedItem.rarity}</span>
                              </div>
                              <div className="mobile-stat-divider" />
                              {equippedItem.stats.hp && <div className="mobile-stat-row"><span>HP</span><span style={{ color: '#4ade80' }}>+{equippedItem.stats.hp}</span></div>}
                              {equippedItem.stats.damage && <div className="mobile-stat-row"><span>ATK</span><span style={{ color: '#fbbf24' }}>+{equippedItem.stats.damage}</span></div>}
                              {equippedItem.stats.armor && <div className="mobile-stat-row"><span>ARM</span><span style={{ color: '#60a5fa' }}>+{equippedItem.stats.armor}</span></div>}
                              {equippedItem.stats.atkSpeed && <div className="mobile-stat-row"><span>Rate</span><span style={{ color: '#fbbf24' }}>{(() => { const v = Math.round((equippedItem.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}%</span></div>}
                              {equippedItem.stats.speed && <div className="mobile-stat-row"><span>SPD</span><span style={{ color: '#4ade80' }}>+{equippedItem.stats.speed}%</span></div>}
                              {equippedItem.stats.magic && <div className="mobile-stat-row"><span>Magic</span><span style={{ color: '#f87171' }}>+{equippedItem.stats.magic}</span></div>}
                              {equippedItem.stats.atkCooldownReduction && <div className="mobile-stat-row"><span>CDR</span><span style={{ color: '#fbbf24' }}>{Math.round(equippedItem.stats.atkCooldownReduction * 100)}%</span></div>}
                              {equippedItem.stats.critChance && <div className="mobile-stat-row"><span>Crit</span><span style={{ color: '#c084fc' }}>+{equippedItem.stats.critChance}%</span></div>}
                              {equippedItem.stats.lifeSteal && <div className="mobile-stat-row"><span>Life Steal</span><span style={{ color: '#c084fc' }}>+{Math.round(equippedItem.stats.lifeSteal * 100)}%</span></div>}
                              {equippedItem.stats.chainChance && <div className="mobile-stat-row"><span>Chain</span><span style={{ color: '#c084fc' }}>{Math.round(equippedItem.stats.chainChance * 100)}%</span></div>}
                              <div className="mobile-stat-divider" />
                              <div className="mobile-stat-weight">
                                Weight: <strong>{equippedItem.weight === 'none' ? 'None' : equippedItem.weight === 'heavy' ? 'Heavy' : 'Light'}</strong>
                              </div>
                              <div className="mobile-stat-divider" />
                              <button className="item-detail-unequip-btn" onClick={() => handleEquipItem(null)}>
                                Unequip
                              </button>
                            </>
                          ) : (
                            <div className="mobile-stat-empty">Empty slot</div>
                          )}
                        </>
                      ) : (
                        <div className="mobile-stat-empty">Select a slot</div>
                      )}
                    </div>
                  </div>

                  {/* Gear List + Inventory side by side */}
                  <div className="mobile-panels-row">
                    {/* Available Slot Gear list */}
                    <div className="mobile-gear-selection">
                      {selectedSlot ? (
                        <div className="mobile-slot-config">
                          <div className="list-panel-green">
                            <h4 className="panel-title-green">Available {selectedSlot} Gear</h4>
                            <div className="scrollable-item-list">
                              {slotItems.length === 0 ? (
                                <div className="list-empty-text">No items in bag for this slot.</div>
                              ) : (
                                slotItems.map(({ item, owner, selectable }) => (
                                  <div key={item.id} onClick={() => selectable && handleEquipItem(item)}
                                    onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeaveItem}
                                    className="gear-list-item">
                                    <span className="gear-item-name" style={{ color: { Legendary: '#ff8000', Epic: '#a335ee', Rare: '#0070dd', Uncommon: '#1eff00', Common: '#ffffff' }[item.rarity] ?? '#fff' }}>{item.name}</span>
                                    {owner && <span className="gear-item-owner">{owner}</span>}
                                    {selectable && <button className="gear-item-equip-btn">Equip</button>}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mobile-hero-general-stats stats-panel-green">
                          <h4 className="panel-title-green">Hero Statistics</h4>
                          {(() => {
                            const stats = getCombinedStats(activeHero.character_id);
                            return (
                              <div className="general-stats-list">
                                <div className="stat-row"><span>Max HP:</span><span className="val-white">{stats.hp}</span></div>
                                <div className="stat-row"><span>Damage:</span><span className="val-white">+{stats.damage}</span></div>
                                <div className="stat-row"><span>Armor:</span><span className="val-white">+{stats.armor}</span></div>
                                <div className="stat-row"><span>Speed:</span><span className="val-white">x{stats.speed}</span></div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Inventory Section */}
                    <div className="mobile-inventory-section inventory-panel">
                      <h3 className="inventory-panel-title">
                        Shared Inventory ({sharedBag.items.length}/{sharedBag.max_slots})
                      </h3>
                      <div className="inventory-items-list">
                        {sharedBag.items.length === 0 && <div className="inventory-empty">No items</div>}
                        {sharedBag.items.map(item => {
                          const rarityColor: Record<string, string> = {
                            Legendary: '#ff8000', Epic: '#a335ee', Rare: '#0070dd', Uncommon: '#1eff00', Common: '#ffffff'
                          };
                          const sellPrices: Record<string, number> = {
                            Common: 12, Uncommon: 25, Rare: 75, Epic: 200, Legendary: 400
                          };
                          return (
                            <div key={item.id} className="inventory-item-row"
                              onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                              onMouseMove={handleMouseMove}
                              onMouseLeave={handleMouseLeaveItem}>
                              <span className="inventory-item-name" style={{ color: rarityColor[item.rarity] ?? '#fff' }}>{item.name}</span>
                              <span className="inventory-item-type">{item.type}</span>
                              <button 
                                className="inventory-sell-btn" 
                                onClick={() => sellItem(item.id)}
                                onMouseEnter={(e) => { e.stopPropagation(); setHoveredItem(null); }}
                                onMouseLeave={(e) => { e.stopPropagation(); setHoveredItem(item); }}
                              >
                                Sell ({sellPrices[item.rarity] ?? 12}g)
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'buildings' && (
            <div className="mobile-tab-content buildings-tab">
              {activeDistrict === 'none' ? (
                <div className="mobile-buildings-list">
                  {/* Shop Card */}
                  <div onClick={() => setActiveDistrict('shop')} className="building-card building-purple">
                    <div className="building-stripe" />
                    <div className="building-image-container">
                      <img src={import.meta.env.BASE_URL + "shop_stall.png"} alt="Merchant Bazaar" className="building-img" />
                      <div className="building-overlay" />
                      <span className="building-title title-purple">Merchant Shop</span>
                    </div>
                    <div className="building-mobile-desc">Buy Elixirs, Scrolls, and Equipment</div>
                  </div>
                  
                  {/* Blacksmith Card */}
                  <div onClick={() => setActiveDistrict('blacksmith')} className="building-card building-red">
                    <div className="building-stripe" />
                    <div className="building-image-container">
                      <img src={import.meta.env.BASE_URL + "blacksmith_forge.png"} alt="Blacksmith Forge" className="building-img" />
                      <div className="building-overlay" />
                      <span className="building-title title-red">Blacksmith Forge</span>
                    </div>
                    <div className="building-mobile-desc">Reinforce, Upgrade, and Reroll traits</div>
                  </div>

                  {/* Strategy Card */}
                  <div onClick={() => setActiveDistrict('strategy')} className="building-card building-gold">
                    <div className="building-stripe" />
                    <div className="building-image-container">
                      <img src={import.meta.env.BASE_URL + "war_table.png"} alt="Strategy Table" className="building-img" />
                      <div className="building-overlay" />
                      <span className="building-title title-gold">Tactical War Table</span>
                    </div>
                    <div className="building-mobile-desc">Modify team behavior temperaments</div>
                  </div>

                </div>
              ) : (
                <div className="mobile-active-building-container">
                  <div className="mobile-building-nav-header">
                    <button onClick={() => setActiveDistrict('none')} className="mobile-building-back-btn">
                      ← Leave Building
                    </button>
                  </div>
                  <div className="mobile-building-content-pane">
                    {activeDistrict === 'shop' && <Shop activeHeroId={activeHeroId} />}
                    {activeDistrict === 'blacksmith' && <Blacksmith onSelectedItemChange={setSelectedForgeItem} />}
                    {activeDistrict === 'strategy' && (
                      <div className="strategy-table-panel">
                        <h3 className="dynamic-panel-title">War Temperaments</h3>
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

                  </div>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'lexicon' && (
            <div className="mobile-tab-content lexicon-tab">
              <div className="flex flex-col gap-3 justify-center max-w-xs mx-auto py-8">
                <button 
                  onClick={() => setShowLexiconModal(true)}
                  className="btn-fantasy-compendium text-center justify-center py-3"
                >
                  <BookOpen size={16} style={{ marginRight: '6px' }} /> Powerup Lexicon
                </button>
                <button 
                  onClick={() => setShowHeroCompendiumModal(true)}
                  className="btn-fantasy-compendium text-center justify-center py-3"
                >
                  <Users size={16} style={{ marginRight: '6px' }} /> Hero Compendium
                </button>
                <button 
                  onClick={() => { setItemLexiconTab('ARMOR'); setShowItemLexiconModal(true); }}
                  className="btn-fantasy-compendium text-center justify-center py-3"
                >
                  <Shield size={16} style={{ marginRight: '6px' }} /> Item Lexicon
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="mobile-town-nav-bar">
          <button 
            onClick={() => { setMobileTab('squad'); setActiveDistrict('none'); }} 
            className={`mobile-nav-btn ${mobileTab === 'squad' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Squad</span>
          </button>
          <button 
            onClick={() => { setMobileTab('hero'); setActiveDistrict('none'); }} 
            className={`mobile-nav-btn ${mobileTab === 'hero' ? 'active' : ''}`}
          >
            <Sword size={18} />
            <span>Gear</span>
          </button>
          <button 
            onClick={() => { setMobileTab('buildings'); setActiveDistrict('none'); }} 
            className={`mobile-nav-btn ${mobileTab === 'buildings' ? 'active' : ''}`}
          >
            <ShoppingBag size={18} />
            <span>Town</span>
          </button>
          <button 
            onClick={() => { setMobileTab('lexicon'); setActiveDistrict('none'); }} 
            className={`mobile-nav-btn ${mobileTab === 'lexicon' ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Guides</span>
          </button>
        </div>
        {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} portraitOffset compareWithItem={equippedForTooltip} />}

        {/* Lexicon Modal (Mobile) */}
        {showLexiconModal && (
          <div className="compendium-modal-overlay" onClick={() => setShowLexiconModal(false)}>
            <div className="compendium-modal-card" onClick={e => e.stopPropagation()}>
              <button className="compendium-modal-close-btn" onClick={() => setShowLexiconModal(false)}>✕</button>
              <h2 className="compendium-modal-title">Powerup Lexicon</h2>
              <p className="compendium-modal-subtitle">Overview of all powerups available in the game, categorized by class.</p>
              <div className="compendium-tabs">
                {['ALL', 'WARRIOR', 'RANGER', 'WIZARD', 'ROGUE', 'PALADIN', 'DRUID', 'NECROMANCER', 'GENERAL', 'SYNERGY'].map(tab => (
                  <button key={tab} className={`compendium-tab-btn ${lexiconActiveTab === tab ? 'active' : ''}`}
                    onClick={() => setLexiconActiveTab(tab)}>
                    {tab === 'WIZARD' ? 'SORCERESS' : tab}
                  </button>
                ))}
              </div>
              <div className="compendium-content-scroll">
                <div className="compendium-grid">
                  {Object.entries(POWERUP_DESCRIPTIONS)
                    .filter(([name]) => lexiconActiveTab === 'ALL' || getPowerupCategory(name) === lexiconActiveTab)
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
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Compendium Modal (Mobile) */}
        {showHeroCompendiumModal && (
          <div className="compendium-modal-overlay" onClick={() => setShowHeroCompendiumModal(false)}>
            <div className="compendium-modal-card" onClick={e => e.stopPropagation()}>
              <button className="compendium-modal-close-btn" onClick={() => setShowHeroCompendiumModal(false)}>✕</button>
              <h2 className="compendium-modal-title">Hero Compendium</h2>
              <p className="compendium-modal-subtitle">Detailed breakdown of each hero class, their base attributes, and unique passives.</p>
              <div className="hero-compendium-layout">
                <div className="hero-compendium-sidebar">
                  {COMPENDIUM_HEROES.map(heroDef => {
                    const rHero = roster.find(h => h.class === heroDef.class);
                    const isUnlocked = rHero?.unlocked ?? false;
                    const isActive = heroCompendiumSelectedClass === heroDef.class;
                    return (
                      <div key={heroDef.class} className={`hero-sidebar-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        onClick={() => setHeroCompendiumSelectedClass(heroDef.class)}>
                        <img src={getAvatarPath(heroDef.class)} alt={heroDef.displayName} className="hero-sidebar-avatar" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="hero-sidebar-name">{heroDef.displayName}</span>
                          <span className="hero-sidebar-status">{isUnlocked ? 'Unlocked' : 'Locked'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const selectedHeroDef = COMPENDIUM_HEROES.find(h => h.class === heroCompendiumSelectedClass);
                  const selectedRosterHero = roster.find(h => h.class === heroCompendiumSelectedClass);
                  if (!selectedHeroDef || !selectedRosterHero) return null;
                  const isUnlocked = selectedRosterHero.unlocked;
                  return (
                    <div className="hero-compendium-details">
                      <div className="hero-details-header">
                        <img src={getAvatarPath(selectedHeroDef.class)} alt={selectedHeroDef.displayName} className="hero-details-avatar" />
                        <div className="hero-details-title-area">
                          <h3 className="hero-details-class-name">{selectedHeroDef.displayName}</h3>
                          <span className={`hero-details-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`}>
                            {isUnlocked ? 'Unlocked' : 'Locked'}
                          </span>
                        </div>
                      </div>
                      <p className="hero-details-description">
                        {selectedHeroDef.description}
                      </p>
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
  }

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

          {(activeDistrict === 'blacksmith' && selectedForgeItem) ? (
            <div className="item-detail-container">
              <div className="item-detail-header">
                <span className={`item-detail-name ${
                  selectedForgeItem.rarity === 'Legendary' ? 'text-legendary'
                    : selectedForgeItem.rarity === 'Epic' ? 'text-epic'
                    : selectedForgeItem.rarity === 'Rare' ? 'text-rare'
                    : selectedForgeItem.rarity === 'Uncommon' ? 'text-uncommon'
                    : 'text-white'
                }`}>{selectedForgeItem.name}</span>
                <span className="item-detail-rarity-badge">{selectedForgeItem.rarity}</span>

                <div className="item-detail-stats">
                  {selectedForgeItem.stats.hp && <div>+{selectedForgeItem.stats.hp} Health capacity</div>}
                  {selectedForgeItem.stats.damage && <div>+{selectedForgeItem.stats.damage} Flat Damage</div>}
                  {selectedForgeItem.stats.armor && <div>+{selectedForgeItem.stats.armor} Armor Rating</div>}
                  {selectedForgeItem.stats.atkSpeed && <div>{(() => { const v = Math.round((selectedForgeItem.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}% Attack rate</div>}
                  {selectedForgeItem.stats.speed && <div>+{selectedForgeItem.stats.speed}% Movement Speed</div>}
                  {selectedForgeItem.stats.atkCooldownReduction && <div>+{Math.round(selectedForgeItem.stats.atkCooldownReduction * 100)}% Attack Cooldown Reduction</div>}
                </div>

                {selectedForgeItem.affixes.length > 0 && (
                  <div className="item-detail-affixes">
                    {selectedForgeItem.affixes.map((aff, i) => (
                      <div key={i}>* {aff}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="item-detail-footer">
                <span>Weight: <span className="item-detail-weight-val">{selectedForgeItem.weight}</span></span>
              </div>
            </div>
          ) : equippedItem ? (
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
                  {equippedItem.stats.atkSpeed && <div>{(() => { const v = Math.round((equippedItem.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}% Attack rate</div>}
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
                <div className="paperdoll-header-row">
                  {activeHero && (
                    <img
                      src={getAvatarPath(activeHero.class)}
                      alt={getClassName(activeHero.class)}
                      className="paperdoll-hero-sprite"
                    />
                  )}
                  <h3 className="paperdoll-header">
                    {activeHero ? getClassName(activeHero.class) : 'Ranger'}
                  </h3>
                </div>

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
                    const baseAtkCooldown = activeHero.class === 'RANGER' ? 1.0 : activeHero.class === 'WIZARD' ? 1.4 : 1.2;
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
          {activeDistrict === 'shop' && <Shop activeHeroId={activeHeroId} />}
          {activeDistrict === 'blacksmith' && <Blacksmith onSelectedItemChange={setSelectedForgeItem} />}
          
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
                {[...roster].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map(hero => {
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
              <div className="tavern-panel">
                <div className="tavern-header" style={{ borderBottom: '1px solid rgba(234, 179, 8, 0.25)', paddingBottom: '6px' }}>
                  <h2 className="tavern-title">✦ Barracks Quarters ✦</h2>
                </div>
                <div className="tavern-dialogue-bubble" style={{ marginTop: '12px' }}>
                  <p className="text-xs text-neutral-400">
                    All hero classes are unlocked automatically and ready for battle. Manage squad slots, customize gear, or purchase stock from the shop to prepare.
                  </p>
                </div>
              </div>
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
            <button 
              className="btn-fantasy-compendium"
              onClick={() => {
                setItemLexiconTab('ARMOR');
                setShowItemLexiconModal(true);
              }}
            >
              <Shield size={13} style={{ marginRight: '6px' }} />
              Item Lexicon
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
              const isLocked = slotIdx >= maxSquadSlots || (!squad[slotIdx] && availableHeroCount === 0);
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
                    {warriorUnlocked && !hero && (
                      <div className="new-slot-indicator">
                        <Sparkles size={14} className="text-amber-400" />
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
                    onMouseEnter={(e) => { e.stopPropagation(); setHoveredItem(null); }}
                    onMouseLeave={(e) => { e.stopPropagation(); setHoveredItem(item); }}
                  >
                    Sell ({sellPrices[item.rarity] ?? 12}g)
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} compareWithItem={equippedForTooltip} />}

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

                    <p className="hero-details-description">
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

      {/* Item Lexicon Modal */}
      {showItemLexiconModal && (
        <div className="compendium-modal-overlay" onClick={() => setShowItemLexiconModal(false)}>
          <div className="compendium-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <button className="compendium-modal-close-btn" onClick={() => setShowItemLexiconModal(false)}>✕</button>
            <h2 className="compendium-modal-title">Item Lexicon</h2>
            <p className="compendium-modal-subtitle">A guide to all equipment, weight classes, biome-specific names, and rarity tiers.</p>

            {/* Tabs */}
            <div className="compendium-tabs">
              {['ARMOR', 'WEIGHT', 'BIOME NAMES', 'RARITY', 'LEGENDARIES'].map(tab => (
                <button 
                  key={tab}
                  className={`compendium-tab-btn ${itemLexiconTab === tab ? 'active' : ''}`}
                  onClick={() => setItemLexiconTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="compendium-content-scroll">
              {/* ARMOR TAB */}
              {itemLexiconTab === 'ARMOR' && (
                <div className="compendium-grid">
                  {([
                    { slot: 'helm', icon: <Crown size={18} />, name: 'Head', desc: 'Protects the head. Helmets provide armor and HP.' },
                    { slot: 'shoulders', icon: <ShieldAlert size={18} />, name: 'Shoulders', desc: 'Shoulder guards. Contribute armor and HP.' },
                    { slot: 'chest', icon: <Shield size={18} />, name: 'Chest', desc: 'Body armor. The largest single source of armor and HP.' },
                    { slot: 'pants', icon: <ShieldCheck size={18} />, name: 'Legs', desc: 'Leg protection. Contribute armor and HP.' },
                    { slot: 'boots', icon: <Footprints size={18} />, name: 'Boots', desc: 'Footwear. Affects movement speed based on weight.' },
                    { slot: 'gloves', icon: <ShieldAlert size={18} />, name: 'Gloves', desc: 'Hand protection. Contribute armor and HP.' },
                    { slot: 'weapon', icon: <Sword size={18} />, name: 'Weapon', desc: 'Determines attack damage and attack speed. Not affected by weight class.' },
                  ] as const).map(item => (
                    <div key={item.slot} className="powerup-card" style={{ borderLeft: '3px solid #60a5fa' }}>
                      <span className="powerup-card-title" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.icon} {item.name}
                      </span>
                      <span className="powerup-card-desc">{item.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* WEIGHT TAB */}
              {itemLexiconTab === 'WEIGHT' && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Light Armor */}
                    <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '8px', padding: '14px' }}>
                      <h4 style={{ color: '#4ade80', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Light Armor</h4>
                      <ul style={{ color: '#ccc', fontSize: '0.82rem', lineHeight: '1.7', margin: 0, paddingLeft: '16px' }}>
                        <li><strong style={{ color: '#4ade80' }}>+3% Movement Speed</strong> per piece</li>
                        <li><strong style={{ color: '#4ade80' }}>+3% Attack Speed</strong> per piece</li>
                        <li>Low Armor value (0.25x base)</li>
                        <li>Low HP value (0.5x base)</li>
                      </ul>
                      <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '8px', marginBottom: 0 }}>
                        Full set (6 pieces): +18% Move Speed, +18% Attack Speed. Best for Rangers and fast attackers.
                      </p>
                    </div>
                    {/* Heavy Armor */}
                    <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '8px', padding: '14px' }}>
                      <h4 style={{ color: '#f87171', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Heavy Armor</h4>
                      <ul style={{ color: '#ccc', fontSize: '0.82rem', lineHeight: '1.7', margin: 0, paddingLeft: '16px' }}>
                        <li><strong style={{ color: '#f87171' }}>-3% Movement Speed</strong> per piece</li>
                        <li><strong style={{ color: '#f87171' }}>-3% Attack Speed</strong> per piece</li>
                        <li>High Armor value (1.5x base)</li>
                        <li>High HP value (1.5x base)</li>
                      </ul>
                      <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '8px', marginBottom: 0 }}>
                        Full set (6 pieces): -18% Move Speed, -18% Attack Speed. Best for Warriors and tanks.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 14px' }}>
                    <p style={{ color: '#aaa', fontSize: '0.8rem', margin: 0, lineHeight: '1.6' }}>
                      <strong style={{ color: '#facc15' }}>Ranger Bonus:</strong> If a Ranger wears NO heavy armor pieces, they gain an additional +15% Movement Speed and +15% Attack Speed.
                      <br />
                      <strong style={{ color: '#60a5fa' }}>Warrior Bonus:</strong> Warriors receive a 1.2x multiplier to all armor values from equipped items.
                    </p>
                  </div>
                </div>
              )}

              {/* BIOME NAMES TAB */}
              {itemLexiconTab === 'BIOME NAMES' && (
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0 0 12px 0' }}>
                    Each biome has unique item names. The name you see tells you which biome the item came from.
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', color: '#facc15', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Slot</th>
                          <th style={{ textAlign: 'center', color: '#4ade80', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Biome 1 (Light / Heavy)</th>
                          <th style={{ textAlign: 'center', color: '#4ade80', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Biome 2</th>
                          <th style={{ textAlign: 'center', color: '#4ade80', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Biome 3</th>
                          <th style={{ textAlign: 'center', color: '#4ade80', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Biome 4</th>
                          <th style={{ textAlign: 'center', color: '#4ade80', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>Biome 5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { slot: 'Helm',      l: ['Coif', 'Hood', 'Cap', 'Visor', 'Veil'],             h: ['Casque', 'Helm', 'Crown', 'Basinet', 'Great Helm'] },
                          { slot: 'Shoulders', l: ['Shawl', 'Mantle', 'Wrap', 'Epaulets', 'Cape'],     h: ['Pauldrons', 'Rerebrace', 'Spaulders', 'Vambraces', 'Mail Shoulders'] },
                          { slot: 'Chest',     l: ['Vest', 'Tunic', 'Jerkin', 'Doublet', 'Raiment'],    h: ['Cuirass', 'Hauberk', 'Breastplate', 'Mail', 'Plate'] },
                          { slot: 'Legs',      l: ['Breeches', 'Leggings', 'Trousers', 'Hose', 'Chausses'], h: ['Cuisses', 'Greaves', 'Leg Guards', 'Faulds', 'Tassets'] },
                          { slot: 'Boots',     l: ['Sandals', 'Slippers', 'Turnshoes', 'Sneakers', 'Crocks'], h: ['Ironshods', 'Sabatons', 'Greaves', 'Treads', 'Stompers'] },
                          { slot: 'Gloves',    l: ['Gloves', 'Wraps', 'Bracers', 'Handwraps', 'Mitts'], h: ['Gauntlets', 'Rerebraces', 'Plate Fists', 'Warfists', 'Fists'] },
                        ] as const).map(row => (
                          <tr key={row.slot}>
                            <td style={{ color: '#ddd', padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>{row.slot}</td>
                            {row.l.map((lightName, i) => (
                              <td key={i} style={{ textAlign: 'center', padding: '5px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <span style={{ color: '#4ade80' }}>{lightName}</span>
                                <span style={{ color: '#666' }}> / </span>
                                <span style={{ color: '#f87171' }}>{row.h[i]}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RARITY TAB */}
              {itemLexiconTab === 'RARITY' && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {([
                    { name: 'Common', color: '#ffffff', chance: 'Varies by biome', desc: 'No suffix. Basic stats only.', suffix: 'None' },
                    { name: 'Uncommon', color: '#1eff00', chance: '~30% (Biome 1)', desc: 'One bonus affix. Examples: of Vitality, of Defiance, of Haste, of Striking.', suffix: 'of Vitality, of Defiance, of Haste, of Striking' },
                    { name: 'Rare', color: '#0070dd', chance: '~15% (Biome 1)', desc: 'Stronger affixes with multiple stat bonuses.', suffix: 'of Vampirism, of Fortune, of Cleansing, of Focus' },
                    { name: 'Epic', color: '#a335ee', chance: '~5% (Biome 1)', desc: 'Powerful affixes with unique combat effects.', suffix: 'of Chain Lightning, of Frozen Ice, of Burning Embers' },
                    { name: 'Legendary', color: '#ff8000', chance: '0.2% (Biome 1) up to 1.8% (Biome 5)', desc: 'Unique named items with special combat procs. 40 total legendaries.', suffix: 'Unique name + affix' },
                  ] as const).map(r => (
                    <div key={r.name} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.color}33`, borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: r.color, fontWeight: 700, fontSize: '0.9rem' }}>{r.name}</span>
                        <span style={{ color: '#888', fontSize: '0.72rem' }}>{r.chance}</span>
                      </div>
                      <p style={{ color: '#bbb', fontSize: '0.78rem', margin: 0, lineHeight: '1.5' }}>{r.desc}</p>
                      <p style={{ color: '#777', fontSize: '0.72rem', margin: '4px 0 0 0' }}>Suffixes: {r.suffix}</p>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px', marginTop: '4px' }}>
                    <p style={{ color: '#aaa', fontSize: '0.78rem', margin: 0, lineHeight: '1.6' }}>
                      <strong style={{ color: '#facc15' }}>Pity System:</strong> Each non-Legendary drop increases your Legendary chance. The bonus resets when a Legendary drops.
                      <br />
                      <strong style={{ color: '#facc15' }}>Upgrade:</strong> Items can be upgraded at the Blacksmith for +1 Armor, +3 Damage, and +8 HP per level.
                    </p>
                  </div>
                </div>
              )}

              {/* LEGENDARIES TAB */}
              {itemLexiconTab === 'LEGENDARIES' && (() => {
                // Collect all owned legendary names from roster equipment + shared bag
                const ownedNames = new Set<string>();
                roster.forEach(hero => {
                  if (hero.equipment) {
                    Object.values(hero.equipment).forEach(item => {
                      if (item && item.rarity === 'Legendary') ownedNames.add(item.name);
                    });
                  }
                });
                sharedBag.items.forEach(item => {
                  if (item.rarity === 'Legendary') ownedNames.add(item.name);
                });

                const slotIcon = (type: string) => {
                  switch (type) {
                    case 'helm': return <Crown size={14} />;
                    case 'shoulders': return <ShieldAlert size={14} />;
                    case 'chest': return <Shield size={14} />;
                    case 'pants': return <ShieldCheck size={14} />;
                    case 'boots': return <Footprints size={14} />;
                    case 'gloves': return <ShieldAlert size={14} />;
                    case 'weapon': return <Sword size={14} />;
                    default: return <Award size={14} />;
                  }
                };

                const slotLabel = (type: string) => {
                  switch (type) {
                    case 'helm': return 'Head';
                    case 'shoulders': return 'Shoulders';
                    case 'chest': return 'Chest';
                    case 'pants': return 'Legs';
                    case 'boots': return 'Boots';
                    case 'gloves': return 'Gloves';
                    case 'weapon': return 'Weapon';
                    default: return type;
                  }
                };

                return (
                  <div style={{ padding: '4px 0' }}>
                    <p style={{ color: '#aaa', fontSize: '0.78rem', margin: '0 0 10px 12px' }}>
                      {ownedNames.size} / {LEGENDARY_TEMPLATES.length} Legendaries Acquired
                    </p>
                    <div className="compendium-grid">
                      {LEGENDARY_TEMPLATES.map(template => {
                        const isOwned = ownedNames.has(template.name);
                        // Build a dummy Item for tooltip
                        const tooltipItem: Item = {
                          id: `lexicon_${template.name}`,
                          name: template.name,
                          type: template.type,
                          rarity: 'Legendary',
                          stats: { ...template.stats },
                          weight: template.weight,
                          affixes: [...template.affixes],
                        };
                        return (
                          <div
                            key={template.name}
                            className="powerup-card"
                            style={{
                              borderLeft: `3px solid ${isOwned ? '#ff8000' : '#555'}`,
                              opacity: isOwned ? 1 : 0.6,
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                              setMouseCoords({ x: e.clientX, y: e.clientY });
                              setHoveredItem(tooltipItem);
                            }}
                            onMouseMove={(e) => {
                              setMouseCoords({ x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="powerup-card-title" style={{ color: '#ff8000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {slotIcon(template.type)} {template.name}
                              </span>
                              {isOwned && (
                                <span style={{ color: '#ff8000', fontSize: '1rem' }} title="Acquired">&#10003;</span>
                              )}
                            </div>
                            <span className="powerup-card-class-tag" style={{ color: '#aaa' }}>
                              {slotLabel(template.type)} &middot; {template.weight === 'none' ? 'None' : template.weight === 'heavy' ? 'Heavy' : 'Light'}
                            </span>
                            <span className="powerup-card-desc" style={{ fontStyle: 'italic', color: '#c084fc' }}>
                              {template.affixes[0]}
                            </span>
                          </div>
                        );
                      })}
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
