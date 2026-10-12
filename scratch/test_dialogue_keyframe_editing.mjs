import assert from 'assert';
import {
  addOrUpdateDialogueKeyframe,
  updateDialogueKeyframeById,
  removeDialogueKeyframe,
  evaluateAssistantDialogue,
  getPrevKeyframeProjectTime,
  getNextKeyframeProjectTime,
} from '../src/utils/keyframeAnimation.ts';

console.log('🧪 Starting Dialogue Keyframe Editing Test Suite...');

// 1. Create a base assistant element
let assistant = {
  id: 'asst-1',
  type: 'assistant',
  name: 'Clippy Test',
  track: 3,
  startTime: 2.0,
  duration: 10.0,
  x: 200,
  y: 300,
  width: 120,
  height: 120,
  rotation: 0,
  opacity: 1,
  dialogueText: 'Initial text at t=0',
  pose: 'idle',
  bubblePosition: 'left',
  showDialogue: true,
  keyframes: [],
  dialogueKeyframes: [],
};

// Test A: Adding first keyframe at relTime = 3.0s should create a t=0 anchor and t=3.0 keyframe
assistant = addOrUpdateDialogueKeyframe(assistant, 3.0, {
  dialogueText: 'First keyframe at 3s',
  pose: 'explaining',
  bubblePosition: 'right',
  showDialogue: true,
});

assert.strictEqual(assistant.dialogueKeyframes.length, 2, 'Should create t=0 anchor and t=3.0 keyframe');
assert.strictEqual(assistant.dialogueKeyframes[0].time, 0, 'First keyframe should be at t=0');
assert.strictEqual(assistant.dialogueKeyframes[0].dialogueText, 'Initial text at t=0');
assert.strictEqual(assistant.dialogueKeyframes[1].time, 3.0, 'Second keyframe should be at t=3.0');
assert.strictEqual(assistant.dialogueKeyframes[1].dialogueText, 'First keyframe at 3s');
assert.strictEqual(assistant.dialogueKeyframes[1].pose, 'explaining');
assert.strictEqual(assistant.dialogueKeyframes[1].bubblePosition, 'right');
console.log('✅ Test A Passed: Initial anchor and first keyframe created correctly');

// Test B: Add a second keyframe at relTime = 6.0s
assistant = addOrUpdateDialogueKeyframe(assistant, 6.0, {
  dialogueText: 'Second keyframe at 6s',
  pose: 'wave',
  bubblePosition: 'top',
  showDialogue: true,
});

assert.strictEqual(assistant.dialogueKeyframes.length, 3, 'Should now have 3 keyframes');
const kf0 = assistant.dialogueKeyframes[0];
const kf1 = assistant.dialogueKeyframes[1];
const kf2 = assistant.dialogueKeyframes[2];
assert.strictEqual(kf2.time, 6.0);
assert.strictEqual(kf2.dialogueText, 'Second keyframe at 6s');
assert.strictEqual(kf2.pose, 'wave');
console.log('✅ Test B Passed: Third keyframe added at 6.0s');

// Test C: Direct keyframe text mutation by ID on keyframe 1 (t=3.0s)
const updatedAfterKf1Text = updateDialogueKeyframeById(assistant, kf1.id, {
  dialogueText: 'MODIFIED Keyframe 1 text: Hello World!',
});
assistant = updatedAfterKf1Text;

assert.strictEqual(assistant.dialogueKeyframes[0].dialogueText, 'Initial text at t=0', 'Keyframe 0 text must be unchanged');
assert.strictEqual(assistant.dialogueKeyframes[1].dialogueText, 'MODIFIED Keyframe 1 text: Hello World!', 'Keyframe 1 text must be updated');
assert.strictEqual(assistant.dialogueKeyframes[2].dialogueText, 'Second keyframe at 6s', 'Keyframe 2 text must be unchanged');
console.log('✅ Test C Passed: Direct keyframe text mutation by ID updated only the target keyframe');

// Test D: Direct keyframe pose mutation by ID on keyframe 2 (t=6.0s)
assistant = updateDialogueKeyframeById(assistant, kf2.id, {
  pose: 'alert',
  bubblePosition: 'top-right',
  dialogueText: 'MODIFIED Keyframe 2 text: Alert message!',
});

