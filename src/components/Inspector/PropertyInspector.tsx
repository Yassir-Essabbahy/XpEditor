import React, { useState } from 'react';
import { 
  Trash2, 
  Move, 
  Clock, 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Sliders, 
  Sparkles,
  Image as ImageIcon,
  CheckSquare,
  Square,
  RotateCw,
  Upload,
  Diamond,
  ChevronLeft,
  ChevronRight,
  Link2,
  Unlink,
  RotateCcw,
  MessageSquare,
  Bot,
  Plus
} from 'lucide-react';
import { 
  CanvasElement, 
  XpWindowElement, 
  WallpaperElement, 
  ImageViewerElement,
  DialogElement,
  DesktopIconElement,
  TextElement,
  CursorElement,
  AudioElement,
  VideoElement,
  AssistantElement,
  AssistantPose,
  BubblePosition,
  ProjectAsset,
  KeyframeProperty,
  KeyframeEasing,
  Keyframe
} from '../../types/editor';
import { pickImageFile, extractFriendlyName } from '../../utils/filePicker';
import { 
  getAnimatedElementProps,
  addOrUpdateKeyframe,
  removeKeyframe,
  findKeyframeAtTime,
  getPrevKeyframeProjectTime,
  getNextKeyframeProjectTime,
  clearAllKeyframes,
  evaluateAudioVolume,
  evaluateAssistantDialogue,
  addOrUpdateDialogueKeyframe,
  updateDialogueKeyframeById,
  removeDialogueKeyframe
} from '../../utils/keyframeAnimation';
import { XP_WALLPAPERS, XP_ICONS, XP_CURSORS, XP_ASSISTANT_POSES } from '../../utils/xpAssets';

