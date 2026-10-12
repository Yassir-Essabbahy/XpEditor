import React, { useRef, useState, useEffect } from 'react';
import { 
  Scissors, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Magnet,
  Volume2,
  Layers,
  AppWindow,
  MousePointer,
  ImageIcon,
  Clock,
  Diamond,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { CanvasElement, Track, Keyframe, AssistantElement } from '../../types/editor';
import { 
  addOrUpdateKeyframe, 
  getAnimatedElementProps,
  getPrevKeyframeProjectTime, 
  getNextKeyframeProjectTime,
  addOrUpdateDialogueKeyframe,
  evaluateAssistantDialogue
} from '../../utils/keyframeAnimation';

interface TimelineProps {
  elements: CanvasElement[];
  currentTime: number;
  duration: number;
  zoom: number;
  selectedElementId: string | null;
  onSeek: (time: number) => void;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onSplitClip: (id: string, splitTime: number) => void;
  onZoomChange: (zoom: number) => void;
  onExtendDuration?: (newDuration: number) => void;
  onInteractionStart?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  elements,
  currentTime,
  duration,
  zoom,
  selectedElementId,
  onSeek,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onSplitClip,
  onZoomChange,
  onExtendDuration,
  onInteractionStart,
}) => {
  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true);

  // Moving clip state
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    startX: number;
    origStart: number;
    duration: number;
  } | null>(null);

  // Trimming clip state
  const [trimmingClip, setTrimmingClip] = useState<{
    id: string;
    edge: 'left' | 'right';
    startX: number;
    origStart: number;
    origDuration: number;
  } | null>(null);

  // Keyframe interaction state
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{
    elementId: string;
    keyframeId: string;
    startX: number;
    origTime: number;
    duration: number;
  } | null>(null);

  // 4 Standard multi-track timeline lanes
  const tracks: Track[] = [
    { id: 'track-4', name: 'Audio & SFX', type: 'audio', color: '#10b981' },
    { id: 'track-3', name: 'Overlays & Cursors', type: 'overlay', color: '#f59e0b' },
    { id: 'track-2', name: 'XP Windows & Apps', type: 'video', color: '#3b82f6' },
    { id: 'track-1', name: 'Wallpaper & Desktop', type: 'video', color: '#8b5cf6' },
  ];

  // Pixels per second based on zoom factor
  const pps = 45 * zoom; 
  const timelineWidth = Math.max(1000, duration * pps + 200);

  // Time ruler ticks (adaptive step for any duration)
  const rulerTicks = [];
  const tickStep = duration > 120 ? 10 : duration > 60 ? 5 : duration > 30 ? 2 : 1;
  for (let s = 0; s <= duration; s += tickStep) {
    rulerTicks.push(s);
  }

  // Snapping points calculation
  const getSnapPoints = (excludeId?: string) => {
    const points = [0, currentTime, duration];
    elements.forEach((el) => {
      if (el.id !== excludeId) {
        points.push(el.startTime);
        points.push(el.startTime + el.duration);
      }
    });
    return points;
  };

  const snapTime = (time: number, excludeId?: string, thresholdSec = 0.15) => {
    if (!isSnapping) return time;
    const points = getSnapPoints(excludeId);
    for (const pt of points) {
      if (Math.abs(time - pt) <= thresholdSec) {
        return pt;
      }
    }
    return time;
  };

  // Scrubbing on Ruler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let newTime = Math.max(0, Math.min(duration, clickX / pps));
    newTime = snapTime(newTime);
    onSeek(Number(newTime.toFixed(2)));
    setIsScrubbing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Scrubbing
      if (isScrubbing && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        let newTime = Math.max(0, Math.min(duration, clickX / pps));
        newTime = snapTime(newTime);
        onSeek(Number(newTime.toFixed(2)));
      }

      // 2. Moving Clip
      else if (draggingClip) {
        const deltaSec = (e.clientX - draggingClip.startX) / pps;
        let proposedStart = Math.max(0, draggingClip.origStart + deltaSec);

        // Snap start or end
        if (isSnapping) {
          const snappedStart = snapTime(proposedStart, draggingClip.id);
          if (snappedStart !== proposedStart) {
            proposedStart = snappedStart;
          } else {
            const proposedEnd = proposedStart + draggingClip.duration;
            const snappedEnd = snapTime(proposedEnd, draggingClip.id);
            if (snappedEnd !== proposedEnd) {
              proposedStart = Math.max(0, snappedEnd - draggingClip.duration);
            }
          }
        }

        const clipEnd = proposedStart + draggingClip.duration;
        if (clipEnd > duration) {
          onExtendDuration?.(Math.ceil(clipEnd));
        }

        onUpdateElement(draggingClip.id, { startTime: Number(proposedStart.toFixed(2)) });
      }

      // 3. Trimming Clip
      else if (trimmingClip) {
        const deltaSec = (e.clientX - trimmingClip.startX) / pps;

        if (trimmingClip.edge === 'left') {
          let proposedStart = trimmingClip.origStart + deltaSec;
          proposedStart = snapTime(proposedStart, trimmingClip.id);
          const maxStart = trimmingClip.origStart + trimmingClip.origDuration - 0.2;
          proposedStart = Math.max(0, Math.min(maxStart, proposedStart));
          const newDuration = (trimmingClip.origStart + trimmingClip.origDuration) - proposedStart;
          // Shift element-relative keyframes so animation stays glued to project time.
          const shift = proposedStart - trimmingClip.origStart;
          const targetEl = elements.find((el) => el.id === trimmingClip.id);
          const updates: any = {
            startTime: Number(proposedStart.toFixed(2)),
            duration: Number(newDuration.toFixed(2)),
          };
          if (targetEl && targetEl.keyframes && targetEl.keyframes.length > 0 && Math.abs(shift) > 0.0001) {
            updates.keyframes = targetEl.keyframes
              .map((k) => ({ ...k, time: Number((k.time - shift).toFixed(3)) }))
              .filter((k) => k.time >= -0.001 && k.time <= newDuration + 0.001)
              .map((k) => ({ ...k, time: Math.max(0, Math.min(newDuration, k.time)) }));
            if (targetEl.type === 'assistant') {
              const dKfs = (targetEl as AssistantElement).dialogueKeyframes || [];
              if (dKfs.length > 0) {
                updates.dialogueKeyframes = dKfs
                  .map((dk) => ({ ...dk, time: Number((dk.time - shift).toFixed(3)) }))
                  .filter((dk) => dk.time >= -0.001 && dk.time <= newDuration + 0.001)
                  .map((dk) => ({ ...dk, time: Math.max(0, Math.min(newDuration, dk.time)) }));
              }
            }
          } else if (targetEl && targetEl.type === 'assistant') {
            // Even without transform kfs, lone dialogue kfs must still shift on left-trim.
            const dKfs = (targetEl as AssistantElement).dialogueKeyframes || [];
            if (dKfs.length > 0 && Math.abs(shift) > 0.0001) {
              updates.dialogueKeyframes = dKfs
                .map((dk) => ({ ...dk, time: Number((dk.time - shift).toFixed(3)) }))
                .filter((dk) => dk.time >= -0.001 && dk.time <= newDuration + 0.001)
                .map((dk) => ({ ...dk, time: Math.max(0, Math.min(newDuration, dk.time)) }));
            }
          }

          onUpdateElement(trimmingClip.id, updates);
        } else if (trimmingClip.edge === 'right') {
          let proposedDuration = trimmingClip.origDuration + deltaSec;
          let proposedEnd = trimmingClip.origStart + proposedDuration;
          proposedEnd = snapTime(proposedEnd, trimmingClip.id);
          proposedEnd = Math.max(trimmingClip.origStart + 0.2, proposedEnd);
          if (proposedEnd > duration) {
            onExtendDuration?.(Math.ceil(proposedEnd));
          }
          proposedDuration = proposedEnd - trimmingClip.origStart;

          // Clamp/trim keyframes that now fall beyond the shortened duration.
          const targetEl = elements.find((el) => el.id === trimmingClip.id);
          const updates: any = {
            duration: Number(proposedDuration.toFixed(2)),
          };
          if (targetEl && targetEl.keyframes && targetEl.keyframes.length > 0) {
            updates.keyframes = targetEl.keyframes.filter((k) => k.time <= proposedDuration + 0.001);
            if (targetEl.type === 'assistant') {
              const dKfs = (targetEl as AssistantElement).dialogueKeyframes || [];
              if (dKfs.length > 0) {
                updates.dialogueKeyframes = dKfs.filter((dk) => dk.time <= proposedDuration + 0.001);
              }
            }
          } else if (targetEl && targetEl.type === 'assistant') {
            const dKfs = (targetEl as AssistantElement).dialogueKeyframes || [];
            if (dKfs.length > 0) {
              updates.dialogueKeyframes = dKfs.filter((dk) => dk.time <= proposedDuration + 0.001);
            }
          }

          onUpdateElement(trimmingClip.id, updates);
        }
      }

      // 4. Moving Keyframe along clip
      else if (draggingKeyframe) {
        const deltaSec = (e.clientX - draggingKeyframe.startX) / pps;
        const targetEl = elements.find((el) => el.id === draggingKeyframe.elementId);
        if (targetEl && targetEl.keyframes) {
          const newTime = Math.max(0, Math.min(draggingKeyframe.duration, draggingKeyframe.origTime + deltaSec));
          const updatedKeyframes = targetEl.keyframes.map((k) =>
            (k.id === draggingKeyframe.keyframeId || Math.abs(k.time - draggingKeyframe.origTime) < 0.02)
              ? { ...k, time: Number(newTime.toFixed(3)) }
              : k
          );
          const updates: any = { keyframes: updatedKeyframes };
          if (targetEl.type === 'assistant') {
            const asst = targetEl as AssistantElement;
            if (asst.dialogueKeyframes && asst.dialogueKeyframes.length > 0) {
              updates.dialogueKeyframes = asst.dialogueKeyframes.map((dk) =>
                Math.abs(dk.time - draggingKeyframe.origTime) < 0.05
                  ? { ...dk, time: Number(newTime.toFixed(3)) }
                  : dk
              );
            }
          }
          onUpdateElement(targetEl.id, updates);
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setDraggingClip(null);
      setTrimmingClip(null);
      setDraggingKeyframe(null);
    };

    if (isScrubbing || draggingClip || trimmingClip || draggingKeyframe) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, draggingClip, trimmingClip, draggingKeyframe, duration, pps, isSnapping, onSeek, onUpdateElement, elements]);

  // Keyframe keyboard deletion listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (selectedKeyframeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        const el = elements.find((item) => item.id === selectedElementId);
        if (el && el.keyframes) {
          e.preventDefault();
          onInteractionStart?.();
          const targetKf = el.keyframes.find((k) => k.id === selectedKeyframeId);
          let updatedKeyframes = el.keyframes;
          const updates: any = {};
          if (targetKf) {
            updatedKeyframes = el.keyframes.filter((k) => Math.abs(k.time - targetKf.time) > 0.02);
            if (el.type === 'assistant' && (el as AssistantElement).dialogueKeyframes) {
              updates.dialogueKeyframes = (el as AssistantElement).dialogueKeyframes!.filter(
                (dk) => Math.abs(dk.time - targetKf.time) > 0.05
              );
            }
          } else {
            updatedKeyframes = el.keyframes.filter((k) => k.id !== selectedKeyframeId);
          }
          updates.keyframes = updatedKeyframes;
          onUpdateElement(el.id, updates);
          setSelectedKeyframeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKeyframeId, selectedElementId, elements, onUpdateElement, onInteractionStart]);

  const handleKeyframeMouseDown = (e: React.MouseEvent, el: CanvasElement, kf: Keyframe) => {
    e.stopPropagation();
    onInteractionStart?.();
    onSelectElement(el.id);
    setSelectedKeyframeId(kf.id);
    onSeek(Number((el.startTime + kf.time).toFixed(3)));
    setDraggingKeyframe({
      elementId: el.id,
      keyframeId: kf.id,
      startX: e.clientX,
      origTime: kf.time,
      duration: el.duration,
    });
  };

  const handleClipMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    onInteractionStart?.();
    onSelectElement(el.id);
    setDraggingClip({
      id: el.id,
      startX: e.clientX,
      origStart: el.startTime,
      duration: el.duration,
    });
  };

  const handleTrimMouseDown = (e: React.MouseEvent, el: CanvasElement, edge: 'left' | 'right') => {
    e.stopPropagation();
    onInteractionStart?.();
    onSelectElement(el.id);
    setTrimmingClip({
      id: el.id,
      edge,
      startX: e.clientX,
      origStart: el.startTime,
      origDuration: el.duration,
    });
  };

  // Assign elements to specific track lanes
  const getElementsForTrack = (trackId: string) => {
    return elements.filter((el) => {
      if (trackId === 'track-4') return el.type === 'audio';
      if (trackId === 'track-3') return el.type === 'cursor' || el.type === 'text' || el.type === 'assistant';
      if (trackId === 'track-2') return el.type === 'xp-window' || el.type === 'image-viewer' || el.type === 'dialog' || el.type === 'video';
      return el.type === 'wallpaper' || el.type === 'taskbar' || el.type === 'desktop-icon';
    });
  };

  const getClipIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Volume2 size={12} />;
      case 'cursor': return <MousePointer size={12} />;
      case 'assistant': return <MousePointer size={12} />;
      case 'wallpaper': return <ImageIcon size={12} />;
      case 'xp-window': 
      case 'image-viewer':
      case 'dialog': return <AppWindow size={12} />;
      default: return <Layers size={12} />;
    }
  };

  return (
    <div className="editor-timeline">
      {/* Timeline Toolbar */}
      <div className="timeline-toolbar">
        <div className="timeline-tools-group">
          <button 
            className="timeline-tool-btn" 
            title="Split Clip at Playhead (Scissors)"
            onClick={() => {
              let targetId = selectedElementId;
              if (!targetId) {
                // Find any clip intersecting playhead if nothing specifically selected
                const hit = elements.find((el) => currentTime > el.startTime && currentTime < (el.startTime + el.duration));
                if (hit) targetId = hit.id;
              }
              if (targetId) {
                onSplitClip(targetId, currentTime);
              }
            }}
          >
            <Scissors size={14} />
          </button>
          <button 
            className="timeline-tool-btn" 
            title="Delete Selected Clip"
            onClick={() => {
              if (selectedElementId) {
                onDeleteElement(selectedElementId);
              }
            }}
          >
            <Trash2 size={14} />
          </button>
          <button 
            className={`timeline-tool-btn ${isSnapping ? 'active' : ''}`}
            style={{ color: isSnapping ? 'var(--accent)' : 'var(--text-muted)' }}
            title={isSnapping ? 'Magnet Snapping Enabled' : 'Magnet Snapping Disabled'}
            onClick={() => setIsSnapping(!isSnapping)}
          >
            <Magnet size={14} />
          </button>

          {/* Keyframe Animation Controls for Selected Element */}
          {selectedElement && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
              <button
                className="timeline-tool-btn"
                title="Jump to Previous Keyframe"
                onClick={() => {
                  const prev = getPrevKeyframeProjectTime(selectedElement, currentTime);
                  if (prev !== null) onSeek(prev);
                }}
                disabled={getPrevKeyframeProjectTime(selectedElement, currentTime) === null}
                style={{ opacity: getPrevKeyframeProjectTime(selectedElement, currentTime) !== null ? 1 : 0.4 }}
              >
                <ChevronLeft size={13} />
              </button>

              <button
                className="editor-btn"
                style={{ 
                  padding: '3px 8px', 
                  fontSize: '11px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  borderColor: 'rgba(245, 158, 11, 0.4)', 
                  color: '#f59e0b' 
                }}
                title="Add keyframes for current position, scale, rotation and opacity at playhead"
                onClick={() => {
                  onInteractionStart?.();
                  const anim = getAnimatedElementProps(selectedElement, currentTime);
                  const relTime = Math.max(0, Math.min(selectedElement.duration, currentTime - selectedElement.startTime));
                  // Audio clips animate volume (no visual transform); all other types animate transform.
                  if (selectedElement.type === 'audio') {
                    const animVol = anim.volume !== undefined ? anim.volume : ((selectedElement as any).volume ?? 1);
                    const updated = addOrUpdateKeyframe(selectedElement, 'volume', relTime, animVol);
                    onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
                    return;
                  }
                  let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, anim.x);
                  updated = addOrUpdateKeyframe(updated, 'y', relTime, anim.y);
                  updated = addOrUpdateKeyframe(updated, 'width', relTime, anim.width);
                  updated = addOrUpdateKeyframe(updated, 'height', relTime, anim.height);
                  updated = addOrUpdateKeyframe(updated, 'rotation', relTime, anim.rotation);
                  updated = addOrUpdateKeyframe(updated, 'opacity', relTime, anim.opacity);

                  if (selectedElement.type === 'assistant') {
                    const asst = selectedElement as AssistantElement;
                    const evalD = evaluateAssistantDialogue(asst, currentTime);
                    const updatedAsst = addOrUpdateDialogueKeyframe(asst, relTime, {
                      dialogueText: evalD.dialogueText,
                      pose: evalD.pose,
                      bubblePosition: evalD.bubblePosition,
                      showDialogue: evalD.showDialogue,
                    });
                    onUpdateElement(selectedElement.id, {
                      keyframes: updated.keyframes,
                      dialogueKeyframes: updatedAsst.dialogueKeyframes,
                    });
                    return;
                  }

                  onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
                }}
              >
                <Diamond size={11} fill="#f59e0b" />
                <span>+ Keyframe</span>
              </button>

              <button
                className="timeline-tool-btn"
                title="Jump to Next Keyframe"
                onClick={() => {
                  const next = getNextKeyframeProjectTime(selectedElement, currentTime);
                  if (next !== null) onSeek(next);
                }}
                disabled={getNextKeyframeProjectTime(selectedElement, currentTime) === null}
                style={{ opacity: getNextKeyframeProjectTime(selectedElement, currentTime) !== null ? 1 : 0.4 }}
              >
                <ChevronRight size={13} />
              </button>

              {selectedKeyframeId && (
                <button
                  className="timeline-tool-btn"
                  title="Delete Selected Keyframe"
                  style={{ color: 'var(--danger)', marginLeft: '4px' }}
                  onClick={() => {
                    onInteractionStart?.();
                    const targetKf = selectedElement.keyframes?.find((k) => k.id === selectedKeyframeId);
                    let updatedKeyframes = selectedElement.keyframes || [];
                    if (targetKf) {
                      updatedKeyframes = updatedKeyframes.filter((k) => Math.abs(k.time - targetKf.time) > 0.02);
                    } else {
                      updatedKeyframes = updatedKeyframes.filter((k) => k.id !== selectedKeyframeId);
                    }
                    onUpdateElement(selectedElement.id, { keyframes: updatedKeyframes });
                    setSelectedKeyframeId(null);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}

          {/* Project Duration extension in Timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <Clock size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Project:</span>
            <input
              type="number"
              min="1"
              max="3600"
              step="1"
              value={duration}
              onChange={(e) => {
                const val = Math.max(1, parseFloat(e.target.value) || 1);
                onExtendDuration?.(val);
              }}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                width: '52px',
                textAlign: 'center',
              }}
              title="Project Duration in seconds"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>s</span>
            <button
              className="editor-btn"
              style={{ padding: '2px 6px', fontSize: '10px' }}
              onClick={() => onExtendDuration?.(duration + 10)}
              title="Extend project duration by +10s"
            >
              +10s
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ZoomOut size={13} color="var(--text-muted)" />
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => onZoomChange(Number(e.target.value))}
            style={{ width: '90px', accentColor: 'var(--accent)' }}
          />
          <ZoomIn size={13} color="var(--text-muted)" />
        </div>
      </div>

      {/* Timeline Tracks & Ruler Scroll Area */}
      <div className="timeline-scroll-area">
        <div className="timeline-tracks-container" style={{ width: `${timelineWidth}px` }}>
          
          {/* Header Row: Track Label spacer & Time Ruler */}
          <div style={{ display: 'flex', height: '26px', background: 'var(--timeline-ruler-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 20 }}>
            <div className="track-header-cell" style={{ height: '100%', borderBottom: 'none' }}>
              <span>TIMELINE TRACKS</span>
            </div>
            
            <div 
              ref={rulerRef}
              style={{ flex: 1, position: 'relative', cursor: 'pointer', height: '100%' }}
              onMouseDown={handleRulerMouseDown}
            >
              {rulerTicks.map((sec) => (
                <div 
                  key={sec} 
                  style={{ 
                    position: 'absolute', 
                    left: `${sec * pps}px`, 
                    top: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    alignItems: 'center',
                    borderLeft: '1px solid rgba(255,255,255,0.15)',
                    paddingLeft: '4px',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-dim)',
                    pointerEvents: 'none'
                  }}
                >
                  {sec}s
                </div>
              ))}
            </div>
          </div>

          {/* Tracks Area */}
          {tracks.map((track) => {
            const trackElements = getElementsForTrack(track.id);

            return (
              <div key={track.id} className="timeline-track-row">
                <div className="track-header-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: track.color }} />
                    <span style={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: 500 }}>{track.name}</span>
                  </div>
                </div>

                <div 
                  className="track-lane"
                  onClick={() => onSelectElement(null)}
                >
                  {trackElements.map((el) => {
                    const isSelected = el.id === selectedElementId;
                    const leftPx = el.startTime * pps;
                    const widthPx = Math.max(30, el.duration * pps);
                    const isAudio = el.type === 'audio';

                    return (
                      <div
                        key={el.id}
                        className={`timeline-clip-block ${isSelected ? 'selected' : ''} ${isAudio ? 'timeline-clip-audio' : ''}`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, el)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectElement(el.id);
                        }}
                      >
                        {/* Left Trim Handle */}
                        <div 
                          className="trim-handle-left"
                          title="Trim Clip In-Point"
                          onMouseDown={(e) => handleTrimMouseDown(e, el, 'left')}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* Clip Content */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', pointerEvents: 'none', width: '100%' }}>
                          {getClipIcon(el.type)}
                          <span style={{ fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {el.name}
                          </span>
                          <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: 'auto', flexShrink: 0 }}>
                            {el.duration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Keyframe Diamond Markers Overlay */}
                        {el.keyframes && el.keyframes.length > 0 && (
                          <div
                            className="timeline-clip-keyframes"
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: 0,
                              right: 0,
                              height: '10px',
                              pointerEvents: 'none',
                              zIndex: 5,
                            }}
                          >
                            {Array.from(
                              el.keyframes.reduce((acc, kf) => {
                                const rounded = Math.round(kf.time * 100) / 100;
                                if (!acc.has(rounded)) acc.set(rounded, []);
                                acc.get(rounded)!.push(kf);
                                return acc;
                              }, new Map<number, Keyframe[]>()).entries()
                            ).map(([groupTime, kfs]) => {
                              const isKfSelected = kfs.some((k) => k.id === selectedKeyframeId);
                              const kfLeftPx = (groupTime / el.duration) * widthPx;
                              const propNames = kfs.map((k) => k.property).join(', ');

                              return (
                                <div
                                  key={groupTime}
                                  title={`Keyframe at ${groupTime.toFixed(2)}s (${propNames}) - Drag to move, click to jump`}
                                  style={{
                                    position: 'absolute',
                                    left: `${kfLeftPx}px`,
                                    top: '50%',
                                    width: isKfSelected ? '10px' : '8px',
                                    height: isKfSelected ? '10px' : '8px',
                                    background: isKfSelected ? '#38bdf8' : '#f59e0b',
                                    border: isKfSelected ? '1.5px solid #ffffff' : '1px solid #78350f',
                                    boxShadow: isKfSelected ? '0 0 6px #38bdf8' : '0 1px 2px rgba(0,0,0,0.6)',
                                    transform: 'translate(-50%, -50%) rotate(45deg)',
                                    cursor: 'ew-resize',
                                    pointerEvents: 'auto',
                                  }}
                                  onMouseDown={(e) => handleKeyframeMouseDown(e, el, kfs[0])}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInteractionStart?.();
                                    onSelectElement(el.id);
                                    setSelectedKeyframeId(kfs[0].id);
                                    onSeek(Number((el.startTime + groupTime).toFixed(3)));
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Dialogue Keyframe Markers for Assistant Clips */}
                        {el.type === 'assistant' && (el as AssistantElement).dialogueKeyframes && (el as AssistantElement).dialogueKeyframes!.length > 0 && (
                          <div
                            className="timeline-clip-dialogue-keyframes"
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: 0,
                              right: 0,
                              height: '10px',
                              pointerEvents: 'none',
                              zIndex: 6,
                            }}
                          >
                            {(el as AssistantElement).dialogueKeyframes!.map((dkf) => {
                              const kfLeftPx = (dkf.time / el.duration) * widthPx;
                              const isCurrentTime = Math.abs((el.startTime + dkf.time) - currentTime) < 0.05;
                              return (
                                <div
                                  key={dkf.id}
                                  title={`Dialogue Keyframe at ${dkf.time.toFixed(2)}s: "${dkf.dialogueText ? dkf.dialogueText.slice(0, 30) : '(empty)'}" (${dkf.pose || 'idle'}) - Click to jump`}
                                  style={{
                                    position: 'absolute',
                                    left: `${kfLeftPx}px`,
                                    top: '50%',
                                    width: isCurrentTime ? '9px' : '7px',
                                    height: isCurrentTime ? '9px' : '7px',
                                    background: isCurrentTime ? '#a855f7' : '#ec4899',
                                    border: isCurrentTime ? '1.5px solid #ffffff' : '1px solid #831843',
                                    borderRadius: '2px',
                                    boxShadow: isCurrentTime ? '0 0 6px #a855f7' : '0 1px 2px rgba(0,0,0,0.6)',
                                    transform: 'translate(-50%, -50%)',
                                    cursor: 'pointer',
                                    pointerEvents: 'auto',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInteractionStart?.();
                                    onSelectElement(el.id);
                                    onSeek(Number((el.startTime + dkf.time).toFixed(3)));
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Right Trim Handle */}
                        <div 
                          className="trim-handle-right"
                          title="Trim Clip Out-Point"
                          onMouseDown={(e) => handleTrimMouseDown(e, el, 'right')}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Draggable Playhead Scrubber Line */}
          <div 
            className="timeline-playhead"
            style={{ 
              left: `${160 + currentTime * pps}px`,
            }}
          >
            <div 
              className="playhead-scrubber-handle" 
              title="Drag playhead to scrub"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsScrubbing(true);
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
};
