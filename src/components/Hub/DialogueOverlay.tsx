import React, { useState, useEffect, useRef } from 'react';
import type { DialogueLine } from '../../types/game';

interface DialogueOverlayProps {
  dialogue: DialogueLine[];
  onComplete: () => void;
}

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({ dialogue, onComplete }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  const currentLine = dialogue[currentLineIndex];
  const typingTimer = useRef<any>(null);

  useEffect(() => {
    if (!currentLine) return;
    
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    const fullText = currentLine.text;
    
    if (typingTimer.current) clearInterval(typingTimer.current);
    
    typingTimer.current = setInterval(() => {
      setDisplayedText((prev) => prev + fullText.charAt(index));
      index++;
      if (index >= fullText.length) {
        if (typingTimer.current) clearInterval(typingTimer.current);
        setIsTyping(false);
      }
    }, 15); // Snappy 15ms per character for an excellent game text feel

    return () => {
      if (typingTimer.current) clearInterval(typingTimer.current);
    };
  }, [currentLineIndex, currentLine]);

  const handleNext = () => {
    if (isTyping) {
      // Skip typing and show full text immediately
      if (typingTimer.current) clearInterval(typingTimer.current);
      setDisplayedText(currentLine.text);
      setIsTyping(false);
    } else {
      if (currentLineIndex < dialogue.length - 1) {
        setCurrentLineIndex(currentLineIndex + 1);
      } else {
        onComplete();
      }
    }
  };

  if (!currentLine) return null;

  return (
    <div className="dialogue-overlay-container" onClick={handleNext}>
      <div className="dialogue-backdrop" />
      
      <div className="dialogue-content-wrapper">
        {/* Character Portrait */}
        <div className="dialogue-portrait-container">
          <img 
            src={currentLine.portrait} 
            alt={currentLine.speaker} 
            className="dialogue-portrait-img" 
            onClick={(e) => e.stopPropagation()} // Prevent clicking the image from advancing dialogue twice
          />
        </div>

        {/* Speech / Text Box */}
        <div className="dialogue-speech-box" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
          <div className="dialogue-speaker-badge">
            {currentLine.speaker}
          </div>
          
          <div className="dialogue-text-content">
            {displayedText}
          </div>
          
          <div className="dialogue-next-indicator">
            {isTyping ? '...' : '▼'}
          </div>
        </div>
      </div>
    </div>
  );
};
