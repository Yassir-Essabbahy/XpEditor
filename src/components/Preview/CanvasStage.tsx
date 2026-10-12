import React, { useRef, useState, useEffect } from 'react';
import { 
  CanvasElement, 
  CompositionSettings, 
  XpWindowElement, 
  WallpaperElement,
  ImageViewerElement,
  DialogElement,
  DesktopIconElement,
  TextElement,
  CursorElement,
  VideoElement,
  AssistantElement
} from '../../types/editor';
import { XpWindowFrame } from '../XpAssets/XpWindowFrame';
import { XpImageViewer } from '../XpAssets/XpImageViewer';
import { XpWallpaper } from '../XpAssets/XpWallpaper';
import { XpDialog } from '../XpAssets/XpDialog';
import { XpDesktopIcon } from '../XpAssets/XpDesktopIcon';
import { XpTextOverlay } from '../XpAssets/XpTextOverlay';
import { XpCursor } from '../XpAssets/XpCursor';
import { XpAssistant } from '../XpAssets/XpAssistant';
import { XpTransformBox } from '../XpAssets/XpTransformBox';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { getAnimatedElementProps, getTransitionedElementProps, addOrUpdateKeyframe } from '../../utils/keyframeAnimation';

interface CanvasStageProps {
  elements: CanvasElement[];
  currentTime: number;
  settings: CompositionSettings;
  selectedElementId: string | null;
  previewZoom: number;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onZoomChange: (zoom: number) => void;
  onInteractionStart?: () => void;
  onSeek?: (time: number) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  elements,
  currentTime,
  settings,
  selectedElementId,
  previewZoom,
  onSelectElement,
  onUpdateElement,
  onZoomChange,
  onInteractionStart,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag move state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

