import assert from 'node:assert';
import {
  evaluateElementProperty,
  getAnimatedElementProps,
  addOrUpdateKeyframe,
  evaluateAssistantDialogue,
  addOrUpdateDialogueKeyframe,
  removeDialogueKeyframe,
  evaluateAudioVolume
} from '../src/utils/keyframeAnimation.ts';

console.log('--- Running Keyframe Boundary & Assistant Dialogue Test Suite ---');

// -----------------------------------------------------------------------------
// Test 1: First frame boundary test (verifying t=0 NEVER returns the last keyframe)
// -----------------------------------------------------------------------------
console.log('\n[Test 1] First frame boundary holding:');
const testEl1 = {
  id: 'el-1',
  name: 'Test Element',
  type: 'image-viewer',
  x: 500, // base x was mutated to the last keyframe's position
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
  startTime: 0,
  duration: 10,
  keyframes: [
    { id: 'k1', time: 2, property: 'x', value: 100, easing: 'linear' },
    { id: 'k2', time: 5, property: 'x', value: 500, easing: 'linear' },
  ]
};

const valAt0 = evaluateElementProperty(testEl1, 'x', 0);
console.log(`- Value at t=0s: ${valAt0} (Expected: 100, NOT 500)`);
assert.strictEqual(valAt0, 100, 't=0 must hold first keyframe value (100), not last keyframe or mutated base value');

const valAt1 = evaluateElementProperty(testEl1, 'x', 1);
console.log(`- Value at t=1s: ${valAt1} (Expected: 100)`);
assert.strictEqual(valAt1, 100, 't=1 must hold first keyframe value');

const valAt3_5 = evaluateElementProperty(testEl1, 'x', 3.5);
console.log(`- Value at t=3.5s: ${valAt3_5} (Expected: 300)`);
assert.strictEqual(valAt3_5, 300, 't=3.5 must linearly interpolate between 100 and 500');

const valAt5 = evaluateElementProperty(testEl1, 'x', 5);
console.log(`- Value at t=5s: ${valAt5} (Expected: 500)`);
assert.strictEqual(valAt5, 500, 't=5 must equal last keyframe value');

const valAt8 = evaluateElementProperty(testEl1, 'x', 8);
console.log(`- Value at t=8s: ${valAt8} (Expected: 500)`);
assert.strictEqual(valAt8, 500, 't=8 must hold last keyframe value');
console.log('✓ Test 1 Passed: First frame correctly holds first keyframe and never leaps to last keyframe.');

// -----------------------------------------------------------------------------
// Test 2: Auto-record initial keyframe at t=0 when first keyframe added at t > 0
// -----------------------------------------------------------------------------
console.log('\n[Test 2] Auto-initial keyframe creation when keyframing at t > 0:');
const freshEl = {
  id: 'el-fresh',
  name: 'Fresh Element',
  type: 'image-viewer',
  x: 25,
  y: 30,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
  startTime: 0,
  duration: 10,
  keyframes: []
};

// User moves playhead to 3s and moves element to x = 200
const updatedFreshEl = addOrUpdateKeyframe(freshEl, 'x', 3, 200);
console.log(`- Total keyframes on fresh element: ${updatedFreshEl.keyframes.length} (Expected: 2)`);
assert.strictEqual(updatedFreshEl.keyframes.length, 2, 'Should create 2 keyframes: initial at t=0 and target at t=3');

const kf0 = updatedFreshEl.keyframes.find(k => k.time === 0 && k.property === 'x');
const kf3 = updatedFreshEl.keyframes.find(k => k.time === 3 && k.property === 'x');
assert(kf0, 'Initial keyframe at t=0 must exist');
assert(kf3, 'Target keyframe at t=3 must exist');
console.log(`- Keyframe at t=0: value = ${kf0.value} (Expected: 25)`);
assert.strictEqual(kf0.value, 25, 'Keyframe at t=0 must capture initial base value 25');
console.log(`- Keyframe at t=3: value = ${kf3.value} (Expected: 200)`);
assert.strictEqual(kf3.value, 200, 'Keyframe at t=3 must have value 200');

