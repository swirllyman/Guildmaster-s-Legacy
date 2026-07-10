import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { EquipmentSlot } from '../../types/game';
import { ItemTooltip } from './ItemTooltip';
import { 
  ShoppingBag, 
  Lock, 
  Sparkles, 
  Scroll, 
  FlaskConical, 
  UserPlus,
  Crown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Footprints,
  Sword
} from 'lucide-react';

interface ShopProps {
  activeHeroId?: string | null;
}

export const Shop: React.FC<ShopProps> = ({ activeHeroId = null }) => {
  const {
    shopInventory,
    gold,
    runsCount,
    restockCount,
    roster,
    buyShopItem,
    restockShop,
    buyLateGameMercenary
  } = useGame();

  const isMobile = useIsMobile();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedTooltipIndex, setSelectedTooltipIndex] = useState<number | null>(null);

  const handleItemInteraction = (index: number) => {
    if (isMobile) {
      setSelectedTooltipIndex(prev => prev === index ? null : index);
    } else {
      setHoveredIndex(index);
    }
  };

  const handleItemLeave = () => {
    if (!isMobile) {
      setHoveredIndex(null);
    }
  };

  const isTooltipVisible = (index: number) => {
    if (isMobile) {
      return selectedTooltipIndex === index;
    }
    return hoveredIndex === index;
  };

  const handleBuy = (index: number) => {
    buyShopItem(index);
  };

  const getItemCost = (item: any) => {
    if (item.name === 'Scroll of Resurrection') return 80;
    if (item.name === 'Elixir of Wrath') return 40;
    
    const costs: Record<string, number> = {
      Common: 25,
      Uncommon: 50,
      Rare: 150,
      Epic: 400,
      Legendary: 800
    };
    return costs[item.rarity] || 25;
  };

  const getItemIcon = (item: any) => {
    if (item.type === 'consumable') {
      return item.name.includes('Scroll') 
        ? <Scroll size={16} className="text-amber-400" /> 
        : <FlaskConical size={16} className="text-purple-400" />;
    }
    
    const iconMap: Record<string, any> = {
      helm: <Crown size={16} className="text-amber-500/80" />,
      shoulders: <ShieldAlert size={16} className="text-orange-500/80" />,
      chest: <Shield size={16} className="text-blue-500/80" />,
      pants: <ShieldCheck size={16} className="text-teal-500/80" />,
      boots: <Footprints size={16} className="text-amber-600" />,
      gloves: <ShieldAlert size={16} className="text-green-500/80" />,
      weapon: <Sword size={16} className="text-red-500/80" />
    };
    return iconMap[item.type] || <ShoppingBag size={16} />;
  };



  const lockedHeroes = roster.filter(h => !h.unlocked);
  const mercUnlocked = runsCount >= 20;
  const restockCost = 100 + 100 * restockCount;
  const canRestock = gold >= restockCost;

  return (
    <div className="shop-vertical-layout">
      {/* 1. Shop Info & Restock */}
      <div className="shop-header-section">
        <div className="shop-header-left">
          <ShoppingBag className="text-amber-500" size={20} />
          <div>
            <h4 className="shop-title-text">Merchant Bazaar</h4>
            <div className="shop-subtitle-text">Restocks after every dungeon crawl</div>
          </div>
        </div>
        <button className="shop-restock-btn" onClick={() => restockShop()} disabled={!canRestock}>
          Restock ({restockCost}g)
        </button>
      </div>

      {/* 2. Gear & Items Stock */}
      <div className="shop-stock-section">
        <h5 className="shop-section-title">
          <Sparkles size={12} /> Armor &amp; Weapons
        </h5>

        <div className="shop-stock-list">
          {shopInventory.map((item, index) => {
            const cost = getItemCost(item);
            const canAfford = gold >= cost;
            const isRightColumn = index % 2 === 1;

            const activeHero = roster.find(h => h.character_id === activeHeroId) || null;
            const equipped = (activeHero && item.type !== 'consumable')
              ? activeHero.equipment[item.type as EquipmentSlot]
              : null;

            return (
              <div
                key={item.id}
                className={`shop-item-row border-rarity-${item.rarity.toLowerCase()} shop-item-row--hoverable`}
                onMouseEnter={() => handleItemInteraction(index)}
                onMouseLeave={handleItemLeave}
                onClick={() => handleItemInteraction(index)}
              >
                <div className="shop-item-left">
                  <div className="shop-item-sprite-box">
                    {getItemIcon(item)}
                  </div>
                  <div className="shop-item-details">
                    <h4 className={`shop-item-name ${
                      item.rarity === 'Legendary' ? 'text-legendary'
                        : item.rarity === 'Epic' ? 'text-epic'
                        : item.rarity === 'Rare' ? 'text-rare'
                        : item.rarity === 'Uncommon' ? 'text-uncommon'
                        : 'text-white'
                    }`}>{item.name}</h4>
                    
                    <div className="shop-item-sub">
                      {item.stats.hp && <span>+{item.stats.hp} HP </span>}
                      {item.stats.damage && <span>+{item.stats.damage} Atk </span>}
                      {item.stats.armor && <span>+{item.stats.armor} Arm </span>}
                      {item.stats.atkSpeed && <span>{(() => { const v = Math.round((item.stats.atkSpeed - 1) * 100); return `${v >= 0 ? '+' : ''}${v}`; })()}% Rate </span>}
                      {item.affixes.length > 0 && <span className="stat-affix">* {item.affixes[0]}</span>}
                    </div>
                  </div>
                </div>

                <div className="shop-item-right">
                  <span className="shop-item-cost">
                    {cost}g
                  </span>
                  <button
                    disabled={!canAfford}
                    className="shop-buy-btn"
                    onClick={() => handleBuy(index)}
                  >
                    Buy
                  </button>
                </div>

                {/* Hover Tooltip */}
                {isTooltipVisible(index) && (
                  <ItemTooltip 
                    item={item} 
                    placement={isRightColumn ? 'left' : 'right'} 
                    compareWithItem={equipped}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Mercenary Roster Recruitment */}
      <div className="shop-merc-section">
        <h5 className="shop-section-title">
          <UserPlus size={12} /> Mercenary Tavern
        </h5>

        {!mercUnlocked ? (
          <div className="shop-merc-restricted">
            <Lock size={20} className="text-red-500 mb-1" />
            <h6 className="merc-lock-title">Restricted</h6>
            <p className="merc-lock-desc">Requires 20 crawls ({runsCount}/20 completed)</p>
          </div>
        ) : (
          <div className="shop-merc-list">
            {lockedHeroes.length === 0 ? (
              <div className="merc-empty-text">All classes successfully recruited!</div>
            ) : (
              lockedHeroes.map(hero => (
                <div key={hero.character_id} className="shop-merc-row">
                  <div>
                    <div className="merc-row-class">{hero.class} Class</div>
                    <div className="merc-row-sub">Barracks Recruitment</div>
                  </div>
                  <button
                    disabled={gold < 300}
                    className="shop-buy-btn"
                    onClick={() => buyLateGameMercenary(hero.class)}
                  >
                    Hire (300g)
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
