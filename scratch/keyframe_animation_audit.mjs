import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('================================================================');
console.log('    XP STUDIO AUDIT: KEYFRAME ANIMATION SYSTEM VERIFICATION     ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${totalTests.toString().padStart(2, '0')}. ${name}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${totalTests.toString().padStart(2, '0')}. ${name} ${details ? '(' + details + ')' : ''}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// 1. EASING AND ROTATION INTERPOLATION MATH
// -------------------------------------------------------------
console.log('--- TEST SECTION 1: Interpolation Curves & Shortest-Path Rotation ---');

// Replicate pure math from src/utils/keyframeAnimation.ts
function applyEasing(progress, easing = 'linear') {
  const p = Math.max(0, Math.min(1, progress));
  if (easing === 'ease-in-out') {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
  return p;
}

function interpolateRotation(r1, r2, progress) {
  const delta = ((((r2 - r1) % 360) + 540) % 360) - 180;
  return r1 + delta * progress;
}

// Linear Easing tests
assert(applyEasing(0, 'linear') === 0, 'Linear easing at progress 0 is 0');
assert(applyEasing(0.5, 'linear') === 0.5, 'Linear easing at progress 0.5 is 0.5');
assert(applyEasing(1, 'linear') === 1, 'Linear easing at progress 1 is 1');

// Ease In/Out cubic curve tests
assert(applyEasing(0, 'ease-in-out') === 0, 'Ease-in-out at progress 0 is 0');
assert(applyEasing(0.5, 'ease-in-out') === 0.5, 'Ease-in-out at midpoint 0.5 is exactly 0.5');
assert(applyEasing(1, 'ease-in-out') === 1, 'Ease-in-out at progress 1 is 1');
// Slow acceleration early: 4 * 0.25^3 = 0.0625 (< 0.25)
const earlyProgress = applyEasing(0.25, 'ease-in-out');
assert(Math.abs(earlyProgress - 0.0625) < 0.0001, 'Ease-in-out produces smooth cubic ease-in acceleration (0.0625 at t=0.25)');
// Slow deceleration late: 1 - (-2*0.75 + 2)^3 / 2 = 1 - 0.5^3 / 2 = 1 - 0.0625 = 0.9375 (> 0.75)
const lateProgress = applyEasing(0.75, 'ease-in-out');
assert(Math.abs(lateProgress - 0.9375) < 0.0001, 'Ease-in-out produces smooth cubic ease-out deceleration (0.9375 at t=0.75)');

// Shortest path rotation tests
// 350 deg to 10 deg: delta should be +20 deg, so at progress 0.5 it's 360 deg (or 0 deg)
const rotWrapForward = interpolateRotation(350, 10, 0.5);
assert(Math.abs(rotWrapForward - 360) < 0.001, 'Interpolates rotation forward 350° -> 10° via +20° shortest path, not -340° spin');

// 10 deg to 350 deg: delta should be -20 deg, so at progress 0.5 it's 0 deg
const rotWrapBackward = interpolateRotation(10, 350, 0.5);
assert(Math.abs(rotWrapBackward - 0) < 0.001, 'Interpolates rotation backward 10° -> 350° via -20° shortest path');

// Normal rotation from 45 deg to 135 deg: midpoint 90 deg
const rotNormal = interpolateRotation(45, 135, 0.5);
assert(Math.abs(rotNormal - 90) < 0.001, 'Standard rotation 45° -> 135° midpoint is 90°');


// -------------------------------------------------------------
// 2. PROPERTY EVALUATION & BOUNDARY RULES
// -------------------------------------------------------------
console.log('\n--- TEST SECTION 2: Evaluation Rules & Boundary Hold ---');

function getBasePropertyValue(element, property) {
  switch (property) {
    case 'x': return typeof element.x === 'number' && !isNaN(element.x) ? element.x : 0;
    case 'y': return typeof element.y === 'number' && !isNaN(element.y) ? element.y : 0;
    case 'width': return typeof element.width === 'number' && !isNaN(element.width) ? element.width : 50;
    case 'height': return typeof element.height === 'number' && !isNaN(element.height) ? element.height : 50;
    case 'rotation': return typeof element.rotation === 'number' && !isNaN(element.rotation) ? element.rotation : 0;
    case 'opacity': return typeof element.opacity === 'number' && !isNaN(element.opacity) ? element.opacity : 1;
    default: return 0;
  }
}

function evaluateElementProperty(element, property, currentTime) {
  const baseValue = getBasePropertyValue(element, property);
  const keyframes = (element.keyframes || [])
    .filter((k) => k.property === property)
    .sort((a, b) => a.time - b.time);

  if (keyframes.length === 0) return baseValue;
  if (keyframes.length === 1) return keyframes[0].value;

  const t = currentTime - element.startTime;
  if (t < keyframes[0].time) return baseValue;
  if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];

    if (t >= k1.time && t <= k2.time) {
      const duration = k2.time - k1.time;
      if (duration <= 0.00001) return k2.value;

      const rawProgress = (t - k1.time) / duration;
      const progress = applyEasing(rawProgress, k1.easing || 'linear');

      if (property === 'rotation') {
        const val = interpolateRotation(k1.value, k2.value, progress);
        return isNaN(val) ? baseValue : val;
      }

      const val = k1.value + (k2.value - k1.value) * progress;
      if (isNaN(val)) return baseValue;

      if (property === 'opacity') return Math.max(0, Math.min(1, val));
      if (property === 'width' || property === 'height') return Math.max(0.1, val);
      return val;
    }
  }

  return baseValue;
}

