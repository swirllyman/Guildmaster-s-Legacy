import React from 'react';
import type { Item, ItemStats } from '../../types/game';

const rarityColor: Record<string, string> = {
  Legendary: '#ff8000',
  Epic:      '#a335ee',
  Rare:      '#0070dd',
  Uncommon:  '#1eff00',
  Common:    '#ffffff',
};

interface StatDef {
  key: keyof ItemStats;
  label: string;
  isPercent: boolean;
  color: string;
  getValue: (item: Item) => number;
  formatValue: (val: number) => string;
}

const STAT_DEFS: StatDef[] = [
  {
    key: 'hp',
    label: 'Max HP',
    isPercent: false,
    color: '#4ade80',
    getValue: (item) => item.stats.hp || 0,
    formatValue: (v) => `+${v} Max HP`,
  },
  {
    key: 'armor',
    label: 'Armor',
    isPercent: false,
    color: '#60a5fa',
    getValue: (item) => item.stats.armor || 0,
    formatValue: (v) => `+${v} Armor`,
  },
  {
    key: 'damage',
    label: 'Flat Damage',
    isPercent: false,
    color: '#fbbf24',
    getValue: (item) => item.stats.damage || 0,
    formatValue: (v) => `+${v} Flat Damage`,
  },
  {
    key: 'atkSpeed',
    label: 'Attack Rate',
    isPercent: true,
    color: '#fbbf24',
    getValue: (item) => item.stats.atkSpeed ? Math.round((item.stats.atkSpeed - 1) * 100) : 0,
    formatValue: (v) => `${v >= 0 ? '+' : ''}${v}% Attack Rate`,
  },
  {
    key: 'speed',
    label: 'Movement Speed',
    isPercent: true,
    color: '#4ade80',
    getValue: (item) => item.stats.speed || 0,
    formatValue: (v) => `${v >= 0 ? '+' : ''}${v}% Movement Speed`,
  },
  {
    key: 'atkCooldownReduction',
    label: 'Attack Cooldown Reduction',
    isPercent: true,
    color: '#fbbf24',
    getValue: (item) => item.stats.atkCooldownReduction ? Math.round(item.stats.atkCooldownReduction * 100) : 0,
    formatValue: (v) => `+${v}% Attack Cooldown Reduction`,
  },
  {
    key: 'critChance',
    label: 'Critical Strike Chance',
    isPercent: true,
    color: '#c084fc',
    getValue: (item) => item.stats.critChance || 0,
    formatValue: (v) => `+${v}% Critical Strike Chance`,
  },
  {
    key: 'lifeSteal',
    label: 'Life Steal on Hit',
    isPercent: true,
    color: '#c084fc',
    getValue: (item) => item.stats.lifeSteal ? Math.round(item.stats.lifeSteal * 100) : 0,
    formatValue: (v) => `+${v}% Life Steal on Hit`,
  },
  {
    key: 'chainChance',
    label: 'Chain Lightning Chance',
    isPercent: true,
    color: '#c084fc',
    getValue: (item) => item.stats.chainChance ? Math.round(item.stats.chainChance * 100) : 0,
    formatValue: (v) => `${v}% Chain Lightning Chance`,
  },
  {
    key: 'magic',
    label: 'Magic Power',
    isPercent: false,
    color: '#f87171',
    getValue: (item) => item.stats.magic || 0,
    formatValue: (v) => `+${v} Magic Power`,
  },
];

