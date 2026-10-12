import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  MousePointer, 
  Layers,
  Music,
  Video,
  Volume2,
  Upload,
  AlertCircle,
  Plus,
  Monitor,
  Maximize2
} from 'lucide-react';
import { CanvasElement, ProjectAsset } from '../../types/editor';
import { pickImageFile, processImageFile, extractFriendlyName } from '../../utils/filePicker';
import { XP_SOUNDS, playXpSound } from '../../utils/xpAssets';

interface AssetLibraryProps {
  onAddElement: (element: Partial<CanvasElement>) => void;
  projectAssets?: ProjectAsset[];
  onImportAsset?: (asset: ProjectAsset) => void;
  onSetWallpaper?: (src: string) => void;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ 
  onAddElement, 
  projectAssets = [], 
  onImportAsset,
  onSetWallpaper
}) => {
  const [subTab, setSubTab] = useState<'presets' | 'media' | 'audio'>('presets');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const xpPresets = [
    {
      id: 'bliss-wallpaper',
      title: 'Windows XP Bliss Wallpaper',
      category: 'Backgrounds',
      preview: '/assets/WindowsXp_Background.jpg',
      type: 'wallpaper' as const,
      defaultProps: {
        type: 'wallpaper' as const,
        name: 'Bliss Wallpaper',
        imageSrc: '/assets/WindowsXp_Background.jpg',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      }
    },
    {
      id: 'paint-app',
      title: 'Paint Window',
      category: 'XP Windows',
      preview: '/assets/Paint.jpg',
      type: 'xp-window' as const,
      defaultProps: {
        type: 'xp-window' as const,
        name: 'untitled - Paint',
        title: 'untitled - Paint',
        windowType: 'paint' as const,
        contentImageSrc: '/assets/Paint.jpg',
        hasMenuBar: true,
        hasStatusBar: true,
        statusText: 'For Help, click Help Topics on the Help Menu.',
        width: 55,
        height: 58,
        x: 15,
        y: 10,
      }
    },
    {
      id: 'image-viewer-app',
      title: 'XP Picture Viewer',
      category: 'XP Windows',
      preview: '/assets/CDPlayer.jpg',
      type: 'image-viewer' as const,
      defaultProps: {
        name: 'Windows Picture Viewer',
        type: 'image-viewer' as const,
        title: 'CDPlayer.jpg - Windows Picture and Fax Viewer',
        imageSrc: '/assets/CDPlayer.jpg',
        imageName: 'CDPlayer.jpg',
        zoomLevel: 1,
        rotation: 0,
        fitMode: 'contain' as const,
        isActive: true,
        width: 56,
        height: 52,
        x: 24,
        y: 16,
      }
    },
    {
      id: 'notepad-app',
      title: 'Notepad Window',
      category: 'XP Windows',
      preview: '/assets/Notepad.jpg',
      type: 'xp-window' as const,
      defaultProps: {
        type: 'xp-window' as const,
        name: 'Untitled - Notepad',
        title: 'Untitled - Notepad',
        windowType: 'notepad' as const,
        contentImageSrc: '/assets/Notepad.jpg',
        hasMenuBar: true,
        hasStatusBar: true,
        width: 50,
        height: 48,
        x: 20,
        y: 14,
      }
    },
    {
      id: 'error-dialog',
      title: 'XP Error Alert',
      category: 'Dialogs & Alerts',
      preview: '/assets/Error.jpg',
      type: 'dialog' as const,
      defaultProps: {
        name: 'Critical System Error',
        type: 'dialog' as const,
        dialogTitle: 'System Error',
        message: 'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01).',
        iconType: 'error' as const,
        buttonLayout: 'ok' as const,
        width: 38,
        height: 25,
        x: 31,
        y: 35,
      }
    },
    {
      id: 'desktop-icon-item',
      title: 'XP Desktop Icon',
      category: 'Desktop Elements',
      preview: '',
      type: 'desktop-icon' as const,
      defaultProps: {
        name: 'My Computer Icon',
        type: 'desktop-icon' as const,
        label: 'My Computer',
        iconType: 'my-computer' as const,
        width: 10,
        height: 14,
        x: 4,
        y: 6,
      }
    },
    {
      id: 'text-balloon',
      title: 'XP Notification Balloon',
      category: 'Text & Overlays',
      preview: '',
      type: 'text' as const,
      defaultProps: {
        name: 'XP Security Alert',
        type: 'text' as const,
        text: 'Your computer might be at risk. Antivirus software is not installed.',
        balloonStyle: true,
        balloonTitle: 'Windows Security Alerts',
        fontSize: 11,
        color: '#000000',
        fontFamily: 'Tahoma, sans-serif',
        width: 32,
        height: 20,
        x: 62,
        y: 70,
      }
    },
    {
      id: 'xp-cursor',
      title: 'Classic XP Pointer Cursor',
      category: 'Cursors & Overlays',
      preview: '',
      type: 'cursor' as const,
      defaultProps: {
        type: 'cursor' as const,
        name: 'XP Mouse Cursor',
        cursorType: 'default' as const,
        showMovementPath: true,
        width: 4,
        height: 6,
        x: 50,
        y: 50,
      }
    },
    {
      id: 'xp-taskbar',
      title: 'XP Classic Blue Taskbar',
      category: 'Desktop Elements',
      preview: '',
      type: 'taskbar' as const,
      defaultProps: {
        type: 'taskbar' as const,
        name: 'Windows XP Taskbar',
        width: 100,
        height: 6,
        x: 0,
        y: 94,
      }
    },
    {
      id: 'recycle-bin-icon',
      title: 'Recycle Bin Icon',
      category: 'Desktop Elements',
      preview: '',
      type: 'desktop-icon' as const,
      defaultProps: {
        name: 'Recycle Bin',
        type: 'desktop-icon' as const,
        label: 'Recycle Bin',
        iconType: 'recycle-bin' as const,
        width: 10,
        height: 14,
        x: 4,
        y: 22,
      }
    },
    {
      id: 'warning-dialog',
      title: 'XP Warning Dialog',
      category: 'Dialogs & Alerts',
      preview: '',
      type: 'dialog' as const,
      defaultProps: {
        name: 'Virtual Memory Warning',
        type: 'dialog' as const,
        dialogTitle: 'System Warning',
        message: 'Your system is low on virtual memory. Windows is increasing the size of your virtual memory paging file.',
        iconType: 'warning' as const,
        buttonLayout: 'ok' as const,
        width: 42,
        height: 25,
        x: 30,
        y: 40,
      }
    },
    {
      id: 'text-overlay-title',
      title: 'XP Title Text',
      category: 'Text & Overlays',
      preview: '',
      type: 'text' as const,
      defaultProps: {
        name: 'Title Text',
        type: 'text' as const,
        text: 'Welcome to Windows XP',
        balloonStyle: false,
        fontSize: 24,
        color: '#ffffff',
        fontFamily: 'Tahoma, sans-serif',
        width: 50,
        height: 12,
        x: 25,
        y: 12,
      }
    },
    // Authentic Wallpapers from WinXp Pack
    {
      id: 'autumn-wallpaper',
      title: 'Autumn Wallpaper',
      category: 'Backgrounds',
      preview: '/assets/xp/wallpapers/Autumn.png',
      type: 'wallpaper' as const,
      defaultProps: {
        type: 'wallpaper' as const,
        name: 'Autumn Wallpaper',
        imageSrc: '/assets/xp/wallpapers/Autumn.png',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      }
    },
    {
      id: 'azul-wallpaper',
      title: 'Azul Wallpaper',
      category: 'Backgrounds',
      preview: '/assets/xp/wallpapers/Azul.png',
      type: 'wallpaper' as const,
      defaultProps: {
        type: 'wallpaper' as const,
        name: 'Azul Wallpaper',
        imageSrc: '/assets/xp/wallpapers/Azul.png',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      }
    },
    {
      id: 'stonehenge-wallpaper',
      title: 'Stonehenge Wallpaper',
      category: 'Backgrounds',
      preview: '/assets/xp/wallpapers/Stonehenge.png',
      type: 'wallpaper' as const,
      defaultProps: {
        type: 'wallpaper' as const,
        name: 'Stonehenge Wallpaper',
        imageSrc: '/assets/xp/wallpapers/Stonehenge.png',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      }
    },
    // Authentic Desktop Icons
    {
      id: 'my-documents-icon',
      title: 'My Documents Icon',
      category: 'Desktop Elements',
      preview: '/assets/xp/icons/my_documents.png',
      type: 'desktop-icon' as const,
      defaultProps: {
        name: 'My Documents',
        type: 'desktop-icon' as const,
        label: 'My Documents',
        iconType: 'my-documents' as const,
        width: 10,
        height: 14,
        x: 4,
        y: 14,
      }
    },
    {
      id: 'internet-icon',
      title: 'Internet Explorer Icon',
      category: 'Desktop Elements',
      preview: '/assets/xp/icons/internet_explorer.png',
      type: 'desktop-icon' as const,
      defaultProps: {
        name: 'Internet Explorer',
        type: 'desktop-icon' as const,
        label: 'Internet Explorer',
        iconType: 'internet' as const,
        width: 10,
        height: 14,
        x: 4,
        y: 30,
      }
    },
    // Clippy Assistant Companion
    {
      id: 'clippy-assistant',
      title: 'Clippy Assistant',
      category: 'Assistants & Overlays',
      preview: '/assets/xp/assistants/clippy/clippy.png',
      type: 'assistant' as const,
      defaultProps: {
        name: 'Clippy Assistant',
        type: 'assistant' as const,
        character: 'clippy' as const,
        pose: 'idle' as const,
        isAnimated: false,
        animationSpeed: 12,
        showDialogue: true,
        dialogueText: "It looks like you're making a video!\nWould you like help with that?",
        bubblePosition: 'left' as const,
        bubbleBgColor: '#FFFFE1',
        bubbleTextColor: '#000000',
        bubbleBorderColor: '#000000',
        bubbleFontSize: 12,
        bubbleWidth: 48,
        bubblePadding: 10,
        bubbleCornerRadius: 8,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        width: 16,
        height: 22,
        x: 72,
        y: 60,
      }
    }
  ];

  // Pick and import image using native dialog / HTML5 picker
  const handleImportImagePicker = async () => {
    try {
      setIsImporting(true);
      setErrorMessage(null);
      const res = await pickImageFile();
      if (!res) return;

      const newAsset: ProjectAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: res.name,
        type: 'image',
        src: res.src,
        size: res.size,
        addedAt: new Date().toISOString(),
      };

      onImportAsset?.(newAsset);
    } catch (err: any) {
      console.error('Failed to import image:', err);
      setErrorMessage(err?.message || 'Could not import the selected image.');
    } finally {
      setIsImporting(false);
    }
  };

  // Drag-and-drop file processing
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setErrorMessage(null);

    const files = Array.from(e.dataTransfer.files).filter((f) => 
      f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)
    );

    if (files.length === 0) {
      setErrorMessage('Please drop valid image files (PNG, JPG, JPEG, or WebP).');
      return;
    }

    setIsImporting(true);
    for (const file of files) {
      try {
        const res = await processImageFile(file);
        const newAsset: ProjectAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: res.name,
          type: 'image',
          src: res.src,
          size: res.size,
          addedAt: new Date().toISOString(),
        };
        onImportAsset?.(newAsset);
      } catch (err: any) {
        console.error('Failed to process dropped image:', err);
        setErrorMessage(`Failed to process ${file.name}`);
      }
    }
    setIsImporting(false);
  };

  // File import helpers for Video/Audio
  const handleImportMedia = (type: 'video' | 'audio') => {
    const input = document.createElement('input');
    input.type = 'file';
    if (type === 'video') input.accept = 'video/mp4,video/webm';
    if (type === 'audio') input.accept = 'audio/mp3,audio/wav,audio/ogg';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);

      if (type === 'video') {
        onAddElement({
          type: 'video',
          name: file.name,
          videoSrc: url,
          volume: 1,
          fitMode: 'contain',
          width: 60,
          height: 50,
          x: 20,
          y: 20,
        });
      } else if (type === 'audio') {
        onAddElement({
          type: 'audio',
          name: file.name,
          audioSrc: url,
          volume: 0.8,
          trackId: 'track-4',
          duration: 5,
        });
      }
    };
    input.click();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-panel)', padding: '3px', borderRadius: '6px' }}>
        <button
          className={`editor-btn ${subTab === 'presets' ? 'primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '4px 6px', fontSize: '11px' }}
          onClick={() => setSubTab('presets')}
        >
          XP Presets
        </button>
        <button
          className={`editor-btn ${subTab === 'media' ? 'primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '4px 6px', fontSize: '11px' }}
          onClick={() => setSubTab('media')}
        >
          Media ({projectAssets.length})
        </button>
        <button
          className={`editor-btn ${subTab === 'audio' ? 'primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center', padding: '4px 6px', fontSize: '11px' }}
          onClick={() => setSubTab('audio')}
        >
          Audio & SFX
        </button>
      </div>

      {/* 1. Presets View */}
      {subTab === 'presets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {xpPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                if (preset.type === 'wallpaper' && onSetWallpaper) {
                  onSetWallpaper((preset.defaultProps as any).imageSrc || preset.preview);
                } else {
                  onAddElement({ ...preset.defaultProps, type: preset.type } as any);
                }
              }}
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div
                style={{
                  height: '75px',
                  borderRadius: '4px',
                  background: preset.preview 
                    ? `url(${preset.preview}) center/${preset.type === 'assistant' || preset.type === 'desktop-icon' ? 'contain' : 'cover'} no-repeat` 
                    : 'var(--bg-surface)',
                  backgroundOrigin: 'content-box',
                  padding: preset.type === 'assistant' ? '4px' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {!preset.preview && (
                  preset.type === 'cursor' ? <MousePointer size={24} color="var(--accent)" /> :
                  preset.type === 'taskbar' ? <Layers size={24} color="#10b981" /> :
                  <ImageIcon size={24} color="var(--text-muted)" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {preset.title}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {preset.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Media Import View */}
      {subTab === 'media' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '11px',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Primary Import Image Button & Native Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 12px',
              background: isDraggingOver ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-panel)',
              border: isDraggingOver ? '2px dashed var(--accent)' : '1px dashed var(--border-color)',
              borderRadius: '8px',
              textAlign: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={handleImportImagePicker}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <button
                className="editor-btn primary"
                style={{ padding: '6px 14px', fontSize: '12px', pointerEvents: 'none' }}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import Image'}
              </button>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                or drag & drop PNG, JPG, JPEG, WebP files here
              </div>
            </div>
          </div>

          {/* Imported Project Assets Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Project Images ({projectAssets.length})
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                Persistent in .xpproj
              </span>
            </div>

            {projectAssets.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                No custom images imported yet. Click "Import Image" or drag photos into this area.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projectAssets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '4px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={asset.src}
                          alt={asset.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            // Clear error image and show fallback icon
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span 
                          style={{ 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            color: 'var(--text-main)', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}
                          title={asset.name}
                        >
                          {extractFriendlyName(asset.name)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatSize(asset.size) || 'Image Asset'}
                        </span>
                      </div>
                    </div>

                    {/* Quick placement actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      <button
                        className="editor-btn"
                        style={{ padding: '4px 6px', fontSize: '10px', justifyContent: 'center' }}
                        title="Add as Windows Picture and Fax Viewer element"
                        onClick={() => {
                          const friendly = extractFriendlyName(asset.name);
                          onAddElement({
                            type: 'image-viewer',
                            name: friendly,
                            title: `${friendly} - Windows Picture and Fax Viewer`,
                            imageSrc: asset.src,
                            imageName: friendly,
                            zoomLevel: 1,
                            rotation: 0,
                            fitMode: 'contain',
                            isActive: true,
                            width: 56,
                            height: 52,
                            x: 22,
                            y: 16,
                          });
                        }}
                      >
                        <Maximize2 size={11} style={{ marginRight: '3px' }} />
                        Viewer
                      </button>

                      <button
                        className="editor-btn"
                        style={{ padding: '4px 6px', fontSize: '10px', justifyContent: 'center' }}
                        title="Add inside a classic Windows XP application window"
                        onClick={() => {
                          const friendly = extractFriendlyName(asset.name);
                          onAddElement({
                            type: 'xp-window',
                            name: friendly,
                            title: friendly,
                            windowType: 'generic',
                            contentImageSrc: asset.src,
                            hasMenuBar: true,
                            hasStatusBar: true,
                            fitMode: 'contain',
                            width: 52,
                            height: 48,
                            x: 20,
                            y: 14,
                          });
                        }}
                      >
                        <Plus size={11} style={{ marginRight: '3px' }} />
                        XP Window
                      </button>

                      <button
                        className="editor-btn"
                        style={{ padding: '4px 6px', fontSize: '10px', justifyContent: 'center' }}
                        title="Set this image as Windows XP Desktop Wallpaper"
                        onClick={() => {
                          if (onSetWallpaper) {
                            onSetWallpaper(asset.src);
                          } else {
                            onAddElement({
                              type: 'wallpaper',
                              name: 'Wallpaper',
                              imageSrc: asset.src,
                              width: 100,
                              height: 100,
                              x: 0,
                              y: 0,
                            });
                          }
                        }}
                      >
                        <Monitor size={11} style={{ marginRight: '3px' }} />
                        Wallpaper
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          {/* Secondary media (Video/Audio) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Other Media Types
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                className="editor-btn"
                style={{ padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}
                onClick={() => handleImportMedia('video')}
              >
                <Video size={13} color="#f59e0b" style={{ marginRight: '4px' }} />
                Video Clip
              </button>

              <button
                className="editor-btn"
                style={{ padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}
                onClick={() => handleImportMedia('audio')}
              >
                <Music size={13} color="#10b981" style={{ marginRight: '4px' }} />
                Audio Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Audio & Sound FX View */}
      {subTab === 'audio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Authentic Windows XP System Sounds ({XP_SOUNDS.length} Sound Effects):
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {XP_SOUNDS.map((snd) => {
              const isAlert = snd.id.includes('error') || snd.id.includes('stop') || snd.id.includes('critical');
              const isInfo = snd.id.includes('balloon') || snd.id.includes('ding') || snd.id.includes('info');
              const isStartup = snd.id.includes('startup') || snd.id.includes('logon');
              const iconColor = isAlert ? '#ef4444' : isStartup ? '#10b981' : isInfo ? '#3b82f6' : '#f59e0b';

              return (
                <div
                  key={snd.id}
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Volume2 size={16} color={iconColor} style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {snd.name}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {snd.description} • {snd.duration}s
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="editor-btn"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => playXpSound(snd.src)}
                      title="Preview Sound"
                    >
                      ▶ Test
                    </button>
                    <button
                      className="editor-btn primary"
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => {
                        onAddElement({
                          name: snd.name,
                          type: 'audio',
                          trackId: 'track-4',
                          audioSrc: snd.src,
                          volume: 0.8,
                          duration: snd.duration,
                        });
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