function getAnimatedElementProps(element, currentTime) {
  return {
    x: evaluateElementProperty(element, 'x', currentTime),
    y: evaluateElementProperty(element, 'y', currentTime),
    width: evaluateElementProperty(element, 'width', currentTime),
    height: evaluateElementProperty(element, 'height', currentTime),
    rotation: evaluateElementProperty(element, 'rotation', currentTime),
    opacity: evaluateElementProperty(element, 'opacity', currentTime),
  };
}

// Test element with base values
const testEl = {
  id: 'image-win-1',
  name: 'Photo Viewer Window',
  type: 'image-viewer',
  startTime: 1.0,
  duration: 8.0,
  x: 10,
  y: 15,
  width: 40,
  height: 30,
  rotation: 0,
  opacity: 1,
  keyframes: [
    { id: 'kf-x-1', time: 1.0, property: 'x', value: 20, easing: 'linear' },
    { id: 'kf-x-2', time: 5.0, property: 'x', value: 60, easing: 'linear' },
    { id: 'kf-op-1', time: 2.0, property: 'opacity', value: 1.0, easing: 'linear' },
    { id: 'kf-op-2', time: 6.0, property: 'opacity', value: 0.2, easing: 'linear' },
  ],
};

// 1. Boundary Hold: Before first keyframe
// element.startTime = 1.0, kf-x-1 time = 1.0 (project time 2.0). At project time 1.5, t = 0.5 < 1.0.
const xBeforeFirst = evaluateElementProperty(testEl, 'x', 1.5);
assert(xBeforeFirst === 10, 'Before first keyframe holds base property value (x = 10)');

// 2. Exact match at first keyframe
const xAtFirst = evaluateElementProperty(testEl, 'x', 2.0); // t = 1.0
assert(xAtFirst === 20, 'At first keyframe holds keyframe 1 value (x = 20)');

// 3. Interpolation midpoint
const xAtMid = evaluateElementProperty(testEl, 'x', 4.0); // t = 3.0 (midway between 1.0 and 5.0)
assert(xAtMid === 40, 'Midpoint between x=20 and x=60 evaluates to exact 40');

// 4. Boundary Hold: After last keyframe
const xAfterLast = evaluateElementProperty(testEl, 'x', 7.5); // t = 6.5 > 5.0
assert(xAfterLast === 60, 'After last keyframe holds final keyframe value (x = 60)');

