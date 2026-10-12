import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ArrowUp, 
  ArrowDown, 
  Trash2,
  Layers,
  AppWindow,
  MousePointer,
  Image as ImageIcon
} from 'lucide-react';
import { CanvasElement } from '../../types/editor';

interface LayersPanelProps {
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onReorderLayer,
}) => {
  // Sort descending by zIndex so highest layer is visually on top
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'xp-window': return <AppWindow size={13} color="#3b82f6" />;
      case 'cursor': return <MousePointer size={13} color="#f59e0b" />;
      case 'wallpaper': return <ImageIcon size={13} color="#10b981" />;
      default: return <Layers size={13} color="var(--text-muted)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 600 }}>
          Composition Layers ({elements.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sortedElements.map((el) => {
          const isSelected = el.id === selectedElementId;
          return (
            <div
              key={el.id}
              onClick={() => onSelectElement(el.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: isSelected ? 'var(--bg-panel-active)' : 'var(--bg-panel)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {getElementIcon(el.type)}
                <span 
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: isSelected ? 600 : 400, 
                    color: isSelected ? '#fff' : 'var(--text-main)', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: '120px'
                  }}
                >
                  {el.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  z:{el.zIndex}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="editor-btn"
                  style={{ padding: '3px', border: 'none', background: 'transparent' }}
                  title="Move Layer Up"
                  onClick={() => onReorderLayer(el.id, 'up')}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  className="editor-btn"
                  style={{ padding: '3px', border: 'none', background: 'transparent' }}
                  title="Move Layer Down"
                  onClick={() => onReorderLayer(el.id, 'down')}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  className="editor-btn"
                  style={{ padding: '3px', border: 'none', background: 'transparent' }}
                  title={el.visible ? 'Hide' : 'Show'}
                  onClick={() => onUpdateElement(el.id, { visible: !el.visible })}
                >
                  {el.visible ? <Eye size={12} /> : <EyeOff size={12} color="var(--text-dim)" />}
                </button>
                <button
                  className="editor-btn"
                  style={{ padding: '3px', border: 'none', background: 'transparent' }}
                  title={el.locked ? 'Unlock' : 'Lock'}
                  onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
                >
                  {el.locked ? <Lock size={12} color="var(--warning)" /> : <Unlock size={12} />}
                </button>
                <button
                  className="editor-btn"
                  style={{ padding: '3px', border: 'none', background: 'transparent', color: 'var(--danger)' }}
                  title="Delete Layer"
                  onClick={() => onDeleteElement(el.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
