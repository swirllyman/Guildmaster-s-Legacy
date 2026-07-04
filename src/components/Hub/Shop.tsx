import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { Item } from '../../types/game';
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

// Build a full stat line list for the tooltip
const buildTooltipLines = (item: Item): { text: string; color: string }[] => {
  const lines: { text: string; color: string }[] = [];

  if (item.stats.hp)        lines.push({ text: `+${item.stats.hp} Max HP`,               color: '#4ade80' });
  if (item.stats.armor)     lines.push({ text: `+${item.stats.armor} Armor`,              color: '#60a5fa' });
  if (item.stats.damage)    lines.push({ text: `+${item.stats.damage} Flat Damage`,       color: '#fbbf24' });
  if (item.stats.atkSpeed)  lines.push({ text: `+${Math.round((item.stats.atkSpeed - 1) * 100)}% Attack Rate`, color: '#fbbf24' });
  if (item.stats.speed)  lines.push({ text: `+${item.stats.speed}% Movement Speed`, color: '#4ade80' });
  if (item.stats.atkCooldownReduction)  lines.push({ text: `+${Math.round(item.stats.atkCooldownReduction * 100)}% Attack Cooldown Reduction`, color: '#fbbf24' });
  if (item.stats.critChance) lines.push({ text: `+${item.stats.critChance}% Critical Strike Chance`, color: '#c084fc' });
  if (item.stats.lifeSteal)  lines.push({ text: `+${Math.round(item.stats.lifeSteal * 100)}% Life Steal on Hit`, color: '#c084fc' });
  if (item.stats.chainChance) lines.push({ text: `${Math.round(item.stats.chainChance * 100)}% Chain Lightning Chance`, color: '#c084fc' });
  if (item.stats.magic)      lines.push({ text: `+${item.stats.magic} Magic Power`,       color: '#f87171' });

  item.affixes.forEach(a => {
    // Only show affixes not already shown via stats (dedup the display)
    if (!lines.some(l => l.text.includes(a.replace(/^\* /, '').split(' ')[0]))) {
      lines.push({ text: `* ${a}`, color: '#c084fc' });
    }
  });

  return lines;
};

export const Shop: React.FC = () => {
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

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleBuy = (index: number) => {
    buyShopItem(index);
  };

  const getItemCost = (item: any) => {
    if (item.name === 'Scroll of Resurrection') return 80;
    if (item.name === 'Elixir of Wrath') return 40;
    
    const costs: Record<string, number> = {
      Common: 25,
      Uncommon: 50,
      Rare: 100,
      Epic: 200,
      Legendary: 400
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

  const rarityColor: Record<string, string> = {
    Legendary: '#ff8000',
    Epic:      '#a335ee',
    Rare:      '#0070dd',
    Uncommon:  '#1eff00',
    Common:    '#ffffff',
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
            const tooltipLines = buildTooltipLines(item);
            const isHovered = hoveredIndex === index;
            const isRightColumn = index % 2 === 1;

            return (
              <div
                key={item.id}
                className={`shop-item-row border-rarity-${item.rarity.toLowerCase()} shop-item-row--hoverable`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
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
                      {item.stats.atkSpeed && <span>+{Math.round((item.stats.atkSpeed - 1) * 100)}% Rate </span>}
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
                {isHovered && tooltipLines.length > 0 && (
                  <div className={`shop-item-tooltip ${isRightColumn ? 'tooltip-left' : 'tooltip-right'}`}>
                    <div className="shop-tooltip-header">
                      <span style={{ color: rarityColor[item.rarity] ?? '#fff' }}>
                        {item.name}
                      </span>
                      <span className="shop-tooltip-rarity">{item.rarity}</span>
                    </div>
                    <div className="shop-tooltip-divider" />
                    {tooltipLines.map((line, i) => (
                      <div key={i} className="shop-tooltip-stat" style={{ color: line.color }}>
                        {line.text}
                      </div>
                    ))}
                    <div className="shop-tooltip-divider" />
                    <div className="shop-tooltip-weight">
                      Weight class: <strong>{item.weight === 'none' ? 'None' : item.weight === 'heavy' ? 'Heavy' : 'Light'}</strong>
                    </div>
                  </div>
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
