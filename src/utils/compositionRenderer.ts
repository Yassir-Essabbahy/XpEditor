import { CanvasElement, XpWindowElement, WallpaperElement, ImageViewerElement, DialogElement, DesktopIconElement, TextElement, CursorElement, AssistantElement, VideoElement, AudioElement } from '../types/editor';
import { formatFriendlyTitle } from './filePicker';
import { getAnimatedElementProps, getTransitionedElementProps, evaluateAssistantDialogue, evaluateTransitions, evaluateAudioVolume } from './keyframeAnimation';
import { XP_ICON_PATHS, XP_CURSOR_PATHS, XP_ASSISTANT_SHEET, XP_ASSISTANT_POSE_MAP } from './xpAssets';

// Cache for loaded HTML images
const imageCache = new Map<string, HTMLImageElement>();

// Media pools for video/audio clip elements. Owned by the renderer so the
// export pass can draw video frames AND route element audio into one mix
// from the same <video>/<audio> instances (preview uses its own instances).
const videoPool = new Map<string, HTMLVideoElement>();
const audioPool = new Map<string, HTMLAudioElement>();
// One MediaElementSource per media element (browser throws on a second one),
// reused across repeat exports.
const mediaSourceMap = new WeakMap<HTMLMediaElement, { ctx: AudioContext; gain: GainNode }>();

export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      // Fallback if image fails
      resolve(img);
    };
    img.src = src;
  });
}

// Preload all assets present in composition
export async function preloadCompositionAssets(elements: CanvasElement[]): Promise<void> {
  const promises: Promise<HTMLImageElement>[] = [];
  const mediaPromises: Promise<unknown>[] = [];

  elements.forEach((el) => {
    if (el.type === 'wallpaper') {
      const wall = el as WallpaperElement;
      if (wall.imageSrc) {
        promises.push(preloadImage(wall.imageSrc));
      }
      if (wall.showDesktopIcons !== false) {
        promises.push(preloadImage(XP_ICON_PATHS['my-computer']));
        promises.push(preloadImage(XP_ICON_PATHS['my-documents']));
        promises.push(preloadImage(XP_ICON_PATHS['recycle-bin']));
        promises.push(preloadImage(XP_ICON_PATHS['internet']));
      }
    } else if (el.type === 'xp-window' && (el as XpWindowElement).contentImageSrc) {
      promises.push(preloadImage((el as XpWindowElement).contentImageSrc!));
    } else if (el.type === 'image-viewer' && (el as ImageViewerElement).imageSrc) {
      promises.push(preloadImage((el as ImageViewerElement).imageSrc));
    } else if (el.type === 'desktop-icon') {
      const iconPath = XP_ICON_PATHS[(el as DesktopIconElement).iconType] || XP_ICON_PATHS['my-computer'];
      if (iconPath) promises.push(preloadImage(iconPath));
    } else if (el.type === 'cursor') {
      const cursorPath = XP_CURSOR_PATHS[(el as CursorElement).cursorType] || XP_CURSOR_PATHS['default'];
      if (cursorPath) promises.push(preloadImage(cursorPath));
    } else if (el.type === 'dialog') {
      const dialogIconPath = XP_ICON_PATHS[(el as DialogElement).iconType] || XP_ICON_PATHS['error'];
      if (dialogIconPath) promises.push(preloadImage(dialogIconPath));
    } else if (el.type === 'assistant') {
      promises.push(preloadImage(XP_ASSISTANT_SHEET));
      Object.values(XP_ASSISTANT_POSE_MAP).forEach((src) => {
        promises.push(preloadImage(src));
      });
    } else if (el.type === 'video') {
      mediaPromises.push(preloadVideoForElement(el as VideoElement));
    } else if (el.type === 'audio') {
      const src = (el as AudioElement).audioSrc;
      if (src && !src.startsWith('builtin:')) {
        mediaPromises.push(preloadAudioForElement(el as AudioElement));
      }
    }
  });

  await Promise.all(promises);
  // Media preloads must never block the export (dead blob URLs after a
  // project reload, missing files, slow network) — bounded wait.
  await Promise.all(
    mediaPromises.map((p) =>
      Promise.race([
        p,
        new Promise((resolve) => setTimeout(resolve, 5000)).then(() => null),
      ]).catch(() => null)
    )
  );
}

/**
 * Returns (creating if needed) the pooled <video> for a video clip element.
 * Pooled instance is paused by default; callers drive play/pause/seek.
 * Returns null when the element has no usable source.
 */
export function getVideoElement(el: VideoElement): HTMLVideoElement | null {
  if (!el.videoSrc) return null;
  let v = videoPool.get(el.id);
  if (v && v.dataset.src === el.videoSrc) return v;
  // Source changed (e.g. relinked file) — drop the stale instance.
  if (v) {
    try { v.pause(); } catch {}
    v.removeAttribute('src');
    videoPool.delete(el.id);
  }
  v = document.createElement('video');
  v.muted = false;
  v.playsInline = true;
  (v as any).playsinline = true;
  v.preload = 'auto';
  v.loop = !!el.loop;
  (v as any).disablePictureInPicture = true;
  if (el.videoSrc.startsWith('http://') || el.videoSrc.startsWith('https://')) {
    v.crossOrigin = 'anonymous';
  }
  v.dataset.src = el.videoSrc;
  v.src = el.videoSrc;
  try { v.load(); } catch {}
  videoPool.set(el.id, v);
  return v;
}

