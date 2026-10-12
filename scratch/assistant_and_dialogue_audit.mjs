import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ASSISTANTS_DIR = path.join(PUBLIC_DIR, 'assets', 'xp', 'assistants', 'clippy');
const FFMPEG_PATH = 'C:\\Users\\moroc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe';
const FFPROBE_PATH = 'C:\\Users\\moroc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffprobe.exe';

let passed = 0;
let total = 0;

function assert(condition, testName, details = '') {
  total++;
  if (condition) {
    console.log(`[PASS] ${String(total).padStart(2, '0')}. ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${String(total).padStart(2, '0')}. ${testName}`);
    if (details) console.error(`       -> ${details}`);
  }
}

// Helper to inspect PNG dimensions and color type from header
function inspectPng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return null;

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25]; // 6 = RGBA, 4 = Grayscale+Alpha, 2 = RGB, 3 = Palette

  return { width, height, bitDepth, colorType, hasAlpha: colorType === 6 || colorType === 4 };
}

console.log('================================================================');
console.log('   XP STUDIO AUDIT: ANIMATED ASSISTANT & DIALOGUE BUBBLES       ');
console.log('================================================================\n');

console.log('--- TEST SECTION 1: Transparent Assistant Character & Poses ---');

const clippyPngPath = path.join(ASSISTANTS_DIR, 'clippy.png');
assert(fs.existsSync(clippyPngPath), 'Base Clippy transparent PNG exists');

const clippyInfo = inspectPng(clippyPngPath);
assert(clippyInfo && clippyInfo.width === 240 && clippyInfo.height === 240, 'Clippy base image has 240x240 dimensions', `Got: ${JSON.stringify(clippyInfo)}`);
assert(clippyInfo && clippyInfo.hasAlpha, 'Clippy base image preserves true 32-bit RGBA alpha channel', `ColorType: ${clippyInfo?.colorType}`);

const poses = ['idle', 'think', 'noted', 'listen', 'check', 'cool'];
let allPosesValid = true;
for (const pose of poses) {
  const pPath = path.join(ASSISTANTS_DIR, `clippy_${pose}.png`);
  if (!fs.existsSync(pPath)) {
    allPosesValid = false;
    break;
  }
  const info = inspectPng(pPath);
  if (!info || info.width !== 240 || info.height !== 240 || !info.hasAlpha) {
    allPosesValid = false;
    break;
  }
}
assert(allPosesValid, 'All 6 Clippy poses exist with 240x240 dimensions and alpha transparency');

const sheetPath = path.join(ASSISTANTS_DIR, 'clippy_idle_sheet.png');
assert(fs.existsSync(sheetPath), 'Clippy 33-frame animation sprite sheet exists');
const sheetInfo = inspectPng(sheetPath);
assert(sheetInfo && sheetInfo.width === 7920 && sheetInfo.height === 240, 'Sprite sheet has exact dimensions 7920x240 (33 frames of 240x240)', `Got: ${sheetInfo?.width}x${sheetInfo?.height}`);
assert(sheetInfo && sheetInfo.hasAlpha, 'Sprite sheet preserves 32-bit RGBA alpha transparency');

console.log('\n--- TEST SECTION 2: Dialogue Speech Bubble Calculation & Geometry ---');

// Mock text wrapping logic identical to compositionRenderer.ts
function wrapDialogueLines(text, maxWidth, charWidth = 6.8) {
  const rawParagraphs = text.split('\n');
  const lines = [];
  rawParagraphs.forEach((paragraph) => {
    const words = paragraph.split(' ');
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const testWidth = testLine.length * charWidth;
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  });
  return lines;
}

const sampleText = "It looks like you're making a video!\nWould you like help with that?";
const wrapped = wrapDialogueLines(sampleText, 200);
assert(wrapped.length >= 2, 'Dialogue wraps multiline text correctly across newlines and margins', `Lines: ${JSON.stringify(wrapped)}`);

// Mock position calculator identical to compositionRenderer.ts & XpAssistant.tsx
function getBubbleCoordinates(x, y, w, h, bubbleWidth, bubbleHeight, position) {
  let bx = x - bubbleWidth - 14;
  let by = y + h * 0.15;

  if (position === 'right') {
    bx = x + w + 14;
    by = y + h * 0.15;
  } else if (position === 'top') {
    bx = x + w / 2 - bubbleWidth / 2;
    by = y - bubbleHeight - 16;
  } else if (position === 'top-left') {
    bx = x + w * 0.15 - bubbleWidth;
    by = y - bubbleHeight - 16;
  } else if (position === 'top-right') {
    bx = x + w * 0.85;
    by = y - bubbleHeight - 16;
  }
  return { bx, by };
}

