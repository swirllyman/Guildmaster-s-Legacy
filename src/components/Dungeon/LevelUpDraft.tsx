import React from 'react';
import { useGame } from '../../context/GameContext';
import { Shield, Sparkles, Sword, Heart, Activity, Zap } from 'lucide-react';

export const LevelUpDraft: React.FC = () => {
  const { activeRun, triggerDraftChoice } = useGame();

  if (!activeRun || !activeRun.drafting) return null;

  const handleSelect = (index: number) => {
    triggerDraftChoice(index);
  };

  const getCardIcon = (type: 'stat' | 'skill' | 'heal', classTag?: string) => {
    if (classTag === 'WARRIOR') return <Shield className="text-blue-400" size={28} />;
    if (classTag === 'RANGER') return <Sword className="text-green-400" size={28} />;
    if (classTag === 'WIZARD') return <Zap className="text-purple-400" size={28} />;
    
    if (type === 'heal') return <Heart className="text-red-400" size={28} />;
    return <Activity className="text-amber-400" size={28} />;
  };

  const getCardThemeClass = (classTag?: string) => {
    if (classTag === 'WARRIOR') return 'border-blue-500/40 hover:border-blue-400 bg-blue-950/10';
    if (classTag === 'RANGER') return 'border-green-500/40 hover:border-green-400 bg-green-950/10';
    if (classTag === 'WIZARD') return 'border-purple-500/40 hover:border-purple-400 bg-purple-950/10';
    return 'border-amber-500/40 hover:border-amber-400 bg-amber-950/10';
  };

  return (
    <div className="draft-overlay-container">
      <div className="draft-board-container">
        {/* Header */}
        <div className="draft-board-header">
          <span className="draft-header-label">
            <Sparkles size={12} className="animate-spin text-amber-400" /> Team Level Increased
          </span>
          <h2 className="draft-header-title">Draft Team Ability</h2>
          <p className="draft-header-desc">
            Choose one passive enhancement or tactical support line. The ability applies directly to surviving team members.
          </p>
        </div>

        {/* 3-Card Array */}
        <div className="draft-cards-grid">
          {activeRun.draftChoices.map((choice, index) => {
            const isClassSpecific = !!choice.classTag;
            const themeClass = getCardThemeClass(choice.classTag);

            return (
              <div
                key={choice.id}
                className={`draft-card-wrapper ${themeClass}`}
                onClick={() => handleSelect(index)}
              >
                {/* Visual Icon */}
                <div className="draft-card-icon-box">
                  {getCardIcon(choice.type, choice.classTag)}
                </div>

                {/* Tags */}
                {isClassSpecific ? (
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