/** Preloads a video clip until first frame is available (bounded wait). */
export function preloadVideoForElement(el: VideoElement): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const v = getVideoElement(el);
    if (!v) { resolve(null); return; }
    if (v.readyState >= 2) { resolve(v); return; }
    const done = () => { cleanup(); resolve(v); };
    const fail = () => { cleanup(); resolve(v); };
    const cleanup = () => {
      v.removeEventListener('canplay', done);
      v.removeEventListener('error', fail);
    };
    v.addEventListener('canplay', done);
    v.addEventListener('error', fail);
    setTimeout(() => { cleanup(); resolve(v); }, 5000);
  });
}

/**
 * Returns (creating if needed) the pooled <audio> for an audio clip element.
 * File-based sources only — builtin: SFX ids are synthesized at mix time.
 */
export function getAudioElement(el: AudioElement): HTMLAudioElement | null {
  if (!el.audioSrc || el.audioSrc.startsWith('builtin:')) return null;
  let a = audioPool.get(el.id);
  if (a && a.dataset.src === el.audioSrc) return a;
  if (a) {
    try { a.pause(); } catch {}
    audioPool.delete(el.id);
  }
  a = new Audio();
  a.preload = 'auto';
  a.loop = !!el.loop;
  a.dataset.src = el.audioSrc;
  a.src = el.audioSrc;
  audioPool.set(el.id, a);
  return a;
}

export function preloadAudioForElement(el: AudioElement): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    const a = getAudioElement(el);
    if (!a) { resolve(null); return; }
    if (a.readyState >= 2) { resolve(a); return; }
    const done = () => { cleanup(); resolve(a); };
    const fail = () => { cleanup(); resolve(a); };
    const cleanup = () => {
      a.removeEventListener('canplaythrough', done);
      a.removeEventListener('canplay', done);
      a.removeEventListener('error', fail);
    };
    a.addEventListener('canplaythrough', done);
    a.addEventListener('canplay', done);
    a.addEventListener('error', fail);
    setTimeout(() => { cleanup(); resolve(a); }, 5000);
  });
}

/** Pauses every pooled media element (export teardown / new export start). */
export function stopAllPooledMedia(): void {
  videoPool.forEach((v) => { try { v.pause(); } catch {} });
  audioPool.forEach((a) => { try { a.pause(); } catch {} });
}

/** Drops pooled instances whose element no longer exists (or changed src). */
export function pruneMediaPools(liveIds: Set<string>): void {
  videoPool.forEach((v, id) => {
    if (!liveIds.has(id)) {
      try { v.pause(); } catch {}
      v.removeAttribute('src');
      videoPool.delete(id);
    }
  });
  audioPool.forEach((a, id) => {
    if (!liveIds.has(id)) {
      try { a.pause(); } catch {}
      audioPool.delete(id);
    }
  });
}

/**
 * Routes a pooled media element into an export AudioContext mix, creating
 * the (single-per-element) MediaElementSource on first use. Returns the
 * per-element GainNode for volume automation, or null if routing failed
 * (e.g. CORS-tainted remote source — canvas video still draws, just silent).
 */
export function routeMediaToMix(
  media: HTMLMediaElement,
  ctx: AudioContext,
  dest: AudioNode
): GainNode | null {
  try {
    const existing = mediaSourceMap.get(media);
    if (existing && existing.ctx === ctx) {
      try { existing.gain.disconnect(); } catch {}
      existing.gain.connect(dest);
      return existing.gain;
    }
    const src = ctx.createMediaElementSource(media);
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(dest);
    mediaSourceMap.set(media, { ctx, gain });
    return gain;
  } catch (err) {
    console.warn('Could not route media element into export mix:', err);
    return null;
  }
}

/** Current export-safe volume for an audio clip (keyframes × fades). */
export function getExportAudioVolume(el: AudioElement, time: number): number {
  try {
    return evaluateAudioVolume(el as unknown as CanvasElement, time);
  } catch {
    return el.volume ?? 0.8;
  }
}

/** Current export-safe volume for a video clip's audio track. */
export function getExportVideoVolume(el: VideoElement, time: number): number {
  try {
    return evaluateAudioVolume(el as unknown as CanvasElement, time);
  } catch {
    return (el as any).volume ?? 1;
  }
}