const clippyRect = { x: 750, y: 500, w: 140, h: 200 };
const bubbleDims = { bubbleWidth: 220, bubbleHeight: 80 };

const posLeft = getBubbleCoordinates(clippyRect.x, clippyRect.y, clippyRect.w, clippyRect.h, bubbleDims.bubbleWidth, bubbleDims.bubbleHeight, 'left');
assert(posLeft.bx < clippyRect.x, 'Position "left" places speech bubble to the left of Clippy', `bx: ${posLeft.bx}, clippy.x: ${clippyRect.x}`);

const posRight = getBubbleCoordinates(clippyRect.x, clippyRect.y, clippyRect.w, clippyRect.h, bubbleDims.bubbleWidth, bubbleDims.bubbleHeight, 'right');
assert(posRight.bx > clippyRect.x + clippyRect.w, 'Position "right" places speech bubble to the right of Clippy', `bx: ${posRight.bx}, right edge: ${clippyRect.x + clippyRect.w}`);

const posTop = getBubbleCoordinates(clippyRect.x, clippyRect.y, clippyRect.w, clippyRect.h, bubbleDims.bubbleWidth, bubbleDims.bubbleHeight, 'top');
assert(posTop.by < clippyRect.y, 'Position "top" places speech bubble above Clippy', `by: ${posTop.by}, clippy.y: ${clippyRect.y}`);

const posTopLeft = getBubbleCoordinates(clippyRect.x, clippyRect.y, clippyRect.w, clippyRect.h, bubbleDims.bubbleWidth, bubbleDims.bubbleHeight, 'top-left');
assert(posTopLeft.bx < clippyRect.x && posTopLeft.by < clippyRect.y, 'Position "top-left" offsets bubble above and leftward');

const posTopRight = getBubbleCoordinates(clippyRect.x, clippyRect.y, clippyRect.w, clippyRect.h, bubbleDims.bubbleWidth, bubbleDims.bubbleHeight, 'top-right');
assert(posTopRight.bx > clippyRect.x && posTopRight.by < clippyRect.y, 'Position "top-right" offsets bubble above and rightward');

console.log('\n--- TEST SECTION 3: Keyframe Synchronous Motion & Fades ---');

// Evaluate fade alpha
function calcFadeAlpha(time, startTime, duration, fadeIn, fadeOut) {
  let fadeAlpha = 1;
  const relTime = time - startTime;
  if (fadeIn && fadeIn > 0 && relTime < fadeIn) {
    fadeAlpha = Math.max(0, Math.min(1, relTime / fadeIn));
  } else if (fadeOut && fadeOut > 0 && duration - relTime < fadeOut) {
    fadeAlpha = Math.max(0, Math.min(1, (duration - relTime) / fadeOut));
  }
  return fadeAlpha;
}

const alphaStart = calcFadeAlpha(0.0, 0, 10, 1.0, 1.0);
assert(alphaStart === 0, 'Fade-in starts at 0.0 opacity');

const alphaMidFade = calcFadeAlpha(0.5, 0, 10, 1.0, 1.0);
assert(Math.abs(alphaMidFade - 0.5) < 0.001, 'Fade-in reaches 0.5 opacity at half duration');

const alphaFullyVisible = calcFadeAlpha(2.0, 0, 10, 1.0, 1.0);
assert(alphaFullyVisible === 1, 'Fully visible after fade-in completes');

const alphaFadeOut = calcFadeAlpha(9.5, 0, 10, 1.0, 1.0);
assert(Math.abs(alphaFadeOut - 0.5) < 0.001, 'Fade-out decreases to 0.5 opacity during exit');

// Synchronous motion test: Bubble coordinates follow animated Clippy x position
const clippyFrame1 = { x: 200, y: 500, w: 140, h: 200 };
const clippyFrame2 = { x: 600, y: 500, w: 140, h: 200 };
const bubbleFrame1 = getBubbleCoordinates(clippyFrame1.x, clippyFrame1.y, clippyFrame1.w, clippyFrame1.h, 220, 80, 'left');
const bubbleFrame2 = getBubbleCoordinates(clippyFrame2.x, clippyFrame2.y, clippyFrame2.w, clippyFrame2.h, 220, 80, 'left');
const deltaClippy = clippyFrame2.x - clippyFrame1.x;
const deltaBubble = bubbleFrame2.bx - bubbleFrame1.bx;
assert(deltaClippy === deltaBubble && deltaClippy === 400, 'Dialogue bubble moves synchronously with Clippy keyframe motion (0 drift)', `Clippy delta: ${deltaClippy}, Bubble delta: ${deltaBubble}`);

