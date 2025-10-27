import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ audioUrl, duration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-message-player bg-gray-700 rounded-lg p-3 w-full max-w-xs">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />
      
      <div className="flex items-center space-x-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          {isPlaying ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white ml-0.5" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-300 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 0)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>
        
        <Volume2 size={16} className="text-gray-400" />
      </div>
    </div>
  );
};