// Helper to draw clean vector XP window buttons on Canvas 2D
function drawTitlebarButtonsCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  btnSize = 20,
  showMinMax = true
) {
  const closeX = x + w - btnSize - 4;
  const maxX = closeX - btnSize - 2;
  const minX = maxX - btnSize - 2;

  // Close Button (Coral / Red)
  const closeGrad = ctx.createLinearGradient(closeX, y + 4, closeX, y + 4 + btnSize);
  closeGrad.addColorStop(0, '#e06c52');
  closeGrad.addColorStop(1, '#c93b1d');
  ctx.fillStyle = closeGrad;
  ctx.fillRect(closeX, y + 4, btnSize, btnSize);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(closeX, y + 4, btnSize, btnSize);

  // Crisp Close 'X' vector
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(closeX + 5.5, y + 4 + 5.5);
  ctx.lineTo(closeX + btnSize - 5.5, y + 4 + btnSize - 5.5);
  ctx.moveTo(closeX + btnSize - 5.5, y + 4 + 5.5);
  ctx.lineTo(closeX + 5.5, y + 4 + btnSize - 5.5);
  ctx.stroke();

  if (showMinMax) {
    const maxGrad = ctx.createLinearGradient(maxX, y + 4, maxX, y + 4 + btnSize);
    maxGrad.addColorStop(0, '#3884ea');
    maxGrad.addColorStop(1, '#1e52bc');

    // Maximize Button
    ctx.fillStyle = maxGrad;
    ctx.fillRect(maxX, y + 4, btnSize, btnSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(maxX, y + 4, btnSize, btnSize);

    // Maximize square outline vector
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(maxX + 4.5, y + 4 + 4.5, btnSize - 9, btnSize - 9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(maxX + 4.5, y + 4 + 6);
    ctx.lineTo(maxX + btnSize - 4.5, y + 4 + 6);
    ctx.stroke();

    // Minimize Button
    ctx.fillStyle = maxGrad;
    ctx.fillRect(minX, y + 4, btnSize, btnSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(minX, y + 4, btnSize, btnSize);

    // Minimize dash vector
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(minX + 5, y + 4 + btnSize - 6);
    ctx.lineTo(minX + btnSize - 5, y + 4 + btnSize - 6);
    ctx.stroke();
  }
}

// Draw a single frame of the entire Windows XP composition onto a 2D canvas
export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  time: number,
  canvasW: number,
  canvasH: number
) {
  // Clear frame
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Filter elements active at the given time with continuous boundary protection
  let visibleElements = elements
    .filter((el) => {
      // Ensure background wallpaper and taskbar stay visible across video
      if (el.type === 'wallpaper' && el.startTime === 0) {
        return el.visible && time >= 0;
      }
      if (el.type === 'taskbar' && el.startTime === 0) {
        return el.visible && time >= 0;
      }
      // Inclusive clip boundary check with small tolerance to prevent single-frame black flashes
      return el.visible && time >= (el.startTime - 0.001) && time <= (el.startTime + el.duration + 0.001);
    })
    .sort((a, b) => a.zIndex - b.zIndex);

  // If multiple cursor layers are active at the same time, keep only top active cursor to avoid duplicate overlapping ghosts
  const activeCursors = visibleElements.filter((el) => el.type === 'cursor');
  if (activeCursors.length > 1) {
    const topCursor = activeCursors[activeCursors.length - 1];
    visibleElements = visibleElements.filter((el) => el.type !== 'cursor' || el.id === topCursor.id);
  }

  visibleElements.forEach((el) => {
    // Transitioned props (entrance/exit presets on top of keyframes) drive
    // geometry everywhere. Assistant opacity is applied inside drawAssistant
    // (base here) so the fade is counted exactly once, matching the preview.
    const base = getAnimatedElementProps(el, time);
    const full = getTransitionedElementProps(el, time);
    const anim = el.type === 'assistant' ? { ...full, opacity: base.opacity } : full;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity));

    const x = (anim.x / 100) * canvasW;
    const y = (anim.y / 100) * canvasH;
    const w = (anim.width / 100) * canvasW;
    const h = (anim.height / 100) * canvasH;

    // Apply smooth rotation around element center
    if (anim.rotation) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((anim.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    switch (el.type) {
      case 'wallpaper':
        drawWallpaper(ctx, el as WallpaperElement, x, y, w, h);
        break;
      case 'xp-window':
        drawXpWindow(ctx, el as XpWindowElement, x, y, w, h);
        break;
      case 'image-viewer':
        drawImageViewer(ctx, el as ImageViewerElement, x, y, w, h);
        break;
      case 'dialog':
        drawDialog(ctx, el as DialogElement, x, y, w, h);
        break;
      case 'desktop-icon':
        drawDesktopIcon(ctx, el as DesktopIconElement, x, y, w, h);
        break;
      case 'text':
        drawTextOverlay(ctx, el as TextElement, x, y, w, h);
        break;
      case 'cursor':
        drawCursor(ctx, el as CursorElement, x, y, w, h);
        break;
      case 'taskbar':
        drawTaskbar(ctx, x, y, w, h);
        break;
      case 'assistant':
        drawAssistant(ctx, el as AssistantElement, time, x, y, w, h);
        break;
      case 'video':
        drawVideo(ctx, el as VideoElement, time, x, y, w, h);
        break;
      // Audio clips are sound-only (mixed into the export, played live in preview).
    }

    ctx.restore();
  });
}

// 10. Draw Video Clip frame (pooled <video>, driven by callers)
function drawVideo(
  ctx: CanvasRenderingContext2D,
  el: VideoElement,
  time: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (w <= 0 || h <= 0) return;
  const v = getVideoElement(el);
  // Letterbox backdrop so contain-fit never shows transparency.
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);
  if (!v || v.readyState < 2 || v.videoWidth <= 0 || v.videoHeight <= 0) {
    // Source missing (e.g. dead blob URL after project reload): slate + label.
    ctx.fillStyle = '#1c2530';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '12px Tahoma, sans-serif';
    ctx.textAlign = 'center';
    const label = el.videoSrc && el.videoSrc.startsWith('blob:')
      ? 'Video source unlinked — relink the file'
      : 'Video unavailable';
    ctx.fillText(label, x + w / 2, y + h / 2);
    return;
  }
  // Keep playback roughly glued to the timeline when callers seek per frame;
  // live playback otherwise just draws the current frame.
  const rel = Math.max(0, time - el.startTime);
  if (v.paused && v.readyState >= 2) {
    const target = v.loop ? rel % Math.max(0.1, el.duration) : rel;
    const srcDur = isFinite(v.duration) && v.duration > 0 ? v.duration : el.duration;
    const want = !v.loop && srcDur > 0 ? Math.min(target, Math.max(0, srcDur - 0.05)) : target;
    if (Math.abs(v.currentTime - want) > 0.25) {
      try { v.currentTime = Math.max(0, want); } catch {}
    }
  }
  const fit = el.fitMode || 'contain';
  const vw = v.videoWidth;
  const vh = v.videoHeight;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (fit === 'cover') {
    const s = Math.max(w / vw, h / vh);
    dw = vw * s; dh = vh * s;
    dx = x + (w - dw) / 2; dy = y + (h - dh) / 2;
  } else {
    const s = Math.min(w / vw, h / vh);
    dw = vw * s; dh = vh * s;
    dx = x + (w - dw) / 2; dy = y + (h - dh) / 2;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);
  try {
    ctx.drawImage(v, dx, dy, dw, dh);
  } catch {
    // Tainted/empty frame — slate already painted behind.
  }
  ctx.restore();
}

// 1. Draw Wallpaper
function drawWallpaper(
  ctx: CanvasRenderingContext2D,
  el: WallpaperElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const img = imageCache.get(el.imageSrc);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    // Classic Bliss gradient fallback
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#3a6ea5');
    grad.addColorStop(0.5, '#78b0e8');
    grad.addColorStop(0.7, '#4c9a2a');
    grad.addColorStop(1, '#2d7a18');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // Draw optional desktop icons
  if (el.showDesktopIcons !== false) {
    const defaultIcons = [
      { label: 'My Computer', type: 'my-computer', x: x + 20, y: y + 20 },
      { label: 'My Documents', type: 'my-documents', x: x + 20, y: y + 95 },
      { label: 'Recycle Bin', type: 'recycle-bin', x: x + 20, y: y + 170 },
      { label: 'Internet Explorer', type: 'internet', x: x + 20, y: y + 245 },
    ];

    defaultIcons.forEach((item) => {
      const iconPath = XP_ICON_PATHS[item.type];
      const iconImg = iconPath ? imageCache.get(iconPath) : null;
      if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
        ctx.drawImage(iconImg, item.x + 9, item.y, 32, 32);
      } else {
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📁', item.x + 25, item.y + 24);
      }

      ctx.font = '11px Tahoma, sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, item.x + 26, item.y + 45);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.label, item.x + 25, item.y + 44);
    });
  }
}

