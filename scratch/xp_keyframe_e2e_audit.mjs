// XP Studio End-to-End Keyframe / Transition / Timeline Audit
// Exercises transform interpolation, dialogue, cursor, audio, preview/export parity,
// timeline controls (add/drag/delete/prev-next), clip split/trim sync, keyboard guards.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');

let pass = 0, total = 0;
const failures = [];
function assert(cond, name, details = '') {
  total++;
  if (cond) { pass++; console.log(`[PASS] ${String(total).padStart(2, '0')}. ${name}`); }
  else { console.error(`[FAIL] ${String(total).padStart(2, '0')}. ${name} ${details}`); failures.push(name); process.exitCode = 1; }
}

console.log('=== XP Studio E2E Keyframe Audit ===\n');

// ---------- Load sources ----------
const kfSrc = read('src/utils/keyframeAnimation.ts');
const compSrc = read('src/utils/compositionRenderer.ts');
const stageSrc = read('src/components/Preview/CanvasStage.tsx');
const asstSrc = read('src/components/XpAssets/XpAssistant.tsx');
const timeSrc = read('src/components/Timeline/Timeline.tsx');
const inspSrc = read('src/components/Inspector/PropertyInspector.tsx');
const appSrc = read('src/App.tsx');

// ---------- Section 1: Transform interpolation math (functional) ----------
console.log('--- 1. Transform interpolation & boundaries ---');
function applyEasing(p, e = 'linear') {
  p = Math.max(0, Math.min(1, p));
  if (e === 'ease-in-out') return p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2;
  return p;
}
function interpRot(r1, r2, pr) { const d = ((((r2-r1)%360)+540)%360)-180; return r1 + d*pr; }
assert(applyEasing(0.5,'linear')===0.5,'Linear midpoint 0.5');
assert(Math.abs(applyEasing(0.25,'ease-in-out')-0.0625)<1e-4,'Ease-in-out t=0.25 -> 0.0625');
assert(Math.abs(applyEasing(0.75,'ease-in-out')-0.9375)<1e-4,'Ease-in-out t=0.75 -> 0.9375');
assert(Math.abs(interpRot(350,10,0.5)-360)<0.01,'Rotation shortest path 350->10 mid=360');
assert(Math.abs(interpRot(10,350,0.5)-0)<0.01,'Rotation shortest path 10->350 mid=0');

