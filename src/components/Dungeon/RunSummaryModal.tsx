import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { Item } from '../../types/game';
import { ItemTooltip } from '../Hub/ItemTooltip';
import { Coins, Award, Sparkles, Home, ShieldAlert, CheckCircle2, Sword } from 'lucide-react';

export const RunSummaryModal: React.FC = () => {
  const { completedRunSummary, closeRunSummary, roster } = useGame();

  if (!completedRunSummary) return null;

  const { success, goldScavenged, itemsAcquired, powerupsSelected, currentBiome, currentChamber, heroDamageDealt } = completedRunSummary;

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
  };

  const handleReturn = () => {
    closeRunSummary();
  };

  const formatClassName = (cls: string) => {
    return cls.charAt(0) + cls.slice(1).toLowerCase();
  };

  const damageDealt = heroDamageDealt || {};

  return (
    <div className="summary-overlay">
      <div className="summary-board">
        {/* Victory/Defeat Banner Header */}
        <div className={`summary-header ${success ? 'victory' : 'defeat'}`}>
          <div className="summary-banner-icon">
            {success ? (
              <CheckCircle2 size={36} className="text-amber-400 animate-bounce" />
            ) : (
              <ShieldAlert size={36} className="text-red-500 animate-pulse" />
            )}
          </div>
          <h2 className="summary-banner-title">
            {success ? 'Expedition Successful' : 'Expedition Failed'}
          </h2>
          <p className="summary-banner-subtitle">
            Terminated in Biome {currentBiome}: Chamber {currentChamber}
          </p>
        </div>

        {/* Stats Columns Split */}
        <div className="summary-content-grid">
          {/* Left section: Gold Scavenged */}
          <div className="summary-card gold-card">
            <h4 className="summary-card-title">
              <Coins size={14} className="text-amber-500" /> Gold Scavenged
            </h4>
            <div className="summary-gold-amount">
              <span className="summary-gold-value">{goldScavenged}</span>
              <span className="summary-gold-lbl">g</span>
            </div>
            <p className="summary-gold-desc">Added directly to your treasury barracks.</p>
          </div>

          {/* Center section: Selected Powerups Breakdown */}
          <div className="summary-card powerups-card">
            <h4 className="summary-card-title">
              <Sparkles size={14} className="text-purple-400" /> Powerups Drafted
            </h4>
            <div className="summary-powerups-list">
              {powerupsSelected.length === 0 ? (
                <div className="summary-empty-text">No abilities drafted this run.</div>
              ) : (
                powerupsSelected.map((title, idx) => (
                  <div key={idx} className="summary-powerup-row">
                    <span className="summary-powerup-bullet">✦</span>
                    <span className="summary-powerup-name">{title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right section: Hero Damage breakdown */}
          <div className="summary-card damage-card">
            <h4 className="summary-card-title">
              <Sword size={14} className="text-red-400" /> Damage Dealt
            </h4>
            <div className="summary-damage-list">
              {Object.keys(damageDealt).length === 0 ? (
                <div className="summary-empty-text">No damage dealt this run.</div>
              ) : (
                Object.entries(damageDealt).map(([heroId, dmg]) => {
                  const hero = roster.find(h => h.character_id === heroId);
                  const className = hero ? formatClassName(hero.class) : 'Hero';
                  return (
                    <div key={heroId} className="summary-damage-row">
                      <div className="summary-damage-hero-info">
                        <span className="summary-damage-bullet">✦</span>
                        <span className="summary-damage-hero">{className}</span>
                      </div>
                      <span className="summary-damage-value">
                        {dmg.toLocaleString()}<span className="summary-damage-lbl"> dmg</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Loot Items Acquired */}
        <div className="summary-loot-container">
          <h4 className="summary-card-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', margin: '0 0 10px 0' }}>
            <Award size={14} className="text-green-400" /> Scavenged Loot Acquired
          </h4>
          <div className="summary-loot-list">
            {itemsAcquired.length === 0 ? (
              <div className="loot-empty-text" style={{ padding: '20px 0' }}>No equipment scavenged on this expedition.</div>
            ) : (
              itemsAcquired.map((item, idx) => (
                <div
                  key={idx}
                  className={`summary-loot-card border-rarity-${item.rarity.toLowerCase()}`}
                  onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeaveItem}
                >
                  <div className="summary-loot-header">
                    <span className={`summary-loot-name ${
                      item.rarity === 'Legendary' ? 'text-legendary'
                        : item.rarity === 'Epic' ? 'text-epic'
                        : item.rarity === 'Rare' ? 'text-rare'
                        : item.rarity === 'Uncommon' ? 'text-uncommon'
                        : 'text-white'
                    }`}>{item.name}</span>
                    <span className="summary-loot-slot">{item.type}</span>
                  </div>
                  <div className="summary-loot-stats">
                    {item.stats.hp && <span>+{item.stats.hp} HP </span>}
                    {item.stats.damage && <span>+{item.stats.damage} Atk </span>}
                    {item.stats.armor && <span>+{item.stats.armor} Arm </span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Return Button */}
        <div className="summary-footer-actions">
          <button className="deploy-btn-pronounced summary-return-btn" onClick={handleReturn}>
            <Home size={14} className="inline mr-1" /> Return To Town
          </button>
        </div>
      </div>
      {hoveredItem && <ItemTooltip item={hoveredItem} coords={mouseCoords} />}
    </div>
  );
};
export default RunSummaryModal;