// 2. Draw XP Application Window
function drawXpWindow(
  ctx: CanvasRenderingContext2D,
  el: XpWindowElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const titleH = 28;
  const isError = el.windowType === 'error';

  // Window Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // Outer Window Border (#0055EA)
  ctx.fillStyle = '#ECE9D8';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0055EA';
  ctx.strokeRect(x, y, w, h);

  // Luna Blue Titlebar
  const titleGrad = ctx.createLinearGradient(x, y, x, y + titleH);
  if (el.isActive !== false) {
    titleGrad.addColorStop(0, '#0058EE');
    titleGrad.addColorStop(0.15, '#3593FF');
    titleGrad.addColorStop(0.6, '#0055EA');
    titleGrad.addColorStop(1, '#0045D0');
  } else {
    titleGrad.addColorStop(0, '#7697C6');
    titleGrad.addColorStop(0.5, '#7A9BC8');
    titleGrad.addColorStop(1, '#688BB9');
  }
  ctx.fillStyle = titleGrad;
  ctx.fillRect(x, y, w, titleH);

  // Window Title Text
  const windowTitle = formatFriendlyTitle(el.title || el.name);
  ctx.font = 'bold 12px Tahoma, sans-serif';
  ctx.fillStyle = '#0f3b82';
  ctx.textAlign = 'left';
  ctx.fillText(windowTitle, x + 25, y + 19);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(windowTitle, x + 24, y + 18);

  // Window Icon
  ctx.font = '12px sans-serif';
  ctx.fillText(isError ? '❌' : '🗔', x + 6, y + 19);

  // Window Buttons (Minimize, Maximize, Close) with clean vector symbols
  drawTitlebarButtonsCanvas(ctx, x, y, w, 20, !isError);

  // Menu bar (if enabled)
  let contentY = y + titleH;
  if (el.hasMenuBar && !isError) {
    const menuH = 22;
    ctx.fillStyle = '#ECE9D8';
    ctx.fillRect(x, contentY, w, menuH);
    ctx.strokeStyle = '#D5D2C2';
    ctx.beginPath();
    ctx.moveTo(x, contentY + menuH);
    ctx.lineTo(x + w, contentY + menuH);
    ctx.stroke();

    ctx.font = '11px Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText('File    Edit    View    Image    Options    Help', x + 8, contentY + 15);
    contentY += menuH;
  }

  // Window Content Area
  const statusH = (el.hasStatusBar && !isError) ? 20 : 0;
  const contentH = y + h - contentY - statusH;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2, contentY, w - 4, contentH);

  if (el.contentImageSrc) {
    const img = imageCache.get(el.contentImageSrc);
    if (img && img.complete && img.naturalWidth > 0) {
      const cw = w - 4;
      const ch = contentH;
      const fit = el.fitMode || 'contain';
      if (fit === 'cover') {
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, contentY, cw, ch);
        ctx.clip();
        ctx.drawImage(img, x + 2 + (cw - dw) / 2, contentY + (ch - dh) / 2, dw, dh);
        ctx.restore();
      } else {
        // contain (preserve aspect ratio by default)
        const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, x + 2 + (cw - dw) / 2, contentY + (ch - dh) / 2, dw, dh);
      }
    }
  }

  // Status Bar (if enabled)
  if (statusH > 0) {
    const statY = y + h - statusH;
    ctx.fillStyle = '#ECE9D8';
    ctx.fillRect(x, statY, w, statusH);
    ctx.strokeStyle = '#D5D2C2';
    ctx.strokeRect(x, statY, w, statusH);
    ctx.font = '10px Tahoma, sans-serif';
    ctx.fillStyle = '#444444';
    ctx.fillText(el.statusText || 'Ready', x + 6, statY + 14);
  }
}