// Evaluating across time
assert.strictEqual(evaluateElementProperty(updatedFreshEl, 'x', 0), 25, 'At t=0, value must be 25');
assert.strictEqual(evaluateElementProperty(updatedFreshEl, 'x', 1.5), 112.5, 'At t=1.5, value must be 112.5');
assert.strictEqual(evaluateElementProperty(updatedFreshEl, 'x', 3), 200, 'At t=3, value must be 200');
console.log('✓ Test 2 Passed: Starting animation from t=0 works seamlessly.');

// -----------------------------------------------------------------------------
// Test 3: Dialogue Keyframing System (Text, Status/Pose, Bubble Position, Visibility)
// -----------------------------------------------------------------------------
console.log('\n[Test 3] Assistant Dialogue Keyframing:');
let assistantEl = {
  id: 'asst-1',
  name: 'Clippy Assistant',
  type: 'assistant',
  character: 'clippy',
  pose: 'idle',
  showDialogue: true,
  dialogueText: 'Hi! I am Clippy, your Windows XP Assistant.',
  bubblePosition: 'left',
  startTime: 0,
  duration: 10,
  dialogueKeyframes: []
};

// Initial evaluation at t=0 without keyframes
let eval0 = evaluateAssistantDialogue(assistantEl, 0);
assert.strictEqual(eval0.dialogueText, 'Hi! I am Clippy, your Windows XP Assistant.');
assert.strictEqual(eval0.pose, 'idle');
assert.strictEqual(eval0.bubblePosition, 'left');
assert.strictEqual(eval0.showDialogue, true);

// User adds dialogue keyframe at 3s: thinking state
assistantEl = addOrUpdateDialogueKeyframe(assistantEl, 3, {
  dialogueText: 'Would you like some help editing this video?',
  pose: 'think',
  bubblePosition: 'top',
  showDialogue: true,
});

// User adds dialogue keyframe at 6s: noted state
assistantEl = addOrUpdateDialogueKeyframe(assistantEl, 6, {
  dialogueText: 'Great choice! Setting up keyframes now.',
  pose: 'noted',
  bubblePosition: 'right',
  showDialogue: true,
});

// User adds dialogue keyframe at 8s: hiding dialogue bubble
assistantEl = addOrUpdateDialogueKeyframe(assistantEl, 8, {
  dialogueText: '',
  pose: 'cool',
  bubblePosition: 'right',
  showDialogue: false,
});

console.log(`- Created ${assistantEl.dialogueKeyframes.length} dialogue keyframes (including auto t=0 start keyframe).`);
assert.strictEqual(assistantEl.dialogueKeyframes.length, 4, 'Expected 4 keyframes: auto t=0, t=3, t=6, t=8');

// Evaluating at t = 1.5s (before first transition)
const at1_5 = evaluateAssistantDialogue(assistantEl, 1.5);
console.log(`- At t=1.5s: "${at1_5.dialogueText}" | Pose: ${at1_5.pose} | Pos: ${at1_5.bubblePosition} | Visible: ${at1_5.showDialogue}`);
assert.strictEqual(at1_5.dialogueText, 'Hi! I am Clippy, your Windows XP Assistant.');
assert.strictEqual(at1_5.pose, 'idle');
assert.strictEqual(at1_5.bubblePosition, 'left');
assert.strictEqual(at1_5.showDialogue, true);

// Evaluating at t = 3.5s (after first transition)
const at3_5 = evaluateAssistantDialogue(assistantEl, 3.5);
console.log(`- At t=3.5s: "${at3_5.dialogueText}" | Pose: ${at3_5.pose} | Pos: ${at3_5.bubblePosition} | Visible: ${at3_5.showDialogue}`);
assert.strictEqual(at3_5.dialogueText, 'Would you like some help editing this video?');
assert.strictEqual(at3_5.pose, 'think');
assert.strictEqual(at3_5.bubblePosition, 'top');
assert.strictEqual(at3_5.showDialogue, true);
assert.strictEqual(at3_5.activeKeyframeTime, 3);

