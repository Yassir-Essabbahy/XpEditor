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
import { CanvasElement, CompositionSettings, VideoElement, AudioElement } from '../../types/editor';
import {
  preloadCompositionAssets,
  renderCompositionFrame,
  getVideoElement,
  getAudioElement,
  routeMediaToMix,
  getExportAudioVolume,
  getExportVideoVolume,
  stopAllPooledMedia,
  pruneMediaPools,
} from '../../utils/compositionRenderer';
import { scheduleBuiltinSound } from '../../utils/xpSounds';

// One AudioContext reused across exports: a <video>/<audio> element accepts a
// single MediaElementSource for its lifetime, so the mix context must persist.
let sharedExportCtx: AudioContext | null = null;
function getSharedExportCtx(): AudioContext {
  if (!sharedExportCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedExportCtx = new AudioCtx();
  }
  if (sharedExportCtx.state === 'suspended') {
    sharedExportCtx.resume().catch(() => {});
  }
  return sharedExportCtx;
}

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
  const cancelRef = React.useRef(false);

  if (!isOpen) return null;

  const totalFrames = Math.round(settings.duration * exportFps);
  const sanitizedName = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'xp_simulation';
  const ffmpegCmd = `ffmpeg -y -i ${sanitizedName}_raw.webm -c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 -c:a aac ${sanitizedName}.mp4`;

  const handleStartExport = async () => {
    cancelRef.current = false;
    // Snapshot: teardown below must restore these even if props change mid-export.
    const clipElements = elements;
    const clipDuration = settings.duration;
    try {
      setExporting(true);
      setErrorMessage(null);
      setProgress(0);
      setStatusText('Preloading composition assets, video & audio...');
      setDownloadUrl(null);

      // 1. Preload images + video/audio clip media (bounded waits inside).
      await preloadCompositionAssets(clipElements);
      pruneMediaPools(new Set(clipElements.map((e) => e.id)));
      stopAllPooledMedia();
      if (cancelRef.current) throw new Error('Export cancelled.');

      // 2. Setup canvas
      const width = exportWidth;
      const height = exportHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D rendering context is not supported or could not be allocated.');
      }

      setStatusText('Preparing audio mix (video + audio tracks)...');

      // 3. Shared mix context + per-export destination. Media elements stay
      // routed ONLY into the mix (never to speakers) so the tab stays silent.
      const audioCtx = getSharedExportCtx();
      await audioCtx.resume().catch(() => {});
      const mixDest = audioCtx.createMediaStreamDestination();

      interface ClipSound {
        el: VideoElement | AudioElement;
        kind: 'video' | 'audio';
        media: HTMLMediaElement | null;
        gain: GainNode | null;
        entered: boolean;
      }
      const clipSounds: ClipSound[] = [];
      for (const el of clipElements) {
        if (!el.visible) continue;
        if (el.type === 'video') {
          const v = el as VideoElement;
          const media = getVideoElement(v);
          if (media) {
            try { media.pause(); media.currentTime = 0; } catch {}
            media.loop = !!v.loop;
            const gain = routeMediaToMix(media, audioCtx, mixDest);
            clipSounds.push({ el: v, kind: 'video', media, gain, entered: false });
          }
        } else if (el.type === 'audio') {
          const a = el as AudioElement;
          if (a.audioSrc.startsWith('builtin:')) {
            // One-shot synth scheduled at the clip offset with keyframed volume.
            try {
              const vol = getExportAudioVolume(a, a.startTime + 0.01);
              scheduleBuiltinSound(audioCtx, mixDest, a.audioSrc, vol, a.startTime);
            } catch (err) {
              console.warn('Builtin SFX schedule failed:', err);
            }
          } else {
            const media = getAudioElement(a);
            if (media) {
              try { media.pause(); media.currentTime = 0; } catch {}
              media.loop = !!a.loop;
              const gain = routeMediaToMix(media, audioCtx, mixDest);
              clipSounds.push({ el: a, kind: 'audio', media, gain, entered: false });
            }
          }
        }
      }

      setStatusText('Starting realtime capture (video + audio)...');

      // 4. Combined stream: canvas video track + mixed audio tracks.
      const canvasStream = canvas.captureStream(exportFps);
      const videoTracks = canvasStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('Canvas stream produced no video track.');
      }
      const combined = new MediaStream([
        ...videoTracks,
        ...mixDest.stream.getAudioTracks(),
      ]);
      const pickMime = (): string => {
        const cands = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
        for (const c of cands) {
          try {
            if (MediaRecorder.isTypeSupported(c)) return c;
          } catch {}
        }
        return '';
      };
      const mimeType = pickMime();
      const recorder = new MediaRecorder(combined, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 16000000, // 16 Mbps high definition
        audioBitsPerSecond: 128000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start(250);

      // 5. Realtime capture pass: drive canvas frames + clip playback + per-
      // frame volume automation (keyframes × fades) for the whole duration.
      // Keep the tab visible — background tabs throttle rAF and would gap.
      const fps = exportFps;
      const duration = clipDuration;
      const t0 = performance.now();
      let lastDrawnFrame = -1;

      await new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelRef.current) { resolve(); return; }
          const elapsed = (performance.now() - t0) / 1000;
          const time = Math.min(elapsed, duration);

          for (const cs of clipSounds) {
            const m = cs.media;
            if (!m) continue;
            const active =
              time >= cs.el.startTime - 0.001 &&
              time <= cs.el.startTime + cs.el.duration + 0.001;
            try {
              if (active && !cs.entered) {
                cs.entered = true;
                const off = Math.max(0, time - cs.el.startTime);
                try {
                  if (Math.abs((m.currentTime || 0) - off) > 0.3) m.currentTime = off;
                } catch {}
                m.play().catch(() => {});
              } else if (!active && cs.entered) {
                if (time < cs.el.startTime) cs.entered = false;
                else m.pause();
              }
            } catch {}
            // Volume automation every frame: smooth via setTargetAtTime.
            try {
              const vol =
                cs.kind === 'audio'
                  ? getExportAudioVolume(cs.el as AudioElement, time)
                  : getExportVideoVolume(cs.el as VideoElement, time);
              if (cs.gain) cs.gain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.03);
              else (m as HTMLMediaElement).volume = Math.max(0, Math.min(1, vol));
            } catch {}
          }

          const frame = Math.floor(time * fps);
          if (frame !== lastDrawnFrame) {
            lastDrawnFrame = frame;
            try {
              renderCompositionFrame(ctx, clipElements, time, width, height);
            } catch (err) {
              console.warn('Frame render failed:', err);
            }
            const pct = Math.round((time / duration) * 100);
            setProgress(pct);
            setStatusText(`Capturing ${time.toFixed(1)}s of ${duration}s (video + audio, realtime)...`);
          }

          // Small audio tail so reverb/one-shots aren't hard-cut.
          if (elapsed >= duration + 0.4) { resolve(); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      // 6. Teardown media before finalizing the container.
      stopAllPooledMedia();
      if (cancelRef.current) {
        try { recorder.stop(); } catch {}
        await stopped;
        setStatusText('Export cancelled.');
        setProgress(0);
        return;
      }

      setStatusText('Finalizing video container...');
      recorder.stop();
      await stopped;

      const type = mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) {
        throw new Error('Recorder produced no data — try a shorter duration or a different browser.');
      }
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setStatusText('Video successfully rendered with picture + sound!');
    } catch (err: any) {
      console.error('Export failed:', err);
      stopAllPooledMedia();
      if (err?.message === 'Export cancelled.') {
        setStatusText('Export cancelled.');
        setProgress(0);
      } else {
        setErrorMessage(err.message || 'An unexpected rendering error occurred during export.');
        setStatusText('Render failed.');
      }
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
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Realtime capture with video + audio, then convert via FFmpeg</p>
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
              The composition was captured in realtime with video-clip picture, audio tracks, XP window chrome, dialogs, and text.
              Keep this tab visible during capture — background tabs throttle rendering.
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
          <button
            className="editor-btn"
            onClick={() => {
              if (exporting) cancelRef.current = true;
              else onClose();
            }}
          >
            {exporting ? 'Cancel Export' : 'Cancel'}
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
