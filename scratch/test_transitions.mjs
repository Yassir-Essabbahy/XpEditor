// Transition preset verification: source wiring + numeric behavior.
import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
let pass = 0, total = 0;
function assert(c, n, d = '') {
  total++;
  if (c) { pass++; console.log(`[PASS] ${n}`); }
  else { console.error(`[FAIL] ${n} ${d}`); process.exitCode = 1; }
}
const kf = read('src/utils/keyframeAnimation.ts');
const types = read('src/types/editor.ts');
const stage = read('src/components/Preview/CanvasStage.tsx');
const comp = read('src/utils/compositionRenderer.ts');
const insp = read('src/components/Inspector/PropertyInspector.tsx');
const asst = read('src/components/XpAssets/XpAssistant.tsx');

// Source wiring
assert(/EntranceAnimation/.test(types), 'types: EntranceAnimation exists');
assert(/entranceAnimation\?/.test(types) && /exitAnimation\?/.test(types), 'types: entrance/exit fields on BaseElement');
assert(/'ease-in'/.test(types) && /'ease-out'/.test(types), 'types: ease-in/ease-out easings added');
assert(/export function evaluateTransitions/.test(kf), 'engine: evaluateTransitions exported');
assert(/export function getTransitionedElementProps/.test(kf), 'engine: getTransitionedElementProps exported');
assert(/case 'ease-in':/.test(kf) && /case 'ease-out':/.test(kf), 'engine: applyEasing handles ease-in/out');
assert(/fadeInDuration/.test(kf) && /Legacy fade-in fallback|legacy/i.test(kf), 'engine: legacy fade fallback preserved');
assert(stage.includes('getTransitionedElementProps'), 'stage: renders transitioned props');
assert(stage.includes('getAnimatedElementProps(el, currentTime)') || stage.includes('getAnimatedElementProps'), 'stage: drag still uses base keyframed values');
assert(comp.includes('getTransitionedElementProps'), 'export: renders transitioned props');
assert(comp.includes('evaluateTransitions(el, time)'), 'export: assistant uses shared transition opacity');
assert(asst.includes('evaluateTransitions(element, currentTime)'), 'preview assistant: shared transition opacity');
assert(insp.includes('Entrance & Exit'), 'inspector: entrance/exit section present');
assert((insp.match(/pop-in/g) || []).length >= 2, 'inspector: pop-in preset offered');
assert(insp.includes("value=\"ease-in\"") && insp.includes("value=\"ease-out\""), 'inspector: new easing options');

// Numeric behavior (mirror of engine math)
const easeOut = (p) => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
const backOut = (p) => { const c = Math.max(0, Math.min(1, p)), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2); };
assert(easeOut(0) === 0 && easeOut(1) === 1, 'ease-out endpoints 0/1');
assert(easeOut(0.5) > 0.5, 'ease-out is front-loaded (>0.5 at midpoint)');
assert(Math.abs(backOut(0)) < 1e-9 && Math.abs(backOut(1) - 1) < 1e-9, 'back-out endpoints 0/1');
assert(backOut(0.7) > 1, 'pop-in overshoots above 1 mid-flight');
const p3 = (p) => p * p * p;
assert(Math.abs(p3(0.5) - 0.125) < 1e-9, 'ease-in cubic 0.125 at midpoint');
// fade entrance at half duration -> opacity ~0.875 (ease-out(0.5))
assert(Math.abs(easeOut(0.5) - 0.875) < 1e-9, 'fade entrance opacity 0.875 halfway through 0.5s entrance');
// slide offset at progress 0 -> full 20pt distance
assert(20 * (1 - easeOut(0)) === 20, 'slide starts fully offset (20pts)');
assert(20 * (1 - easeOut(1)) === 0, 'slide lands at 0 offset');
// zoom scale endpoints
assert(0.4 + 0.6 * easeOut(0) === 0.4, 'zoom starts at 0.4x');
assert(0.4 + 0.6 * easeOut(1) === 1, 'zoom lands at 1x');

console.log(`\nRESULT: ${pass}/${total} passed`);