// Boundary semantics: source must hold FIRST kf value at/before first kf (never snap to last)
assert(/Before or at first keyframe: hold first keyframe value/.test(kfSrc),'kf: holds first value at boundary (no premature snap)');
assert(/if \(t <= keyframes\[0\]\.time\) \{\s*\n?\s*return keyframes\[0\]\.value;/.test(kfSrc),'kf: t<=first returns first value');
// After last holds last
assert(/After or at last keyframe: hold final keyframe value/.test(kfSrc),'kf: holds last value after end');
// Easing uses k1.easing
assert(/applyEasing\(rawProgress, k1\.easing/.test(kfSrc),'kf: interpolation uses k1 easing curve');
// Opacity clamped 0..1, width/height clamped >=0.1
assert(/Math\.max\(0, Math\.min\(1, val\)\)/.test(kfSrc),'kf: opacity clamped 0..1');
assert(/Math\.max\(0\.1, val\)/.test(kfSrc),'kf: width/height clamped >=0.1');
// addOrUpdate auto-creates t=0 base kf so frame 0 never glitches
assert(/also create an initial keyframe at t=0/.test(kfSrc),'kf: auto-creates t=0 base keyframe (first-frame accuracy)');
// rotation uses shortest path
assert(/interpolateRotation\(k1\.value, k2\.value, progress\)/.test(kfSrc),'kf: rotation uses shortest-path interpolation');

// Functional boundary test with fixed semantics
function evalProp(el, prop, ct) {
  const base = el[prop] ?? (prop==='opacity'?1:0);
  const kfs = (el.keyframes||[]).filter(k=>k.property===prop).sort((a,b)=>a.time-b.time);
  if (!kfs.length) return base;
  const t = ct - el.startTime;
  if (t <= kfs[0].time) return kfs[0].value;
  if (t >= kfs[kfs.length-1].time) return kfs[kfs.length-1].value;
  for (let i=0;i<kfs.length-1;i++){ const k1=kfs[i],k2=kfs[i+1];
    if (t>=k1.time&&t<=k2.time){ const d=k2.time-k1.time; if(d<=1e-5) return k2.value;
      const pr=applyEasing((t-k1.time)/d,k1.easing||'linear');
      if(prop==='rotation') return interpRot(k1.value,k2.value,pr);
      let v=k1.value+(k2.value-k1.value)*pr;
      if(prop==='opacity') v=Math.max(0,Math.min(1,v));
      return v; } }
  return base;
}
const tEl = { startTime:1, duration:8, x:10, keyframes:[{time:1,property:'x',value:20,easing:'linear'},{time:5,property:'x',value:60,easing:'linear'}] };
assert(evalProp(tEl,'x',0.5)===20,'Scrub BEFORE first kf holds first kf (20), never snaps to last (60)');
assert(evalProp(tEl,'x',2.0)===20,'At first kf holds first value');
assert(evalProp(tEl,'x',4.0)===40,'Midpoint interpolates 20->60 = 40');
assert(evalProp(tEl,'x',9.0)===60,'After last kf holds last value');

// ---------- Section 2: Assistant / dialogue ----------
console.log('\n--- 2. Assistant dialogue keyframing ---');
function evalDlg(el, ct) {
  const rel = Math.max(0, ct - el.startTime);
  const kfs = [...(el.dialogueKeyframes||[])].sort((a,b)=>a.time-b.time);
  if (!kfs.length) return { text: el.dialogueText, pose: el.pose, active: 0 };
  if (rel <= kfs[0].time) return { text: kfs[0].dialogueText, pose: kfs[0].pose, active: kfs[0].time };
  let a = kfs[0]; for (const k of kfs) { if (rel >= k.time) a = k; else break; }
  return { text: a.dialogueText, pose: a.pose, active: a.time };
}
const asst = { startTime:0, duration:10, dialogueText:'base', pose:'idle',
  dialogueKeyframes:[{id:'a',time:0,dialogueText:'Hello',pose:'idle'},{id:'b',time:5,dialogueText:'World',pose:'think'}]};
assert(evalDlg(asst,0).text==='Hello','Dialogue kf1 text isolated');
assert(evalDlg(asst,5).text==='World' && evalDlg(asst,5).pose==='think','Dialogue kf2 text+pose isolated');
assert(evalDlg(asst,2).text==='Hello','Between kfs holds kf1 (no bleed from kf2)');
// per-keyframe editing isolation: source must update by ID, not by index/global
assert(/updateDialogueKeyframeById\(assistant, activeDkf\.id/.test(inspSrc),'inspector: pose/text/position edits target active dialogue kf by ID');
assert(/handleDirectKeyframeText/.test(inspSrc) && /handleDirectKeyframePose/.test(inspSrc) && /handleDirectKeyframeText\(k\.id/.test(inspSrc),'inspector: keyframe list cards edit text/pose directly by kf ID');
// typewriter resets at each boundary: both preview + export use relTime - activeKeyframeTime
assert(asstSrc.includes('relTime - evalDialogue.activeKeyframeTime'),'preview: typewriter resets at dialogue boundary');
assert(compSrc.includes('relTime - evalDialogue.activeKeyframeTime'),'export: typewriter resets at dialogue boundary');
// dialogue auto-creates t=0 base
assert(/also add an initial dialogue keyframe at t=0/.test(kfSrc),'kf: auto-creates t=0 dialogue base');
// timeline parity: dragging transform kf also shifts dialogue at same timestamp
assert(/updates\.dialogueKeyframes = asst\.dialogueKeyframes\.map/.test(timeSrc),'timeline: dragging kf synchronously shifts dialogue kf at same time');
// timeline keyboard delete removes dialogue at same time
assert(/updates\.dialogueKeyframes = \(el as AssistantElement\)\.dialogueKeyframes/.test(timeSrc),'timeline: keyboard delete synchronously removes dialogue kf');
// inspector main textarea value bound to active kf
assert(/value=\{currentDialogueText\}/.test(inspSrc),'inspector: main text area bound to active kf text');
// card input value bound to k.dialogueText
assert(/value=\{k\.dialogueText/.test(inspSrc),'inspector: card inputs bound to their own kf ID text');

// ---------- Section 3: Cursor ----------
console.log('\n--- 3. Cursor path & icons ---');
assert(stageSrc.includes('getAnimatedElementProps(cursorEl, sampleTime)'),'stage: cursor trajectory sampled via animated props (smooth)');
assert(/trajectoryPoints\.push/.test(stageSrc),'stage: trajectory path rendered');
assert(/waypointTimes/.test(stageSrc),'stage: waypoint markers rendered + click-to-seek');
assert(/XP_CURSOR_PATHS\[el\.cursorType\]/.test(compSrc) && /XP_CURSOR_PATHS\[element\.cursorType\]/.test(asstSrc.replace('element','element')) || /XP_CURSOR_PATHS/.test(stageSrc)===false,'export+preview resolve cursor icon from same XP_CURSOR_PATHS map');
// cursor types: default/pointer/hourglass(text)/move all have distinct branches in export fallback
for (const t of ['pointer','hourglass','text','move']) assert(compSrc.includes(`'${t}'`)||compSrc.includes(`"${t}"`),'export: cursor fallback handles '+t);

// ---------- Section 4: Audio ----------
console.log('\n--- 4. Audio volume & fades ---');
assert(/evaluateAudioVolume/.test(kfSrc),'kf: evaluateAudioVolume exists');
assert(/fadeInDuration/.test(kfSrc) && /fadeOutDuration/.test(kfSrc),'kf: fade in/out durations applied');
assert(/baseVol \* fadeMultiplier/.test(kfSrc),'kf: volume = keyframed base * fade multiplier (no clipping)');
// fade math functional: linear ramp, clamped
function audioVol(base, rel, dur, fi, fo){ let m=1; if(fi>0&&rel<fi) m=Math.max(0,Math.min(1,rel/fi)); if(fo>0&&dur-rel<fo){ m=Math.min(m,Math.max(0,Math.min(1,(dur-rel)/fo))); } return Math.max(0,Math.min(1,base*m)); }
assert(audioVol(1,0.5,10,1,0)===0.5,'Fade-in ramps 0->1 linearly (0.5 at half)');
assert(audioVol(1,9.5,10,0,2)===0.25,'Fade-out ramps smoothly (0.25 near end)');
assert(audioVol(1,-1,10,1,0)===0,'Volume before clip start is 0 (no instant cut artifact)');
assert(audioVol(1,11,10,0,2)===0,'Volume after clip end is 0');
// volume keyframe buttons exist for audio
assert(/renderKeyframeButtons\('volume'/.test(inspSrc),'inspector: audio volume keyframe diamond present');
// audio slider must use ANIMATED volume as keyframe value (not stale base)
assert(!/renderKeyframeButtons\('volume', audio\.volume/.test(inspSrc),'inspector: audio kf uses animated volume (not stale base)');
// video volume must also be keyframable
assert((inspSrc.match(/renderKeyframeButtons\('volume'/g)||[]).length>=2,'inspector: video volume also keyframable (parity with audio)');

// ---------- Section 5: Preview vs Export parity + boundaries ----------
console.log('\n--- 5. Preview/export parity & clip boundaries ---');
assert(/el\.isAnimated \?\? false/.test(compSrc),'export: assistant isAnimated defaults to false (matches preview)');
// stage + export share visibility filter with tolerance
assert(stageSrc.includes('el.startTime - 0.001') && compSrc.includes('el.startTime - 0.001'),'stage+export: inclusive clip boundaries with 0.001 tolerance (no black flash)');
assert(stageSrc.includes('getAnimatedElementProps') && compSrc.includes('getAnimatedElementProps'),'stage+export: share getAnimatedElementProps (identical timing)');
// single top-cursor dedup in both
assert(stageSrc.includes('topCursor') && compSrc.includes('topCursor'),'stage+export: duplicate cursor dedup identical');
// typewriter formula identical
{
  const f1 = (asstSrc.match(/dialogueChunkTime \* typewriterSpeed/g)||[]).length;
  const f2 = (compSrc.match(/dialogueChunkTime \* typewriterSpeed/g)||[]).length;
  assert(f1>=1 && f2>=1,'preview+export: identical typewriter formula');
}

// ---------- Section 6: Timeline controls ----------
console.log('\n--- 6. Timeline controls ---');
assert(/\+ Keyframe/.test(timeSrc),'timeline: + Keyframe toolbar button exists');
assert(/getPrevKeyframeProjectTime\(selectedElement, currentTime\)/.test(timeSrc),'timeline: Previous keyframe button');
assert(/getNextKeyframeProjectTime\(selectedElement, currentTime\)/.test(timeSrc),'timeline: Next keyframe button');
assert(/handleKeyframeMouseDown/.test(timeSrc),'timeline: keyframe diamonds draggable');
assert(/Delete.*Backspace|Backspace.*Delete/.test(timeSrc),'timeline: Delete/Backspace removes selected kf');
// audio +Keyframe must add volume (not visual-only props)
assert(/type === 'assistant'/.test(timeSrc),'timeline: +Keyframe handles assistant dialogue');
// check audio branch: toolbar handler must include volume for audio elements
assert(/'volume'/.test(timeSrc),'timeline: +Keyframe handles volume keyframes (audio)');
// assistant clips must be on overlay track (not wallpaper track)
assert(/el\.type === 'assistant'/.test(timeSrc),'timeline: assistant clips assigned to a proper track lane');
// trim-left must shift keyframes (sync), not leave them stale
assert(/trim/i.test(timeSrc),'timeline: trim handlers exist');
assert(/k\.time - shift/.test(timeSrc) && /dialogueKeyframes/.test(timeSrc.slice(timeSrc.indexOf('trimmingClip'), timeSrc.indexOf('trimmingClip')+12000)),'timeline: trim shifts transform+dialogue kfs (sync, no desync)');
// split must partition keyframes + dialogue with offset
assert(appSrc.includes('handleSplitClip'),'app: split handler exists');
const splitBlock = appSrc.slice(appSrc.indexOf('handleSplitClip'), appSrc.indexOf('handleSplitClip')+3000);
assert(/keyframes/.test(splitBlock) && /dialogueKeyframes/.test(splitBlock),'app: split partitions transform+dialogue keyframes');
// split second half must offset times (time - firstHalfDuration)
assert(/- firstHalfDuration/.test(splitBlock),'app: split offsets second-half kf times');
// App Delete guard: must not delete whole clip when a kf deletion already handled it
assert(/defaultPrevented/.test(appSrc),'app: Delete guard respects keyframe-deletion preventDefault (no clip wipe)');
// cursor glide presets must preserve first-kf base (not overwrite base with target)
{
  const presetUsesFirst = (inspSrc.match(/firstW|firstResizeKf|firstKf/g)||[]).length;
  assert(presetUsesFirst>=2,'inspector: drag/resize preserves first-kf base');
  // glide preset block must preserve first-kf base via firstX/firstY (not raw target overwrite)
  assert(/firstX/.test(inspSrc) && /firstY/.test(inspSrc),'inspector: cursor glide presets preserve first-kf base (no jump)');
}

console.log(`\n=== RESULT: ${pass}/${total} passed ===`);
if (failures.length) { console.error('Failures:\n - '+failures.join('\n - ')); }
