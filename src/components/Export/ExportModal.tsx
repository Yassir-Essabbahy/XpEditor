import React, { useState } from 'react';
import { 
  Download, 
  X, 
  Film, 
  CheckCircle, 
  AlertCircle,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { CanvasElement, CompositionSettings } from '../../types/editor';
import { preloadCompositionAssets, renderCompositionFrame } from '../../utils/compositionRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompositionSettings;
  elements: CanvasElement[];
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  elements,
  projectName,
}) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Configurable export settings
  const [filename, setFilename] = useState(projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'xp_simulation');
  const [exportWidth, setExportWidth] = useState(settings.width);
  const [exportHeight, setExportHeight] = useState(settings.height);
  const [exportFps, setExportFps] = useState(settings.fps);

  if (!isOpen) return null;

  const totalFrames = Math.round(settings.duration * exportFps);
  const sanitizedName = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'xp_simulation';
  const ffmpegCmd = `ffmpeg -y -i ${sanitizedName}_raw.webm -c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 -c:a aac ${sanitizedName}.mp4`;

  const handleStartExport = async () => {
    try {
      setExporting(true);
      setErrorMessage(null);
      setProgress(0);
      setStatusText('Preloading composition assets & images...');

      // 1. Preload assets
      await preloadCompositionAssets(elements);

      // 2. Setup Offscreen Canvas
      const width = exportWidth;
      const height = exportHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D rendering context is not supported or could not be allocated.');
      }

      setStatusText('Initializing video stream recorder...');

      // Setup MediaRecorder
      const stream = canvas.captureStream(exportFps);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 16000000, // 16 Mbps high definition
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.start();

      // 3. Render frame by frame
      const fps = exportFps;
      const duration = settings.duration;

      for (let frame = 0; frame <= totalFrames; frame++) {
        const time = frame / fps;
        renderCompositionFrame(ctx, elements, time, width, height);

        const pct = Math.round((frame / totalFrames) * 92);
        setProgress(pct);
        setStatusText(`Rendering frame ${frame} of ${totalFrames} (${Math.round((time / duration) * 100)}%)...`);

        // Small delay to yield to UI and stream recorder
        await new Promise((r) => setTimeout(r, 1000 / (fps * 2)));
      }

      setStatusText('Finalizing video container...');
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setProgress(100);
          setStatusText('Video successfully rendered!');
          resolve();
        };
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(err.message || 'An unexpected rendering error occurred during export.');
      setStatusText('Render failed.');
    } finally {
      setExporting(false);
    }
  };

  const copyFfmpegCommand = () => {
    navigator.clipboard.writeText(ffmpegCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-icon-chip" style={{ width: '28px', height: '28px' }}>
              <Film size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Export MP4 Video</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Render Windows XP Simulation using FFmpeg</p>
            </div>
          </div>
          <button 
            className="editor-btn" 
            style={{ padding: '4px', border: 'none', background: 'transparent' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Configurable Export Settings (Active prior to render) */}
        {!exporting && !downloadUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Output File Name */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Output File Name
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="editor-select"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                  placeholder="xp_simulation"
                />
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>.mp4</span>
              </div>
            </div>

            {/* Resolution and FPS Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Resolution
                </label>
                <select
                  className="editor-select"
                  style={{ width: '100%', padding: '6px 8px' }}
                  value={`${exportWidth}x${exportHeight}`}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    setExportWidth(w);
                    setExportHeight(h);
                  }}
                >
                  <option value="1920x1080">1920 × 1080 (1080p 16:9)</option>
                  <option value="1280x720">1280 × 720 (720p 16:9)</option>
                  <option value="1024x768">1024 × 768 (XP CRT 4:3)</option>
                  <option value="800x600">800 × 600 (Classic XP 4:3)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Framerate
                </label>
                <select
                  className="editor-select"
                  style={{ width: '100%', padding: '6px 8px' }}
                  value={exportFps}
                  onChange={(e) => setExportFps(Number(e.target.value))}
                >
                  <option value="24">24 FPS</option>
                  <option value="30">30 FPS</option>
                  <option value="60">60 FPS</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Duration
                </label>
                <div style={{ padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: '#fff', textAlign: 'center' }}>
                  {settings.duration}s
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert Display */}
        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '6px', color: '#ef4444', fontSize: '12px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Render Error</span>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Active Rendering Progress Display */}
        {exporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-panel)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{statusText}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
              <span>Target: {exportWidth}×{exportHeight} @ {exportFps}fps</span>
              <span>Total frames: {totalFrames}</span>
            </div>
          </div>
        )}

        {/* Completed State */}
        {downloadUrl && !exporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
              <CheckCircle size={18} />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Composition Render Complete!</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              The video composition has been frame-accurately rendered with all wallpapers, XP window chrome, image viewer controls, dialogs, and text.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <a
                href={downloadUrl}
                download={`${sanitizedName}_raw.webm`}
                className="editor-btn primary"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', padding: '8px' }}
              >
                <Download size={15} />
                <span>Download Rendered Video ({sanitizedName}_raw.webm)</span>
              </a>
            </div>

            {/* Direct FFmpeg Command Helper */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Terminal size={12} /> Convert to H.264 MP4 via FFmpeg CLI
                </span>
                <button
                  className="editor-btn"
                  style={{ padding: '2px 6px', fontSize: '10px' }}
                  onClick={copyFfmpegCommand}
                >
                  {copiedCmd ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <code style={{ display: 'block', background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '4px', fontSize: '10px', color: '#60a5fa', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {ffmpegCmd}
              </code>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button className="editor-btn" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          {!downloadUrl ? (
            <button
              className="editor-btn primary"
              onClick={handleStartExport}
              disabled={exporting}
              style={{ minWidth: '130px', justifyContent: 'center' }}
            >
              <Download size={14} />
              <span>{exporting ? 'Rendering...' : 'Start Render'}</span>
            </button>
          ) : (
            <button className="editor-btn primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