// Evaluating at t = 6.2s (after second transition)
const at6_2 = evaluateAssistantDialogue(assistantEl, 6.2);
console.log(`- At t=6.2s: "${at6_2.dialogueText}" | Pose: ${at6_2.pose} | Pos: ${at6_2.bubblePosition} | Visible: ${at6_2.showDialogue}`);
assert.strictEqual(at6_2.dialogueText, 'Great choice! Setting up keyframes now.');
assert.strictEqual(at6_2.pose, 'noted');
assert.strictEqual(at6_2.bubblePosition, 'right');
assert.strictEqual(at6_2.showDialogue, true);
assert.strictEqual(at6_2.activeKeyframeTime, 6);

// Evaluating at t = 8.5s (bubble hidden, pose cool)
const at8_5 = evaluateAssistantDialogue(assistantEl, 8.5);
console.log(`- At t=8.5s: Pose: ${at8_5.pose} | Visible: ${at8_5.showDialogue}`);
assert.strictEqual(at8_5.pose, 'cool');
assert.strictEqual(at8_5.showDialogue, false);
console.log('✓ Test 3 Passed: Dialogue text, status/pose, bubble position, and visibility transition accurately.');

// -----------------------------------------------------------------------------
// Test 4: Removing Dialogue Keyframe
// -----------------------------------------------------------------------------
console.log('\n[Test 4] Removing Dialogue Keyframe:');
const kfToRemove = assistantEl.dialogueKeyframes.find(k => k.time === 6);
assert(kfToRemove, 'Keyframe at t=6 must exist');
assistantEl = removeDialogueKeyframe(assistantEl, kfToRemove.id);
assert.strictEqual(assistantEl.dialogueKeyframes.length, 3, 'Should have 3 dialogue keyframes left');

const at6_5AfterRemoval = evaluateAssistantDialogue(assistantEl, 6.5);
console.log(`- At t=6.5s after removing t=6 keyframe: "${at6_5AfterRemoval.dialogueText}" | Pose: ${at6_5AfterRemoval.pose}`);
assert.strictEqual(at6_5AfterRemoval.dialogueText, 'Would you like some help editing this video?');
assert.strictEqual(at6_5AfterRemoval.pose, 'think');
console.log('✓ Test 4 Passed: Deleting dialogue keyframe updates timeline state cleanly.');

// -----------------------------------------------------------------------------
// Test 5: Typewriter Animation Chunk Progress Per Keyframe
// -----------------------------------------------------------------------------
console.log('\n[Test 5] Typewriter animation chunk progress per keyframe:');
const testAssistantWithTw = {
  id: 'asst-tw',
  name: 'Clippy Assistant',
  type: 'assistant',
  character: 'clippy',
  pose: 'idle',
  showDialogue: true,
  dialogueText: 'Hello world',
  bubblePosition: 'left',
  typewriterEffect: true,
  typewriterSpeed: 20, // 20 chars per second
  startTime: 0,
  duration: 10,
  dialogueKeyframes: [
    {
      id: 'dk-1',
      time: 0,
      dialogueText: 'Hello world',
      pose: 'idle',
      bubblePosition: 'left',
      showDialogue: true,
    },
    {
      id: 'dk-2',
      time: 4,
      dialogueText: 'Welcome to Windows XP!',
      pose: 'think',
      bubblePosition: 'top',
      showDialogue: true,
    }
  ]
};

