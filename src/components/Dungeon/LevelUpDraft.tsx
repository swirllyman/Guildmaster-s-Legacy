import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { POWERUP_DESCRIPTIONS } from '../../types/game';
import { Shield, Sparkles, Sword, Heart, Activity, Zap, Layers } from 'lucide-react';

export const LevelUpDraft: React.FC = () => {
  const { activeRun, roster, triggerDraftChoice } = useGame();

  const [isAutoDraftActive, setIsAutoDraftActive] = useState<boolean>(() => {
    return localStorage.getItem('autoDraftActive') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('autoDraftActive', isAutoDraftActive ? 'true' : 'false');
  }, [isAutoDraftActive]);

  const [autoDraftCountdown, setAutoDraftCountdown] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    triggerDraftChoice(index);
  };

  // 1. Reset/initialize auto draft countdown if conditions change
  useEffect(() => {
    if (!isAutoDraftActive || !activeRun || !activeRun.drafting || !activeRun.draftChoices || activeRun.draftChoices.length === 0) {
      setAutoDraftCountdown(null);
      return;
    }

    if (autoDraftCountdown === null) {
      setAutoDraftCountdown(3);
    }
  }, [isAutoDraftActive, activeRun?.drafting, activeRun?.draftChoices, autoDraftCountdown]);

  // 2. Countdown ticking mechanism
  useEffect(() => {
    if (autoDraftCountdown === null || !activeRun) return;

    const run = activeRun;

    if (autoDraftCountdown === 0) {
      // Evaluate draft choices and find the best one
      let bestIndex = 0;
      let highestScore = -Infinity;

      run.draftChoices.forEach((choice, index) => {
        let score = 0;

        // 1. Synergy upgrades get the highest priority
        if (choice.synergyClasses && choice.synergyClasses.length > 0) {
          score += 100;
        }

        // 2. Class-specific active skills
        if (choice.classTag && choice.type === 'skill') {
          score += 50;
        }

        // 3. Stat upgrades
        if (choice.type === 'stat') {
          score += 30;
        }

        // 4. Heals (elevated dynamically based on party HP)
        if (choice.type === 'heal') {
          let totalHp = 0;
          let totalMaxHp = 0;
          if (run.livingSquad) {
            Object.values(run.livingSquad).forEach((hero: any) => {
              if (hero.hp > 0) {
                totalHp += hero.hp;
                totalMaxHp += hero.maxHp;
              }
            });
          }
          const avgHpRatio = totalMaxHp > 0 ? (totalHp / totalMaxHp) : 1;
          
          if (avgHpRatio < 0.4) {
            score += 120; // Critical healing need
          } else if (avgHpRatio < 0.7) {
            score += 40;  // Moderate healing need
          } else {
            score += 10;  // Low healing need
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestIndex = index;
        }
      });

      handleSelect(bestIndex);
      setAutoDraftCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoDraftCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoDraftCountdown, activeRun]);

  if (!activeRun || !activeRun.drafting) return null;

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

  const selectedPowerups = activeRun.selectedPowerups ?? [];
  const stackedPowerups = selectedPowerups.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const getCardIcon = (type: 'stat' | 'skill' | 'heal', classTag?: string, isSynergy?: boolean) => {
    if (isSynergy) return <Layers className="text-fuchsia-400" size={28} />;
    if (classTag === 'WARRIOR') return <Shield className="text-blue-400" size={28} />;
    if (classTag === 'PALADIN') return <Shield className="text-yellow-400" size={28} />;
    if (classTag === 'RANGER') return <Sword className="text-green-400" size={28} />;
    if (classTag === 'DRUID') return <Activity className="text-emerald-400" size={28} />;
    if (classTag === 'WIZARD') return <Zap className="text-purple-400" size={28} />;
    if (classTag === 'NECROMANCER') return <Zap className="text-fuchsia-400" size={28} />;
    if (classTag === 'ROGUE') return <Sword className="text-red-400" size={28} />;
    
    if (type === 'heal') return <Heart className="text-red-400" size={28} />;
    return <Activity className="text-amber-400" size={28} />;
  };

  const getCardThemeClass = (classTag?: string) => {
    if (classTag === 'WARRIOR' || classTag === 'PALADIN') return 'card-warrior';
    if (classTag === 'RANGER' || classTag === 'DRUID' || classTag === 'ROGUE') return 'card-ranger';
    if (classTag === 'WIZARD' || classTag === 'NECROMANCER') return 'card-wizard';
    return 'card-generic';
  };

  return (
    <div className="draft-overlay-container">
      <div className="draft-board-container">
        {/* Header */}
        <div className="draft-board-header" style={{ position: 'relative' }}>
          <span className="draft-header-label">
            <Sparkles size={12} className="animate-spin text-amber-400" /> Team Level Increased
          </span>
          <h2 className="draft-header-title" style={{ marginBottom: '8px' }}>Draft Team Ability</h2>
          
          <label className={`auto-camp-toggle-container ${isAutoDraftActive ? 'active' : ''}`} style={{ marginBottom: '12px' }}>
            <input
              type="checkbox"
              className="auto-camp-checkbox"
              checked={isAutoDraftActive}
              onChange={(e) => setIsAutoDraftActive(e.target.checked)}
            />
            <span>
              Auto-Select Best Powerup
              {autoDraftCountdown !== null && (
                <span className="text-amber-400/80 text-[10px] ml-1 font-mono">
                  (Selecting in {autoDraftCountdown}s...)
                </span>
              )}
            </span>
          </label>
        </div>

        {/* Squad Status & Selected Powerups Dashboard */}
        <div className="draft-status-dashboard">
          {/* Left Panel: Current Party Health */}
          <div className="draft-status-panel">
            <div className="draft-panel-header">
              <span className="draft-panel-title">
                <Heart size={14} className="text-red-400 animate-pulse" /> Current Party Health
              </span>
              <span className="draft-panel-badge">
                {Object.keys(activeRun.livingSquad).filter(id => activeRun.livingSquad[id].hp > 0).length} Alive
              </span>
            </div>
            
            <div className="draft-hp-list">
              {Object.keys(activeRun.livingSquad).map(id => {
                const hero = roster.find(h => h.character_id === id);
                if (!hero) return null;
                const runHero = activeRun.livingSquad[id];
                const isDead = runHero.hp <= 0;
                const hpRatio = Math.max(0, Math.min(1, runHero.hp / runHero.maxHp));
                const displayClass = hero.class === 'WIZARD' ? 'SORCERESS' : hero.class;

                return (
                  <div key={id} className={`draft-hp-row ${isDead ? 'deceased' : ''}`}>
                    <img 
                      src={getAvatarPath(hero.class)} 
                      alt={displayClass} 
                      className="draft-hp-avatar" 
                    />
                    <div className="draft-hp-info">
                      <div className="draft-hp-top-line">
                        <span className="draft-hp-name">{displayClass}</span>
                        <span className={`draft-hp-numbers ${isDead ? 'text-red-500 font-bold' : ''}`}>
                          {isDead ? 'DECEASED' : `${runHero.hp} / ${runHero.maxHp} HP`}
                        </span>
                      </div>
                      <div className="draft-hp-bar-bg">
                        <div 
                          className="draft-hp-bar-fill" 
                          style={{ 
                            width: `${hpRatio * 100}%`,
                            background: hpRatio > 0.5 
                              ? 'linear-gradient(90deg, #10b981, #34d399)' 
                              : hpRatio > 0.2 
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' 
                              : 'linear-gradient(90deg, #ef4444, #f87171)'
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Current Powerups Drafted */}
          <div className="draft-status-panel">
            <div className="draft-panel-header">
              <span className="draft-panel-title">
                <Layers size={14} className="text-purple-400" /> Active Powerups Drafted
              </span>
              <span className="draft-panel-badge gold">
                {selectedPowerups.length} Total
              </span>
            </div>

            <div className="draft-powerups-list">
              {Object.keys(stackedPowerups).length === 0 ? (
                <div className="draft-powerups-empty">
                  <span>No persistent powerups drafted yet.</span>
                </div>
              ) : (
                Object.entries(stackedPowerups).map(([powerup, count], idx) => {
                   const isSynergy = ['Marked for Death', 'Quick Burn', 'Fire Armor'].includes(powerup);
                   const isDefense = !isSynergy && (powerup.includes('Shield') || powerup.includes('Defense') || powerup.includes('Will') || powerup.includes('Iron') || powerup.includes('Block') || powerup.includes('Ursine') || powerup.includes('Devotion') || powerup.includes('Evasive'));
                   const isAttack = !isSynergy && (powerup.includes('Shot') || powerup.includes('Sharpshooter') || powerup.includes('Slam') || powerup.includes('Blade') || powerup.includes('Poison') || powerup.includes('Charge') || powerup.includes('Feral') || powerup.includes('Horde') || powerup.includes('Magi') || powerup.includes('Explosion') || powerup.includes('Shadowstep') || powerup.includes('Adrenaline'));
                   const isMagic = !isSynergy && (powerup.includes('Mana') || powerup.includes('Fireball') || powerup.includes('Strike') || powerup.includes('Clarity') || powerup.includes('Aura') || powerup.includes('Poisoning'));
                   const isHeal = !isSynergy && (powerup.includes('Rejuvenate') || powerup.includes('Second Wind') || powerup.includes('Shift'));
                  const desc = POWERUP_DESCRIPTIONS[powerup] || 'Active team enhancement';

                  return (
                    <div 
                      key={`${powerup}-${idx}`}
                      className="draft-powerup-pill"
                    >
                      {isSynergy && <Layers className="text-fuchsia-400 flex-shrink-0" size={13} />}
                      {isDefense && <Shield className="text-blue-400 flex-shrink-0" size={13} />}
                      {isAttack && <Sword className="text-green-400 flex-shrink-0" size={13} />}
                      {isMagic && <Zap className="text-purple-400 flex-shrink-0" size={13} />}
                      {isHeal && <Heart className="text-red-400 flex-shrink-0" size={13} />}
                      {!isSynergy && !isDefense && !isAttack && !isMagic && !isHeal && <Sparkles className="text-amber-400 flex-shrink-0" size={13} />}
                      
                      <span className="draft-powerup-pill-name">{powerup}</span>
                      {count > 1 && <span className="draft-powerup-pill-badge">x{count}</span>}

                      <div className="draft-powerup-tooltip">
                        {desc}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3-Card Array */}
        <div className="draft-cards-grid">
          {activeRun.draftChoices.map((choice, index) => {
            const isSynergy = !!choice.synergyClasses && choice.synergyClasses.length > 0;
            const isClassSpecific = !!choice.classTag;
            let themeClass = '';
            if (isSynergy) {
              themeClass = 'card-synergy';
            } else {
              themeClass = getCardThemeClass(choice.classTag);
            }

            return (
              <div
                key={choice.id}
                className={`draft-card-wrapper ${themeClass}`}
                onClick={() => handleSelect(index)}
              >
                {/* Visual Icon */}
                <div className="draft-card-icon-box">
                  {getCardIcon(choice.type, choice.classTag, isSynergy)}
                </div>

                {/* Tags */}
                {isSynergy ? (
                  <span className="draft-card-tag card-synergy-tag">
                    Synergy Upgrade
                  </span>
                ) : isClassSpecific ? (
                  <span className="draft-card-tag class-specific">
                    {choice.classTag === 'WIZARD' ? 'SORCERESS' : choice.classTag} Upgrade
                  </span>
                ) : (
                  <span className="draft-card-tag squad-support">
                    Squad Support
                  </span>
                )}

                {/* Text Description */}
                <div className="draft-card-text-block">
                  <h3 className="draft-card-title">
                    {choice.title}
                  </h3>
                  <p className="draft-card-desc">
                    {choice.description}
                  </p>
                </div>

                <button className="draft-card-select-btn">
                  Select Card
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default LevelUpDraft;