export const buildTooltipLines = (
  item: Item,
  compareWithItem?: Item | null
): { text: string; color: string; diffElement?: React.ReactNode }[] => {
  const lines: { text: string; color: string; diffElement?: React.ReactNode }[] = [];

  STAT_DEFS.forEach((def) => {
    const hVal = def.getValue(item);
    const eVal = compareWithItem ? def.getValue(compareWithItem) : 0;

    // Show this line if either hovered item has it, or equipped item has it (when comparing)
    if (hVal !== 0 || (compareWithItem && eVal !== 0)) {
      const baseText = def.formatValue(hVal);
      let diffElement: React.ReactNode = undefined;

      if (compareWithItem) {
        const diff = hVal - eVal;
        if (diff !== 0) {
          const diffSign = diff > 0 ? '+' : '';
          const diffColor = diff > 0 ? '#4ade80' : '#f87171';
          diffElement = (
            <span style={{ color: diffColor, marginLeft: '6px', fontWeight: 'bold' }}>
              ({diffSign}{diff}{def.isPercent ? '%' : ''})
            </span>
          );
        }
      }

      let lineColor = def.color;
      if (def.key === 'speed') {
        lineColor = hVal >= 0 ? '#4ade80' : '#f87171';
      }

      lines.push({ text: baseText, color: lineColor, diffElement });
    }
  });

  // Now append affixes
  item.affixes.forEach((a) => {
    // Only show affixes not already shown via stats (dedup the display)
    if (!lines.some((l) => l.text.includes(a.replace(/^\* /, '').split(' ')[0]))) {
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
  portraitOffset?: boolean;
  compareWithItem?: Item | null;
  compareLabel?: string;
  isUpgradeComparison?: boolean;
}

interface ItemTooltipContentProps {
  item: Item;
  placement: string;
  className: string;
  tooltipLines: { text: string; color: string; diffElement?: React.ReactNode }[];
  compareLabel?: string;
}

const ItemTooltipContent: React.FC<ItemTooltipContentProps> = ({
  item,
  placement,
  className,
  tooltipLines,
  compareLabel,
}) => {
  return (
    <div className={`gear-tooltip tooltip-${placement} ${className}`}>
      {compareLabel && (
        <div className="gear-tooltip-compare-header">
          {compareLabel}
        </div>
      )}
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
          {line.diffElement}
        </div>
      ))}
      <div className="gear-tooltip-divider" />
      <div className="gear-tooltip-slot">
        Slot: <strong>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</strong>
      </div>
      <div className="gear-tooltip-weight">
        Weight class: <strong>{item.weight === 'none' ? 'None' : item.weight === 'heavy' ? 'Heavy' : 'Light'}</strong>
      </div>
    </div>
  );
};

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ 
  item, 
  placement = 'right', 
  className = '',
  coords,
  portraitOffset = false,
  compareWithItem = null,
  compareLabel = 'Currently Equipped',
  isUpgradeComparison = false,
}) => {
  const tooltipLines = (compareWithItem && isUpgradeComparison)
    ? buildTooltipLines(item, null)
    : buildTooltipLines(item, compareWithItem);

  const equippedTooltipLines = compareWithItem
    ? (isUpgradeComparison 
        ? buildTooltipLines(compareWithItem, item) 
        : buildTooltipLines(compareWithItem, null))
    : [];
  
  if (tooltipLines.length === 0) return null;

  // Calculate dynamic dimensions for cursor protection
  const hasCompare = !!compareWithItem;
  const singleWidth = 240;
  const totalWidth = hasCompare ? (singleWidth * 2 + 12) : singleWidth;

  let style: React.CSSProperties = {};
  if (coords) {
    const hOffset = portraitOffset ? 60 : 15;
    let left = coords.x + hOffset;
    let top = coords.y - 50;
    
    if (typeof window !== 'undefined') {
      if (left + totalWidth > window.innerWidth) {
        left = coords.x - totalWidth - hOffset; // Flip to left of cursor
      }
      if (top + 250 > window.innerHeight) {
        top = window.innerHeight - 260;
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
      pointerEvents: 'none',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    };
  }

  return (
    <div 
      className={`gear-tooltip-wrapper ${coords ? 'fixed-coords' : ''} tooltip-${placement} ${className}`} 
      style={style}
    >
      <ItemTooltipContent 
        item={item} 
        placement={placement} 
        className={className} 
        tooltipLines={tooltipLines} 
      />
      {compareWithItem && (
        <ItemTooltipContent 
          item={compareWithItem} 
          placement={placement} 
          className={className} 
          tooltipLines={equippedTooltipLines} 
          compareLabel={compareLabel}
        />
      )}
    </div>
  );
};
