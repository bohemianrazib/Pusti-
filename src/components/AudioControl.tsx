import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

export const AudioControl: React.FC = () => {
  const [isMuted, setIsMuted] = useState(audioEngine.getMute());

  const handleToggle = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    audioEngine.setMute(nextState);
    if (!nextState) {
      audioEngine.playClick();
      audioEngine.startAmbience();
    }
  };

  return (
    <button
      id="sound-toggle-btn"
      onClick={handleToggle}
      className={`p-2.5 rounded-full border transition-all duration-300 flex items-center justify-center cursor-pointer ${
        isMuted
          ? 'bg-crimson-900/40 border-crimson-800/30 text-gray-500 hover:text-gray-300'
          : 'bg-gold-500/15 border-gold-500/30 text-gold-400 hover:scale-105 shadow-[0_0_10px_rgba(201,160,59,0.15)]'
      }`}
      title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
    >
      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
};