interface PropertyInspectorProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  projectAssets?: ProjectAsset[];
  onImportAsset?: (asset: ProjectAsset) => void;
  currentTime?: number;
  onSeek?: (time: number) => void;
  onInteractionStart?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  projectAssets = [],
  onImportAsset,
  currentTime,
  onSeek,
  onInteractionStart,
}) => {
  const [lockAspectRatio, setLockAspectRatio] = useState(false);
  const [selectedEasing, setSelectedEasing] = useState<KeyframeEasing>('linear');
  const [selectedDkfId, setSelectedDkfId] = useState<string | null>(null);

  if (!selectedElement) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
        <Sliders size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>No Element Selected</span>
        <span style={{ fontSize: '11px', marginTop: '4px' }}>Click any visual element in the preview canvas or timeline to inspect and edit properties.</span>
      </div>
    );
  }

  const handlePickAndApplyImage = async (
    targetProp: 'imageSrc' | 'contentImageSrc',
    updateTitleWithFilename = false
  ) => {
    try {
      const res = await pickImageFile();
      if (!res) return;

      const newAsset: ProjectAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: res.name,
        type: 'image',
        src: res.src,
        size: res.size,
        addedAt: new Date().toISOString(),
      };
      onImportAsset?.(newAsset);

      const updates: any = { [targetProp]: res.src };
      if (updateTitleWithFilename) {
        updates.imageName = res.name;
        updates.title = `${res.name} - Windows Picture and Fax Viewer`;
      }
      onUpdateElement(selectedElement.id, updates);
    } catch (err) {
      console.error('Failed to pick and apply image:', err);
    }
  };

  const playheadTime = currentTime ?? selectedElement.startTime;
  const anim = getAnimatedElementProps(selectedElement, playheadTime);
  const relTime = Math.max(0, Math.min(selectedElement.duration, playheadTime - selectedElement.startTime));

  const renderKeyframeButtons = (prop: KeyframeProperty, currentValue: number) => {
    const hasKf = !!findKeyframeAtTime(selectedElement, prop, relTime);
    const prevTime = getPrevKeyframeProjectTime(selectedElement, playheadTime, prop);
    const nextTime = getNextKeyframeProjectTime(selectedElement, playheadTime, prop);

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
        <button
          type="button"
          className="timeline-tool-btn"
          style={{ padding: '1px', width: '16px', height: '16px', opacity: prevTime !== null ? 1 : 0.3 }}
          title={`Jump to previous ${prop} keyframe`}
          disabled={prevTime === null}
          onClick={(e) => {
            e.preventDefault();
            if (prevTime !== null && onSeek) onSeek(prevTime);
          }}
        >
          <ChevronLeft size={10} />
        </button>

        <button
          type="button"
          className="timeline-tool-btn"
          style={{
            padding: '1px',
            width: '16px',
            height: '16px',
            color: hasKf ? '#f59e0b' : 'var(--text-muted)',
          }}
          title={hasKf ? `Remove ${prop} keyframe at ${relTime.toFixed(2)}s` : `Add ${prop} keyframe at ${relTime.toFixed(2)}s`}
          onClick={(e) => {
            e.preventDefault();
            onInteractionStart?.();
            if (hasKf) {
              const targetKf = findKeyframeAtTime(selectedElement, prop, relTime);
              if (targetKf) {
                const updated = removeKeyframe(selectedElement, targetKf.id);
                onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
              }
            } else {
              const updated = addOrUpdateKeyframe(selectedElement, prop, relTime, currentValue, selectedEasing);
              onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
            }
          }}
        >
          <Diamond size={11} fill={hasKf ? '#f59e0b' : 'none'} />
        </button>

        <button
          type="button"
          className="timeline-tool-btn"
          style={{ padding: '1px', width: '16px', height: '16px', opacity: nextTime !== null ? 1 : 0.3 }}
          title={`Jump to next ${prop} keyframe`}
          disabled={nextTime === null}
          onClick={(e) => {
            e.preventDefault();
            if (nextTime !== null && onSeek) onSeek(nextTime);
          }}
        >
          <ChevronRight size={10} />
        </button>
      </div>
    );
  };

  const handleNumericPropertyChange = (prop: KeyframeProperty, val: number) => {
    onInteractionStart?.();
    const hasKfOnEl = selectedElement.keyframes && selectedElement.keyframes.some((k) => k.property === prop);

    if (hasKfOnEl) {
      const updated = addOrUpdateKeyframe(selectedElement, prop, relTime, val, selectedEasing);
      const firstKf = updated.keyframes?.filter((k) => k.property === prop).sort((a, b) => a.time - b.time)[0];
      const baseValToStore = firstKf ? firstKf.value : val;
      onUpdateElement(selectedElement.id, { [prop]: baseValToStore, keyframes: updated.keyframes });
    } else {
      onUpdateElement(selectedElement.id, { [prop]: val });
    }
  };

  const handleWidthChange = (val: number) => {
    const clampedW = Math.max(1, val);
    if (lockAspectRatio) {
      const currentW = anim.width || selectedElement.width || 50;
      const currentH = anim.height || selectedElement.height || 50;
      const ratio = currentH / currentW;
      const clampedH = Math.max(1, Math.round(clampedW * ratio));

      const hasKeyframes = selectedElement.keyframes && selectedElement.keyframes.length > 0;
      if (hasKeyframes) {
        let updated = addOrUpdateKeyframe(selectedElement, 'width', relTime, clampedW, selectedEasing);
        updated = addOrUpdateKeyframe(updated, 'height', relTime, clampedH, selectedEasing);
        const firstW = updated.keyframes?.filter((k) => k.property === 'width').sort((a, b) => a.time - b.time)[0]?.value ?? clampedW;
        const firstH = updated.keyframes?.filter((k) => k.property === 'height').sort((a, b) => a.time - b.time)[0]?.value ?? clampedH;
        onUpdateElement(selectedElement.id, { width: firstW, height: firstH, keyframes: updated.keyframes });
      } else {
        onUpdateElement(selectedElement.id, { width: clampedW, height: clampedH });
      }
    } else {
      handleNumericPropertyChange('width', clampedW);
    }
  };

  const handleHeightChange = (val: number) => {
    const clampedH = Math.max(1, val);
    if (lockAspectRatio) {
      const currentW = anim.width || selectedElement.width || 50;
      const currentH = anim.height || selectedElement.height || 50;
      const ratio = currentW / currentH;
      const clampedW = Math.max(1, Math.round(clampedH * ratio));

      const hasKeyframes = selectedElement.keyframes && selectedElement.keyframes.length > 0;
      if (hasKeyframes) {
        let updated = addOrUpdateKeyframe(selectedElement, 'height', relTime, clampedH, selectedEasing);
        updated = addOrUpdateKeyframe(updated, 'width', relTime, clampedW, selectedEasing);
        const firstW = updated.keyframes?.filter((k) => k.property === 'width').sort((a, b) => a.time - b.time)[0]?.value ?? clampedW;
        const firstH = updated.keyframes?.filter((k) => k.property === 'height').sort((a, b) => a.time - b.time)[0]?.value ?? clampedH;
        onUpdateElement(selectedElement.id, { width: firstW, height: firstH, keyframes: updated.keyframes });
      } else {
        onUpdateElement(selectedElement.id, { width: clampedW, height: clampedH });
      }
    } else {
      handleNumericPropertyChange('height', clampedH);
    }
  };

  const isXpWindow = selectedElement.type === 'xp-window';
  const xpWin = isXpWindow ? (selectedElement as XpWindowElement) : null;

  const isWallpaper = selectedElement.type === 'wallpaper';
  const wallpaper = isWallpaper ? (selectedElement as WallpaperElement) : null;

  const isImageViewer = selectedElement.type === 'image-viewer';
  const imageViewer = isImageViewer ? (selectedElement as ImageViewerElement) : null;

  const isDialog = selectedElement.type === 'dialog';
  const dialog = isDialog ? (selectedElement as DialogElement) : null;

  const isDesktopIcon = selectedElement.type === 'desktop-icon';
  const desktopIcon = isDesktopIcon ? (selectedElement as DesktopIconElement) : null;

  const isText = selectedElement.type === 'text';
  const textOverlay = isText ? (selectedElement as TextElement) : null;

  const isCursor = selectedElement.type === 'cursor';
  const cursor = isCursor ? (selectedElement as CursorElement) : null;

  const isAudio = selectedElement.type === 'audio';
  const audio = isAudio ? (selectedElement as AudioElement) : null;

  const isVideo = selectedElement.type === 'video';
  const video = isVideo ? (selectedElement as VideoElement) : null;

  const isAssistant = selectedElement.type === 'assistant';
  const assistant = isAssistant ? (selectedElement as AssistantElement) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
            {selectedElement.name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {selectedElement.type}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="editor-btn"
            style={{ padding: '5px' }}
            title={selectedElement.visible ? 'Hide Element' : 'Show Element'}
            onClick={() => onUpdateElement(selectedElement.id, { visible: !selectedElement.visible })}
          >
            {selectedElement.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button 
            className="editor-btn"
            style={{ padding: '5px' }}
            title={selectedElement.locked ? 'Unlock Element' : 'Lock Element'}
            onClick={() => onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })}
          >
            {selectedElement.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button 
            className="editor-btn"
            style={{ padding: '5px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Delete Element"
            onClick={() => onDeleteElement(selectedElement.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Transform / Position Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Move size={12} /> Canvas Position & Size (%)
          </span>
          <button
            type="button"
            className="timeline-tool-btn"
            style={{ 
              padding: '2px 6px', 
              fontSize: '10px', 
              gap: '4px', 
              color: lockAspectRatio ? 'var(--accent)' : 'var(--text-muted)',
              background: lockAspectRatio ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              border: '1px solid',
              borderColor: lockAspectRatio ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
              borderRadius: '4px'
            }}
            onClick={() => setLockAspectRatio(!lockAspectRatio)}
            title={lockAspectRatio ? 'Aspect Ratio Locked (proportional scaling)' : 'Aspect Ratio Unlocked (free scaling)'}
          >
            {lockAspectRatio ? <Link2 size={11} /> : <Unlink size={11} />}
            <span>{lockAspectRatio ? 'Locked' : 'Unlock'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>X Position</label>
              {renderKeyframeButtons('x', anim.x)}
            </div>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              value={Math.round(anim.x)} 
              onChange={(e) => handleNumericPropertyChange('x', Number(e.target.value))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Y Position</label>
              {renderKeyframeButtons('y', anim.y)}
            </div>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              value={Math.round(anim.y)} 
              onChange={(e) => handleNumericPropertyChange('y', Number(e.target.value))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Width</label>
              {renderKeyframeButtons('width', anim.width)}
            </div>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              value={Math.round(anim.width)} 
              onChange={(e) => handleWidthChange(Number(e.target.value))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Height</label>
              {renderKeyframeButtons('height', anim.height)}
            </div>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              value={Math.round(anim.height)} 
              onChange={(e) => handleHeightChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Center Rotation Control */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RotateCw size={11} /> Rotation
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
                {Math.round(anim.rotation)}°
              </span>
              {anim.rotation !== 0 && (
                <button
                  type="button"
                  className="timeline-tool-btn"
                  style={{ padding: '1px', width: '16px', height: '16px' }}
                  title="Reset rotation to 0°"
                  onClick={() => handleNumericPropertyChange('rotation', 0)}
                >
                  <RotateCcw size={10} />
                </button>
              )}
              {renderKeyframeButtons('rotation', anim.rotation)}
            </div>
          </div>
          <input 
            type="range" 
            min="-180" 
            max="180" 
            step="1"
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            value={Math.round(anim.rotation)} 
            onChange={(e) => handleNumericPropertyChange('rotation', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Layer Hierarchy & Opacity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Layers size={12} /> Appearance & Depth
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Opacity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#fff' }}>{Math.round(anim.opacity * 100)}%</span>
                {renderKeyframeButtons('opacity', anim.opacity)}
              </div>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              style={{ width: '100%', accentColor: 'var(--accent)' }}
              value={anim.opacity} 
              onChange={(e) => handleNumericPropertyChange('opacity', Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Z-Index Order</span>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '70px' }}
              value={selectedElement.zIndex}
              onChange={(e) => onUpdateElement(selectedElement.id, { zIndex: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Keyframe Animation Overview Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Diamond size={12} fill="#f59e0b" /> Keyframe Animation
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {(selectedElement.keyframes || []).length} keyframes
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="editor-btn primary"
              style={{ flex: 1, padding: '5px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              title="Add keyframes for position, size, rotation and opacity at current playhead"
              onClick={() => {
                onInteractionStart?.();
                let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, anim.x, selectedEasing);
                updated = addOrUpdateKeyframe(updated, 'y', relTime, anim.y, selectedEasing);
                updated = addOrUpdateKeyframe(updated, 'width', relTime, anim.width, selectedEasing);
                updated = addOrUpdateKeyframe(updated, 'height', relTime, anim.height, selectedEasing);
                updated = addOrUpdateKeyframe(updated, 'rotation', relTime, anim.rotation, selectedEasing);
                updated = addOrUpdateKeyframe(updated, 'opacity', relTime, anim.opacity, selectedEasing);
                onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
              }}
            >
              <Diamond size={11} fill="currentColor" />
              <span>+ Keyframe (All)</span>
            </button>

            {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
              <button
                type="button"
                className="editor-btn"
                style={{ padding: '5px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Clear all keyframes on this element"
                onClick={() => {
                  if (window.confirm('Clear all keyframes on this element?')) {
                    onInteractionStart?.();
                    const updated = clearAllKeyframes(selectedElement);
                    onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
                  }
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Interpolation Curve</label>
            <select
              className="editor-select"
              style={{ width: '140px', fontSize: '11px' }}
              value={selectedEasing}
              onChange={(e) => {
                const newEasing = e.target.value as KeyframeEasing;
                setSelectedEasing(newEasing);
                if (selectedElement.keyframes && selectedElement.keyframes.length > 0) {
                  const updated = selectedElement.keyframes.map((k) =>
                    Math.abs(k.time - relTime) <= 0.05 ? { ...k, easing: newEasing } : k
                  );
                  onUpdateElement(selectedElement.id, { keyframes: updated });
                }
              }}
            >
              <option value="linear">Linear (Standard)</option>
              <option value="ease-in-out">Ease In / Out (Smooth)</option>
            </select>
          </div>

          {/* Keyframe Markers List on Element */}
          {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', maxHeight: '90px', overflowY: 'auto' }}>
              {Array.from(
                selectedElement.keyframes.reduce((acc, kf) => {
                  const rounded = Math.round(kf.time * 100) / 100;
                  if (!acc.has(rounded)) acc.set(rounded, []);
                  acc.get(rounded)!.push(kf);
                  return acc;
                }, new Map<number, Keyframe[]>()).entries()
              ).map(([time, kfs]) => {
                const isCurrent = Math.abs(relTime - time) <= 0.05;
                return (
                  <div
                    key={time}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface)',
                      border: isCurrent ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '11px',
                    }}
                  >
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: isCurrent ? '#38bdf8' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      onClick={() => onSeek?.(Number((selectedElement.startTime + time).toFixed(3)))}
                      title="Jump playhead to this keyframe"
                    >
                      <Diamond size={9} fill={isCurrent ? '#38bdf8' : '#f59e0b'} color={isCurrent ? '#38bdf8' : '#f59e0b'} />
                      <span>{time.toFixed(2)}s</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '4px' }}>
                        ({kfs.map((k) => k.property).join(', ')})
                      </span>
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                      title="Delete keyframes at this timestamp"
                      onClick={() => {
                        onInteractionStart?.();
                        const updatedKeyframes = selectedElement.keyframes?.filter((k) => Math.abs(k.time - time) > 0.02) || [];
                        onUpdateElement(selectedElement.id, { keyframes: updatedKeyframes });
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Timing Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={12} /> Video Timing
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Time (s)</label>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              step="0.5"
              value={selectedElement.startTime} 
              onChange={(e) => onUpdateElement(selectedElement.id, { startTime: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Duration (s)</label>
            <input 
              type="number" 
              className="editor-select"
              style={{ width: '100%' }}
              step="0.5"
              value={selectedElement.duration} 
              onChange={(e) => onUpdateElement(selectedElement.id, { duration: Math.max(0.5, Number(e.target.value)) })}
            />
          </div>
        </div>
      </div>

      {/* 1. Wallpaper Configuration */}
      {isWallpaper && wallpaper && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ImageIcon size={12} /> Wallpaper Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Image Preview & Import Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '56px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {wallpaper.imageSrc ? (
                  <img
                    src={wallpaper.imageSrc}
                    alt="Wallpaper"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <ImageIcon size={16} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {extractFriendlyName(wallpaper.imageSrc, 'Windows XP Wallpaper')}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Desktop Background</span>
              </div>
              <button
                className="editor-btn primary"
                style={{ padding: '5px 8px', fontSize: '11px', flexShrink: 0 }}
                onClick={() => handlePickAndApplyImage('imageSrc')}
                title="Import or replace wallpaper using Windows file picker"
              >
                <Upload size={12} style={{ marginRight: '4px' }} />
                Import Wallpaper
              </button>
            </div>

            {/* Built-in Windows XP Wallpapers Dropdown */}
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                Built-in Windows XP Wallpapers
              </label>
              <select
                className="editor-select"
                style={{ width: '100%' }}
                value={wallpaper.imageSrc || '/assets/WindowsXp_Background.jpg'}
                onChange={(e) => onUpdateElement(selectedElement.id, { imageSrc: e.target.value } as any)}
              >
                {XP_WALLPAPERS.map((wp) => (
                  <option key={wp.id} value={wp.src}>
                    {wp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Choose from Project Images Dropdown */}
            {projectAssets.length > 0 && (
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                  Choose from Project Media
                </label>
                <select
                  className="editor-select"
                  style={{ width: '100%' }}
                  value={wallpaper.imageSrc || ''}
                  onChange={(e) => onUpdateElement(selectedElement.id, { imageSrc: e.target.value } as any)}
                >
                  <option value="/assets/WindowsXp_Background.jpg">Default Windows XP Bliss Wallpaper</option>
                  {projectAssets.map((asset) => (
                    <option key={asset.id} value={asset.src}>
                      {extractFriendlyName(asset.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}
              onClick={() => onUpdateElement(selectedElement.id, { showDesktopIcons: !wallpaper.showDesktopIcons } as any)}
            >
              {wallpaper.showDesktopIcons !== false ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
              <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Show Desktop Icons (My Computer, Bin...)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Windows XP Application Window Specific Properties */}
      {isXpWindow && xpWin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> XP Window Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Title Bar Text</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%' }}
                value={xpWin.title || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { title: e.target.value } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Window Preset Type</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={xpWin.windowType}
                onChange={(e) => onUpdateElement(selectedElement.id, { windowType: e.target.value as any } as any)}
              >
                <option value="generic">Standard Windows App</option>
                <option value="notepad">Notepad Text Editor</option>
                <option value="paint">MS Paint</option>
                <option value="cdplayer">CD Audio Player</option>
                <option value="error">System Error Alert Dialog</option>
              </select>
            </div>

            {/* Window Content Image & Replace Image button */}
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                Inside Window Content Image
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '6px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '4px', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {xpWin.contentImageSrc ? (
                    <img 
                      src={xpWin.contentImageSrc} 
                      alt="Window Image Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon size={16} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {extractFriendlyName(xpWin.contentImageSrc || '', 'No image selected')}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Window Content</span>
                </div>
                <button
                  className="editor-btn"
                  style={{ padding: '4px 8px', fontSize: '10px', flexShrink: 0 }}
                  onClick={() => handlePickAndApplyImage('contentImageSrc')}
                  title="Replace with an image from your computer"
                >
                  <Upload size={11} style={{ marginRight: '3px' }} />
                  Replace Image
                </button>
              </div>

              {projectAssets.length > 0 && (
                <select 
                  className="editor-select"
                  style={{ width: '100%', marginBottom: '6px' }}
                  value={xpWin.contentImageSrc || ''}
                  onChange={(e) => onUpdateElement(selectedElement.id, { contentImageSrc: e.target.value } as any)}
                >
                  <option value="">-- Choose from Project Media --</option>
                  <option value="/assets/xp/assistants/clippy/clippy.png">Clippy Assistant (Transparent)</option>
                  <option value="/assets/Paint.jpg">MS Paint Canvas</option>
                  <option value="/assets/CDPlayer.jpg">CD Player UI</option>
                  <option value="/assets/Error.jpg">Critical Error Graphic</option>
                  <option value="/assets/Notepad.jpg">Notepad Document</option>
                  <option value="/assets/WindowsXp_Background.jpg">Bliss Landscape</option>
                  {projectAssets.map((asset) => (
                    <option key={asset.id} value={asset.src}>
                      {extractFriendlyName(asset.name)}
                    </option>
                  ))}
                </select>
              )}

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  Image Fit Mode (Aspect Ratio)
                </label>
                <select 
                  className="editor-select"
                  style={{ width: '100%' }}
                  value={xpWin.fitMode || 'contain'}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fitMode: e.target.value as any } as any)}
                >
                  <option value="contain">Contain (Preserve authentic aspect ratio)</option>
                  <option value="cover">Cover (Fill entire window frame)</option>
                </select>
              </div>
            </div>

            {/* Checkbox Toggles for Authenticity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => onUpdateElement(selectedElement.id, { isActive: !xpWin.isActive } as any)}
              >
                {xpWin.isActive !== false ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
                <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Active Blue Titlebar (vs Inactive)</span>
              </div>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => onUpdateElement(selectedElement.id, { hasMenuBar: !xpWin.hasMenuBar } as any)}
              >
                {xpWin.hasMenuBar ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
                <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Show Menu Bar (File, Edit, View...)</span>
              </div>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => onUpdateElement(selectedElement.id, { hasStatusBar: !xpWin.hasStatusBar } as any)}
              >
                {xpWin.hasStatusBar ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
                <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Show Status Bar at bottom</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Windows Picture and Fax Viewer Specific Properties */}
      {isImageViewer && imageViewer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ImageIcon size={12} /> XP Picture Viewer Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Display Image & Replace Image button */}
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                Displayed Picture
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '6px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '4px', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {imageViewer.imageSrc ? (
                    <img 
                      src={imageViewer.imageSrc} 
                      alt="Viewer Picture Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon size={16} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {imageViewer.imageName || extractFriendlyName(imageViewer.imageSrc || '', 'photo.jpg')}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Picture Media</span>
                </div>
                <button
                  className="editor-btn"
                  style={{ padding: '4px 8px', fontSize: '10px', flexShrink: 0 }}
                  onClick={() => handlePickAndApplyImage('imageSrc', true)}
                  title="Replace with an image from your computer"
                >
                  <Upload size={11} style={{ marginRight: '3px' }} />
                  Replace Image
                </button>
              </div>

              {projectAssets.length > 0 && (
                <select 
                  className="editor-select"
                  style={{ width: '100%', marginBottom: '6px' }}
                  value={imageViewer.imageSrc || ''}
                  onChange={(e) => {
                    const src = e.target.value;
                    const matchedAsset = projectAssets.find((a) => a.src === src);
                    const friendly = matchedAsset ? extractFriendlyName(matchedAsset.name) : extractFriendlyName(src);
                    onUpdateElement(selectedElement.id, {
                      imageSrc: src,
                      imageName: friendly,
                      title: `${friendly} - Windows Picture and Fax Viewer`
                    } as any);
                  }}
                >
                  <option value="">-- Choose from Project Media --</option>
                  <option value="/assets/xp/assistants/clippy/clippy.png">Clippy.png (Office Assistant)</option>
                  <option value="/assets/CDPlayer.jpg">CDPlayer.jpg</option>
                  <option value="/assets/Paint.jpg">Paint.jpg</option>
                  <option value="/assets/Error.jpg">Error.jpg</option>
                  <option value="/assets/Notepad.jpg">Notepad.jpg</option>
                  <option value="/assets/WindowsXp_Background.jpg">WindowsXp_Background.jpg</option>
                  {projectAssets.map((asset) => (
                    <option key={asset.id} value={asset.src}>
                      {extractFriendlyName(asset.name)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Display Image Filename</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%' }}
                value={imageViewer.imageName || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { 
                  imageName: e.target.value,
                  title: `${e.target.value} - Windows Picture and Fax Viewer`
                } as any)}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Image Fit Mode</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={imageViewer.fitMode || 'contain'}
                onChange={(e) => onUpdateElement(selectedElement.id, { fitMode: e.target.value as any } as any)}
              >
                <option value="contain">Contain (Fit in window)</option>
                <option value="cover">Cover (Fill window)</option>
                <option value="none">Original Size (1:1)</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zoom Level</span>
                <span style={{ fontSize: '11px', color: '#fff' }}>{Math.round((imageViewer.zoomLevel || 1) * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.2" 
                max="3" 
                step="0.1"
                style={{ width: '100%', accentColor: 'var(--accent)' }}
                value={imageViewer.zoomLevel || 1}
                onChange={(e) => onUpdateElement(selectedElement.id, { zoomLevel: Number(e.target.value) } as any)}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Rotation Angle</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    className={`editor-btn ${imageViewer.rotation === deg ? 'primary' : ''}`}
                    style={{ flex: 1, padding: '4px' }}
                    onClick={() => onUpdateElement(selectedElement.id, { rotation: deg } as any)}
                  >
                    <RotateCw size={11} /> {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}
              onClick={() => onUpdateElement(selectedElement.id, { isActive: !imageViewer.isActive } as any)}
            >
              {imageViewer.isActive !== false ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
              <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Active Blue Window (vs Inactive)</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Windows XP Dialog / Message Box */}
      {isDialog && dialog && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> XP Dialog Box Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Dialog Title</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%' }}
                value={dialog.dialogTitle || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { dialogTitle: e.target.value } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Alert Message</label>
              <textarea 
                className="editor-select"
                style={{ width: '100%', height: '50px', resize: 'vertical' }}
                value={dialog.message || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { message: e.target.value } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Icon Style</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={dialog.iconType || 'error'}
                onChange={(e) => onUpdateElement(selectedElement.id, { iconType: e.target.value as any } as any)}
              >
                <option value="error">Critical Error (Red ✕)</option>
                <option value="warning">Warning (Yellow ⚠️)</option>
                <option value="info">Information (Blue ℹ️)</option>
                <option value="question">Question (❓)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Buttons Layout</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={dialog.buttonLayout || 'ok'}
                onChange={(e) => onUpdateElement(selectedElement.id, { buttonLayout: e.target.value as any } as any)}
              >
                <option value="ok">[ OK ]</option>
                <option value="ok-cancel">[ OK ] [ Cancel ]</option>
                <option value="yes-no">[ Yes ] [ No ]</option>
                <option value="retry-cancel">[ Retry ] [ Cancel ]</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. Desktop Icon Settings */}
      {isDesktopIcon && desktopIcon && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> Desktop Icon Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Icon Label</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%' }}
                value={desktopIcon.label || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { label: e.target.value } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Icon Graphic</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={desktopIcon.iconType || 'my-computer'}
                onChange={(e) => onUpdateElement(selectedElement.id, { iconType: e.target.value as any } as any)}
              >
                {XP_ICONS.map((ic) => (
                  <option key={ic.id} value={ic.id}>{ic.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 6. Text Overlay / Notification Balloon Settings */}
      {isText && textOverlay && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> Text & Balloon Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Text Content</label>
              <textarea 
                className="editor-select"
                style={{ width: '100%', height: '50px', resize: 'vertical' }}
                value={textOverlay.text || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { text: e.target.value } as any)}
              />
            </div>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => onUpdateElement(selectedElement.id, { balloonStyle: !textOverlay.balloonStyle } as any)}
            >
              {textOverlay.balloonStyle ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text-dim)" />}
              <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>XP Notification Balloon Style</span>
            </div>
            {textOverlay.balloonStyle && (
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Balloon Title</label>
                <input 
                  type="text" 
                  className="editor-select"
                  style={{ width: '100%' }}
                  value={textOverlay.balloonTitle || ''}
                  onChange={(e) => onUpdateElement(selectedElement.id, { balloonTitle: e.target.value } as any)}
                />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Font Size</span>
                <span style={{ fontSize: '11px', color: '#fff' }}>{textOverlay.fontSize || 12}px</span>
              </div>
              <input 
                type="range" 
                min="9" 
                max="48" 
                step="1"
                style={{ width: '100%', accentColor: 'var(--accent)' }}
                value={textOverlay.fontSize || 12}
                onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Text Color</label>
              <input 
                type="color" 
                value={textOverlay.color || '#ffffff'}
                onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value } as any)}
                style={{ width: '100%', height: '28px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Mouse Cursor Settings */}
      {isCursor && cursor && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> XP Cursor & Motion Path
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Pointer Type</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={cursor.cursorType || 'default'}
                onChange={(e) => onUpdateElement(selectedElement.id, { cursorType: e.target.value as any } as any)}
              >
                {XP_CURSORS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Click Animation Effect</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={cursor.clickEffect || 'none'}
                onChange={(e) => onUpdateElement(selectedElement.id, { clickEffect: e.target.value as any } as any)}
              >
                <option value="none">None (Standard)</option>
                <option value="ripple">Click Ripple Glow</option>
                <option value="press">Button Press Down</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: '#fff', marginTop: '2px' }}>
              <input
                type="checkbox"
                checked={cursor.showMovementPath !== false}
                onChange={(e) => onUpdateElement(selectedElement.id, { showMovementPath: e.target.checked } as any)}
              />
              <span>Show Motion Path on Canvas</span>
            </label>

            {/* Mouse Motion Keyframing & Waypoints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Waypoints & Keyframes
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {((cursor.keyframes || []).filter(k => k.property === 'x' || k.property === 'y').length > 0)
                    ? `${(cursor.keyframes || []).filter(k => k.property === 'x').length} Waypoints`
                    : 'Static Position'}
                </span>
              </div>

              <button
                type="button"
                className="editor-btn"
                style={{ width: '100%', justifyContent: 'center', gap: '5px', fontSize: '11px', padding: '6px' }}
                onClick={() => {
                  onInteractionStart?.();
                  let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, anim.x, selectedEasing);
                  updated = addOrUpdateKeyframe(updated, 'y', relTime, anim.y, selectedEasing);
                  onUpdateElement(selectedElement.id, { keyframes: updated.keyframes });
                }}
              >
                <Diamond size={11} fill="#f59e0b" color="#f59e0b" />
                <span>+ Add Movement Waypoint at {relTime.toFixed(2)}s</span>
              </button>

              {/* Movement Glide Quick Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Glide Presets (at {relTime.toFixed(1)}s):</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  <button
                    type="button"
                    className="editor-btn"
                    style={{ fontSize: '10px', padding: '4px', justifyContent: 'center' }}
                    onClick={() => {
                      onInteractionStart?.();
                      let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, 3, 'ease-in-out');
                      updated = addOrUpdateKeyframe(updated, 'y', relTime, 96, 'ease-in-out');
                      onUpdateElement(selectedElement.id, { x: 3, y: 96, keyframes: updated.keyframes });
                    }}
                    title="Glide pointer to Start Menu at current playhead"
                  >
                    To Start Menu
                  </button>
                  <button
                    type="button"
                    className="editor-btn"
                    style={{ fontSize: '10px', padding: '4px', justifyContent: 'center' }}
                    onClick={() => {
                      onInteractionStart?.();
                      let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, 75, 'ease-in-out');
                      updated = addOrUpdateKeyframe(updated, 'y', relTime, 25, 'ease-in-out');
                      onUpdateElement(selectedElement.id, { x: 75, y: 25, keyframes: updated.keyframes });
                    }}
                    title="Glide pointer to Close Button at current playhead"
                  >
                    To Close Button
                  </button>
                  <button
                    type="button"
                    className="editor-btn"
                    style={{ fontSize: '10px', padding: '4px', justifyContent: 'center' }}
                    onClick={() => {
                      onInteractionStart?.();
                      let updated = addOrUpdateKeyframe(selectedElement, 'x', relTime, 50, 'ease-in-out');
                      updated = addOrUpdateKeyframe(updated, 'y', relTime, 50, 'ease-in-out');
                      onUpdateElement(selectedElement.id, { x: 50, y: 50, keyframes: updated.keyframes });
                    }}
                    title="Glide pointer to Screen Center at current playhead"
                  >
                    To Center
                  </button>
                  <button
                    type="button"
                    className="editor-btn"
                    style={{ fontSize: '10px', padding: '4px', justifyContent: 'center', color: 'var(--danger)' }}
                    onClick={() => {
                      onInteractionStart?.();
                      const filtered = (selectedElement.keyframes || []).filter(k => k.property !== 'x' && k.property !== 'y');
                      onUpdateElement(selectedElement.id, { keyframes: filtered });
                    }}
                    title="Clear all motion keyframes for cursor"
                  >
                    Clear Path
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Audio Track Settings */}
      {isAudio && audio && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> Audio Track & Fades
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Audio Source URL / Path</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%', fontSize: '11px' }}
                value={audio.audioSrc || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { audioSrc: e.target.value } as any)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base Volume ({Math.round(((anim.volume !== undefined ? anim.volume : audio.volume) ?? 1) * 100)}%)</span>
                {renderKeyframeButtons('volume', audio.volume ?? 1)}
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                style={{ width: '100%', accentColor: '#10b981' }}
                value={(anim.volume !== undefined ? anim.volume : audio.volume) ?? 1}
                onChange={(e) => handleNumericPropertyChange('volume', Number(e.target.value))}
              />
            </div>

            {/* Fade In & Fade Out Automation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fade In (sec)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  className="editor-input"
                  value={audio.fadeInDuration ?? 0}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fadeInDuration: Math.max(0, parseFloat(e.target.value) || 0) } as any)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fade Out (sec)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  className="editor-input"
                  value={audio.fadeOutDuration ?? 0}
                  onChange={(e) => onUpdateElement(selectedElement.id, { fadeOutDuration: Math.max(0, parseFloat(e.target.value) || 0) } as any)}
                />
              </div>
            </div>

            {/* Quick Fade Presets */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              <button
                type="button"
                className="editor-btn"
                style={{ flex: 1, fontSize: '10px', padding: '3px 4px', justifyContent: 'center' }}
                onClick={() => onUpdateElement(selectedElement.id, { fadeInDuration: 1.0 } as any)}
              >
                Fade In 1s
              </button>
              <button
                type="button"
                className="editor-btn"
                style={{ flex: 1, fontSize: '10px', padding: '3px 4px', justifyContent: 'center' }}
                onClick={() => onUpdateElement(selectedElement.id, { fadeOutDuration: 2.0 } as any)}
              >
                Fade Out 2s
              </button>
              <button
                type="button"
                className="editor-btn"
                style={{ flex: 1, fontSize: '10px', padding: '3px 4px', justifyContent: 'center' }}
                onClick={() => onUpdateElement(selectedElement.id, { fadeInDuration: 1.0, fadeOutDuration: 2.0 } as any)}
              >
                Fade In/Out
              </button>
            </div>

            {/* Effective Volume Readout */}
            <div style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Effective Playhead Volume:</span>
              <span style={{ fontWeight: 600 }}>{Math.round(evaluateAudioVolume(selectedElement, playheadTime) * 100)}%</span>
            </div>

            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '2px' }}
              onClick={() => onUpdateElement(selectedElement.id, { loop: !audio.loop } as any)}
            >
              {audio.loop ? <CheckSquare size={14} color="#10b981" /> : <Square size={14} color="var(--text-dim)" />}
              <span style={{ fontSize: '11px', color: 'var(--text-main)' }}>Loop Audio</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. Video Clip Settings */}
      {isVideo && video && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> Video Clip Settings
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Video Source URL</label>
              <input 
                type="text" 
                className="editor-select"
                style={{ width: '100%', fontSize: '11px' }}
                value={video.videoSrc || ''}
                onChange={(e) => onUpdateElement(selectedElement.id, { videoSrc: e.target.value } as any)}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Fit Mode</label>
              <select 
                className="editor-select"
                style={{ width: '100%' }}
                value={video.fitMode || 'contain'}
                onChange={(e) => onUpdateElement(selectedElement.id, { fitMode: e.target.value as any } as any)}
              >
                <option value="contain">Contain (Fit)</option>
                <option value="cover">Cover (Fill)</option>
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Audio Volume</span>
                <span style={{ fontSize: '11px', color: '#fff' }}>{Math.round((video.volume ?? 1) * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                style={{ width: '100%', accentColor: '#f59e0b' }}
                value={video.volume ?? 1}
                onChange={(e) => onUpdateElement(selectedElement.id, { volume: Number(e.target.value) } as any)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 11. Assistant Character & Dialogue Bubble Properties */}
      {isAssistant && assistant && (() => {
        const evalDialogue = evaluateAssistantDialogue(assistant, playheadTime);
        const dKfs = [...(assistant.dialogueKeyframes || [])].sort((a, b) => a.time - b.time);
        const hasDialogueKfs = dKfs.length > 0;
        const hasGeneralKfs = (selectedElement.keyframes && selectedElement.keyframes.length > 0) ?? false;

        // Target dialogue keyframe currently being inspected / edited
        const nearDkf = dKfs.find((k) => Math.abs(k.time - relTime) <= 0.15);
        const selectedDkf = selectedDkfId ? dKfs.find((k) => k.id === selectedDkfId) : null;
        const activeDkf = nearDkf || selectedDkf || dKfs.find((k) => Math.abs(k.time - evalDialogue.activeKeyframeTime) <= 0.05) || (hasDialogueKfs ? dKfs[0] : null);

        const currentDkf = nearDkf;

        const currentDialogueText = activeDkf ? (activeDkf.dialogueText ?? '') : (evalDialogue.dialogueText ?? assistant.dialogueText ?? '');
        const currentPose = activeDkf ? (activeDkf.pose || 'idle') : (evalDialogue.pose || assistant.pose || 'idle');
        const currentBubblePos = activeDkf ? (activeDkf.bubblePosition || 'left') : (evalDialogue.bubblePosition || assistant.bubblePosition || 'left');
        const currentShow = activeDkf ? (activeDkf.showDialogue !== false) : (evalDialogue.showDialogue !== false);

        const prevDkfTime = (() => {
          for (let i = dKfs.length - 1; i >= 0; i--) {
            if (dKfs[i].time < relTime - 0.08) {
              return Number((assistant.startTime + dKfs[i].time).toFixed(3));
            }
          }
          return null;
        })();

        const nextDkfTime = (() => {
          for (let i = 0; i < dKfs.length; i++) {
            if (dKfs[i].time > relTime + 0.08) {
              return Number((assistant.startTime + dKfs[i].time).toFixed(3));
            }
          }
          return null;
        })();

        const handleSetDialogueKeyframe = () => {
          onInteractionStart?.();
          const updated = addOrUpdateDialogueKeyframe(assistant, relTime, {
            dialogueText: currentDialogueText,
            pose: currentPose,
            bubblePosition: currentBubblePos,
            showDialogue: currentShow,
          });
          const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
          if (created) setSelectedDkfId(created.id);
          onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
        };

        const handleDeleteDialogueKeyframe = (kfId: string) => {
          onInteractionStart?.();
          const updated = removeDialogueKeyframe(assistant, kfId);
          if (selectedDkfId === kfId) setSelectedDkfId(null);
          onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
        };

        const handleUpdatePose = (newPose: AssistantPose) => {
          onInteractionStart?.();
          if (hasDialogueKfs) {
            if (activeDkf) {
              const updated = updateDialogueKeyframeById(assistant, activeDkf.id, { pose: newPose });
              const firstPose = updated.dialogueKeyframes?.[0]?.pose || newPose;
              onUpdateElement(selectedElement.id, { pose: firstPose, dialogueKeyframes: updated.dialogueKeyframes });
            } else {
              const updated = addOrUpdateDialogueKeyframe(assistant, relTime, { ...evalDialogue, pose: newPose });
              const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
              if (created) setSelectedDkfId(created.id);
              onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
            }
          } else {
            onUpdateElement(selectedElement.id, { pose: newPose });
          }
        };

        const handleUpdateText = (newText: string) => {
          onInteractionStart?.();
          if (hasDialogueKfs) {
            if (activeDkf) {
              const updated = updateDialogueKeyframeById(assistant, activeDkf.id, { dialogueText: newText });
              const firstText = updated.dialogueKeyframes?.[0]?.dialogueText ?? newText;
              onUpdateElement(selectedElement.id, { dialogueText: firstText, dialogueKeyframes: updated.dialogueKeyframes });
            } else {
              const updated = addOrUpdateDialogueKeyframe(assistant, relTime, {
                ...evalDialogue,
                dialogueText: newText,
              });
              const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
              if (created) setSelectedDkfId(created.id);
              const firstText = updated.dialogueKeyframes?.[0]?.dialogueText ?? newText;
              onUpdateElement(selectedElement.id, { dialogueText: firstText, dialogueKeyframes: updated.dialogueKeyframes });
            }
          } else {
            if (hasGeneralKfs && relTime > 0.05) {
              const updated = addOrUpdateDialogueKeyframe(assistant, relTime, {
                dialogueText: newText,
                pose: assistant.pose || 'idle',
                bubblePosition: assistant.bubblePosition || 'left',
                showDialogue: assistant.showDialogue !== false,
              });
              const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
              if (created) setSelectedDkfId(created.id);
              onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
            } else {
              onUpdateElement(selectedElement.id, { dialogueText: newText });
            }
          }
        };

        const handleDirectKeyframeText = (kfId: string, newText: string) => {
          onInteractionStart?.();
          const updated = updateDialogueKeyframeById(assistant, kfId, { dialogueText: newText });
          const firstText = updated.dialogueKeyframes?.[0]?.dialogueText ?? newText;
          onUpdateElement(selectedElement.id, { dialogueText: firstText, dialogueKeyframes: updated.dialogueKeyframes });
        };

        const handleDirectKeyframePose = (kfId: string, newPose: AssistantPose) => {
          onInteractionStart?.();
          const updated = updateDialogueKeyframeById(assistant, kfId, { pose: newPose });
          const firstPose = updated.dialogueKeyframes?.[0]?.pose || newPose;
          onUpdateElement(selectedElement.id, { pose: firstPose, dialogueKeyframes: updated.dialogueKeyframes });
        };

        const handleDirectKeyframePosition = (kfId: string, newPos: BubblePosition) => {
          onInteractionStart?.();
          const updated = updateDialogueKeyframeById(assistant, kfId, { bubblePosition: newPos });
          const firstPos = updated.dialogueKeyframes?.[0]?.bubblePosition || newPos;
          onUpdateElement(selectedElement.id, { bubblePosition: firstPos, dialogueKeyframes: updated.dialogueKeyframes });
        };

        const handleUpdatePosition = (newPos: BubblePosition) => {
          onInteractionStart?.();
          if (hasDialogueKfs) {
            if (activeDkf) {
              const updated = updateDialogueKeyframeById(assistant, activeDkf.id, { bubblePosition: newPos });
              const firstPos = updated.dialogueKeyframes?.[0]?.bubblePosition || newPos;
              onUpdateElement(selectedElement.id, { bubblePosition: firstPos, dialogueKeyframes: updated.dialogueKeyframes });
            } else {
              const updated = addOrUpdateDialogueKeyframe(assistant, relTime, { ...evalDialogue, bubblePosition: newPos });
              const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
              if (created) setSelectedDkfId(created.id);
              onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
            }
          } else {
            onUpdateElement(selectedElement.id, { bubblePosition: newPos });
          }
        };

        const handleUpdateShow = (newShow: boolean) => {
          onInteractionStart?.();
          if (hasDialogueKfs) {
            if (activeDkf) {
              const updated = updateDialogueKeyframeById(assistant, activeDkf.id, { showDialogue: newShow });
              const firstShow = updated.dialogueKeyframes?.[0]?.showDialogue ?? newShow;
              onUpdateElement(selectedElement.id, { showDialogue: firstShow, dialogueKeyframes: updated.dialogueKeyframes });
            } else {
              const updated = addOrUpdateDialogueKeyframe(assistant, relTime, { ...evalDialogue, showDialogue: newShow });
              const created = updated.dialogueKeyframes?.find((k) => Math.abs(k.time - relTime) <= 0.15);
              if (created) setSelectedDkfId(created.id);
              onUpdateElement(selectedElement.id, { dialogueKeyframes: updated.dialogueKeyframes });
            }
          } else {
            onUpdateElement(selectedElement.id, { showDialogue: newShow });
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Bot size={13} /> XP Assistant Character
              </span>
              {hasDialogueKfs && (
                <span style={{ fontSize: '10px', color: '#ec4899', background: 'rgba(236,72,153,0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(236,72,153,0.3)' }}>
                  {dKfs.length} Dialogue Keyframe{dKfs.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Pose Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Character Status / Pose</label>
                {hasDialogueKfs && activeDkf && (
                  <span style={{ fontSize: '10px', color: '#ec4899', fontWeight: 600 }}>
                    Active at {activeDkf.time.toFixed(1)}s
                  </span>
                )}
              </div>
              <select
                className="editor-input"
                value={currentPose}
                onChange={(e) => handleUpdatePose(e.target.value as AssistantPose)}
              >
                {XP_ASSISTANT_POSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

          {/* Animation Toggle & Speed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#fff' }}>
              <input
                type="checkbox"
                checked={assistant.isAnimated ?? false}
                onChange={(e) => onUpdateElement(selectedElement.id, { isAnimated: e.target.checked })}
              />
              <span>Play Animated Idle Loop (12 FPS Sprite)</span>
            </label>

            {(assistant.isAnimated ?? false) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Animation Speed</span>
                  <span>{assistant.animationSpeed || 12} FPS</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="1"
                  value={assistant.animationSpeed || 12}
                  onChange={(e) => onUpdateElement(selectedElement.id, { animationSpeed: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            )}
          </div>

          {/* Fade-in & Fade-out Durations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fade In (sec)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                className="editor-input"
                value={assistant.fadeInDuration ?? 0}
                onChange={(e) => onUpdateElement(selectedElement.id, { fadeInDuration: Math.max(0, parseFloat(e.target.value) || 0) })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fade Out (sec)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                className="editor-input"
                value={assistant.fadeOutDuration ?? 0}
                onChange={(e) => onUpdateElement(selectedElement.id, { fadeOutDuration: Math.max(0, parseFloat(e.target.value) || 0) })}
              />
            </div>
          </div>

          {/* Dialogue Speech Bubble Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MessageSquare size={13} /> Dialogue Speech Bubble
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={currentShow}
                  onChange={(e) => handleUpdateShow(e.target.checked)}
                />
                <span>Visible</span>
              </label>
            </div>

            {/* Dedicated Dialogue Keyframes Panel */}
            <div
              style={{
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.25)',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Diamond size={12} fill={currentDkf ? '#ec4899' : 'none'} />
                  Dialogue Keyframing
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="timeline-tool-btn"
                    style={{ padding: '2px', width: '20px', height: '20px', opacity: prevDkfTime !== null ? 1 : 0.3 }}
                    title="Jump to previous dialogue keyframe"
                    disabled={prevDkfTime === null}
                    onClick={() => {
                      if (prevDkfTime !== null) {
                        if (onSeek) onSeek(prevDkfTime);
                        const kf = dKfs.find((k) => Math.abs(assistant.startTime + k.time - prevDkfTime) <= 0.05);
                        if (kf) setSelectedDkfId(kf.id);
                      }
                    }}
                  >
                    <ChevronLeft size={12} />
                  </button>

                  <button
                    type="button"
                    className="timeline-tool-btn"
                    style={{ padding: '2px', width: '20px', height: '20px', opacity: nextDkfTime !== null ? 1 : 0.3 }}
                    title="Jump to next dialogue keyframe"
                    disabled={nextDkfTime === null}
                    onClick={() => {
                      if (nextDkfTime !== null) {
                        if (onSeek) onSeek(nextDkfTime);
                        const kf = dKfs.find((k) => Math.abs(assistant.startTime + k.time - nextDkfTime) <= 0.05);
                        if (kf) setSelectedDkfId(kf.id);
                      }
                    }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="editor-btn"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: currentDkf ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    borderColor: currentDkf ? '#ec4899' : 'rgba(255, 255, 255, 0.15)',
                    color: currentDkf ? '#f472b6' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                  onClick={handleSetDialogueKeyframe}
                >
                  <Plus size={12} />
                  <span>{currentDkf ? `Update Keyframe at ${relTime.toFixed(1)}s` : `Add Keyframe at ${relTime.toFixed(1)}s`}</span>
                </button>

                {currentDkf && (
                  <button
                    type="button"
                    className="editor-btn btn-danger"
                    style={{ padding: '4px 6px', fontSize: '11px' }}
                    title={`Delete dialogue keyframe at ${currentDkf.time.toFixed(1)}s`}
                    onClick={() => handleDeleteDialogueKeyframe(currentDkf.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Keyframe List with Direct Editing Cards */}
              {dKfs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                  {dKfs.map((k, idx) => {
                    const isSelected = activeDkf?.id === k.id;
                    return (
                      <div
                        key={k.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '6px',
                          borderRadius: '4px',
                          background: isSelected ? 'rgba(236, 72, 153, 0.18)' : 'rgba(0, 0, 0, 0.25)',
                          border: isSelected ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isSelected ? '0 0 6px rgba(236, 72, 153, 0.25)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <button
                            type="button"
                            className="editor-btn"
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: isSelected ? '#f472b6' : 'var(--text-muted)',
                              background: isSelected ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                              borderColor: isSelected ? '#ec4899' : 'rgba(255, 255, 255, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setSelectedDkfId(k.id);
                              if (onSeek) onSeek(Number((assistant.startTime + k.time).toFixed(3)));
                            }}
                            title={`Jump playhead to keyframe #${idx + 1} (${k.time.toFixed(1)}s)`}
                          >
                            <Diamond size={9} fill={isSelected ? '#ec4899' : 'none'} />
                            <span>{k.time.toFixed(1)}s</span>
                          </button>

                          <select
                            className="editor-input"
                            style={{ height: '22px', fontSize: '10px', padding: '1px 4px', maxWidth: '85px' }}
                            value={k.pose || 'idle'}
                            onChange={(e) => handleDirectKeyframePose(k.id, e.target.value as AssistantPose)}
                            title="Character pose/status for this keyframe"
                          >
                            {XP_ASSISTANT_POSES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>

                          <select
                            className="editor-input"
                            style={{ height: '22px', fontSize: '10px', padding: '1px 4px', maxWidth: '75px' }}
                            value={k.bubblePosition || 'left'}
                            onChange={(e) => handleDirectKeyframePosition(k.id, e.target.value as BubblePosition)}
                            title="Speech bubble position for this keyframe"
                          >
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="top">Top</option>
                            <option value="top-left">Top-L</option>
                            <option value="top-right">Top-R</option>
                          </select>

                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', marginLeft: 'auto' }}
                            title={`Delete keyframe at ${k.time.toFixed(1)}s`}
                            onClick={() => handleDeleteDialogueKeyframe(k.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Direct Text Input For This Keyframe */}
                        <input
                          type="text"
                          className="editor-input"
                          style={{
                            width: '100%',
                            height: '24px',
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: isSelected ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.25)',
                            borderColor: isSelected ? '#ec4899' : 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                          }}
                          value={k.dialogueText ?? ''}
                          placeholder={`Keyframe ${idx + 1} text at ${k.time.toFixed(1)}s...`}
                          onChange={(e) => handleDirectKeyframeText(k.id, e.target.value)}
                          onFocus={() => {
                            setSelectedDkfId(k.id);
                            if (onSeek) onSeek(Number((assistant.startTime + k.time).toFixed(3)));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {currentShow && (
              <>
                {/* Dialogue Text Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bubble Message Text</label>
                    {hasDialogueKfs && activeDkf ? (
                      <span style={{ fontSize: '10px', color: '#ec4899', fontWeight: 600, background: 'rgba(236,72,153,0.12)', padding: '1px 6px', borderRadius: '3px' }}>
                        Editing Keyframe at {activeDkf.time.toFixed(1)}s
                      </span>
                    ) : hasDialogueKfs ? (
                      <span style={{ fontSize: '10px', color: '#ec4899' }}>
                        At {relTime.toFixed(1)}s (New Keyframe)
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    className="editor-input"
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'Tahoma, sans-serif', fontSize: '11px', lineHeight: 1.4 }}
                    value={currentDialogueText}
                    placeholder="Enter what Clippy should say..."
                    onChange={(e) => handleUpdateText(e.target.value)}
                  />
                </div>

                {/* Typewriter Effect */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={assistant.typewriterEffect ?? false}
                      onChange={(e) => onUpdateElement(selectedElement.id, { typewriterEffect: e.target.checked } as any)}
                    />
                    <span>Typewriter Text Animation</span>
                  </label>

                  {(assistant.typewriterEffect ?? false) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>Typing Speed</span>
                        <span>{assistant.typewriterSpeed || 25} chars/sec</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="1"
                        value={assistant.typewriterSpeed || 25}
                        onChange={(e) => onUpdateElement(selectedElement.id, { typewriterSpeed: Number(e.target.value) } as any)}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Placement Position */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bubble Placement</label>
                    {hasDialogueKfs && activeDkf && (
                      <span style={{ fontSize: '10px', color: '#ec4899' }}>
                        Active at {activeDkf.time.toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <select
                    className="editor-input"
                    value={currentBubblePos}
                    onChange={(e) => handleUpdatePosition(e.target.value as BubblePosition)}
                  >
                    <option value="left">Left of Assistant (Default)</option>
                    <option value="right">Right of Assistant</option>
                    <option value="top">Top Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>

                {/* Color Styling */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Background</label>
                    <input
                      type="color"
                      className="editor-input"
                      style={{ padding: '2px', height: '28px', cursor: 'pointer' }}
                      value={assistant.bubbleBgColor || '#FFFFE1'}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleBgColor: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Text Color</label>
                    <input
                      type="color"
                      className="editor-input"
                      style={{ padding: '2px', height: '28px', cursor: 'pointer' }}
                      value={assistant.bubbleTextColor || '#000000'}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleTextColor: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Border Color</label>
                    <input
                      type="color"
                      className="editor-input"
                      style={{ padding: '2px', height: '28px', cursor: 'pointer' }}
                      value={assistant.bubbleBorderColor || '#000000'}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleBorderColor: e.target.value })}
                    />
                  </div>
                </div>

                {/* Typography & Geometry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Font Size</span>
                      <span>{assistant.bubbleFontSize || 12}px</span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="24"
                      value={assistant.bubbleFontSize || 12}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleFontSize: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Bubble Width</span>
                      <span>{assistant.bubbleWidth ? Math.round(assistant.bubbleWidth * 4.5) : 220}px</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="80"
                      value={assistant.bubbleWidth || 48}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleWidth: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Corner Radius</span>
                      <span>{assistant.bubbleCornerRadius ?? 8}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={assistant.bubbleCornerRadius ?? 8}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubbleCornerRadius: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Padding</span>
                      <span>{assistant.bubblePadding ?? 10}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="24"
                      value={assistant.bubblePadding ?? 10}
                      onChange={(e) => onUpdateElement(selectedElement.id, { bubblePadding: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    })()}
    </div>
  );
};