// 3. Draw Windows Picture and Fax Viewer
function drawImageViewer(
  ctx: CanvasRenderingContext2D,
  el: ImageViewerElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const titleH = 28;
  const toolbarH = 36;
  const statusH = 20;

  // Window Shadow & Chrome
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x + 4, y + 4, w, h);

  ctx.fillStyle = '#ECE9D8';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0055EA';
  ctx.strokeRect(x, y, w, h);

  // Titlebar
  const titleGrad = ctx.createLinearGradient(x, y, x, y + titleH);
  titleGrad.addColorStop(0, '#0058EE');
  titleGrad.addColorStop(0.6, '#0055EA');
  titleGrad.addColorStop(1, '#0045D0');
  ctx.fillStyle = titleGrad;
  ctx.fillRect(x, y, w, titleH);

  ctx.font = 'bold 12px Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const rawTitle = el.title || `${el.imageName || 'image.jpg'} - Windows Picture and Fax Viewer`;
  ctx.fillText(formatFriendlyTitle(rawTitle), x + 24, y + 18);
  ctx.font = '12px sans-serif';
  ctx.fillText('🖼️', x + 6, y + 18);

  // Close / Max / Min buttons with clean vector symbols
  drawTitlebarButtonsCanvas(ctx, x, y, w, 20, true);

  // Viewport Mat (#7B92B2)
  const viewY = y + titleH;
  const viewH = h - titleH - toolbarH - statusH;
  ctx.fillStyle = '#7B92B2';
  ctx.fillRect(x + 3, viewY, w - 6, viewH);

  // Draw Image centered
  const img = imageCache.get(el.imageSrc);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, viewY, w - 6, viewH);
    ctx.clip();

    const zoom = el.zoomLevel || 1;
    const rot = (el.rotation || 0) * (Math.PI / 180);
    const cx = x + w / 2;
    const cy = viewY + viewH / 2;

    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(zoom, zoom);

    // Compute scaled dimensions preserving aspect ratio
    const fit = el.fitMode || 'contain';
    let scale = Math.min((w * 0.85) / img.naturalWidth, (viewH * 0.85) / img.naturalHeight);
    if (fit === 'cover') {
      scale = Math.max((w - 6) / img.naturalWidth, viewH / img.naturalHeight);
    } else if (fit === 'none') {
      scale = 1;
    }
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;

    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  // Bottom XP Picture Toolbar
  const toolY = y + titleH + viewH;
  const toolGrad = ctx.createLinearGradient(x, toolY, x, toolY + toolbarH);
  toolGrad.addColorStop(0, '#F0EFE6');
  toolGrad.addColorStop(1, '#D8D4BF');
  ctx.fillStyle = toolGrad;
  ctx.fillRect(x + 2, toolY, w - 4, toolbarH);

  // Draw toolbar buttons
  const tools = ['🔍+', '🔍-', '🖵', '1:1', '▶', '⟳', '⟲', '🗑', '🖶', '💾'];
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  const btnStep = Math.min(32, (w - 20) / tools.length);
  const startBtnX = x + w / 2 - (tools.length * btnStep) / 2 + btnStep / 2;

  tools.forEach((sym, i) => {
    ctx.fillText(sym, startBtnX + i * btnStep, toolY + 22);
  });

  // Status Bar
  const statY = toolY + toolbarH;
  ctx.fillStyle = '#ECE9D8';
  ctx.fillRect(x + 2, statY, w - 4, statusH);
  ctx.font = '10px Tahoma, sans-serif';
  ctx.fillStyle = '#444444';
  ctx.textAlign = 'left';
  ctx.fillText(formatFriendlyTitle(el.imageName || 'image.jpg'), x + 6, statY + 14);
}