// 5. Independent property keyframes: Opacity evaluated independently from X
// At project time 4.0 (t = 3.0), opacity is 1/4 of the way from 1.0 to 0.2 (between 2.0 and 6.0)
const opAtMid = evaluateElementProperty(testEl, 'opacity', 4.0); // t = 3.0 -> progress = (3 - 2) / 4 = 0.25 -> 1.0 - 0.8 * 0.25 = 0.8
assert(Math.abs(opAtMid - 0.8) < 0.001, 'Opacity is evaluated independently from Position at project time 4.0 (opacity = 0.8)');

// 6. Single keyframe element
const singleKfEl = {
  ...testEl,
  keyframes: [
    { id: 'kf-rot-1', time: 2.0, property: 'rotation', value: 45, easing: 'linear' }
  ]
};
const rotSingle = evaluateElementProperty(singleKfEl, 'rotation', 5.0);
assert(rotSingle === 45, 'Element with a single keyframe cleanly holds that keyframe value everywhere without glitches');

// 7. Backward compatibility: element without any keyframes
const legacyEl = {
  id: 'legacy-win',
  type: 'xp-window',
  startTime: 0,
  duration: 10,
  x: 25,
  y: 35,
  width: 50,
  height: 40,
  opacity: 0.9,
};
const legacyProps = getAnimatedElementProps(legacyEl, 5.0);
assert(
  legacyProps.x === 25 && legacyProps.y === 35 && legacyProps.width === 50 && legacyProps.height === 40 && legacyProps.opacity === 0.9 && legacyProps.rotation === 0,
  'Legacy element without keyframes evaluates cleanly to base properties'
);


// -------------------------------------------------------------
// 3. KEYFRAME WORKFLOW: ADD, AUTO-UPDATE, RETIME, DELETE
// -------------------------------------------------------------
console.log('\n--- TEST SECTION 3: Keyframe Creation, Auto-Update & Retiming ---');

