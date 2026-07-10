import React, { useState, useEffect, useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/Hub/MainMenu';
import { TownScene } from './components/Hub/TownScene';
import { CombatSimulation } from './components/Dungeon/CombatSimulation';
import { LevelUpDraft } from './components/Dungeon/LevelUpDraft';
import { RunSummaryModal } from './components/Dungeon/RunSummaryModal';
import { DialogueOverlay } from './components/Hub/DialogueOverlay';
import { RotateCw, Smartphone } from 'lucide-react';
import { useIsMobile } from './hooks/useIsMobile';
import './App.css';

const GameScaleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Determine if the orientation is portrait
      setIsPortrait(h > w);

      // Target aspect ratio (16:9)
      const targetWidth = 1600;
      const targetHeight = 900;

      const scaleX = w / targetWidth;
      const scaleY = h / targetHeight;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
      setDimensions({ width: w, height: h });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }
      
      if (window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock('landscape');
      }
    } catch (err) {
      console.warn("Could not lock orientation automatically:", err);
    }
  };

  if (isMobile) {
    return (
      <div className="game-scale-wrapper is-mobile">
        <div className="game-mobile-content">
          {children}
        </div>
      </div>
    );
  }

  if (isPortrait) {
    return (
      <div className="orientation-warning-overlay">
        <div className="warning-content">
          <div className="warning-icon-wrapper">
            <Smartphone size={40} className="text-amber-500 absolute" />
            <RotateCw size={64} className="text-amber-500/40 animate-spin-slow" />
          </div>
          <h2 className="warning-title">Landscape Mode Required</h2>
          <p className="warning-desc">
            Guildmasters Legacy is optimized for landscape play. Please rotate your device to continue.
          </p>
          <button className="btn-fantasy btn-lock-orientation" onClick={handleRequestLandscape}>
            <RotateCw size={16} /> Force Landscape
          </button>
        </div>
      </div>
    );
  }

  const left = Math.max(0, Math.floor((dimensions.width - 1600 * scale) / 2));
  const top = Math.max(0, Math.floor((dimensions.height - 900 * scale) / 2));

  return (
    <div className="game-scale-wrapper">
      <div
        ref={containerRef}
        className="game-scale-content"
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: '1600px',
          height: '900px',
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: '0 0',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { activeSlot, activeRun, completedRunSummary, activeDialogue, showNextDialogue } = useGame();
  const isMobile = useIsMobile();

  if (activeSlot === null) {
    return <MainMenu />;
  }

  // If showing run summary, render summary overlay
  if (completedRunSummary) {
    return (
      <div className="bg-neutral-950 select-none" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '24px', boxSizing: 'border-box' }}>
        <RunSummaryModal />
      </div>
    );
  }

  // If in a run, render run layout
  if (activeRun) {
    return (
      <div 
        className="bg-neutral-950 select-none relative" 
        style={isMobile ? {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '6px',
          boxSizing: 'border-box'
        } : {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
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
    <div className="select-none relative" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* Main Town District View */}
      <main className="flex-1 px-4 pt-4 pb-0 flex flex-col" style={{ minHeight: 0 }}>
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
      <GameScaleWrapper>
        <MainAppContent />
      </GameScaleWrapper>
    </GameProvider>
  );
}

export default App;
