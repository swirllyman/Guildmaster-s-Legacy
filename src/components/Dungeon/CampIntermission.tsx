import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import type { EquipmentSlot, Item } from '../../types/game';
import { ItemTooltip } from '../Hub/ItemTooltip';
import { 
  Flame, 
  Compass, 
  Heart, 
  Sword, 
  Shield, 
  Footprints, 
  Crown, 
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

const slotIcons: Record<EquipmentSlot, any> = {
  helm: Crown,
  shoulders: ShieldAlert,
  chest: Shield,
  pants: ShieldCheck,
  boots: Footprints,
  gloves: ShieldAlert,
  weapon: Sword
};

export const CampIntermission: React.FC = () => {
  const {
    activeRun,
    roster,
    squad,
    equipItem,
    campHealAllHeroes,
    campReviveHero,
    advanceChamber
  } = useGame();

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(squad[0] ?? null);
  const [selectedBagItemId, setSelectedBagItemId] = useState<string | null>(null);
  const [showReviveModal, setShowReviveModal] = useState<boolean>(false);
  const [healedHeroes, setHealedHeroes] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [isAutoCampActive, setIsAutoCampActive] = useState<boolean>(() => {
    return localStorage.getItem('autoCampActive') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('autoCampActive', isAutoCampActive ? 'true' : 'false');
  }, [isAutoCampActive]);

  const [autoCampCountdown, setAutoCampCountdown] = useState<number | null>(null);
  const [autoCampAction, setAutoCampAction] = useState<'heal' | 'deploy' | null>(null);

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

  if (!activeRun) return null;

  const selectedHero = roster.find(h => h.character_id === selectedHeroId) || null;
  const selectedBagItem = activeRun.runBag.find(i => i.id === selectedBagItemId) || null;

  const handleHeroClick = (heroId: string) => {
    setSelectedHeroId(selectedHeroId === heroId ? null : heroId);
  };

  const handleEquip = (slot: EquipmentSlot) => {
    if (!selectedHeroId || !selectedBagItemId) return;
    const item = activeRun.runBag.find(i => i.id === selectedBagItemId);
    if (!item || item.type !== slot) return;

    equipItem(selectedHeroId, slot, item);
    activeRun.runBag = activeRun.runBag.filter(i => i.id !== selectedBagItemId);
    setSelectedBagItemId(null);
  };

  const handleHealAll = () => {
    if (healedHeroes.length > 0) return;
    campHealAllHeroes();
    const livingIds = Object.keys(activeRun.livingSquad).filter(
      id => activeRun.livingSquad[id].hp > 0
    );
    setHealedHeroes(livingIds);
  };

  const handleRevive = (heroId: string) => {
    campReviveHero(heroId);
    setShowReviveModal(false);
  };

  // 1. Reset/initialize auto camp countdown if conditions change
  useEffect(() => {
    if (!isAutoCampActive || !activeRun || showReviveModal) {
      setAutoCampCountdown(null);
      setAutoCampAction(null);
      return;
    }

    const targetAction = healedHeroes.length === 0 ? 'heal' : 'deploy';
    
    if (autoCampAction !== targetAction) {
      setAutoCampAction(targetAction);
      setAutoCampCountdown(3);
    }
  }, [isAutoCampActive, activeRun, showReviveModal, healedHeroes, autoCampAction]);

  // 2. Countdown ticking mechanism
  useEffect(() => {
    if (autoCampCountdown === null) return;

    if (autoCampCountdown === 0) {
      if (autoCampAction === 'heal') {
        handleHealAll();
      } else if (autoCampAction === 'deploy') {
        advanceChamber();
      }
      setAutoCampCountdown(null);
      setAutoCampAction(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoCampCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoCampCountdown, autoCampAction]);

  const getSlotIcon = (slot: EquipmentSlot, isOccupied: boolean) => {
    const IconComponent = slotIcons[slot] || Shield;
    return (
      <IconComponent 
        size={16} 
        style={{ color: isOccupied ? 'var(--accent-gold)' : '#2b303c' }} 
      />
    );
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

  return (
    <div className="camp-scene-layout">
      {/* 1. Camp Header */}
      <div className="camp-header-section">
        <div className="camp-header-left">
          <Flame size={22} className="text-amber-500 animate-pulse" />
          <div>
            <h3 className="camp-header-title">Camp Intermission</h3>
            <div className="camp-header-subtitle">Rest, manage equipment, and revive fallen squad members.</div>
          </div>
        </div>

        <div className="dungeon-header-right">
          <span className="gold-badge">
            <span className="gold-icon-circle">g</span> {activeRun.runGold} scavenged
          </span>
          <span className="stats-badge">
            <span>Scrolls:</span> <strong>{activeRun.scrollOfResurrectionCount}</strong>
          </span>
        </div>
      </div>

      {/* 2. Camp Board */}
      <div className="camp-board">
        {/* Left Column: Visual Campfire Scene */}
        <div className="camp-campfire-visual-panel">
          <div className="campfire-scene-canvas">
            {/* Squad row standing around fire */}
            <div className="campfire-squad-row">
              {squad.map(id => {
                const runHero = activeRun.livingSquad[id];
                const hero = roster.find(h => h.character_id === id);
                if (!hero || !runHero) return null;

                const isDead = runHero.hp <= 0;
                const isSelected = selectedHeroId === id;

                return (
                  <div
                    key={id}
                    onClick={() => handleHeroClick(id)}
                    className={`campfire-character-spot ${isDead ? 'deceased' : ''} ${isSelected ? 'active' : ''}`}
                  >
                    {/* Floating HP status */}
                    <div className="character-hp-bubble">
                      <span className="char-name">{hero.class}</span>
                      <span className="char-hp-text">
                        {isDead ? 'DECEASED' : `${runHero.hp}/${runHero.maxHp} HP`}
                      </span>
                      {!isDead && (
                        <div className="char-hp-bar-bg">
                          <div 
                            className="char-hp-bar-fill" 
                            style={{ width: `${(runHero.hp / runHero.maxHp) * 100}%` }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Character Sprite Card */}
                    <div className="character-sprite-card">
                      <img 
                        src={getAvatarPath(hero.class)} 
                        alt={hero.class} 
                        className="character-sprite-img" 
                      />
                      {isDead && (
                        <div className="deceased-overlay">
                          <span>K.O.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={`campfire-fire-pit ${healedHeroes.length > 0 ? 'fire-used' : ''}`}
              onClick={handleHealAll}
              style={{ cursor: healedHeroes.length > 0 ? 'default' : 'pointer' }}
            >
              <div className="fire-pit-glow" />
              <img src={import.meta.env.BASE_URL + "campfire.png"} alt="Campfire" className="campfire-image-sprite animate-pulse" />
              {healedHeroes.length > 0 ? (
                <div className="campfire-rested-label">Rested</div>
              ) : (
                <div className="campfire-instruction-label animate-pulse">Click Fire to Heal Party</div>
              )}
            </div>

            {/* Deploy/Embark button */}
            <div className="campfire-deploy-wrapper">
              <label className={`auto-camp-toggle-container ${isAutoCampActive ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  className="auto-camp-checkbox"
                  checked={isAutoCampActive}
                  onChange={(e) => setIsAutoCampActive(e.target.checked)}
                />
                <span>
                  Auto-Heal & Deploy
                  {autoCampCountdown !== null && (
                    <span className="text-amber-400/80 text-[10px] ml-1 font-mono">
                      ({autoCampAction === 'heal' ? 'Healing' : 'Deploying'} in {autoCampCountdown}s...)
                    </span>
                  )}
                </span>
              </label>

              <button className="deploy-btn-pronounced wide-deploy" onClick={advanceChamber}>
                Deploy Squad <Compass size={14} className="inline ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Camp Interactive Sheets */}
        <div className="camp-control-panel">
          {selectedHero ? (
            <div className="camp-control-content">
              {/* Selected Hero details */}
              <div className="camp-hero-details-sheet">
                <div className="camp-sheet-header">
                  <h4 className="camp-sheet-title">Hero: {selectedHero.class}</h4>
                  {activeRun.livingSquad[selectedHero.character_id]?.hp <= 0 && (
                    <button 
                      className="camp-revive-btn"
                      onClick={() => setShowReviveModal(true)}
                    >
                      Revive<br />Ally
                    </button>
                  )}
                </div>

                {/* Equipment Loadout slots */}
                <div className="camp-slots-container">
                  <span className="camp-slots-title">Equipment Slots</span>
                  <div className="camp-slots-row">
                    {Object.keys(selectedHero.equipment).map(slotName => {
                      const slot = slotName as EquipmentSlot;
                      const item = selectedHero.equipment[slot];
                      const isCorrectSlot = selectedBagItem && selectedBagItem.type === slot;

                      return (
                        <div
                          key={slot}
                          onClick={() => {
                            if (isCorrectSlot) handleEquip(slot);
                          }}
                          onMouseEnter={(e) => {
                            if (item) handleMouseEnterItem(item, e);
                          }}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeaveItem}
                          className={`camp-slot-card ${item ? 'occupied' : 'empty'} ${isCorrectSlot ? 'highlight-equip' : ''}`}
                        >
                          {getSlotIcon(slot, !!item)}
                          <span className="camp-slot-label">{slot}</span>
                          {isCorrectSlot && <span className="equip-prompt-badge">Equip</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scavenged Loot bag */}
              <div className="camp-loot-sheet">
                <h4 className="panel-title-yellow" style={{ borderBottom: '1px solid rgba(234, 179, 8, 0.25)', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                  Scavenged Loot Bag
                </h4>
                <div className="camp-loot-list-scroll">
                  {activeRun.runBag.length === 0 ? (
                    <div className="loot-empty-text">No scavenged loot in bag.</div>
                  ) : (
                    activeRun.runBag.map(item => {
                      const isSelected = selectedBagItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedBagItemId(isSelected ? null : item.id)}
                          onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeaveItem}
                          className={`camp-loot-card border-rarity-${item.rarity.toLowerCase()} ${isSelected ? 'active' : ''}`}
                        >
                          <div className="camp-loot-header">
                            <span className={`camp-loot-name ${
                              item.rarity === 'Legendary' ? 'text-legendary'
                                : item.rarity === 'Epic' ? 'text-epic'
                                : item.rarity === 'Rare' ? 'text-rare'
                                : item.rarity === 'Uncommon' ? 'text-uncommon'
                                : 'text-white'
                            }`}>{item.name}</span>
                            <span className="camp-loot-slot">{item.type}</span>
                          </div>
                          <div className="camp-loot-stats">
                            {item.stats.hp && <span>+{item.stats.hp} HP </span>}
                            {item.stats.damage && <span>+{item.stats.damage} Atk </span>}
                            {item.stats.armor && <span>+{item.stats.armor} Arm </span>}
                          </div>
                          {isSelected && (
                            <div className="camp-equip-indicator">
                              {selectedHero && selectedHero.equipment[item.type as EquipmentSlot]
                                ? `Click the glowing [${item.type}] slot above to swap`
                                : `Click the glowing [${item.type}] slot above to equip`}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="camp-campfire-empty">
              <Flame size={36} className="empty-icon text-amber-500/30 animate-pulse" />
              <h4 className="empty-title">Campfire Idle</h4>
              <p className="empty-desc">Select a squad member standing around the campfire to heal them or edit their gear.</p>
            </div>
          )}
        </div>
      </div>

      {/* Revive Confirm Modal */}
      {showReviveModal && selectedHero && (
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <Heart size={36} className="text-green-500 mb-2 animate-bounce" />
            <h4 className="menu-modal-title">Revive Fallen Ally?</h4>
            <p className="menu-modal-desc">
              Reviving <strong>{selectedHero.class}</strong> will consume <strong>1 Resurrection Scroll</strong>.<br />
              Do you wish to proceed?
            </p>
            <p className="menu-modal-desc" style={{ marginTop: '-12px' }}>
              Scrolls remaining: {activeRun.scrollOfResurrectionCount}
            </p>
            <div className="menu-modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowReviveModal(false)}>
                Cancel
              </button>
              <button
                className="modal-confirm-health-btn"
                disabled={activeRun.scrollOfResurrectionCount <= 0}
                onClick={() => handleRevive(selectedHero.character_id)}
              >
                Revive
              </button>
            </div>
          </div>
        </div>
      )}
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}
    </div>
  );
};
export default CampIntermission;
