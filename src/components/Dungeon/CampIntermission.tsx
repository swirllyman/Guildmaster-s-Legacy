import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { EquipmentSlot } from '../../types/game';
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
    campHealHero,
    campReviveHero,
    advanceChamber
  } = useGame();

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [selectedBagItemId, setSelectedBagItemId] = useState<string | null>(null);
  const [showReviveModal, setShowReviveModal] = useState<boolean>(false);
  const [healedHeroes, setHealedHeroes] = useState<string[]>([]);

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

  const handleHeal = (heroId: string) => {
    if (healedHeroes.includes(heroId)) return;
    campHealHero(heroId);
    setHealedHeroes([...healedHeroes, heroId]);
  };

  const handleRevive = (heroId: string) => {
    campReviveHero(heroId);
    setShowReviveModal(false);
  };

  const getSlotIcon = (slot: EquipmentSlot, isOccupied: boolean) => {
    const IconComponent = slotIcons[slot] || Shield;
    return <IconComponent size={16} className={isOccupied ? 'text-amber-500' : 'text-gray-600'} />;
  };

  const getAvatarPath = (heroClass: string) => {
    const pathMap: Record<string, string> = {
      RANGER: '/ranger.png',
      WARRIOR: '/warrior_chef.png',
      WIZARD: '/sorceress.png',
      ROGUE: '/ranger.png',
      PALADIN: '/warrior.png',
      DRUID: '/ranger.png',
      NECROMANCER: '/wizard.png'
    };
    return pathMap[heroClass] || '/ranger.png';
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

            <div className="campfire-fire-pit">
              <div className="fire-pit-glow" />
              <img src="/campfire.png" alt="Campfire" className="campfire-image-sprite animate-pulse" />
            </div>

            {/* Deploy/Embark button */}
            <div className="campfire-deploy-wrapper">
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
                      Revive Ally
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
                          className={`camp-slot-card ${item ? 'occupied' : 'empty'} ${isCorrectSlot ? 'highlight-equip' : ''}`}
                          title={item ? `${item.name} (${item.rarity})` : `Empty ${slot} slot`}
                        >
                          {getSlotIcon(slot, !!item)}
                          <span className="camp-slot-label">{slot}</span>
                          {isCorrectSlot && <span className="equip-prompt-badge">Equip</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Healing at campfire */}
                <div className="camp-campfire-actions">
                  {activeRun.livingSquad[selectedHero.character_id]?.hp > 0 ? (
                    <div className="camp-rest-action-card">
                      <p className="camp-rest-desc">Resting by the fire restores +30 HP to this hero.</p>
                      <button
                        disabled={healedHeroes.includes(selectedHero.character_id)}
                        className="camp-action-button"
                        onClick={() => handleHeal(selectedHero.character_id)}
                      >
                        {healedHeroes.includes(selectedHero.character_id) ? 'Rested & Recovered' : 'Rest at Campfire (Free)'}
                      </button>
                    </div>
                  ) : (
                    <div className="camp-rest-action-card deceased">
                      <p className="camp-rest-desc" style={{ color: '#f87171' }}>This ally is deceased. Use a resurrection scroll to revive them.</p>
                    </div>
                  )}
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

      {/* Revive Confirm Overlay */}
      {showReviveModal && selectedHero && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 border-red-500 flex flex-col gap-4 text-center">
            <Heart size={36} className="text-red-500 animate-bounce mx-auto" />
            <h3 className="text-xl font-fantasy text-red-500 m-0">Revive Fallen Ally</h3>
            <p className="text-xs text-gray-400">
              Reviving **{selectedHero.class}** will consume **1 Resurrection Scroll**. Do you wish to proceed?
            </p>
            <div className="text-[10px] text-gray-500">
              Scrolls remaining: {activeRun.scrollOfResurrectionCount}
            </div>

            <div className="flex gap-4 mt-2 justify-center">
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded text-xs font-fantasy"
                onClick={() => setShowReviveModal(false)}
              >
                Cancel
              </button>
              <button
                disabled={activeRun.scrollOfResurrectionCount <= 0}
                className="px-4 py-2 bg-red-600 text-white rounded text-xs font-fantasy font-bold disabled:opacity-40"
                onClick={() => handleRevive(selectedHero.character_id)}
              >
                Revive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CampIntermission;
