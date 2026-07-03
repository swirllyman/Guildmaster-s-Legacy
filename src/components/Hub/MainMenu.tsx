import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Settings, Trash2, Volume2, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';

export const MainMenu: React.FC = () => {
  const {
    loadSaveSlot,
    deleteSaveSlot,
    getSaveSlotSummary
  } = useGame();

  const [view, setView] = useState<'main' | 'play' | 'options'>('main');
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  // Options State
  const [sfxVolume, setSfxVolume] = useState(() => Number(localStorage.getItem('gl_opt_sfxVolume') || '80'));
  const [musicVolume, setMusicVolume] = useState(() => Number(localStorage.getItem('gl_opt_musicVolume') || '70'));
  const [gameSpeed, setGameSpeed] = useState(() => localStorage.getItem('gl_opt_gameSpeed') || '1x');
  const [logDetail, setLogDetail] = useState(() => localStorage.getItem('gl_opt_logDetail') || 'Verbose');
  const [gfxQuality, setGfxQuality] = useState(() => localStorage.getItem('gl_opt_gfxQuality') || 'High');

  const handleSaveOption = (key: string, value: string | number) => {
    localStorage.setItem(key, String(value));
  };

  const handleResetAllData = () => {
    [1, 2, 3].forEach(slot => deleteSaveSlot(slot));
    setResetConfirm(false);
    setView('main');
  };

  const getHeroSprite = (heroClass: string) => {
    const spriteMap: Record<string, string> = {
      RANGER: '/ranger.png',
      WARRIOR: '/warrior_chef.png',
      WIZARD: '/sorceress.png',
      ROGUE: '/ranger.png',
      PALADIN: '/warrior.png',
      DRUID: '/ranger.png',
      NECROMANCER: '/wizard.png'
    };
    return spriteMap[heroClass] || '/ranger.png';
  };


  return (
    <div className="main-menu-container">
      {/* 1. Living Animated Gothic Background Layer */}
      <div className={`menu-bg-art ${view !== 'main' ? 'blurred' : ''}`} />
      
      {/* Floating Ember Particles Overlay */}
      <div className="ember-particle-field">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className={`ember-particle ember-${(i % 4) + 1}`} />
        ))}
      </div>

      <div className="menu-inner-overlay">
        {/* Top: Large Pulsing Medieval Game Title Logo */}
        {view === 'main' && (
          <div className="menu-header">
            <img src="/game_title.png" alt="Guildmaster's Legacy" className="menu-title-logo animate-pulse-slow" />
          </div>
        )}

        {/* Dynamic Center Panels based on View */}
        <div className="menu-content-viewport">
          {view === 'main' && (
            <div className="menu-main-actions">
              <button 
                onClick={() => setView('play')}
                className="menu-pronounced-btn play-btn"
              >
                <Play size={18} className="inline mr-2" /> Play Campaign
              </button>
              <button 
                onClick={() => setView('options')}
                className="menu-pronounced-btn options-btn"
              >
                <Settings size={18} className="inline mr-2" /> Options
              </button>
            </div>
          )}

          {view === 'play' && (
            <div className="menu-panel-layout animate-fade-in">
              <h3 className="menu-panel-title">✦ Choose Save Slot ✦</h3>
              
              <div className="save-slots-grid">
                {[1, 2, 3].map(slotNum => {
                  const summary = getSaveSlotSummary(slotNum);
                  return (
                    <div key={slotNum} className="save-slot-wrapper">
                      {summary.empty ? (
                        <div 
                          className="save-slot-card empty hover:scale-102 transition duration-200 cursor-pointer"
                          onClick={() => loadSaveSlot(slotNum)}
                        >
                          <div className="slot-number-badge">Slot {slotNum}</div>
                          <Sparkles size={24} className="text-gray-600 mb-2 animate-pulse" />
                          <span className="slot-empty-title">Empty Save</span>
                          <span className="slot-empty-desc">Begin a fresh adventure</span>
                        </div>
                      ) : (
                        <div 
                          className="save-slot-card occupied hover:scale-102 transition duration-200 cursor-pointer"
                          onClick={() => loadSaveSlot(slotNum)}
                        >
                          <div className="slot-number-badge occupied">Slot {slotNum}</div>
                          
                          {/* Squad circles */}
                          <div className="slot-squad-row">
                            {summary.squadClasses.map((heroClass, idx) => (
                              <div 
                                key={idx} 
                                className="slot-hero-circle"
                                title={heroClass}
                              >
                                <img 
                                  src={getHeroSprite(heroClass)} 
                                  alt={heroClass}
                                  className="slot-hero-sprite"
                                />
                              </div>
                            ))}
                            {summary.squadClasses.length === 0 && (
                              <div className="slot-hero-circle empty">
                                <span className="text-gray-600">-</span>
                              </div>
                            )}
                          </div>

                          <div className="slot-stats-lines">
                            <div className="slot-stat-row">
                              <span className="slot-stat-label">Heroes</span>
                              <span className="slot-stat-value gold">{summary.unlockedHeroesCount}/{summary.totalHeroesCount}</span>
                            </div>
                            <div className="slot-stat-row">
                              <span className="slot-stat-label">Crawls</span>
                              <span className="slot-stat-value white">{summary.runsCount}</span>
                            </div>
                            <div className="slot-stat-row">
                              <span className="slot-stat-label">Gold</span>
                              <span className="slot-stat-value yellow">{summary.gold}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <button 
                        disabled={summary.empty}
                        onClick={() => setDeleteConfirmSlot(slotNum)}
                        className={`slot-delete-btn ${summary.empty ? 'disabled' : 'active'}`}
                      >
                        <Trash2 size={11} className="inline mr-1" /> Delete
                      </button>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setView('main')}
                className="menu-back-btn mt-6"
              >
                Back to Title
              </button>
            </div>
          )}

          {view === 'options' && (
            <div className="menu-panel-layout animate-fade-in max-w-lg w-full">
              <h3 className="menu-panel-title">✦ Settings Options ✦</h3>
              
              <div className="options-panel-scroll">
                {/* 1. Audio Mockup Volumes */}
                <div className="options-row border-b border-gray-900 py-3">
                  <div className="options-row-left">
                    <span className="options-label">Music Volume</span>
                    <span className="options-sub">Adjust ambient background music</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-gray-500" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={musicVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMusicVolume(val);
                        handleSaveOption('gl_opt_musicVolume', val);
                      }}
                      className="volume-slider"
                    />
                    <span className="slider-val font-fantasy text-xs text-amber-500 w-8">{musicVolume}%</span>
                  </div>
                </div>

                <div className="options-row border-b border-gray-900 py-3">
                  <div className="options-row-left">
                    <span className="options-label">SFX Volume</span>
                    <span className="options-sub">Combat swings and button triggers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-gray-500" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={sfxVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSfxVolume(val);
                        handleSaveOption('gl_opt_sfxVolume', val);
                      }}
                      className="volume-slider"
                    />
                    <span className="slider-val font-fantasy text-xs text-amber-500 w-8">{sfxVolume}%</span>
                  </div>
                </div>

                {/* 2. Simulation Speed Preferences */}
                <div className="options-row border-b border-gray-900 py-3">
                  <div className="options-row-left">
                    <span className="options-label">Default Combat Speed</span>
                    <span className="options-sub">Initial speed multiplier when entering chambers</span>
                  </div>
                  <div className="flex gap-1.5">
                    {['1x', '2x', '3x', '5x', '10x'].map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setGameSpeed(speed);
                          handleSaveOption('gl_opt_gameSpeed', speed);
                        }}
                        className={`opt-toggle-btn ${gameSpeed === speed ? 'active' : ''}`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Detail Logs Preference */}
                <div className="options-row border-b border-gray-900 py-3">
                  <div className="options-row-left">
                    <span className="options-label">Combat Log Detail</span>
                    <span className="options-sub">Size of the rolling sidebar log outputs</span>
                  </div>
                  <div className="flex gap-1.5">
                    {['Concise', 'Verbose'].map(detail => (
                      <button
                        key={detail}
                        onClick={() => {
                          setLogDetail(detail);
                          handleSaveOption('gl_opt_logDetail', detail);
                        }}
                        className={`opt-toggle-btn ${logDetail === detail ? 'active' : ''}`}
                      >
                        {detail}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Canvas Quality Preference */}
                <div className="options-row border-b border-gray-900 py-3">
                  <div className="options-row-left">
                    <span className="options-label">Graphics Scaling</span>
                    <span className="options-sub">Anti-aliasing quality of game sprites</span>
                  </div>
                  <div className="flex gap-1.5">
                    {['High', 'Medium', 'Retro'].map(quality => (
                      <button
                        key={quality}
                        onClick={() => {
                          setGfxQuality(quality);
                          handleSaveOption('gl_opt_gfxQuality', quality);
                        }}
                        className={`opt-toggle-btn ${gfxQuality === quality ? 'active' : ''}`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Wipe caching */}
                <div className="options-row py-4">
                  <div className="options-row-left">
                    <span className="options-label text-red-400 font-bold">Wipe Hard Cache</span>
                    <span className="options-sub">Delete all 3 save slots permanently</span>
                  </div>
                  <button 
                    onClick={() => setResetConfirm(true)}
                    className="opt-reset-btn"
                  >
                    <RotateCcw size={12} className="inline mr-1" /> Reset All Data
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setView('main')}
                className="menu-back-btn mt-6"
              >
                Back to Title
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlot !== null && (
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <ShieldAlert size={36} className="text-red-500 mb-2 animate-bounce" />
            <h4 className="menu-modal-title">Irreversible Action!</h4>
            <p className="menu-modal-desc">
              You are about to delete all progress in <strong>Save Slot {deleteConfirmSlot}</strong>.<br />
              All gold, item rolls, and unlocked classes will be deleted permanently.
            </p>
            <div className="menu-modal-actions">
              <button 
                onClick={() => setDeleteConfirmSlot(null)}
                className="modal-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteSaveSlot(deleteConfirmSlot);
                  setDeleteConfirmSlot(null);
                }}
                className="modal-confirm-btn"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Data Confirmation Modal */}
      {resetConfirm && (
        <div className="menu-modal-overlay">
          <div className="menu-modal-card">
            <ShieldAlert size={36} className="text-red-500 mb-2 animate-bounce" />
            <h4 className="menu-modal-title">Reset All Progress?</h4>
            <p className="menu-modal-desc">
              This will completely wipe <strong>all three save slots</strong> and reset your options.<br />
              This cannot be undone. Are you sure you wish to proceed?
            </p>
            <div className="menu-modal-actions">
              <button 
                onClick={() => setResetConfirm(false)}
                className="modal-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetAllData}
                className="modal-confirm-btn"
              >
                Confirm Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
