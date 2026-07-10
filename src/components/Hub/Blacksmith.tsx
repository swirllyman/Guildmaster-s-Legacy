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

interface BlacksmithProps {
  onSelectedItemChange?: (item: Item | null) => void;
}

export const Blacksmith: React.FC<BlacksmithProps> = ({ onSelectedItemChange }) => {
  const {
    sharedBag,
    roster,
    gold,
    upgradeItem,
    rerollAffix,
    craftRarity
  } = useGame();

  const firstUnlockedHero = roster.find(h => h.unlocked)?.character_id || '';

  const [selectedItemSource, setSelectedItemSource] = useState<'bag' | 'hero'>('hero');
  const [selectedHeroId, setSelectedHeroId] = useState<string>(firstUnlockedHero);
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
  const [rerollQueue, setRerollQueue] = useState<{
    itemId: string;
    affixIndex: number;
    originalAffix: string;
    newAffix: string;
    commit: (accept: boolean) => void;
  }[]>([]);

  const rerollPrompt = rerollQueue[0] || null;

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

  React.useEffect(() => {
    if (onSelectedItemChange) {
      onSelectedItemChange(activeItem);
    }
  }, [activeItem, onSelectedItemChange]);

  const getUpgradeLevel = (item: Item) => {
    const match = item.name.match(/\+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const getUpgradeCost = (item: Item) => {
    if (item.rarity === 'Legendary') {
      return (getUpgradeLevel(item) + 1) * 10000;
    }
    return 50 + getUpgradeLevel(item) * 25;
  };

  const getRarityCraftCost = (item: Item) => {
    const costs: Record<Item['rarity'], number> = {
      Common: 50,
      Uncommon: 150,
      Rare: 400,
      Epic: 800,
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
      setRerollQueue(prev => [...prev, {
        itemId: activeItem.id,
        affixIndex,
        originalAffix: activeItem.affixes[affixIndex],
        newAffix: rollResult.newAffix,
        commit: (accept: boolean) => {
          rollResult.commit(accept);
          setRerollQueue(prev => prev.slice(1));
        }
      }]);
    } catch (e: any) {
      alert(e.message || "Failed to reroll");
    }
  };

  const handleRerollAll = () => {
    if (!activeItem || activeItem.rarity === 'Common' || activeItem.rarity === 'Legendary') return;
    for (let i = 0; i < activeItem.affixes.length; i++) {
      handleReroll(i);
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
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <RefreshCw size={36} className="text-amber-400 mb-2 animate-spin" />
            <h4 className="menu-modal-title">Reroll Outcome ({rerollPrompt.affixIndex + 1})</h4>
            <p className="menu-modal-desc">
              Gold has been consumed. Select which modifier you wish to commit to this slot.
            </p>
            <div className="grid grid-cols-2 gap-4 my-4 w-full">
              <div
                className="border border-gray-800 p-4 rounded bg-black/45 cursor-pointer hover:border-gray-500 transition text-center flex flex-col gap-2 justify-between"
                onClick={() => rerollPrompt.commit(false)}
              >
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Keep original</div>
                <div className="text-xs text-gray-300 font-fantasy py-4">{rerollPrompt.originalAffix}</div>
                <button className="modal-cancel-btn">Keep Old</button>
              </div>

              <div
                className="border border-amber-500/40 p-4 rounded bg-amber-950/10 cursor-pointer hover:border-amber-400 transition text-center flex flex-col gap-2 justify-between"
                onClick={() => rerollPrompt.commit(true)}
              >
                <div className="text-[10px] text-amber-500 uppercase font-bold tracking-wider flex justify-center gap-1">
                  <Sparkles size={12} /> Accept New
                </div>
                <div className="text-xs text-amber-400 font-fantasy py-4 font-bold">{rerollPrompt.newAffix}</div>
                <button className="modal-confirm-btn">Accept New</button>
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
                    className={`forge-item-row ${
                      selectedItemId === item.id ? 'active' : ''
                    }`}
                  >
                    <div className="forge-item-sprite-box">
                      {getItemIcon(item)}
                    </div>
                    <div className="forge-item-details">
                      <span className="forge-item-name" style={{ color: { Legendary: '#ff8000', Epic: '#a335ee', Rare: '#0070dd', Uncommon: '#1eff00', Common: '#ffffff' }[item.rarity] ?? '#fff' }}>{item.name}</span>
                      <div className="forge-item-sub">
                        <span className="forge-item-type">{item.type}</span>
                        {item.stats.hp && <span>+{item.stats.hp} HP</span>}
                        {item.stats.damage && <span>+{item.stats.damage} Atk</span>}
                        {item.stats.armor && <span>+{item.stats.armor} Arm</span>}
                        {item.affixes.length > 0 && <span className="stat-affix">* {item.affixes[0]}</span>}
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
                  <p className="forge-action-desc">
                    {activeItem.rarity === 'Legendary' 
                      ? 'Flatly boosts stats, but legendary tempering is extremely expensive.' 
                      : 'Flatly boosts primary health, weapon damage, or armor ratings.'}
                  </p>
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
                    {activeItem.rarity === 'Legendary' || activeItem.rarity === 'Epic' ? (
                      <span className="forge-action-max">MAX CRAFTABLE</span>
                    ) : (
                      <span className="forge-action-cost">{getRarityCraftCost(activeItem)}g</span>
                    )}
                  </div>
                  <p className="forge-action-desc">
                    {activeItem.rarity === 'Epic' || activeItem.rarity === 'Legendary'
                      ? 'This item has reached the maximum craftable rarity tier.'
                      : 'Ascends rarity tier and appends a randomized secondary trait affix.'}
                  </p>
                  <button
                    disabled={activeItem.rarity === 'Epic' || activeItem.rarity === 'Legendary' || gold < getRarityCraftCost(activeItem)}
                    className="forge-action-btn"
                    onClick={handleCraftRarity}
                  >
                    {activeItem.rarity === 'Epic' || activeItem.rarity === 'Legendary' ? 'Max Craftable Tier' : 'Promote Rarity'}
                  </button>
                </div>

                {/* 3. Affix reroll engine */}
                <div className="forge-action-card">
                  <div className="forge-action-card-header">
                    <span className="forge-action-title">Affix Reroll</span>
                    {activeItem.rarity !== 'Common' && (
                      <span className="forge-action-cost">{getRerollCost(activeItem) * activeItem.affixes.length}g</span>
                    )}
                  </div>
                  <p className="forge-action-desc">Reroll all secondary traits at once.</p>
                  {activeItem.rarity === 'Common' ? (
                    <button disabled className="forge-action-btn">No Affixes</button>
                  ) : activeItem.rarity === 'Legendary' ? (
                    <button disabled className="forge-action-btn">Legendary Locked</button>
                  ) : (
                    <button
                      disabled={gold < getRerollCost(activeItem) * activeItem.affixes.length}
                      className="forge-action-btn"
                      onClick={handleRerollAll}
                    >
                      Reroll All
                    </button>
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
      {hoveredItem && (
        <ItemTooltip 
          item={hoveredItem} 
          coords={mouseCoords} 
          compareWithItem={(() => {
            const stats = { ...hoveredItem.stats };
            if (stats.damage !== undefined) stats.damage += 3;
            if (stats.armor !== undefined) stats.armor += 1;
            if (stats.hp !== undefined) stats.hp += 8;

            const name = hoveredItem.name.includes('+')
              ? hoveredItem.name.replace(/\+(\d+)/, (_, n) => `+${Number(n) + 1}`)
              : `${hoveredItem.name} +1`;

            return {
              ...hoveredItem,
              name,
              stats,
            };
          })()}
          compareLabel="Next Upgrade"
          isUpgradeComparison={true}
        />
      )}
    </div>
  );
};
