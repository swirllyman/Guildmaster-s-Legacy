import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Shop } from './Shop';
import { Blacksmith } from './Blacksmith';
import { TownChef } from './TownChef';
import type { EquipmentSlot, Item } from '../../types/game';
import { Sword, Shield, Crown, Footprints, ShieldAlert, Award, ShieldCheck, HelpCircle } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';



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
    gold,
    startRun,
    returnToMainMenu
  } = useGame();

  const [activeDistrict, setActiveDistrict] = useState<'strategy' | 'blacksmith' | 'shop' | 'roster' | 'none'>('strategy');
  const [selectedSquadSlot, setSelectedSquadSlot] = useState<number | null>(0);
  const [activeHeroId, setActiveHeroId] = useState<string | null>('hero_ranger');
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>('weapon');
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

  const maxSquadSlots = runsCount < 3 ? 1 : runsCount < 5 ? 2 : 3;

  const activeHero = roster.find(h => h.character_id === activeHeroId) || null;
  const equippedItem = (activeHero && selectedSlot && activeHero.equipment) ? activeHero.equipment[selectedSlot] : null;

  // Combined stats calculator
  const getCombinedStats = (heroId: string) => {
    const hero = roster.find(h => h.character_id === heroId);
    if (!hero) return { hp: 0, damage: 0, armor: 0, speed: 1, atkSpeed: 1, magic: 0 };

    const classBaseDmg = hero.class === 'WARRIOR' ? 12 : hero.class === 'WIZARD' ? 16 : 9;

    let hp = hero.base_stats.hp;
    let damage = classBaseDmg;
    let armor = 0;
    let speed = 1.0;
    let atkSpeed = 1.0;
    let magic = 0;

    if (hero.equipment) {
      for (const key in hero.equipment) {
        const item = hero.equipment[key as EquipmentSlot];
        if (item) {
          if (item.stats.hp) hp += item.stats.hp;
          if (item.stats.damage) damage += item.stats.damage;
          if (item.stats.armor) armor += item.stats.armor;
          if (item.stats.magic) magic += item.stats.magic;
          if (item.stats.atkSpeed) atkSpeed *= item.stats.atkSpeed;
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
      magic
    };
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

  const handleEquipItem = (item: Item) => {
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

  return (
    <div className="town-scene-layout">
      {/* 1. Town District Interactive Building Headers */}
      <div className="town-buildings-row">
        {/* Shop Building */}
        <div 
          onClick={() => setActiveDistrict('shop')}
          className={`building-card building-purple ${activeDistrict === 'shop' ? 'active' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src="/shop_stall.png" alt="Merchant Bazaar" className="building-img" />
            <div className="building-overlay" />
            <span className="building-title title-purple">Merchant Shop</span>
          </div>
          <div className="building-desc">Buy Elixirs, Scrolls, and Equipment</div>
        </div>

        {/* Blacksmith Forge */}
        <div 
          onClick={() => setActiveDistrict('blacksmith')}
          className={`building-card building-red ${activeDistrict === 'blacksmith' ? 'active' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src="/blacksmith_forge.png" alt="Blacksmith Forge" className="building-img" />
            <div className="building-overlay" />
            <span className="building-title title-red">Blacksmith Forge</span>
          </div>
          <div className="building-desc">Reinforce, Upgrade, and Reroll traits</div>
        </div>

        {/* Strategy Table */}
        <div 
          onClick={() => setActiveDistrict('strategy')}
          className={`building-card building-gold ${activeDistrict === 'strategy' ? 'active' : ''}`}
        >
          <div className="building-stripe" />
          <div className="building-image-container">
            <img src="/war_table.png" alt="Strategy Table" className="building-img" />
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
                Weight class: <span className="item-detail-weight-val">{equippedItem.weight}</span>
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
        <div className="paperdoll-column">
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
                  Save & Exit
                </button>
                <button 
                  disabled={squad.length === 0} 
                  onClick={startRun}
                  className="deploy-btn-pronounced"
                >
                  <Sword size={12} className="inline mr-1" /> Deploy Expedition
                </button>
              </div>
            </div>

            <h3 className="paperdoll-header">
              Armor loadout: {activeHero ? getClassName(activeHero.class) : 'Ranger'}
            </h3>

            {/* Equipment Loadout + Stats Panel */}
            <div className="loadout-and-stats-row">
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

                {/* Center Column: Helm, Chest, Pants, Boots */}
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

                {/* Right Column: Weapon & Decorative Off-hand Shield */}
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

                  <div className="paperdoll-slot-decorative">
                    <Shield size={14} className="opacity-15 text-gray-600" />
                    <span className="slot-label-decorative">Off-hand</span>
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

      {/* 3. Squad Display Center-Bottom with Buttons [2] [1] [3] */}
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
      </div>
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}
    </div>
  );
};
