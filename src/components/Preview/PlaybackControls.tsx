import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  Repeat,
  Volume2,
  VolumeX
} from 'lucide-react';

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  onTogglePlay: () => void;
  onToggleLoop?: () => void;
  onToggleMute?: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (frames: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  isLooping = false,
  isMuted = false,
  onTogglePlay,
  onToggleLoop,
  onToggleMute,
  onSeek,
  onStepFrame,
}) => {
  // Format seconds to HH:MM:SS:FF
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  return (
    <div className="stage-playback-bar">
      {/* Timecode display */}
      <div className="timecode-display">
        <span className="timecode-current">{formatTimecode(currentTime)}</span>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span style={{ color: 'var(--text-muted)' }}>{formatTimecode(duration)}</span>
      </div>

      {/* Main Transport Controls */}
      <div className="playback-center">
        <button 
          className="transport-btn" 
          title="Jump to Start (Home)"
          onClick={() => onSeek(0)}
        >
          <SkipBack size={15} />
        </button>

        <button 
          className="transport-btn" 
          title="Previous Frame (Left Arrow)"
          onClick={() => onStepFrame(-1)}
        >
          <ChevronLeft size={16} />
        </button>

        <button 
          className="transport-btn play-btn" 
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
        </button>

        <button 
          className="transport-btn" 
          title="Next Frame (Right Arrow)"
          onClick={() => onStepFrame(1)}
        >
          <ChevronRight size={16} />
        </button>

        <button 
          className="transport-btn" 
          title="Jump to End (End)"
          onClick={() => onSeek(duration)}
        >
          <SkipForward size={15} />
        </button>
      </div>

      {/* Right toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          className={`transport-btn ${isLooping ? 'active' : ''}`}
          style={isLooping ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
          title={isLooping ? 'Disable Loop' : 'Enable Loop Playback'}
          onClick={onToggleLoop}
        >
          <Repeat size={14} />
        </button>
        <button 
          className={`transport-btn ${isMuted ? 'active' : ''}`}
          style={isMuted ? { color: '#ef4444', borderColor: '#ef4444' } : undefined}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          onClick={onToggleMute}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
};