  // Resize state
  const [resizing, setResizing] = useState<{
    handle: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Filter elements active at the current playhead time
  let visibleElements = elements
    .filter((el) => {
      // Ensure background wallpaper and taskbar remain active across composition
      if (el.type === 'wallpaper' && el.startTime === 0) {
        return el.visible && currentTime >= 0;
      }
      if (el.type === 'taskbar' && el.startTime === 0) {
        return el.visible && currentTime >= 0;
      }
      const isTimeActive = currentTime >= (el.startTime - 0.001) && currentTime <= (el.startTime + el.duration + 0.001);
      return el.visible && isTimeActive;
    })
    .sort((a, b) => a.zIndex - b.zIndex);

  // Avoid multiple overlapping cursor ghosts on screen while preserving clips
  const activeCursors = visibleElements.filter((el) => el.type === 'cursor');
  if (activeCursors.length > 1) {
    const topCursor = activeCursors[activeCursors.length - 1];
    visibleElements = visibleElements.filter((el) => el.type !== 'cursor' || el.id === topCursor.id);
  }

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Dragging / Moving Support
  const handleMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    if (element.locked) return;
    e.stopPropagation();
    onInteractionStart?.();
    onSelectElement(element.id);

    const anim = getAnimatedElementProps(element, currentTime);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: anim.x,
      elY: anim.y,
    });
  };

  // Resize Handle Support
  const handleResizeStart = (handle: string, e: React.MouseEvent, element: CanvasElement) => {
    if (element.locked) return;
    e.stopPropagation();
    onInteractionStart?.();
    onSelectElement(element.id);

    const anim = getAnimatedElementProps(element, currentTime);
    setResizing({
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: anim.x,
      origY: anim.y,
      origW: anim.width,
      origH: anim.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !selectedElement) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Handling moving
      if (isDragging && dragStart) {
        const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

        const newXVal = Math.max(-20, Math.min(100, dragStart.elX + deltaX));
        const newYVal = Math.max(-20, Math.min(100, dragStart.elY + deltaY));
        const elTime = Math.max(0, Math.min(selectedElement.duration, currentTime - selectedElement.startTime));

        let updatedKeyframes = selectedElement.keyframes;
        if (updatedKeyframes && updatedKeyframes.length > 0) {
          let updatedEl = addOrUpdateKeyframe(selectedElement, 'x', elTime, Number(newXVal.toFixed(2)));
          updatedEl = addOrUpdateKeyframe(updatedEl, 'y', elTime, Number(newYVal.toFixed(2)));
          updatedKeyframes = updatedEl.keyframes;
        }

        const firstKfX = updatedKeyframes?.filter((k) => k.property === 'x').sort((a, b) => a.time - b.time)[0];
        const firstKfY = updatedKeyframes?.filter((k) => k.property === 'y').sort((a, b) => a.time - b.time)[0];

        onUpdateElement(selectedElement.id, {
          x: firstKfX ? firstKfX.value : Number(newXVal.toFixed(2)),
          y: firstKfY ? firstKfY.value : Number(newYVal.toFixed(2)),
          ...(updatedKeyframes ? { keyframes: updatedKeyframes } : {}),
        });
      }

      // Handling 8-point resizing
      if (resizing) {
        const deltaX = ((e.clientX - resizing.startX) / rect.width) * 100;
        const deltaY = ((e.clientY - resizing.startY) / rect.height) * 100;

        let newX = resizing.origX;
        let newY = resizing.origY;
        let newW = resizing.origW;
        let newH = resizing.origH;
        const minSize = 6; // minimum 6% dimension

        const handle = resizing.handle;

        // East / West
        if (handle.includes('e')) {
          newW = Math.max(minSize, resizing.origW + deltaX);
        } else if (handle.includes('w')) {
          const maxDeltaX = resizing.origW - minSize;
          const clampedDeltaX = Math.min(maxDeltaX, deltaX);
          newX = resizing.origX + clampedDeltaX;
          newW = resizing.origW - clampedDeltaX;
        }

        // North / South
        if (handle.includes('s')) {
          newH = Math.max(minSize, resizing.origH + deltaY);
        } else if (handle.includes('n')) {
          const maxDeltaY = resizing.origH - minSize;
          const clampedDeltaY = Math.min(maxDeltaY, deltaY);
          newY = resizing.origY + clampedDeltaY;
          newH = resizing.origH - clampedDeltaY;
        }

        const elTime = Math.max(0, Math.min(selectedElement.duration, currentTime - selectedElement.startTime));
        let updatedKeyframes = selectedElement.keyframes;
        if (updatedKeyframes && updatedKeyframes.length > 0) {
          let updatedEl = addOrUpdateKeyframe(selectedElement, 'x', elTime, Number(newX.toFixed(2)));
          updatedEl = addOrUpdateKeyframe(updatedEl, 'y', elTime, Number(newY.toFixed(2)));
          updatedEl = addOrUpdateKeyframe(updatedEl, 'width', elTime, Number(newW.toFixed(2)));
          updatedEl = addOrUpdateKeyframe(updatedEl, 'height', elTime, Number(newH.toFixed(2)));
          updatedKeyframes = updatedEl.keyframes;
        }

        const firstResizeKfX = updatedKeyframes?.filter((k) => k.property === 'x').sort((a, b) => a.time - b.time)[0];
        const firstResizeKfY = updatedKeyframes?.filter((k) => k.property === 'y').sort((a, b) => a.time - b.time)[0];
        const firstResizeKfW = updatedKeyframes?.filter((k) => k.property === 'width').sort((a, b) => a.time - b.time)[0];
        const firstResizeKfH = updatedKeyframes?.filter((k) => k.property === 'height').sort((a, b) => a.time - b.time)[0];

        onUpdateElement(selectedElement.id, {
          x: firstResizeKfX ? firstResizeKfX.value : Number(newX.toFixed(2)),
          y: firstResizeKfY ? firstResizeKfY.value : Number(newY.toFixed(2)),
          width: firstResizeKfW ? firstResizeKfW.value : Number(newW.toFixed(2)),
          height: firstResizeKfH ? firstResizeKfH.value : Number(newH.toFixed(2)),
          ...(updatedKeyframes ? { keyframes: updatedKeyframes } : {}),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      setResizing(null);
    };

    if (isDragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, resizing, selectedElement, onUpdateElement]);

  return (
    <div className="stage-viewport-wrapper" onClick={() => onSelectElement(null)}>
      {/* Zoom / View Control Overlay */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '16px', 
          right: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          background: 'rgba(20, 23, 29, 0.85)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '4px 8px',
          zIndex: 30
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="editor-btn" 
          style={{ padding: '3px 6px', border: 'none', background: 'transparent' }}
          onClick={() => onZoomChange(Math.max(0.5, previewZoom - 0.1))}
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>
          {Math.round(previewZoom * 100)}%
        </span>
        <button 
          className="editor-btn" 
          style={{ padding: '3px 6px', border: 'none', background: 'transparent' }}
          onClick={() => onZoomChange(Math.min(1.5, previewZoom + 0.1))}
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button 
          className="editor-btn" 
          style={{ padding: '3px 6px', border: 'none', background: 'transparent' }}
          onClick={() => onZoomChange(1)}
          title="Reset Zoom"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Modern Video Canvas Frame */}
      <div 
        className="video-canvas-container"
        ref={containerRef}
        style={{
          aspectRatio: `${settings.width} / ${settings.height}`,
          transform: `scale(${previewZoom})`,
          transformOrigin: 'center center',
          transition: (isDragging || resizing) ? 'none' : 'transform 0.1s ease',
        }}
      >
        <div className="canvas-scene">
          {visibleElements.map((el) => {
            const isSelected = el.id === selectedElementId;
            // Rendered props include entrance/exit transitions; keyframe editing
            // and drag logic below intentionally keep using the base keyframed
            // values so transition offsets are never baked into keyframes.
            // Assistant opacity stays base here — XpAssistant applies the
            // transition opacity itself (plus a selection floor while editing).
            const base = getAnimatedElementProps(el, currentTime);
            const full = getTransitionedElementProps(el, currentTime);
            const anim = el.type === 'assistant' ? { ...full, opacity: base.opacity } : full;

            return (
              <div
                key={el.id}
                className={`canvas-element ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${anim.x}%`,
                  top: `${anim.y}%`,
                  width: `${anim.width}%`,
                  height: `${anim.height}%`,
                  zIndex: el.zIndex,
                  opacity: anim.opacity,
                  transform: anim.rotation ? `rotate(${anim.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  cursor: el.locked ? 'not-allowed' : 'move',
                }}
                onMouseDown={(e) => handleMouseDown(e, el)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                }}
              >
                {/* 1. Wallpaper with optional desktop icons */}
                {el.type === 'wallpaper' && (
                  <XpWallpaper 
                    element={el as WallpaperElement} 
                    isSelected={isSelected} 
                  />
                )}

                {/* 2. XP Application Window */}
                {el.type === 'xp-window' && (
                  <XpWindowFrame 
                    element={el as XpWindowElement} 
                    isSelected={isSelected} 
                  />
                )}

                {/* 3. XP Image Viewer Window (Windows Picture and Fax Viewer) */}
                {el.type === 'image-viewer' && (
                  <XpImageViewer
                    element={el as ImageViewerElement}
                    isSelected={isSelected}
                    onUpdateProps={(updates) => onUpdateElement(el.id, updates)}
                  />
                )}

                {/* 4. XP Dialog / Error Message Box */}
                {el.type === 'dialog' && (
                  <XpDialog
                    element={el as DialogElement}
                    isSelected={isSelected}
                  />
                )}

                {/* 5. XP Desktop Icon */}
                {el.type === 'desktop-icon' && (
                  <XpDesktopIcon
                    element={el as DesktopIconElement}
                    isSelected={isSelected}
                  />
                )}

                {/* 6. Text Overlay / Notification Balloon */}
                {el.type === 'text' && (
                  <XpTextOverlay
                    element={el as TextElement}
                    isSelected={isSelected}
                  />
                )}

                {/* 7. XP Mouse Cursor */}
                {el.type === 'cursor' && (
                  <XpCursor
                    element={el as CursorElement}
                    isSelected={isSelected}
                  />
                )}

                {/* 8. Desktop Taskbar */}
                {el.type === 'taskbar' && (
                  <div className="xp-taskbar-asset">
                    <div className="xp-start-button">
                      <span style={{ fontSize: '13px' }}>🪟</span>
                      <span>start</span>
                    </div>
                    <div className="xp-tray">
                      <span>🔔</span>
                      <span>11:45 PM</span>
                    </div>
                  </div>
                )}

                {/* 9. Video Clip */}
                {el.type === 'video' && (
                  <video
                    src={(el as VideoElement).videoSrc}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: (el as VideoElement).fitMode || 'contain',
                      display: 'block',
                      pointerEvents: 'none',
                    }}
                    autoPlay
                    muted
                    loop={(el as VideoElement).loop}
                  />
                )}

                {/* 10. Windows XP Assistant (Clippy + Dialogue Bubble) */}
                {el.type === 'assistant' && (
                  <XpAssistant
                    element={el as AssistantElement}
                    isSelected={isSelected}
                    currentTime={currentTime}
                  />
                )}

                {/* Interactive 8-point Transform Box */}
                {isSelected && !el.locked && (
                  <XpTransformBox
                    element={el}
                    onResizeStart={(handle, e) => handleResizeStart(handle, e, el)}
                  />
                )}
              </div>
            );
          })}

          {/* Mouse Movement Trajectory Path & Interactive Waypoint Markers */}
          {elements
            .filter((el): el is CursorElement => {
              if (el.type !== 'cursor') return false;
              const isSelected = el.id === selectedElementId;
              const hasPosKf = (el.keyframes || []).some((k) => k.property === 'x' || k.property === 'y');
              if (el.showMovementPath === false) return false;
              return isSelected || hasPosKf || el.showMovementPath === true;
            })
            .map((cursorEl) => {
              const isSelected = cursorEl.id === selectedElementId;
              const numSamples = 40;
              const trajectoryPoints: { x: number; y: number }[] = [];

              for (let i = 0; i <= numSamples; i++) {
                const sampleRelTime = (i / numSamples) * cursorEl.duration;
                const sampleTime = cursorEl.startTime + sampleRelTime;
                const animPos = getAnimatedElementProps(cursorEl, sampleTime);
                trajectoryPoints.push({ x: animPos.x, y: animPos.y });
              }

              const pathD = trajectoryPoints
                .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
                .join(' ');

              // Find distinct keyframe times for waypoints
              const distinctTimes = Array.from(
                new Set(
                  (cursorEl.keyframes || [])
                    .filter((k) => k.property === 'x' || k.property === 'y')
                    .map((k) => k.time)
                )
              ).sort((a, b) => a - b);

              const waypointTimes = distinctTimes.length > 0 ? distinctTimes : [0];

              return (
                <React.Fragment key={`trajectory-${cursorEl.id}`}>
                  {/* SVG dashed trajectory curve */}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: isSelected ? 85 : 65,
                      overflow: 'visible',
                    }}
                  >
                    <defs>
                      <filter id={`glow-${cursorEl.id}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
                      </filter>
                    </defs>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#0055ea' : '#38bdf8'}
                      strokeWidth="2.2"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      filter={`url(#glow-${cursorEl.id})`}
                    />
                  </svg>

                  {/* Interactive Waypoint Markers on Canvas */}
                  {waypointTimes.map((relTime, idx) => {
                    const pos = getAnimatedElementProps(cursorEl, cursorEl.startTime + relTime);
                    const isPlayheadNear = Math.abs(currentTime - (cursorEl.startTime + relTime)) < 0.12;

                    return (
                      <div
                        key={`waypoint-${cursorEl.id}-${idx}-${relTime}`}
                        style={{
                          position: 'absolute',
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 90,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          userSelect: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectElement(cursorEl.id);
                          onSeek?.(cursorEl.startTime + relTime);
                        }}
                        title={`Waypoint ${idx + 1} at ${relTime.toFixed(2)}s (Click to seek)`}
                      >
                        <div
                          style={{
                            width: isPlayheadNear ? '14px' : '10px',
                            height: isPlayheadNear ? '14px' : '10px',
                            borderRadius: '50%',
                            background: isPlayheadNear ? '#f59e0b' : '#0055ea',
                            border: '2px solid #ffffff',
                            boxShadow: isPlayheadNear
                              ? '0 0 8px rgba(245, 158, 11, 0.9)'
                              : '0 0 5px rgba(0, 85, 234, 0.7)',
                            transition: 'all 0.1s ease',
                          }}
                        />
                        {isSelected && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 600,
                              fontFamily: 'Tahoma, sans-serif',
                              background: isPlayheadNear ? 'rgba(245, 158, 11, 0.95)' : 'rgba(0, 85, 234, 0.85)',
                              color: '#ffffff',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              border: '1px solid rgba(255, 255, 255, 0.4)',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            P{idx + 1} ({relTime.toFixed(1)}s)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
        </div>
      </div>
    </div>
  );
};
