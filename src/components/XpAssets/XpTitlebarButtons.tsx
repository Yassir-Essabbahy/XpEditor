import React from 'react';

export const XpMinIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'block' }}>
    <rect x="1" y="6" width="6" height="1.5" fill="#ffffff" />
  </svg>
);

export const XpMaxIcon: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ display: 'block' }}>
    <path d="M1 1h7v7H1z" fill="none" stroke="#ffffff" strokeWidth="1" />
    <rect x="1" y="1" width="7" height="2" fill="#ffffff" />
  </svg>
);

export const XpCloseIcon: React.FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'block' }}>
    <path d="M1 1l6 6M7 1L1 7" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

interface XpTitlebarButtonsProps {
  showMinMax?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const XpTitlebarButtons: React.FC<XpTitlebarButtonsProps> = ({
  showMinMax = true,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <div className="xp-titlebar-buttons">
      {showMinMax && (
        <>
          <div 
            className="xp-window-btn xp-btn-min" 
            title="Minimize" 
            onClick={(e) => { e.stopPropagation(); onMinimize?.(); }}
          >
            <XpMinIcon />
          </div>
          <div 
            className="xp-window-btn xp-btn-max" 
            title="Maximize" 
            onClick={(e) => { e.stopPropagation(); onMaximize?.(); }}
          >
            <XpMaxIcon />
          </div>
        </>
      )}
      <div 
        className="xp-window-btn xp-btn-close" 
        title="Close" 
        onClick={(e) => { e.stopPropagation(); onClose?.(); }}
      >
        <XpCloseIcon />
      </div>
    </div>
  );
};
