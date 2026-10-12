import React from 'react';
import { 
  Film, 
  Download, 
  RotateCcw, 
  RotateCw, 
  SlidersHorizontal,
  Plus,
  Save,
  FolderOpen,
  Clock
} from 'lucide-react';
import { CompositionSettings } from '../../types/editor';

interface HeaderProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  settings: CompositionSettings;
  onUpdateSettings: (newSettings: Partial<CompositionSettings>) => void;
  onExportClick: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onSaveProjectAs?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddElement: (type: 'xp-window' | 'image-viewer' | 'wallpaper' | 'cursor' | 'dialog') => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onUpdateProjectName,
  settings,
  onUpdateSettings,
  onExportClick,
  onSaveProject,
  onOpenProject,
  onSaveProjectAs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddElement,
}) => {
  return (
    <header className="editor-header">
      <div className="header-left">
        <div className="brand-badge">
          <div className="brand-icon-chip">
            <Film size={15} />
          </div>
          <span>XP Studio</span>
        </div>
        
        {/* Editable Project Title */}
        <div className="project-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onUpdateProjectName(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid transparent',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 500,
              padding: '2px 4px',
              outline: 'none',
              width: '140px',
              borderRadius: '3px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--bg-input)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Click to rename project"
          />
        </div>

        {/* Project Save and Open */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            className="editor-btn" 
            style={{ padding: '4px 8px', fontSize: '11px' }} 
            onClick={onSaveProject}
            title="Save Project (.xpproj)"
          >
            <Save size={13} color="var(--accent)" />
            <span>Save</span>
          </button>
          <button 
            className="editor-btn" 
            style={{ padding: '4px 8px', fontSize: '11px' }} 
            onClick={onOpenProject}
            title="Open Existing Project (.xpproj)"
          >
            <FolderOpen size={13} color="#f59e0b" />
            <span>Open</span>
          </button>
          {onSaveProjectAs && (
            <button
              className="editor-btn"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={onSaveProjectAs}
              title="Save Project As... (Ctrl+Shift+S)"
            >
              <span>Save As...</span>
            </button>
          )}
        </div>
      </div>

      <div className="header-center">
        {/* Preset Resolution Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={14} color="var(--text-muted)" />
          <select 
            className="editor-select"
            value={`${settings.width}x${settings.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              const aspect = (w / h > 1.4) ? '16:9' : '4:3';
              onUpdateSettings({ width: w, height: h, aspectRatio: aspect });
            }}
          >
            <option value="1920x1080">1920 × 1080 (1080p 16:9)</option>
            <option value="1280x720">1280 × 720 (720p 16:9)</option>
            <option value="1024x768">1024 × 768 (XP CRT 4:3)</option>
            <option value="800x600">800 × 600 (Classic XP 4:3)</option>
          </select>
        </div>

        {/* Project Frame Rate (FPS) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FPS:</span>
          <select
            className="editor-select"
            value={settings.fps || 30}
            onChange={(e) => onUpdateSettings({ fps: Number(e.target.value) })}
            style={{ width: '68px', padding: '3px 6px', fontSize: '11px' }}
            title="Project frame rate"
          >
            <option value="24">24 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        {/* Project Duration Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} color="var(--text-muted)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration:</span>
          <input 
            type="number"
            min="1"
            max="3600"
            step="1"
            value={settings.duration}
            onChange={(e) => {
              const val = Math.max(1, parseFloat(e.target.value) || 1);
              onUpdateSettings({ duration: val });
            }}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              width: '56px',
              textAlign: 'center',
            }}
            title="Total project duration in seconds (editable)"
          />
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>s</span>
        </div>

        {/* Quick Add Elements */}
        <button 
          className="editor-btn"
          onClick={() => onAddElement('image-viewer')}
          title="Add Windows Picture & Fax Viewer"
        >
          <Plus size={14} />
          <span>Image Viewer</span>
        </button>

        <button 
          className="editor-btn"
          onClick={() => onAddElement('xp-window')}
          title="Add Windows XP Application Window"
        >
          <Plus size={14} />
          <span>XP Window</span>
        </button>

        <button 
          className="editor-btn"
          onClick={() => onAddElement('dialog')}
          title="Add XP Error / Message Box"
        >
          <Plus size={14} />
          <span>Error Dialog</span>
        </button>
      </div>

      <div className="header-right">
        <button 
          className="editor-btn" 
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
        >
          <RotateCcw size={14} />
        </button>
        <button 
          className="editor-btn" 
          title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
        >
          <RotateCw size={14} />
        </button>
        <button 
          className="editor-btn primary"
          onClick={onExportClick}
          title="Render and export composition to MP4 with FFmpeg"
        >
          <Download size={14} />
          <span>Export MP4</span>
        </button>
      </div>
    </header>
  );
};
