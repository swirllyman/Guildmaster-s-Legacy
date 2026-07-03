import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/Hub/MainMenu';
import { TownScene } from './components/Hub/TownScene';
import { CombatSimulation } from './components/Dungeon/CombatSimulation';
import { LevelUpDraft } from './components/Dungeon/LevelUpDraft';
import { RunSummaryModal } from './components/Dungeon/RunSummaryModal';
import { DialogueOverlay } from './components/Hub/DialogueOverlay';
import './App.css';

const MainAppContent: React.FC = () => {
  const { activeSlot, activeRun, completedRunSummary, activeDialogue, showNextDialogue } = useGame();

  if (activeSlot === null) {
    return <MainMenu />;
  }

  // If showing run summary, render summary overlay
  if (completedRunSummary) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 flex items-center justify-center select-none">
        <RunSummaryModal />
      </div>
    );
  }

  // If in a run, render run layout
  if (activeRun) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 flex flex-col gap-6 select-none relative">
        <LevelUpDraft />
        
        <CombatSimulation />

        {activeDialogue && (
          <DialogueOverlay dialogue={activeDialogue} onComplete={showNextDialogue} />
        )}
      </div>
    );
  }

  // Render Hub Lobby layout
  return (
    <div className="min-h-screen flex flex-col select-none relative">
      {/* Main Town District View */}
      <main className="flex-1 px-4 pt-4 pb-0 flex flex-col">
        <TownScene />
      </main>
      {activeDialogue && (
        <DialogueOverlay dialogue={activeDialogue} onComplete={showNextDialogue} />
      )}
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <MainAppContent />
    </GameProvider>
  );
}

export default App;
