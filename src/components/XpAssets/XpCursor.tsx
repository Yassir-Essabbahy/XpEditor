import React, { useState } from 'react';
import { CursorElement } from '../../types/editor';
import { XP_CURSOR_PATHS } from '../../utils/xpAssets';

interface XpCursorProps {
  element: CursorElement;
  isSelected?: boolean;
}

export const XpCursor: React.FC<XpCursorProps> = ({ element }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const cursorSrc = XP_CURSOR_PATHS[element.cursorType] || XP_CURSOR_PATHS['default'];

  const renderCursorSvgFallback = () => {
    switch (element.cursorType) {
      case 'pointer':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 2v10l-2.5-2.5-1.5 1.5 5 5v5h8v-9l-2-2v-4a1 1 0 0 0-2 0v2h-1v-4a1 1 0 0 0-2 0v4h-1V2a1 1 0 0 0-2 0z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'hourglass':
      case 'wait':
        return (
          <div style={{ fontSize: '24px', filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.5))' }}>
            ⌛
          </div>
        );
      case 'text':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 3h8M12 3v18M8 21h8"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M8 3h8M12 3v18M8 21h8"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'move':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l3 3h-2v4h4V7l3 3-3 3v-2h-4v4h2l-3 3-3-3h2v-4H7v2l-3-3 3-3v2h4V9H9l3-3z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.2"
            />
          </svg>
        );
      case 'default':
      default:
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 2v18l5-5 4 8 3-1.5-4-8h6L4 2z"
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        filter: 'drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.6))',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!imgFailed && cursorSrc ? (
        <img
          src={cursorSrc}
          alt={element.cursorType || 'cursor'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            display: 'block',
          }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        renderCursorSvgFallback()
      )}

      {/* Optional Mouse Click Ripple Animation */}
      {element.clickEffect === 'ripple' && (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid #38bdf8',
            transform: 'translate(-50%, -50%)',
            animation: 'cursorRippleAnim 1.2s infinite ease-out',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