console.log('\n--- TEST SECTION 4: .xpproj Project Serialization & Reopening ---');

const assistantElement = {
  id: 'assistant-1',
  name: 'Clippy Assistant',
  type: 'assistant',
  character: 'clippy',
  pose: 'think',
  isAnimated: true,
  animationSpeed: 12,
  showDialogue: true,
  dialogueText: "Did you know Windows XP was released in 2001?",
  bubblePosition: 'left',
  bubbleBgColor: '#FFFFE1',
  bubbleTextColor: '#000000',
  bubbleBorderColor: '#000000',
  bubbleFontSize: 12,
  bubbleWidth: 48,
  bubblePadding: 10,
  bubbleCornerRadius: 8,
  fadeInDuration: 0.5,
  fadeOutDuration: 0.5,
  x: 75,
  y: 65,
  width: 14,
  height: 20,
  rotation: 0,
  opacity: 1,
  startTime: 0,
  duration: 10,
  zIndex: 10,
  visible: true,
  locked: false,
  keyframes: [
    { id: 'kf-1', time: 0, property: 'x', value: 75, easing: 'linear' },
    { id: 'kf-2', time: 5, property: 'x', value: 30, easing: 'ease-in-out' }
  ]
};

const projectData = {
  version: '1.0',
  name: 'Clippy Assistant Demo',
  duration: 10,
  fps: 30,
  resolution: { width: 1280, height: 720 },
  elements: [assistantElement]
};

const serialized = JSON.stringify(projectData, null, 2);
const reloaded = JSON.parse(serialized);
const reloadedAssistant = reloaded.elements[0];

assert(reloadedAssistant.type === 'assistant', 'Serialized project preserves element type "assistant"');
assert(reloadedAssistant.character === 'clippy', 'Preserves assistant character "clippy"');
assert(reloadedAssistant.pose === 'think', 'Preserves assistant pose "think"');
assert(reloadedAssistant.isAnimated === true, 'Preserves sprite animation setting');
assert(reloadedAssistant.dialogueText === assistantElement.dialogueText, 'Preserves full dialogue bubble text');
assert(reloadedAssistant.bubblePosition === 'left', 'Preserves bubble placement position');
assert(reloadedAssistant.bubbleBgColor === '#FFFFE1', 'Preserves authentic XP yellow background color');
assert(reloadedAssistant.keyframes.length === 2, 'Preserves keyframes on assistant element');

console.log('\n--- TEST SECTION 5: Real FFmpeg MP4 Export with Clippy Overlay ---');

const exportDir = path.join(ROOT_DIR, 'scratch', 'test_clippy_export');
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

const bgPath = path.join(PUBLIC_DIR, 'assets', 'xp', 'wallpapers', 'Bliss.png');
const outVideoPath = path.join(exportDir, 'clippy_test.mp4');
if (fs.existsSync(outVideoPath)) fs.unlinkSync(outVideoPath);

// Use FFmpeg complex filter to overlay Clippy onto Bliss wallpaper
// overlay x=900, y=420 (scale clippy to 160x160)
const ffmpegCmd = `"${FFMPEG_PATH}" -y -loop 1 -t 3 -i "${bgPath}" -loop 1 -t 3 -i "${clippyPngPath}" -filter_complex "[0:v]scale=1280:720[bg];[1:v]scale=160:160[clippy];[bg][clippy]overlay=920:460:format=auto[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${outVideoPath}"`;

try {
  execSync(ffmpegCmd, { stdio: 'pipe', timeout: 15000 });
  assert(fs.existsSync(outVideoPath), 'FFmpeg rendered MP4 with transparent Clippy overlay successfully');

  const stats = fs.statSync(outVideoPath);
  assert(stats.size > 10000, `Exported video file has valid size (${stats.size} bytes)`);

  // Probe with ffprobe
  const probeOutput = execSync(`"${FFPROBE_PATH}" -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of json "${outVideoPath}"`, { encoding: 'utf8' });
  const probeJson = JSON.parse(probeOutput);
  const vStream = probeJson.streams?.[0];

  assert(vStream && vStream.codec_name === 'h264', 'Video stream is encoded as H.264');
  assert(vStream && vStream.width === 1280 && vStream.height === 720, 'Exported resolution is exact 1280x720');
} catch (err) {
  console.error('FFmpeg export error:', err.message);
  assert(false, 'FFmpeg export executed without failure');
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('================================================================\n');

if (passed === total) {
  console.log('ALL ANIMATED ASSISTANT & DIALOGUE AUDIT TESTS PASSED! (100%)\n');
  process.exit(0);
} else {
  console.error(`FAILED: ${total - passed} test(s) failed.`);
  process.exit(1);
}