// At t = 0.25s (chunk time = 0.25s), chars typed = Math.floor(0.25 * 20) = 5 -> "Hello"
const evalAt0_25 = evaluateAssistantDialogue(testAssistantWithTw, 0.25);
const chunkTime0_25 = 0.25 - evalAt0_25.activeKeyframeTime;
const chars0_25 = Math.min(evalAt0_25.dialogueText.length, Math.floor(chunkTime0_25 * testAssistantWithTw.typewriterSpeed));
const text0_25 = evalAt0_25.dialogueText.slice(0, chars0_25);
console.log(`- At t=0.25s: chunkTime = ${chunkTime0_25}s, typed = "${text0_25}" (Expected: "Hello")`);
assert.strictEqual(text0_25, 'Hello');

// At t = 4.35s (chunk time = 0.35s relative to keyframe at t=4), chars typed = Math.floor(0.35 * 20 + 0.0001) = 7 -> "Welcome"
const evalAt4_35 = evaluateAssistantDialogue(testAssistantWithTw, 4.35);
const chunkTime4_35 = 4.35 - evalAt4_35.activeKeyframeTime;
const chars4_35 = Math.min(evalAt4_35.dialogueText.length, Math.floor(chunkTime4_35 * testAssistantWithTw.typewriterSpeed + 0.0001));
const text4_35 = evalAt4_35.dialogueText.slice(0, chars4_35);
console.log(`- At t=4.35s: chunkTime = ${chunkTime4_35.toFixed(2)}s, typed = "${text4_35}" (Expected: "Welcome")`);
assert.strictEqual(text4_35, 'Welcome');
console.log('✓ Test 5 Passed: Typewriter animation smoothly resets per dialogue keyframe chunk.');

// -----------------------------------------------------------------------------
// Test 6: Audio Volume Keyframing and Fade In/Out Curves
// -----------------------------------------------------------------------------
console.log('\n[Test 6] Audio volume keyframing and fade curves:');
const audioEl = {
  id: 'aud-1',
  name: 'Background Music',
  type: 'audio',
  audioSrc: '/assets/music.mp3',
  volume: 1,
  fadeInDuration: 2, // 2s fade in
  fadeOutDuration: 2, // 2s fade out
  startTime: 0,
  duration: 10,
  keyframes: [
    { id: 'ak-1', time: 0, property: 'volume', value: 1, easing: 'linear' },
    { id: 'ak-2', time: 5, property: 'volume', value: 0.5, easing: 'linear' },
    { id: 'ak-3', time: 10, property: 'volume', value: 0.5, easing: 'linear' },
  ]
};

// At t=0s: volume must be 0 (due to fade-in start)
const vol0 = evaluateAudioVolume(audioEl, 0);
console.log(`- Audio volume at t=0s: ${vol0.toFixed(2)} (Expected: 0.00)`);
assert.strictEqual(vol0, 0);

// At t=1s: volume must be 0.45 (0.90 interpolated volume * 0.50 fade in multiplier)
const vol1 = evaluateAudioVolume(audioEl, 1);
console.log(`- Audio volume at t=1s: ${vol1.toFixed(2)} (Expected: 0.45)`);
assert.strictEqual(Math.round(vol1 * 100) / 100, 0.45);

// At t=5s: volume must be 0.5 (keyframe at 5s is 0.5, fully past 2s fade in)
const vol5 = evaluateAudioVolume(audioEl, 5);
console.log(`- Audio volume at t=5s: ${vol5.toFixed(2)} (Expected: 0.50)`);
assert.strictEqual(Math.round(vol5 * 100) / 100, 0.5);

// At t=10s: volume must be 0 (due to fade out at duration boundary)
const vol10 = evaluateAudioVolume(audioEl, 10);
console.log(`- Audio volume at t=10s: ${vol10.toFixed(2)} (Expected: 0.00)`);
assert.strictEqual(vol10, 0);
console.log('✓ Test 6 Passed: Audio volume correctly evaluates keyframes combined with fade in/out curves.');

console.log('\n========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (6/6)');
console.log('========================================');
