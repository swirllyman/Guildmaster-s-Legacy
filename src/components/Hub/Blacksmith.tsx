import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { Item, EquipmentSlot } from '../../types/game';
import { 
  Hammer, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  Sword,
  Crown,
  Shield,
  ShieldCheck,
  Footprints
} from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

export const Blacksmith: React.FC = () => {
  const {
    sharedBag,
    roster,
    gold,
    upgradeItem,
    rerollAffix,
    craftRarity
  } = useGame();

  const [selectedItemSource, setSelectedItemSource] = useState<'bag' | 'hero'>('bag');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
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
  const [rerollPrompt, setRerollPrompt] = useState<{
    itemId: string;
    affixIndex: number;
    originalAffix: string;
    newAffix: string;
    commit: (accept: boolean) => void;
  } | null>(null);

  const getSelectableItems = () => {
    if (selectedItemSource === 'bag') {
      return sharedBag.items.filter(i => i.type !== 'consumable');
    } else {
      const hero = roster.find(h => h.character_id === selectedHeroId);
      if (!hero) return [];
      const items: Item[] = [];
      for (const slot in hero.equipment) {
        const item = hero.equipment[slot as EquipmentSlot];
        if (item) items.push(item);
      }
      return items;
    }
  };

  const items = getSelectableItems();
  const activeItem = items.find(i => i.id === selectedItemId) || null;

  const getUpgradeCost = (_item: Item) => 50;

  const getRarityCraftCost = (item: Item) => {
    const costs: Record<Item['rarity'], number> = {
      Common: 40,
      Uncommon: 80,
      Rare: 160,
      Epic: 300,
      Legendary: 9999
    };
    return costs[item.rarity];
  };

  const getRerollCost = (item: Item) => {
    const rerollCount = item.rerollCount || 0;
    const baseRarityCosts: Record<Item['rarity'], number> = {
      Common: 0,
      Uncommon: 30,
      Rare: 60,
      Epic: 120,
      Legendary: 250
    };
    const baseCost = baseRarityCosts[item.rarity];
    return Math.round(baseCost * Math.pow(1.5, rerollCount));
  };

  const handleUpgrade = () => {
    if (!activeItem) return;
    upgradeItem(activeItem.id, selectedItemSource, selectedHeroId);
  };

  const handleCraftRarity = () => {
    if (!activeItem) return;
    craftRarity(activeItem.id, selectedItemSource, selectedHeroId);
  };

  const handleReroll = (affixIndex: number) => {
    if (!activeItem) return;
    try {
      const rollResult = rerollAffix(activeItem.id, affixIndex, selectedItemSource, selectedHeroId);
      setRerollPrompt({
        itemId: activeItem.id,
        affixIndex,
        originalAffix: activeItem.affixes[affixIndex],
        newAffix: rollResult.newAffix,
        commit: (accept: boolean) => {
          rollResult.commit(accept);
          setRerollPrompt(null);
        }
      });
    } catch (e: any) {
      alert(e.message || "Failed to reroll");
    }
  };

  const getItemIcon = (item: any) => {
    const iconMap: Record<string, any> = {
      helm: <Crown size={14} className="text-amber-500/80" />,
      shoulders: <ShieldAlert size={14} className="text-orange-500/80" />,
      chest: <Shield size={14} className="text-blue-500/80" />,
      pants: <ShieldCheck size={14} className="text-teal-500/80" />,
      boots: <Footprints size={14} className="text-amber-600" />,
      gloves: <ShieldAlert size={14} className="text-green-500/80" />,
      weapon: <Sword size={14} className="text-red-500/80" />
    };
    return iconMap[item.type] || <Hammer size={14} />;
  };

  return (
    <div className="forge-vertical-layout">
      {/* RNG Reroll Modal Overlay */}
      {rerollPrompt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel max-w-md w-full p-6 border-amber-500 flex flex-col gap-4">
            <h3 className="text-xl font-fantasy text-amber-500 text-center flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-amber-400" /> Reroll Outcome
            </h3>
            <div className="text-xs text-gray-400 text-center">
              Gold has been consumed. Select which modifier you wish to commit to this slot.
            </div>

            <div className="grid grid-cols-2 gap-4 my-4">
              <div
                className="border border-gray-800 p-4 rounded bg-black/45 cursor-pointer hover:border-gray-500 transition text-center flex flex-col gap-2 justify-between"
                onClick={() => rerollPrompt.commit(false)}
              >
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Keep original</div>
                <div className="text-xs text-gray-300 font-fantasy py-4">{rerollPrompt.originalAffix}</div>
                <button className="px-3 py-1.5 bg-gray-800 text-white rounded text-xs font-fantasy">Keep Old</button>
              </div>

              <div
                className="border border-amber-500/40 p-4 rounded bg-amber-950/10 cursor-pointer hover:border-amber-400 transition text-center flex flex-col gap-2 justify-between"
                onClick={() => rerollPrompt.commit(true)}
              >
                <div className="text-[10px] text-amber-500 uppercase font-bold tracking-wider flex justify-center gap-1">
                  <Sparkles size={12} /> Accept New
                </div>
                <div className="text-xs text-amber-400 font-fantasy py-4 font-bold">{rerollPrompt.newAffix}</div>
                <button className="px-3 py-1.5 bg-amber-500 text-black rounded text-xs font-fantasy font-bold">Accept New</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Forge Grid */}
      <div className="forge-grid">
        {/* Column 1: Selection (Left) */}
        <div className="forge-selection-column">
          <div className="forge-tabs">
            <button
              className={`forge-tab-btn ${selectedItemSource === 'bag' ? 'active' : ''}`}
              onClick={() => {
                setSelectedItemSource('bag');
                setSelectedItemId('');
              }}
            >
              Bag Items
            </button>
            <button
              className={`forge-tab-btn ${selectedItemSource === 'hero' ? 'active' : ''}`}
              onClick={() => {
                setSelectedItemSource('hero');
                setSelectedItemId('');
                const firstUnlocked = roster.find(h => h.unlocked);
                if (firstUnlocked) setSelectedHeroId(firstUnlocked.character_id);
              }}
            >
              Equipped
            </button>
          </div>

          {selectedItemSource === 'hero' && (
            <div className="forge-hero-select-container">
              <span className="forge-select-label">Hero:</span>
              <select
                value={selectedHeroId}
                onChange={(e) => {
                  setSelectedHeroId(e.target.value);
                  setSelectedItemId('');
                }}
                className="forge-hero-select"
              >
                {roster.filter(h => h.unlocked).map(h => (
                  <option key={h.character_id} value={h.character_id}>
                    {h.class}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="forge-items-scroll-list">
            {items.length === 0 ? (
              <div className="forge-empty-text">No items in this location.</div>
            ) : (
              items.map(item => {
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeaveItem}
                    className={`forge-item-row border-rarity-${item.rarity.toLowerCase()} ${
                      selectedItemId === item.id ? 'active' : ''
                    }`}
                    style={{ position: 'relative' }}
                  >
                    <div className="forge-item-sprite-box">
                      {getItemIcon(item)}
                    </div>
                    <div className="forge-item-details">
                      <h4 className={`forge-item-name ${
                        item.rarity === 'Legendary' ? 'text-legendary'
                          : item.rarity === 'Epic' ? 'text-epic'
                          : item.rarity === 'Rare' ? 'text-rare'
                          : item.rarity === 'Uncommon' ? 'text-uncommon'
                          : 'text-white'
                      }`}>{item.name}</h4>
                      <div className="forge-item-sub">
                        {item.stats.hp && <span>+{item.stats.hp} HP </span>}
                        {item.stats.damage && <span>+{item.stats.damage} Atk </span>}
                        {item.stats.armor && <span>+{item.stats.armor} Arm </span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Workstation (Right) */}
        <div className="forge-workstation-column">
          {activeItem ? (
            <div className="forge-workstation-content">
              <div className="forge-workstation-header">
                <div>
                  <h3 className={`forge-workstation-name ${
                    activeItem.rarity === 'Legendary' ? 'text-legendary'
                      : activeItem.rarity === 'Epic' ? 'text-epic'
                      : activeItem.rarity === 'Rare' ? 'text-rare'
                      : activeItem.rarity === 'Uncommon' ? 'text-uncommon'
                      : 'text-white'
                  }`}>{activeItem.name}</h3>
                  <span className="forge-workstation-sub">{activeItem.rarity} | {activeItem.weight} Weight</span>
                </div>
              </div>

              <div className="forge-workstation-actions">
                {/* 1. Stat upgrade */}
                <div className="forge-action-card">
                  <div className="forge-action-card-header">
                    <span className="forge-action-title">Stat Upgrade (+1)</span>
                    <span className="forge-action-cost">{getUpgradeCost(activeItem)}g</span>
                  </div>
                  <p className="forge-action-desc">Flatly boosts primary health, weapon damage, or armor ratings.</p>
                  <button
                    disabled={gold < getUpgradeCost(activeItem)}
                    className="forge-action-btn"
                    onClick={handleUpgrade}
                  >
                    Upgrade Item
                  </button>
                </div>

                {/* 2. Rarity promotion */}
                <div className="forge-action-card">
                  <div className="forge-action-card-header">
                    <span className="forge-action-title">Reforge Rarity</span>
                    {activeItem.rarity !== 'Legendary' ? (
                      <span className="forge-action-cost">{getRarityCraftCost(activeItem)}g</span>
                    ) : (
                      <span className="forge-action-max">MAX</span>
                    )}
                  </div>
                  <p className="forge-action-desc">Ascends rarity tier and appends a randomized secondary trait affix.</p>
                  <button
                    disabled={activeItem.rarity === 'Legendary' || gold < getRarityCraftCost(activeItem)}
                    className="forge-action-btn"
                    onClick={handleCraftRarity}
                  >
                    Promote Rarity
                  </button>
                </div>

                {/* 3. Affix reroll engine */}
                <div className="forge-action-card">
                  <div className="forge-action-card-header">
                    <span className="forge-action-title">Affix Reroll Engine</span>
                  </div>
                  <p className="forge-action-desc">Reroll a secondary trait. Locks all other affix slots permanently.</p>
                  
                  {activeItem.rarity === 'Common' ? (
                    <div className="forge-affix-empty">Common items have no secondary affixes. Promote rarity to unlock.</div>
                  ) : (
                    <div className="forge-affix-list">
                      {activeItem.affixes.map((affix, index) => {
                        const isLocked = activeItem.rerolledSlot !== undefined && activeItem.rerolledSlot !== index;
                        const cost = getRerollCost(activeItem);

                        return (
                          <div key={index} className={`forge-affix-row ${isLocked ? 'locked' : ''}`}>
                            <div className="forge-affix-details">
                              <span className="forge-affix-text">{affix}</span>
                              {activeItem.rerolledSlot === index && <span className="forge-affix-label">Unlocked</span>}
                            </div>
                            {!isLocked && (
                              <button
                                disabled={gold < cost}
                                className="forge-reroll-btn"
                                onClick={() => handleReroll(index)}
                              >
                                Reroll ({cost}g)
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="forge-workstation-empty">
              <Hammer size={32} className="empty-icon text-amber-500/40 mb-2" />
              <h4 className="empty-title">Forge Station Idle</h4>
              <p className="empty-desc">Select an item from the left panel to load it into the blacksmith workstation.</p>
            </div>
          )}
        </div>
      </div>
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}
    </div>
  );
};
