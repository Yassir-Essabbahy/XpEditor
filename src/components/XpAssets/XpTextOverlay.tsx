import React from 'react';
import { TextElement } from '../../types/editor';

interface XpTextOverlayProps {
  element: TextElement;
  isSelected: boolean;
}

export const XpTextOverlay: React.FC<XpTextOverlayProps> = ({ element, isSelected }) => {
  // If styled as classic Windows XP Notification Balloon (e.g. "Tour Windows XP", "Virtual Memory Minimum Too Low")
  if (element.balloonStyle) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FFFFE1',
          border: '1px solid #000000',
          borderRadius: '4px',
          boxShadow: '2px 4px 10px rgba(0, 0, 0, 0.4)',
          padding: '8px 12px',
          fontFamily: 'Tahoma, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box',
          outline: isSelected ? '2px solid var(--accent)' : 'none',
        }}
      >
        {/* Balloon Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>ℹ️</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>
              {element.balloonTitle || 'System Notification'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#666', cursor: 'pointer' }}>✕</span>
        </div>

        {/* Balloon Content Text */}
        <div style={{ fontSize: `${element.fontSize || 11}px`, color: element.color || '#000000', lineHeight: 1.3, overflow: 'hidden' }}>
          {element.text || 'Windows XP Notification Message'}
        </div>

        {/* Speech triangle tail pointing down */}
        <div
          style={{
            position: 'absolute',
            bottom: '-8px',
            right: '24px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #000000',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            right: '25px',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid #FFFFE1',
          }}
        />
      </div>
    );
  }

  // Standard Text Overlay
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
        color: element.color || '#ffffff',
        fontFamily: element.fontFamily || 'Tahoma, sans-serif',
        fontSize: `${element.fontSize || 16}px`,
        fontWeight: 600,
        textShadow: '1px 1px 2px #000000, 0 0 3px rgba(0,0,0,0.8)',
        outline: isSelected ? '2px dashed var(--accent)' : 'none',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {element.text || 'Enter text here'}
    </div>
  );
};