// 4. Draw Error / Alert Dialog
function drawDialog(
  ctx: CanvasRenderingContext2D,
  el: DialogElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const titleH = 26;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x + 4, y + 4, w, h);

  ctx.fillStyle = '#ECE9D8';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0055EA';
  ctx.strokeRect(x, y, w, h);

  // Title bar
  const titleGrad = ctx.createLinearGradient(x, y, x, y + titleH);
  titleGrad.addColorStop(0, '#0058EE');
  titleGrad.addColorStop(1, '#0045D0');
  ctx.fillStyle = titleGrad;
  ctx.fillRect(x, y, w, titleH);

  ctx.font = 'bold 11px Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(el.dialogTitle || 'System Alert', x + 20, y + 17);

  // Close Button with clean vector symbol
  drawTitlebarButtonsCanvas(ctx, x, y, w, 18, false);

  // Dialog Content Body
  const iconX = x + 20;
  const iconY = y + titleH + 20;

  // Render Dialog Icon: authentic PNG first, vector fallback
  const dialogIconPath = XP_ICON_PATHS[el.iconType] || XP_ICON_PATHS['error'];
  const dialogImg = dialogIconPath ? imageCache.get(dialogIconPath) : null;

  if (dialogImg && dialogImg.complete && dialogImg.naturalWidth > 0) {
    ctx.drawImage(dialogImg, iconX, iconY, 32, 32);
  } else if (el.iconType === 'warning') {
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️', iconX + 16, iconY + 24);
  } else if (el.iconType === 'info') {
    ctx.beginPath();
    ctx.arc(iconX + 16, iconY + 16, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4ed8';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.font = 'italic bold 20px Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('i', iconX + 16, iconY + 23);
  } else if (el.iconType === 'question') {
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❓', iconX + 16, iconY + 24);
  } else {
    // Critical Error Icon (Red ✕)
    ctx.beginPath();
    ctx.arc(iconX + 16, iconY + 16, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#cc0000';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('✕', iconX + 16, iconY + 22);
  }

  // Message text
  ctx.font = '11px Tahoma, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  wrapText(ctx, el.message || 'An error has occurred.', iconX + 44, iconY + 10, w - 80, 15);

  // [ OK ] Button
  const btnW = 75;
  const btnH = 23;
  const btnBx = x + w / 2 - btnW / 2;
  const btnBy = y + h - btnH - 12;

  const btnGrad = ctx.createLinearGradient(btnBx, btnBy, btnBx, btnBy + btnH);
  btnGrad.addColorStop(0, '#ffffff');
  btnGrad.addColorStop(1, '#DEDAC5');
  ctx.fillStyle = btnGrad;
  ctx.fillRect(btnBx, btnBy, btnW, btnH);
  ctx.strokeStyle = '#003c74';
  ctx.strokeRect(btnBx, btnBy, btnW, btnH);

  ctx.font = '11px Tahoma, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('OK', btnBx + btnW / 2, btnBy + 15);
}

// 5. Draw Desktop Icon
function drawDesktopIcon(
  ctx: CanvasRenderingContext2D,
  el: DesktopIconElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const iconPath = XP_ICON_PATHS[el.iconType] || XP_ICON_PATHS['my-computer'];
  const iconImg = iconPath ? imageCache.get(iconPath) : null;

  if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
    ctx.drawImage(iconImg, x + w / 2 - 16, y + h / 2 - 20, 32, 32);
  } else {
    let iconGlyph = '🖥️';
    if (el.iconType === 'recycle-bin') iconGlyph = '🗑️';
    else if (el.iconType === 'folder' || el.iconType === 'my-documents') iconGlyph = '📁';
    else if (el.iconType === 'internet') iconGlyph = '🌐';
    else if (el.iconType === 'notepad') iconGlyph = '📝';

    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(iconGlyph, x + w / 2, y + h / 2 - 2);
  }

  ctx.font = '11px Tahoma, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(el.label || 'Item', x + w / 2 + 1, y + h / 2 + 20);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(el.label || 'Item', x + w / 2, y + h / 2 + 19);
}

