import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  onProgress?: (progress: { played: number; playedSeconds: number }) => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

/**
 * Enhanced Video Player Component
 * Features: adaptive streaming, progress tracking, error handling, analytics
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  poster,
  title,
  className = '',
  autoPlay = false,
  controls = true,
  muted = false,
  loop = false,
  onProgress,
  onEnded,
  onError
}) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  // Handle progress
  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setProgress(state.played);
    setCurrentTime(state.playedSeconds);
    setBuffered(state.loaded);

    if (onProgress) {
      onProgress(state);
    }
  };

  // Handle duration
  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  // Handle play/pause
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    setHasPlayed(true);
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !playerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;

    playerRef.current.seekTo(percentage, 'fraction');
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  // Handle fullscreen
  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle error
  const handleError = (e: any) => {
    console.error('Video player error:', e);
    setError('Failed to load video. Please try again.');
    if (onError) {
      onError(e);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}
    >
      {error ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#fff',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <span>{error}</span>
        </div>
      ) : (
        <ReactPlayer
          ref={playerRef}
          url={url}
          poster={poster}
          playing={isPlaying}
          controls={false}
          muted={muted}
          loop={loop}
          volume={volume}
          playbackRate={playbackRate}
          width="100%"
          height="100%"
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={onEnded}
          onError={handleError}
          progressInterval={100}
          config={{
            file: {
              attributes: {
                preload: 'metadata'
              },
              forceVideo: true
            }
          }}
          style={{ background: '#000' }}
        />
      )}

      {/* Custom Controls */}
      {controls && !error && (
        <div
          className={`video-controls ${showControls ? 'visible' : 'hidden'}`}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            padding: '1rem',
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Progress Bar */}
          <div
            className="progress-bar"
            style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              borderRadius: '2px',
              position: 'relative'
            }}
            onClick={handleSeek}
          >
            <div
              className="progress-bar-played"
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: '#fff',
                borderRadius: '2px',
                position: 'relative'
              }}
            >
              <div
                className="progress-bar-thumb"
                style={{
                  position: 'absolute',
                  right: '-6px',
                  top: '-4px',
                  width: '12px',
                  height: '12px',
                  background: '#fff',
                  borderRadius: '50%'
                }}
              />
            </div>
            <div
              className="progress-bar-buffered"
              style={{
                width: `${buffered * 100}%`,
                height: '100%',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '2px',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
          </div>

          {/* Control Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: '#fff'
          }}>
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {isPlaying ? '⏸' : '▶️'}
            </button>

            {/* Time */}
            <span style={{ fontSize: '0.875rem', minWidth: '100px' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: '80px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              style={{
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: 0,
                marginLeft: 'auto'
              }}
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!hasPlayed && !isPlaying && !error && (
        <div
          className="play-button-overlay"
          onClick={handlePlayPause}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'opacity 0.3s ease'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            transition: 'transform 0.2s ease'
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ▶️
          </div>
        </div>
      )}

      <style jsx>{`
        .video-player-container {
          overflow: hidden;
          border-radius: 8px;
        }

        .video-controls.hidden {
          opacity: 0 !important;
        }

        .progress-bar:hover .progress-bar-thumb {
          transform: scale(1.2);
        }

        .play-button-overlay:hover {
          background: rgba(0,0,0,0.7);
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;