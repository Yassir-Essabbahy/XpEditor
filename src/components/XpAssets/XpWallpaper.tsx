import React from 'react';
import { WallpaperElement, DesktopIconItem } from '../../types/editor';
import { XP_ICON_PATHS } from '../../utils/xpAssets';

interface XpWallpaperProps {
  element: WallpaperElement;
  isSelected?: boolean;
}

export const XpWallpaper: React.FC<XpWallpaperProps> = ({ element }) => {
  // Default desktop icons if enabled
  const defaultIcons: DesktopIconItem[] = element.desktopIcons || [
    { id: 'icon-comp', label: 'My Computer', iconType: 'my-computer', x: 2, y: 3 },
    { id: 'icon-doc', label: 'My Documents', iconType: 'my-documents', x: 2, y: 15 },
    { id: 'icon-bin', label: 'Recycle Bin', iconType: 'recycle-bin', x: 2, y: 27 },
    { id: 'icon-ie', label: 'Internet Explorer', iconType: 'internet', x: 2, y: 39 },
  ];

  const renderIconGraphic = (type: string) => {
    const iconSrc = XP_ICON_PATHS[type];
    if (iconSrc) {
      return (
        <img
          src={iconSrc}
          alt={type}
          style={{
            width: '32px',
            height: '32px',
            imageRendering: 'pixelated',
            display: 'block',
            filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))',
          }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    switch (type) {
      case 'my-computer':
        return <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))' }}>🖥️</div>;
      case 'my-documents':
        return <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))' }}>📁</div>;
      case 'recycle-bin':
        return <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))' }}>🗑️</div>;
      case 'internet':
        return <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))' }}>🌐</div>;
      default:
        return <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.6))' }}>📄</div>;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Background Wallpaper */}
      <img
        src={element.imageSrc || '/assets/WindowsXp_Background.jpg'}
        alt="XP Wallpaper"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* Optional Desktop Icons */}
      {element.showDesktopIcons !== false && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {defaultIcons.map((icon) => (
            <div
              key={icon.id}
              className="xp-desktop-icon"
              style={{
                left: `${icon.x}%`,
                top: `${icon.y}%`,
              }}
            >
              <div className="xp-desktop-icon-img">
                {renderIconGraphic(icon.iconType)}
              </div>
              <span className="xp-desktop-icon-label">{icon.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
