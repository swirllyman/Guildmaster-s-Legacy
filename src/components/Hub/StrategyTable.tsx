import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { Hero, EquipmentSlot, Item, TemperamentType } from '../../types/game';
import { Sword, Shield, Crown, Footprints, ShieldAlert, Sparkles, AlertCircle, Plus, X, Award, ShieldCheck } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

const slotIcons: Record<EquipmentSlot, any> = {
  helm: Crown,
  shoulders: ShieldAlert,
  chest: Shield,
  pants: ShieldCheck,
  boots: Footprints,
  gloves: ShieldAlert,
  weapon: Sword
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
  if (heroClass === 'WARRIOR') return 'Warrior Chef';
  return heroClass.charAt(0) + heroClass.slice(1).toLowerCase();
};


export const StrategyTable: React.FC = () => {
  const {
    roster,
    sharedBag,
    squad,
    temperaments,
    runsCount,
    addToSquad,
    removeFromSquad,
    setHeroTemperament,
    equipItem
  } = useGame();

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>('hero_ranger');
  const [selectedBagItem, setSelectedBagItem] = useState<Item | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);

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

  const selectedHero = roster.find(h => h.character_id === selectedHeroId) || null;
  const warriorUnlocked = roster.find(h => h.character_id === 'hero_warrior')?.unlocked;
  const maxSquadSlots = warriorUnlocked ? Math.max(2, runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3) : (runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3);
  const availableHeroCount = roster.filter(h => h.unlocked && !squad.includes(h.character_id)).length;

  // Calculate stats including equipment
  const getCombinedStats = (hero: Hero) => {
    const classBaseDmg =
      hero.class === 'WARRIOR' ? 12 :
      hero.class === 'WIZARD' ? 16 :
      hero.class === 'PALADIN' ? 11 :
      hero.class === 'NECROMANCER' ? 10 :
      hero.class === 'DRUID' ? 10 :
      9;

    let hp = hero.base_stats.hp;
    let damage = classBaseDmg;
    let armor = 0;
    let speed = 1.0;
    let atkSpeed = 1.0;
    let magic = 0;
    let atkCdReduction = 0;

    // Equip modifications
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

    // Class Multipliers
    if (hero.class === 'WARRIOR') {
      armor = Math.round(armor * 1.20);
    }
    if (hero.class === 'RANGER') {
      // Light gear speed bonus
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

  const handleSlotClick = (heroId: string) => {
    setSelectedHeroId(heroId);
  };

  const handleEquip = (slot: EquipmentSlot) => {
    if (!selectedHeroId) return;
    if (selectedBagItem) {
      // Check if type matches
      if (selectedBagItem.type !== slot) return;
      equipItem(selectedHeroId, slot, selectedBagItem);
      setSelectedBagItem(null);
    } else {
      // Unequip
      equipItem(selectedHeroId, slot, null);
    }
  };

  const handleBagItemClick = (item: Item) => {
    if (item.type === 'consumable') return;
    setSelectedBagItem(selectedBagItem?.id === item.id ? null : item);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Squad List / Slots Configuration */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <h2 className="text-2xl mb-4 flex items-center gap-2">
          <Shield className="text-red-500" /> Deployment Squad
        </h2>
        <div className="text-sm text-gray-400 mb-2">
          Squad slots unlock with run count: {runsCount}/5 runs attempted. Max slots: {maxSquadSlots}.
        </div>

        <div className="flex flex-col gap-4">
          {[0, 1, 2].map(index => {
            const squadHeroId = squad[index];
            const hero = roster.find(h => h.character_id === squadHeroId);
            const isLocked = index >= maxSquadSlots || (!squad[index] && availableHeroCount === 0);

            if (isLocked) {
              return (
                <div key={index} className="border border-dashed border-gray-800 rounded-lg p-4 flex items-center justify-between opacity-50 bg-black/35">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center">
                      <AlertCircle className="text-gray-500" />
                    </div>
                    <div>
                      <div className="font-fantasy text-gray-500">Locked Slot</div>
                      <div className="text-xs text-gray-600">Unlocks on Run {index === 1 ? '4' : '10'}</div>
                    </div>
                  </div>
                </div>
              );
            }

            if (!hero) {
              return (
                <div key={index} className="relative border border-dashed border-gray-700 rounded-lg p-4 flex items-center justify-between bg-black/20 hover:border-gray-500 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center border border-gray-700">
                      <Plus className="text-gray-500" />
                    </div>
                    <div>
                      <div className="font-fantasy text-gray-400">Empty Squad Slot</div>
                      <div className="text-xs text-gray-500">Assign a hero from the Roster</div>
                    </div>
                  </div>
                  {warriorUnlocked && (
                    <div className="new-slot-indicator">
                      <Sparkles size={14} className="text-amber-400" />
                    </div>
                  )}
                </div>
              );
            }

            const stats = getCombinedStats(hero);
            const isLeader = index === 0;

            return (
              <div 
                key={index} 
                className={`border rounded-lg p-4 flex flex-col gap-3 transition cursor-pointer ${
                  selectedHeroId === hero.character_id ? 'border-amber-500 bg-amber-950/10' : 'border-gray-800 bg-black/40'
                }`}
                onClick={() => handleSlotClick(hero.character_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                        isLeader ? 'border-amber-400' : 'border-gray-600'
                      } bg-gray-900`}>
                        <img src={getAvatarPath(hero.class)} alt={hero.class} className="w-full h-full object-cover" />
                      </div>
                      {isLeader && (
                        <div className="absolute -top-1 -left-1 bg-amber-500 text-black text-[9px] font-bold px-1 rounded uppercase">
                          Ldr
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-fantasy text-white">{getClassName(hero.class)}</div>
                      <div className="text-xs text-amber-500 flex items-center gap-1">
                        HP: {stats.hp} | Atk: {stats.damage} | Arm: {stats.armor}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="p-1 text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromSquad(hero.character_id);
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-black/35 p-2 rounded text-xs">
                  <span className="text-gray-400 font-fantasy">Temperament:</span>
                  <select 
                    value={temperaments[hero.character_id] || 'EXPLORATORY'}
                    className="bg-gray-900 text-amber-400 border border-gray-800 rounded p-1 font-fantasy focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setHeroTemperament(hero.character_id, e.target.value as TemperamentType)}
                  >
                    <option value="EXPLORATORY">Exploratory (Find cages/chests)</option>
                    <option value="AGGRESSIVE">Aggressive (Hunt nearest enemy)</option>
                    <option value="DEFENSIVE">Defensive (Maintain distance)</option>
                    <option value="PASSIVE">Passive (Avoid fights)</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Available Roster */}
        <h3 className="text-lg mt-6 mb-2 font-fantasy">Barracks Roster</h3>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {[...roster].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map(hero => {
            const inSquad = squad.includes(hero.character_id);
            if (inSquad) return null;

            return (
              <div 
                key={hero.character_id}
                className={`border p-3 rounded-lg flex items-center justify-between transition ${
                  hero.unlocked 
                    ? 'border-gray-800 bg-black/25 hover:border-gray-600' 
                    : 'border-gray-900 opacity-40 bg-black/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-900 border border-gray-700">
                    <img src={getAvatarPath(hero.class)} alt={getClassName(hero.class)} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-fantasy text-sm">{getClassName(hero.class)}</div>
                    <div className="text-xs text-gray-500">
                      {hero.unlocked ? 'Available' : 'Locked'}
                    </div>
                  </div>
                </div>

                {hero.unlocked ? (
                  <button 
                    disabled={squad.length >= maxSquadSlots}
                    className="p-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded text-xs font-fantasy border border-amber-500/35 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => addToSquad(hero.character_id)}
                  >
                    Deploy
                  </button>
                ) : (
                  <span className="text-xs text-red-500 font-fantasy">Quest Required</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment Configuration Panel */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <h2 className="text-2xl mb-4 flex items-center gap-2">
          <Award className="text-amber-500" /> Character Equipment
        </h2>

        {selectedHero ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-900 border-2 border-amber-500">
                <img src={getAvatarPath(selectedHero.class)} alt={getClassName(selectedHero.class)} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-fantasy text-white m-0">{getClassName(selectedHero.class)}</h3>
                <div className="text-xs text-gray-400">Class Traits & Gear Upgrades</div>
              </div>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(selectedHero.equipment) as EquipmentSlot[]).map(slot => {
                const item = selectedHero.equipment[slot];
                const Icon = slotIcons[slot];
                
                const isSelectedForEquip = selectedBagItem && selectedBagItem.type === slot;



                  return (
                    <div 
                      key={slot}
                      onMouseEnter={(e) => item && handleMouseEnterItem(item, e)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeaveItem}
                      className={`border p-3 rounded-lg flex flex-col gap-2 transition relative ${
                        item 
                          ? item.rarity === 'Legendary' ? 'border-amber-500 bg-amber-950/10'
                            : item.rarity === 'Epic' ? 'border-purple-500 bg-purple-950/10'
                            : item.rarity === 'Rare' ? 'border-blue-500 bg-blue-950/10'
                            : item.rarity === 'Uncommon' ? 'border-green-500 bg-green-950/10'
                            : 'border-gray-700 bg-gray-950/30'
                          : isSelectedForEquip ? 'border-dashed border-amber-400 bg-amber-500/5 animate-pulse'
                          : 'border-gray-800 bg-black/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                          <Icon size={12} className="text-gray-400" /> {slot}
                        </span>
                        {item && (
                          <button 
                            className="text-gray-500 hover:text-red-500 text-[10px] font-fantasy"
                            onClick={() => equipItem(selectedHeroId!, slot, null)}
                          >
                            Unequip
                          </button>
                        )}
                      </div>

                      {item ? (
                        <div className="flex flex-col">
                          <div className={`font-fantasy text-sm ${
                            item.rarity === 'Legendary' ? 'text-legendary'
                              : item.rarity === 'Epic' ? 'text-epic'
                              : item.rarity === 'Rare' ? 'text-rare'
                              : item.rarity === 'Uncommon' ? 'text-uncommon'
                              : 'text-white'
                          }`}>{item.name}</div>
                          
                          <div className="text-[10px] text-gray-400 mt-1">
                            {item.stats.hp && <div>+{item.stats.hp} Health</div>}
                            {item.stats.damage && <div>+{item.stats.damage} Damage</div>}
                            {item.stats.armor && <div>+{item.stats.armor} Armor</div>}
                            {item.stats.atkSpeed && <div>{(() => { const v = Math.round((item.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}% Attack Speed</div>}
                            {item.stats.speed && <div>+{item.stats.speed}% Move Speed</div>}
                            {item.stats.atkCooldownReduction && <div>+{Math.round(item.stats.atkCooldownReduction * 100)}% Attack CDR</div>}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`text-xs text-gray-600 italic py-2 cursor-pointer ${
                            isSelectedForEquip ? 'text-amber-400 font-bold' : ''
                          }`}
                          onClick={() => isSelectedForEquip && handleEquip(slot)}
                        >
                          {isSelectedForEquip ? 'Click to Equip Selected' : 'Empty Slot'}
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>

            {/* Calculated Stats Vector */}
            <div className="border border-gray-800 rounded-lg p-4 bg-black/30">
              <h4 className="text-sm font-fantasy mb-3 border-b border-gray-800 pb-1 text-gray-400">Total Combat Stats</h4>
              {(() => {
                const stats = getCombinedStats(selectedHero);
                const classBaseDmg = selectedHero.class === 'WARRIOR' ? 12 : selectedHero.class === 'WIZARD' ? 16 : 9;
                return (
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max HP:</span>
                      <span className="text-white font-bold">
                        {stats.hp}
                        <span className="stat-base-label">(Base: {selectedHero.base_stats.hp})</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Damage:</span>
                      <span className="text-white font-bold">
                        {stats.damage}
                        <span className="stat-base-label">(Base: {classBaseDmg})</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Armor Rating:</span>
                      <span className="text-white font-bold">+{stats.armor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Move Speed:</span>
                      <span className="text-white font-bold">
                        x{stats.speed}
                        <span className="stat-base-label">(Base: {selectedHero.base_stats.speed_mult.toFixed(2)}x)</span>
                      </span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-500">Attack Speed:</span>
                      <span className="text-white font-bold">
                        x{stats.atkSpeed}
                        <span className="stat-base-label">(Base: {selectedHero.base_stats.atk_speed_mult.toFixed(2)}x)</span>
                      </span>
                    </div>
                    {stats.atkCdReduction > 0 && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-500">Attack CDR:</span>
                        <span className="text-white font-bold">+{stats.atkCdReduction}%</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-20 italic">
            Select a squad member on the left to review their equipment and stats.
          </div>
        )}
      </div>

      {/* Shared Inventory Bag */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl flex items-center gap-2 m-0">
            <Sparkles className="text-amber-500" /> Shared Bag
          </h2>
          <span className="text-xs text-gray-500 font-fantasy">
            {sharedBag.items.length} / {sharedBag.max_slots} Slots
          </span>
        </div>

        <div className="text-xs text-gray-400 mb-2">
          Select an item below, then click a matching slot on the center hero to equip it.
        </div>

        {/* Bag Slots */}
        <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-1">
          {Array.from({ length: sharedBag.max_slots }).map((_, index) => {
            const item = sharedBag.items[index];
            if (!item) {
              return (
                <div key={index} className="aspect-square bg-black/40 border border-gray-900 rounded flex items-center justify-center text-gray-700 text-xs">
                  -
                </div>
              );
            }

            const isSelected = selectedBagItem?.id === item.id;
            


            return (
              <div 
                key={item.id}
                onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeaveItem}
                className={`aspect-square border rounded flex items-center justify-center cursor-pointer transition p-1 relative ${
                  item.rarity === 'Legendary' ? 'border-legendary bg-amber-950/20'
                    : item.rarity === 'Epic' ? 'border-epic bg-purple-950/20'
                    : item.rarity === 'Rare' ? 'border-rare bg-blue-950/20'
                    : item.rarity === 'Uncommon' ? 'border-uncommon bg-green-950/20'
                    : 'border-gray-800 bg-gray-950/30'
                } ${isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-95' : 'hover:scale-105'}`}
                title={`${item.name} (${item.type})`}
                onClick={() => handleBagItemClick(item)}
              >
                {/* Visual Icon */}
                <div className="text-center flex flex-col items-center">
                  {item.type === 'weapon' ? <Sword size={18} className="text-amber-500/80" /> : <Shield size={18} className="text-gray-400" />}
                  <span className="text-[7px] text-gray-400 uppercase tracking-widest truncate max-w-full">
                    {item.type.substring(0, 4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedBagItem && (
          <div className="border border-gray-800 rounded p-4 bg-black/40 mt-auto flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className={`font-fantasy text-sm font-bold ${
                selectedBagItem.rarity === 'Legendary' ? 'text-legendary'
                  : selectedBagItem.rarity === 'Epic' ? 'text-epic'
                  : selectedBagItem.rarity === 'Rare' ? 'text-rare'
                  : selectedBagItem.rarity === 'Uncommon' ? 'text-uncommon'
                  : 'text-white'
              }`}>{selectedBagItem.name}</span>
              <span className="text-[10px] bg-gray-900 border border-gray-800 px-1 rounded uppercase tracking-wider text-gray-500 font-bold">
                {selectedBagItem.rarity}
              </span>
            </div>
            
            <div className="text-xs text-gray-400">
              Type: <span className="text-white capitalize">{selectedBagItem.type}</span> | Weight: <span className="text-white capitalize">{selectedBagItem.weight}</span>
            </div>

            <div className="text-xs text-amber-500 font-bold mt-1">
              {selectedBagItem.stats.hp && <div>+{selectedBagItem.stats.hp} Health</div>}
              {selectedBagItem.stats.damage && <div>+{selectedBagItem.stats.damage} Damage</div>}
              {selectedBagItem.stats.armor && <div>+{selectedBagItem.stats.armor} Armor Rating</div>}
              {selectedBagItem.stats.atkSpeed && <div>{(() => { const v = Math.round((selectedBagItem.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}% Attack Speed</div>}
              {selectedBagItem.stats.speed && <div>+{selectedBagItem.stats.speed}% Move Speed</div>}
              {selectedBagItem.stats.atkCooldownReduction && <div>+{Math.round(selectedBagItem.stats.atkCooldownReduction * 100)}% Attack CDR</div>}
            </div>

            {selectedBagItem.affixes.length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-800 text-[10px] text-purple-400">
                {selectedBagItem.affixes.map((aff, i) => (
                  <div key={i}>* {aff}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {hoveredItem && (
        <ItemTooltip 
          item={hoveredItem} 
          coords={mouseCoords} 
          compareWithItem={(() => {
            return (selectedHero && hoveredItem.type !== 'consumable')
              ? selectedHero.equipment[hoveredItem.type as EquipmentSlot]
              : null;
          })()}
        />
      )}
    </div>
  );
};
