import React from 'react';
import { DialogElement } from '../../types/editor';
import { XpTitlebarButtons } from './XpTitlebarButtons';

interface XpDialogProps {
  element: DialogElement;
  isSelected: boolean;
}

export const XpDialog: React.FC<XpDialogProps> = ({ element, isSelected }) => {
  const getIconGraphic = () => {
    switch (element.iconType) {
      case 'error':
        return (
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ff4d4d, #cc0000)',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '20px',
              fontFamily: 'Arial, sans-serif',
              flexShrink: 0,
            }}
          >
            ✕
          </div>
        );
      case 'warning':
        return (
          <div 
            style={{
              fontSize: '32px',
              filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
        );
      case 'info':
        return (
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #3b82f6, #1d4ed8)',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '20px',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              flexShrink: 0,
            }}
          >
            i
          </div>
        );
      case 'question':
        return (
          <div 
            style={{
              fontSize: '32px',
              filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
              flexShrink: 0,
            }}
          >
            ❓
          </div>
        );
      default:
        return null;
    }
  };

  const renderButtons = () => {
    const layout = element.buttonLayout || 'ok';
    const buttonStyle: React.CSSProperties = {
      minWidth: '72px',
      height: '23px',
      background: 'linear-gradient(180deg, #FFFFFF 0%, #ECE9D8 25%, #DEDAC5 100%)',
      border: '1px solid #003c74',
      borderRadius: '3px',
      boxShadow: 'inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.2)',
      fontFamily: 'Tahoma, sans-serif',
      fontSize: '11px',
      fontWeight: 500,
      color: '#000',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 12px',
      cursor: 'default',
      outline: '1px dotted #000',
      outlineOffset: '-4px',
    };

    switch (layout) {
      case 'ok-cancel':
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button style={buttonStyle}>OK</button>
            <button style={{ ...buttonStyle, outline: 'none' }}>Cancel</button>
          </div>
        );
      case 'yes-no':
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button style={buttonStyle}>Yes</button>
            <button style={{ ...buttonStyle, outline: 'none' }}>No</button>
          </div>
        );
      case 'retry-cancel':
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button style={buttonStyle}>Retry</button>
            <button style={{ ...buttonStyle, outline: 'none' }}>Cancel</button>
          </div>
        );
      case 'ok':
      default:
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button style={buttonStyle}>OK</button>
          </div>
        );
    }
  };

  return (
    <div 
      className="xp-window-chrome"
      style={{
        width: '100%',
        height: '100%',
        boxShadow: isSelected 
          ? '0 0 0 2px var(--accent), 0 8px 30px rgba(0,0,0,0.7)' 
          : '3px 5px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Titlebar with classic red [X] button only */}
      <div className="xp-titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{ fontSize: '11px', flexShrink: 0 }}>⚠️</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {element.dialogTitle || 'System Alert'}
          </span>
        </div>
        <XpTitlebarButtons showMinMax={false} />
      </div>

      {/* Dialog Body */}
      <div 
        style={{
          flex: 1,
          background: '#ECE9D8',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          fontFamily: 'Tahoma, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {getIconGraphic()}
          <div 
            style={{ 
              fontSize: '11px', 
              color: '#000000', 
              lineHeight: 1.4,
              wordBreak: 'break-word',
              userSelect: 'none',
            }}
          >
            {element.message || 'An unexpected error has occurred in Windows Explorer.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          {renderButtons()}
        </div>
      </div>
    </div>
  );
};