assert.strictEqual(assistant.dialogueKeyframes[2].pose, 'alert');
assert.strictEqual(assistant.dialogueKeyframes[2].bubblePosition, 'top-right');
assert.strictEqual(assistant.dialogueKeyframes[2].dialogueText, 'MODIFIED Keyframe 2 text: Alert message!');
console.log('✅ Test D Passed: Direct keyframe pose/position/text mutation on keyframe 2 verified');

// Test E: Timeline evaluation of dialogue at different project timestamps
// assistant.startTime = 2.0s
// Project time 2.0s (relTime = 0.0s): Keyframe 0
let eval0 = evaluateAssistantDialogue(assistant, 2.0);
assert.strictEqual(eval0.dialogueText, 'Initial text at t=0');
assert.strictEqual(eval0.pose, 'idle');

// Project time 3.5s (relTime = 1.5s): Between kf0 (0.0s) and kf1 (3.0s) -> holds kf0
let evalMid1 = evaluateAssistantDialogue(assistant, 3.5);
assert.strictEqual(evalMid1.dialogueText, 'Initial text at t=0');

// Project time 5.0s (relTime = 3.0s): Exact kf1 timestamp -> displays kf1
let evalKf1 = evaluateAssistantDialogue(assistant, 5.0);
assert.strictEqual(evalKf1.dialogueText, 'MODIFIED Keyframe 1 text: Hello World!');
assert.strictEqual(evalKf1.pose, 'explaining');
assert.strictEqual(evalKf1.bubblePosition, 'right');

// Project time 7.0s (relTime = 5.0s): Between kf1 (3.0s) and kf2 (6.0s) -> holds kf1
let evalMid2 = evaluateAssistantDialogue(assistant, 7.0);
assert.strictEqual(evalMid2.dialogueText, 'MODIFIED Keyframe 1 text: Hello World!');

// Project time 8.0s (relTime = 6.0s): Exact kf2 timestamp -> displays kf2
let evalKf2 = evaluateAssistantDialogue(assistant, 8.0);
assert.strictEqual(evalKf2.dialogueText, 'MODIFIED Keyframe 2 text: Alert message!');
assert.strictEqual(evalKf2.pose, 'alert');
assert.strictEqual(evalKf2.bubblePosition, 'top-right');

// Project time 11.0s (relTime = 9.0s): After kf2 -> holds kf2
let evalLate = evaluateAssistantDialogue(assistant, 11.0);
assert.strictEqual(evalLate.dialogueText, 'MODIFIED Keyframe 2 text: Alert message!');
console.log('✅ Test E Passed: evaluateAssistantDialogue perfectly switches text across timeline');

// Test F: Navigation jump points (getPrevKeyframeProjectTime & getNextKeyframeProjectTime)
// Keyframes at relTime 0.0s, 3.0s, 6.0s -> Project times: 2.0s, 5.0s, 8.0s
const nextFromStart = getNextKeyframeProjectTime(assistant, 2.0);
assert.strictEqual(nextFromStart, 5.0, 'Next from 2.0s should be 5.0s');

const nextFromMid = getNextKeyframeProjectTime(assistant, 5.0);
assert.strictEqual(nextFromMid, 8.0, 'Next from 5.0s should be 8.0s');

const prevFromEnd = getPrevKeyframeProjectTime(assistant, 8.0);
assert.strictEqual(prevFromEnd, 5.0, 'Prev from 8.0s should be 5.0s');

const prevFromMid = getPrevKeyframeProjectTime(assistant, 5.0);
assert.strictEqual(prevFromMid, 2.0, 'Prev from 5.0s should be 2.0s');
console.log('✅ Test F Passed: Prev/Next keyframe navigation includes dialogue keyframes');

// Test G: Delete dialogue keyframe
assistant = removeDialogueKeyframe(assistant, kf1.id);
assert.strictEqual(assistant.dialogueKeyframes.length, 2, 'Should have 2 keyframes after removing kf1');
assert.strictEqual(assistant.dialogueKeyframes[0].time, 0);
assert.strictEqual(assistant.dialogueKeyframes[1].time, 6.0);
console.log('✅ Test G Passed: Keyframe deletion functions properly');

console.log('🎉 All Dialogue Keyframe tests passed with 100% accuracy!');
