import React from 'react';
import { useGame } from '../../context/GameContext';
import { ChefHat, MessageSquare, ArrowRight, UserPlus } from 'lucide-react';

export const TownChef: React.FC = () => {
  const { talkToTownChef, questState } = useGame();

  const handleTalk = () => {
    talkToTownChef();
  };

  const getStepIndicator = () => {
    switch (questState.chefQuestStep) {
      case 0: return 'Step 1: Speak with Chef';
      case 1: return 'Step 2: Investigate Biome 1';
      case 2: return 'Step 3: Rescue from Dungeon Cage';
      case 3: return 'Quest Complete: Warrior Recruited';
      default: return 'Quest Complete';
    }
  };

  return (
    <div className="tavern-panel">
      {/* Tavern Header */}
      <div className="tavern-header">
        <div className="tavern-header-left">
          <ChefHat size={28} className="text-amber-500" />
          <div>
            <h2 className="tavern-title">The Rusty Ladle Tavern</h2>
            <div className="tavern-subtitle">Town Chef & Retired iron vanguard shield-bearer.</div>
          </div>
        </div>
        <span className="tavern-quest-badge">
          {getStepIndicator()}
        </span>
      </div>

      {/* Tavern Dialogue Bubble */}
      <div className="tavern-dialogue-bubble">
        <div className="tavern-avatar-icon">
          <ChefHat size={22} />
        </div>
        <div className="tavern-dialogue-text">
          <p className="tavern-dialogue-line speaker-chef">
            {questState.chefQuestStep === 3 
              ? "Welcome back to the ladle, Guildmaster! The hearth is warm and my shield is ready."
              : "Welcome, traveler. If you have a minute, I could use some help..."}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {questState.chefQuestStep === 3 
              ? "The Warrior Chef has joined your roster."
              : "Click below to talk to the Chef and hear his request."}
          </p>
        </div>
      </div>

      {/* Actions and Rewards */}
      <div className="tavern-footer">
        <div className="tavern-rewards-desc">
          Quest rewards: Recruiting the **Warrior class (Tank)**, allowing you to deploy two-character squad loadouts.
        </div>
        <button
          className="deploy-btn-pronounced"
          onClick={handleTalk}
          style={{ padding: '6px 14px', fontSize: '0.8rem', marginTop: 0 }}
        >
          <MessageSquare size={12} className="inline mr-1" /> Talk to Chef <ArrowRight size={10} className="inline ml-1" />
        </button>
      </div>

      {questState.chefQuestStep === 3 && (
        <div className="tavern-unlocked-card animate-fade-in">
          <div className="tavern-unlocked-icon">
            <UserPlus size={18} />
          </div>
          <div className="tavern-unlocked-text-block">
            <h4 className="tavern-unlocked-title">Warrior Class Unlocked!</h4>
            <p className="tavern-unlocked-desc">
              The retired Vanguard Soldier has joined your barracks. Deploy him from the **Strategy Table** to defend your squad.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