// 6. Draw Text Overlay / Balloon
function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  el: TextElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (el.balloonStyle) {
    // XP Notification Balloon
    ctx.fillStyle = '#FFFFE1';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.font = 'bold 11px Tahoma, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(`ℹ️ ${el.balloonTitle || 'Notification'}`, x + 6, y + 15);

    ctx.font = `${el.fontSize || 11}px Tahoma, sans-serif`;
    wrapText(ctx, el.text || '', x + 6, y + 32, w - 12, 14);
  } else {
    ctx.font = `bold ${el.fontSize || 16}px ${el.fontFamily || 'Tahoma, sans-serif'}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(el.text || '', x + 1, y + (el.fontSize || 16) + 1);
    ctx.fillStyle = el.color || '#ffffff';
    ctx.fillText(el.text || '', x, y + (el.fontSize || 16));
  }
}

// 7. Draw Mouse Cursor
function drawCursor(
  ctx: CanvasRenderingContext2D,
  el: CursorElement,
  x: number,
  y: number,
  _w: number,
  _h: number
) {
  ctx.save();
  ctx.translate(x, y);

  const cursorPath = XP_CURSOR_PATHS[el.cursorType] || XP_CURSOR_PATHS['default'];
  const cursorImg = cursorPath ? imageCache.get(cursorPath) : null;

  if (cursorImg && cursorImg.complete && cursorImg.naturalWidth > 0) {
    ctx.drawImage(cursorImg, 0, 0, 24, 24);
  } else if (el.cursorType === 'pointer') {
    // Link Hand
    ctx.font = '22px sans-serif';
    ctx.fillText('👆', 0, 18);
  } else if (el.cursorType === 'hourglass') {
    // Hourglass
    ctx.font = '20px sans-serif';
    ctx.fillText('⌛', 0, 18);
  } else if (el.cursorType === 'text') {
    // I-Beam
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(12, 0);
    ctx.moveTo(8, 0); ctx.lineTo(8, 18);
    ctx.moveTo(4, 18); ctx.lineTo(12, 18);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(12, 0);
    ctx.moveTo(8, 0); ctx.lineTo(8, 18);
    ctx.moveTo(4, 18); ctx.lineTo(12, 18);
    ctx.stroke();
  } else if (el.cursorType === 'move') {
    // 4-Way Move Cursor
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(14, 4); ctx.lineTo(11, 4); ctx.lineTo(11, 8);
    ctx.lineTo(15, 8); ctx.lineTo(15, 5); ctx.lineTo(19, 9); ctx.lineTo(15, 13);
    ctx.lineTo(15, 10); ctx.lineTo(11, 10); ctx.lineTo(11, 14); ctx.lineTo(14, 14);
    ctx.lineTo(10, 18); ctx.lineTo(6, 14); ctx.lineTo(9, 14); ctx.lineTo(9, 10);
    ctx.lineTo(5, 10); ctx.lineTo(5, 13); ctx.lineTo(1, 9); ctx.lineTo(5, 5);
    ctx.lineTo(5, 8); ctx.lineTo(9, 8); ctx.lineTo(9, 4); ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Classic XP Cursor Arrow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(5, 14);
    ctx.lineTo(8, 21);
    ctx.lineTo(11, 20);
    ctx.lineTo(7, 13);
    ctx.lineTo(13, 13);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }

  ctx.restore();
}

// 8. Draw Taskbar
function drawTaskbar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Luna Blue taskbar gradient
  const barGrad = ctx.createLinearGradient(x, y, x, y + h);
  barGrad.addColorStop(0, '#1f2f86');
  barGrad.addColorStop(0.1, '#245ddb');
  barGrad.addColorStop(0.9, '#1941a5');
  barGrad.addColorStop(1, '#143586');
  ctx.fillStyle = barGrad;
  ctx.fillRect(x, y, w, h);

  // Green Start Button
  const startW = 100;
  const startGrad = ctx.createLinearGradient(x, y, x, y + h);
  startGrad.addColorStop(0, '#3c8d3c');
  startGrad.addColorStop(0.3, '#3b923b');
  startGrad.addColorStop(1, '#1e5a1e');
  ctx.fillStyle = startGrad;
  ctx.fillRect(x, y, startW, h);

  ctx.font = 'bold italic 14px "Franklin Gothic Medium", Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('🪟 start', x + 10, y + h * 0.68);

  // Notification Tray
  const trayW = 85;
  const trayX = x + w - trayW;
  const trayGrad = ctx.createLinearGradient(trayX, y, trayX, y + h);
  trayGrad.addColorStop(0, '#092c74');
  trayGrad.addColorStop(1, '#0d42a6');
  ctx.fillStyle = trayGrad;
  ctx.fillRect(trayX, y, trayW, h);

  ctx.font = '11px Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('🔔 11:45 PM', trayX + trayW / 2, y + h * 0.66);
}

// Helper: Word wrap for dialogs and text blocks
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Helper: Draw rounded rectangle path
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// 9. Draw Assistant Character and Speech Bubble
function drawAssistant(
  ctx: CanvasRenderingContext2D,
  el: AssistantElement,
  time: number,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Entrance/exit transition opacity (incl. legacy fade fallback). Outer
  // scope passes base opacity so the product lands exactly once — same as
  // the live XpAssistant preview (minus its selection floor).
  const relTime = time - el.startTime;
  const fadeAlpha = evaluateTransitions(el, time).opacity;

  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * fadeAlpha;

  // Draw transparent assistant character
  const evalDialogue = evaluateAssistantDialogue(el, time);
  const pose = evalDialogue.pose;
  const isAnimated = el.isAnimated ?? false;
  const animationSpeed = el.animationSpeed || 12;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  if (isAnimated) {
    const sheetImg = imageCache.get(XP_ASSISTANT_SHEET);
    const totalFrames = 33;
    const frameIndex = Math.max(0, Math.floor((Math.max(0, relTime) * animationSpeed) % totalFrames));
    if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
      ctx.drawImage(sheetImg, frameIndex * 240, 0, 240, 240, x, y, w, h);
    } else {
      const poseSrc = XP_ASSISTANT_POSE_MAP[pose] || XP_ASSISTANT_POSE_MAP['idle'];
      const poseImg = poseSrc ? imageCache.get(poseSrc) : null;
      if (poseImg && poseImg.complete && poseImg.naturalWidth > 0) {
        ctx.drawImage(poseImg, x, y, w, h);
      }
    }
  } else {
    const poseSrc = XP_ASSISTANT_POSE_MAP[pose] || XP_ASSISTANT_POSE_MAP['idle'];
    const poseImg = poseSrc ? imageCache.get(poseSrc) : null;
    if (poseImg && poseImg.complete && poseImg.naturalWidth > 0) {
      ctx.drawImage(poseImg, x, y, w, h);
    }
  }
  ctx.restore();

  // Draw dialogue bubble if active
  const showDialogue = evalDialogue.showDialogue && Boolean(evalDialogue.dialogueText);
  if (showDialogue && evalDialogue.dialogueText) {
    const bubbleBg = el.bubbleBgColor || '#FFFFE1';
    const bubbleText = el.bubbleTextColor || '#000000';
    const bubbleBorder = el.bubbleBorderColor || '#000000';
    const bubbleFontSize = el.bubbleFontSize || 12;
    const bubbleRadius = el.bubbleCornerRadius ?? 8;
    const bubblePadding = el.bubblePadding ?? 10;
    const bubbleWidth = el.bubbleWidth ? el.bubbleWidth * 4.5 : 220;
    const bubblePos = evalDialogue.bubblePosition || 'left';

    ctx.font = `${bubbleFontSize}px Tahoma, sans-serif`;
    const lineHeight = Math.round(bubbleFontSize * 1.45);
    // Typewriter text animation calculation
    const isTypewriter = el.typewriterEffect ?? false;
    const typewriterSpeed = el.typewriterSpeed || 25;
    const fullText = evalDialogue.dialogueText;
    const dialogueChunkTime = Math.max(0, relTime - evalDialogue.activeKeyframeTime);
    let textToRender = fullText;

    if (isTypewriter && fullText) {
      const charsToShow = Math.max(0, Math.floor(dialogueChunkTime * typewriterSpeed + 0.0001));
      textToRender = fullText.slice(0, charsToShow);
    }

    const textMaxWidth = bubbleWidth - bubblePadding * 2;

    // Break dialogueText by newlines, then wrap each paragraph
    const rawParagraphs = (textToRender || ' ').split('\n');
    const lines: string[] = [];
    rawParagraphs.forEach((paragraph) => {
      const words = paragraph.split(' ');
      let currentLine = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
        if (ctx.measureText(testLine).width > textMaxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    });

    const bubbleHeight = Math.max(38, lines.length * lineHeight + bubblePadding * 2);

    let bx = x - bubbleWidth - 14;
    let by = y + h * 0.15;

    if (bubblePos === 'right') {
      bx = x + w + 14;
      by = y + h * 0.15;
    } else if (bubblePos === 'top') {
      bx = x + w / 2 - bubbleWidth / 2;
      by = y - bubbleHeight - 16;
    } else if (bubblePos === 'top-left') {
      bx = x + w * 0.15 - bubbleWidth;
      by = y - bubbleHeight - 16;
    } else if (bubblePos === 'top-right') {
      bx = x + w * 0.85;
      by = y - bubbleHeight - 16;
    }

    // Draw bubble drop shadow & background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    drawRoundedRectPath(ctx, bx, by, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.fillStyle = bubbleBg;
    ctx.fill();
    ctx.restore();

    // Draw bubble outline border
    drawRoundedRectPath(ctx, bx, by, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.strokeStyle = bubbleBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw speech pointer tail pointing toward assistant
    if (bubblePos === 'left') {
      const tailY = by + 24;
      ctx.beginPath();
      ctx.moveTo(bx + bubbleWidth, tailY - 8);
      ctx.lineTo(bx + bubbleWidth + 12, tailY);
      ctx.lineTo(bx + bubbleWidth, tailY + 8);
      ctx.closePath();
      ctx.fillStyle = bubbleBg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + bubbleWidth, tailY - 8);
      ctx.lineTo(bx + bubbleWidth + 12, tailY);
      ctx.lineTo(bx + bubbleWidth, tailY + 8);
      ctx.strokeStyle = bubbleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (bubblePos === 'right') {
      const tailY = by + 24;
      ctx.beginPath();
      ctx.moveTo(bx, tailY - 8);
      ctx.lineTo(bx - 12, tailY);
      ctx.lineTo(bx, tailY + 8);
      ctx.closePath();
      ctx.fillStyle = bubbleBg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx, tailY - 8);
      ctx.lineTo(bx - 12, tailY);
      ctx.lineTo(bx, tailY + 8);
      ctx.strokeStyle = bubbleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const tailX = bubblePos === 'top' 
        ? bx + bubbleWidth / 2 
        : bubblePos === 'top-left' 
        ? bx + bubbleWidth * 0.7 
        : bx + bubbleWidth * 0.25;
      ctx.beginPath();
      ctx.moveTo(tailX - 8, by + bubbleHeight);
      ctx.lineTo(tailX, by + bubbleHeight + 12);
      ctx.lineTo(tailX + 8, by + bubbleHeight);
      ctx.closePath();
      ctx.fillStyle = bubbleBg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tailX - 8, by + bubbleHeight);
      ctx.lineTo(tailX, by + bubbleHeight + 12);
      ctx.lineTo(tailX + 8, by + bubbleHeight);
      ctx.strokeStyle = bubbleBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Render dialogue text
    ctx.fillStyle = bubbleText;
    ctx.font = `${bubbleFontSize}px Tahoma, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + bubblePadding, by + bubblePadding + i * lineHeight);
    }
  }

  ctx.globalAlpha = prevAlpha;
}

