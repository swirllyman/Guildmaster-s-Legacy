import React from 'react';
import type { Item } from '../../types/game';

const rarityColor: Record<string, string> = {
  Legendary: '#ff8000',
  Epic:      '#a335ee',
  Rare:      '#0070dd',
  Uncommon:  '#1eff00',
  Common:    '#ffffff',
};

export const buildTooltipLines = (item: Item): { text: string; color: string }[] => {
  const lines: { text: string; color: string }[] = [];

  if (item.stats.hp)        lines.push({ text: `+${item.stats.hp} Max HP`,               color: '#4ade80' });
  if (item.stats.armor)     lines.push({ text: `+${item.stats.armor} Armor`,              color: '#60a5fa' });
  if (item.stats.damage)    lines.push({ text: `+${item.stats.damage} Flat Damage`,       color: '#fbbf24' });
  if (item.stats.atkSpeed)  lines.push({ text: `+${Math.round((item.stats.atkSpeed - 1) * 100)}% Attack Rate`, color: '#fbbf24' });
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

interface ItemTooltipProps {
  item: Item;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  coords?: { x: number; y: number } | null;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ 
  item, 
  placement = 'right', 
  className = '',
  coords
}) => {
  const tooltipLines = buildTooltipLines(item);
  if (tooltipLines.length === 0) return null;

  // If coords are provided, position fixed next to cursor with screen edge protection
  let style: React.CSSProperties = {};
  if (coords) {
    let left = coords.x + 15;
    let top = coords.y - 50;
    
    if (typeof window !== 'undefined') {
      if (left + 240 > window.innerWidth) {
        left = coords.x - 240; // Flip to left of cursor
      }
      if (top + 200 > window.innerHeight) {
        top = window.innerHeight - 210;
      }
      if (top < 10) {
        top = 10;
      }
    }
    
    style = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      transform: 'none',
      zIndex: 9999,
      pointerEvents: 'none'
    };
  }

  return (
    <div className={`gear-tooltip tooltip-${placement} ${className}`} style={style}>
      <div className="gear-tooltip-header">
        <span style={{ color: rarityColor[item.rarity] ?? '#fff' }}>
          {item.name}
        </span>
        <span className="gear-tooltip-rarity">{item.rarity}</span>
      </div>
      <div className="gear-tooltip-divider" />
      {tooltipLines.map((line, i) => (
        <div key={i} className="gear-tooltip-stat" style={{ color: line.color }}>
          {line.text}
        </div>
      ))}
      <div className="gear-tooltip-divider" />
      <div className="gear-tooltip-weight">
        Weight class: <strong>{item.weight === 'none' ? 'None' : item.weight === 'heavy' ? 'Heavy' : 'Light'}</strong>
      </div>
    </div>
  );
};
