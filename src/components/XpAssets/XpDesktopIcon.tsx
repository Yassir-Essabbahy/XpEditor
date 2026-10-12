import React, { useState } from 'react';
import { DesktopIconElement } from '../../types/editor';
import { XP_ICON_PATHS } from '../../utils/xpAssets';

interface XpDesktopIconProps {
  element: DesktopIconElement;
  isSelected: boolean;
}

export const XpDesktopIcon: React.FC<XpDesktopIconProps> = ({ element, isSelected }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const iconSrc = XP_ICON_PATHS[element.iconType] || XP_ICON_PATHS['my-computer'];

  const renderIconGraphic = () => {
    if (!imgFailed && iconSrc) {
      return (
        <img
          src={iconSrc}
          alt={element.label || 'Desktop Icon'}
          style={{
            width: '32px',
            height: '32px',
            imageRendering: 'pixelated',
            display: 'block',
          }}
          onError={() => setImgFailed(true)}
        />
      );
    }

    // Fallback emoji
    switch (element.iconType) {
      case 'my-computer':
        return <span style={{ fontSize: '28px' }}>🖥️</span>;
      case 'recycle-bin':
      case 'recycle-bin-full':
        return <span style={{ fontSize: '28px' }}>🗑️</span>;
      case 'my-documents':
      case 'folder':
        return <span style={{ fontSize: '28px' }}>📁</span>;
      case 'internet':
        return <span style={{ fontSize: '28px' }}>🌐</span>;
      case 'notepad':
        return <span style={{ fontSize: '28px' }}>📝</span>;
      case 'search':
        return <span style={{ fontSize: '28px' }}>🔍</span>;
      case 'help':
        return <span style={{ fontSize: '28px' }}>❓</span>;
      case 'warning':
        return <span style={{ fontSize: '28px' }}>⚠️</span>;
      case 'error':
        return <span style={{ fontSize: '28px' }}>❌</span>;
      default:
        return <span style={{ fontSize: '28px' }}>📄</span>;
    }
  };

  return (
    <div 
      className={`xp-desktop-icon ${isSelected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '4px',
      }}
    >
      <div 
        className="xp-desktop-icon-img"
        style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.6))' }}
      >
        {renderIconGraphic()}
      </div>
      <span 
        className="xp-desktop-icon-label"
        style={{
          background: isSelected ? '#0b61ff' : 'transparent',
          padding: isSelected ? '1px 4px' : '0',
          borderRadius: '2px',
          textShadow: isSelected ? 'none' : '1px 1px 2px rgba(0,0,0,0.8)',
          color: '#ffffff',
          fontSize: '11px',
          fontFamily: 'Tahoma, sans-serif',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {element.label || 'New Item'}
      </span>
    </div>
  );
};
