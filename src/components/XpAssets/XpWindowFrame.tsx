import React from 'react';
import { XpWindowElement } from '../../types/editor';
import { XpTitlebarButtons } from './XpTitlebarButtons';
import { formatFriendlyTitle } from '../../utils/filePicker';

interface XpWindowFrameProps {
  element: XpWindowElement;
  isSelected: boolean;
  children?: React.ReactNode;
}

export const XpWindowFrame: React.FC<XpWindowFrameProps> = ({ 
  element, 
  isSelected,
  children 
}) => {
  const isErrorDialog = element.windowType === 'error' || element.windowType === 'message-box';
  const isActive = element.isActive !== false;

  // Window Icon graphic based on window type
  const getAppIcon = () => {
    switch (element.windowType) {
      case 'notepad': return '📝';
      case 'paint': return '🎨';
      case 'cdplayer': return '💿';
      case 'error': return '❌';
      default: return '🗔';
    }
  };

  // Standard menu items for classic windows
  const defaultMenus = element.menuItems || ['File', 'Edit', 'View', 'Favorites', 'Help'];
  const displayTitle = formatFriendlyTitle(element.title || element.name);

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
      {/* Authentic XP Blue Titlebar (Active or Inactive) */}
      <div className={`xp-titlebar ${!isActive ? 'inactive' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{ fontSize: '12px', flexShrink: 0 }}>
            {getAppIcon()}
          </span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayTitle}
          </span>
        </div>

        {/* Titlebar Buttons */}
        <XpTitlebarButtons showMinMax={!isErrorDialog} />
      </div>

      {/* Optional Menu Bar */}
      {element.hasMenuBar && !isErrorDialog && (
        <div className="xp-menubar">
          {defaultMenus.map((item) => (
            <div key={item} className="xp-menu-item">
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Window Body / Client Area */}
      <div className="xp-window-content">
        {children ? (
          children
        ) : element.contentImageSrc ? (
          <img 
            src={element.contentImageSrc} 
            alt={element.title}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: element.fitMode || 'contain',
              display: 'block',
              pointerEvents: 'none'
            }} 
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#555', fontFamily: 'Tahoma, sans-serif' }}>
            <p style={{ fontSize: '12px' }}>{element.contentText || element.title}</p>
          </div>
        )}
      </div>

      {/* Optional Status Bar */}
      {element.hasStatusBar && !isErrorDialog && (
        <div className="xp-statusbar">
          <div className="xp-statusbar-panel" style={{ flex: 1 }}>
            {element.statusText || 'Ready'}
          </div>
          <div className="xp-resize-grip" />
        </div>
      )}
    </div>
  );
};