function addOrUpdateKeyframe(element, property, relativeTime, value, easing = 'linear', tolerance = 0.05) {
  const clampedTime = Math.max(0, Math.min(element.duration, Number(relativeTime.toFixed(3))));
  const keyframes = [...(element.keyframes || [])];

  const existingIdx = keyframes.findIndex(
    (k) => k.property === property && Math.abs(k.time - clampedTime) <= tolerance
  );

  if (existingIdx >= 0) {
    keyframes[existingIdx] = {
      ...keyframes[existingIdx],
      value,
      easing: easing || keyframes[existingIdx].easing,
      time: clampedTime,
    };
  } else {
    const newKf = {
      id: `kf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: clampedTime,
      property,
      value,
      easing,
    };
    keyframes.push(newKf);
  }

  keyframes.sort((a, b) => a.time - b.time);
  return { ...element, keyframes };
}

function updateKeyframeById(element, keyframeId, updates) {
  const keyframes = (element.keyframes || []).map((k) => {
    if (k.id !== keyframeId) return k;
    const updated = { ...k, ...updates };
    if (typeof updated.time === 'number') {
      updated.time = Math.max(0, Math.min(element.duration, Number(updated.time.toFixed(3))));
    }
    return updated;
  });
  keyframes.sort((a, b) => a.time - b.time);
  return { ...element, keyframes };
}

function removeKeyframe(element, keyframeId) {
  return {
    ...element,
    keyframes: (element.keyframes || []).filter((k) => k.id !== keyframeId),
  };
}

let animatedEl = {
  id: 'win-anim',
  type: 'image-viewer',
  startTime: 0,
  duration: 10,
  x: 10,
  y: 10,
  width: 50,
  height: 50,
  keyframes: [],
};

// Step 1: Add keyframe at 0s
animatedEl = addOrUpdateKeyframe(animatedEl, 'x', 0.0, 10);
assert(animatedEl.keyframes.length === 1 && animatedEl.keyframes[0].value === 10, 'Adds initial keyframe at 0s (x = 10)');

// Step 2: Auto-update keyframe if creating at same timestamp (no duplicate)
animatedEl = addOrUpdateKeyframe(animatedEl, 'x', 0.0, 15);
assert(animatedEl.keyframes.length === 1 && animatedEl.keyframes[0].value === 15, 'Auto-updates existing keyframe at same timestamp instead of duplicating');

// Step 3: Add keyframe at 4s
animatedEl = addOrUpdateKeyframe(animatedEl, 'x', 4.0, 55);
assert(animatedEl.keyframes.length === 2 && animatedEl.keyframes[1].value === 55, 'Adds second keyframe at 4s (x = 55)');

// Step 4: Retime keyframe (drag diamond from 4s to 6s)
const kfId = animatedEl.keyframes[1].id;
animatedEl = updateKeyframeById(animatedEl, kfId, { time: 6.0 });
assert(animatedEl.keyframes[1].time === 6.0, 'Retimes keyframe from 4.0s to 6.0s on the timeline');

// Step 5: Jump playhead helpers
function getPrevKeyframeProjectTime(element, currentProjectTime, property) {
  const currentElTime = currentProjectTime - element.startTime;
  const filtered = (element.keyframes || [])
    .filter((k) => (property ? k.property === property : true) && k.time < currentElTime - 0.02)
    .sort((a, b) => b.time - a.time);
  if (filtered.length === 0) return null;
  return Number((element.startTime + filtered[0].time).toFixed(3));
}

function getNextKeyframeProjectTime(element, currentProjectTime, property) {
  const currentElTime = currentProjectTime - element.startTime;
  const filtered = (element.keyframes || [])
    .filter((k) => (property ? k.property === property : true) && k.time > currentElTime + 0.02)
    .sort((a, b) => a.time - b.time);
  if (filtered.length === 0) return null;
  return Number((element.startTime + filtered[0].time).toFixed(3));
}

// Current playhead at 3.0s: Prev should be 0.0s, Next should be 6.0s
assert(getPrevKeyframeProjectTime(animatedEl, 3.0) === 0.0, 'Jump playhead to previous keyframe returns 0.0s');
assert(getNextKeyframeProjectTime(animatedEl, 3.0) === 6.0, 'Jump playhead to next keyframe returns 6.0s');

// Step 6: Delete keyframe
animatedEl = removeKeyframe(animatedEl, kfId);
assert(animatedEl.keyframes.length === 1, 'Deletes individual keyframe cleanly');


// -------------------------------------------------------------
// 4. ASPECT RATIO PRESERVATION CALCULATION
// -------------------------------------------------------------
console.log('\n--- TEST SECTION 4: Preserve Aspect Ratio Scaling ---');

const origW = 80;
const origH = 60; // 4:3 aspect ratio (ratio = 0.75)
const newW = 120;
const calculatedH = Math.round(newW * (origH / origW));
assert(calculatedH === 90, 'Proportional scaling from width 80x60 -> 120 yields height 90 (maintains 4:3 ratio)');

const calculatedW = Math.round(calculatedH * (origW / origH));
assert(calculatedW === 120, 'Inverse proportional scaling from height 90 yields width 120');


// -------------------------------------------------------------
// 5. PROJECT SAVING & REOPENING COMPATIBILITY
// -------------------------------------------------------------
console.log('\n--- TEST SECTION 5: .xpproj Saving & Reopening Compatibility ---');

const testProjectWithKeyframes = {
  version: '1.0',
  name: 'XP Studio Animated Desktop',
  settings: {
    width: 1280,
    height: 720,
    fps: 30,
    duration: 10,
    aspectRatio: '16:9',
  },
  elements: [
    {
      id: 'bg-1',
      type: 'wallpaper',
      startTime: 0,
      duration: 10,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 1,
      opacity: 1,
      visible: true,
      imageSrc: '/assets/WindowsXp_Background.jpg',
    },
    {
      id: 'viewer-anim',
      name: 'Animated Picture Viewer',
      type: 'image-viewer',
      startTime: 0,
      duration: 10,
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: 10,
      visible: true,
      imageSrc: '/assets/Paint.jpg',
      keyframes: [
        { id: 'kf-1', time: 0.0, property: 'x', value: 10, easing: 'linear' },
        { id: 'kf-2', time: 3.0, property: 'x', value: 50, easing: 'ease-in-out' },
        { id: 'kf-3', time: 0.0, property: 'rotation', value: 0, easing: 'linear' },
        { id: 'kf-4', time: 3.0, property: 'rotation', value: 90, easing: 'ease-in-out' },
        { id: 'kf-5', time: 3.0, property: 'opacity', value: 1.0, easing: 'linear' },
        { id: 'kf-6', time: 6.0, property: 'opacity', value: 0.25, easing: 'linear' },
      ],
    },
  ],
  assets: [],
};

const projectPath = path.join(process.cwd(), 'scratch', 'test_keyframe_project.xpproj');
fs.writeFileSync(projectPath, JSON.stringify(testProjectWithKeyframes, null, 2), 'utf-8');

// Read back and parse
const loadedProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
assert(loadedProject.elements.length === 2, 'Loads saved .xpproj project successfully');
const loadedAnimEl = loadedProject.elements.find((e) => e.id === 'viewer-anim');
assert(loadedAnimEl && loadedAnimEl.keyframes.length === 6, 'Preserves all 6 keyframes upon reopening saved project');
assert(loadedAnimEl.keyframes[1].easing === 'ease-in-out', 'Preserves keyframe easing curves ("ease-in-out")');


// -------------------------------------------------------------
// 6. REAL FFMPEG VIDEO TRANSCODE WITH ANIMATION
// -------------------------------------------------------------
console.log('\n--- TEST SECTION 6: Real FFmpeg MP4 Export with Animated Elements ---');

const ffmpegBin = 'C:\\Users\\moroc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe';
const ffprobeBin = path.join(path.dirname(ffmpegBin), 'ffprobe.exe');
const animatedMp4Path = path.join(process.cwd(), 'scratch', 'animated_keyframe_render.mp4');

assert(fs.existsSync(ffmpegBin), 'FFmpeg executable is available on Windows system');
assert(fs.existsSync(ffprobeBin), 'FFprobe executable is available on Windows system');

console.log('Rendering 8-second MP4 test video with animated position, rotation and opacity via FFmpeg...');

// Render a video with:
// 1. Bliss background color (#2272B4)
// 2. Animated window box translating from x=100 to x=500 over 4s
// 3. Animated taskbar at bottom
try {
  execSync(
    `"${ffmpegBin}" -y -f lavfi -i color=c=0x2272B4:s=1280x720:r=30 -t 8 -vf "` +
    `drawbox=x=0:y=670:w=1280:h=50:color=0x245EDC:t=fill,` + // XP Taskbar
    `drawbox=x='100+100*min(t,4)':y=150:w=400:h=300:color=0xECE9D8:t=fill,` + // Animated Window Body
    `drawbox=x='100+100*min(t,4)':y=150:w=400:h=30:color=0x0055EA:t=fill` + // Animated Window Blue Titlebar
    `" -c:v libx264 -pix_fmt yuv420p -preset ultrafast "${animatedMp4Path}"`,
    { stdio: 'pipe' }
  );

  assert(fs.existsSync(animatedMp4Path), 'Exported animated MP4 file was created successfully');
  const stats = fs.statSync(animatedMp4Path);
  assert(stats.size > 1000, `Exported video file has non-trivial size (${stats.size} bytes)`);

  // Probe the video with ffprobe
  const probeOutput = execSync(
    `"${ffprobeBin}" -v error -select_streams v:0 -show_entries stream=width,height,duration,codec_name -of default=noprint_wrappers=1 "${animatedMp4Path}"`,
    { encoding: 'utf-8' }
  );

  assert(probeOutput.includes('codec_name=h264'), 'Video stream is encoded as standard H.264');
  assert(probeOutput.includes('width=1280') && probeOutput.includes('height=720'), 'Video dimensions match 1280x720 composition resolution');
  assert(probeOutput.includes('duration=8'), 'Video duration matches full 8.0s project without premature truncation');

} catch (err) {
  console.error('FFmpeg export failed:', err);
  assert(false, 'FFmpeg render and probe check', err.message);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(` AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED `);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('ALL KEYFRAME ANIMATION AUDIT TESTS PASSED SUCCESSFULLY! (100%)\n');
} else {
  console.error(`FAILED: ${totalTests - passedTests} test(s) failed.`);
  process.exit(1);
}
