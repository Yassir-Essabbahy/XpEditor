import React from 'react';
import { ImageViewerElement } from '../../types/editor';
import { XpTitlebarButtons } from './XpTitlebarButtons';
import { formatFriendlyTitle } from '../../utils/filePicker';

interface XpImageViewerProps {
  element: ImageViewerElement;
  isSelected: boolean;
  onUpdateProps?: (updates: Partial<ImageViewerElement>) => void;
}

export const XpImageViewer: React.FC<XpImageViewerProps> = ({
  element,
  isSelected,
  onUpdateProps,
}) => {
  const currentZoom = element.zoomLevel ?? 1;
  const currentRotation = element.rotation ?? 0;

  const handleZoom = (delta: number) => {
    const next = Math.max(0.2, Math.min(3, currentZoom + delta));
    onUpdateProps?.({ zoomLevel: Number(next.toFixed(2)) });
  };

  const handleRotate = (angleDelta: number) => {
    const next = (currentRotation + angleDelta + 360) % 360;
    onUpdateProps?.({ rotation: next });
  };

  const resetFit = () => {
    onUpdateProps?.({ zoomLevel: 1, rotation: 0 });
  };

  const rawTitle = element.title || `${element.imageName || 'Image'} - Windows Picture and Fax Viewer`;
  const displayTitle = formatFriendlyTitle(rawTitle);
  const isActive = element.isActive !== false;

  return (
    <div 
      className="xp-window-chrome"
      style={{
        width: '100%',
        height: '100%',
        boxShadow: isSelected 
          ? '0 0 0 2px var(--accent), 0 8px 30px rgba(0,0,0,0.6)' 
          : '2px 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {/* Title Bar */}
      <div className={`xp-titlebar ${!isActive ? 'inactive' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{ fontSize: '13px' }}>🖼️</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayTitle}
          </span>
        </div>
        <XpTitlebarButtons />
      </div>

      {/* Main Picture Viewport */}
      <div className="xp-image-viewer-viewport">
        <img
          src={element.imageSrc || '/assets/Paint.jpg'}
          alt={element.imageName || 'Viewed Image'}
          className="xp-image-viewer-img"
          style={{
            transform: `scale(${currentZoom}) rotate(${currentRotation}deg)`,
            objectFit: element.fitMode || 'contain',
          }}
        />
      </div>

      {/* Iconic Windows XP Picture Viewer Toolbar */}
      <div className="xp-image-viewer-toolbar">
        <button 
          className="xp-viewer-btn" 
          title="Zoom In" 
          onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }}
        >
          🔍+
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Zoom Out" 
          onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }}
        >
          🔍-
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Best Fit" 
          onClick={(e) => { e.stopPropagation(); resetFit(); }}
        >
          🖵
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Actual Size" 
          onClick={(e) => { e.stopPropagation(); onUpdateProps?.({ zoomLevel: 1 }); }}
        >
          1:1
        </button>

        <div className="xp-viewer-separator" />

        <button 
          className="xp-viewer-btn" 
          title="Start Slide Show (F11)" 
          onClick={(e) => e.stopPropagation()}
        >
          ▶
        </button>

        <div className="xp-viewer-separator" />

        <button 
          className="xp-viewer-btn" 
          title="Rotate Clockwise" 
          onClick={(e) => { e.stopPropagation(); handleRotate(90); }}
        >
          ⟳
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Rotate Counterclockwise" 
          onClick={(e) => { e.stopPropagation(); handleRotate(-90); }}
        >
          ⟲
        </button>

        <div className="xp-viewer-separator" />

        <button 
          className="xp-viewer-btn" 
          title="Delete (Del)" 
          onClick={(e) => e.stopPropagation()}
        >
          🗑
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Print..." 
          onClick={(e) => e.stopPropagation()}
        >
          🖶
        </button>
        <button 
          className="xp-viewer-btn" 
          title="Save As..." 
          onClick={(e) => e.stopPropagation()}
        >
          💾
        </button>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar">
        <div className="xp-statusbar-panel" style={{ flex: 1 }}>
          {element.imageName || 'image.jpg'} (Zoom: {Math.round(currentZoom * 100)}%)
        </div>
        <div className="xp-resize-grip" />
      </div>
    </div>
  );
};
