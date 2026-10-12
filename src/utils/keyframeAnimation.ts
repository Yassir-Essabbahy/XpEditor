import { 
  CanvasElement, 
  Keyframe, 
  KeyframeProperty, 
  KeyframeEasing,
  EntranceAnimation,
  AssistantElement, 
  DialogueKeyframe,
  AssistantPose, 
  BubblePosition 
} from '../types/editor';

export interface AnimatedElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  volume?: number;
}

/**
 * Evaluates interpolation progress using the specified easing curve.
 */
export function applyEasing(progress: number, easing: KeyframeEasing = 'linear'): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (easing) {
    case 'ease-in':
      // Cubic ease-in: slow start, fast finish
      return p * p * p;
    case 'ease-out':
      // Cubic ease-out: fast start, gentle landing
      return 1 - Math.pow(1 - p, 3);
    case 'ease-in-out':
      // Smooth cubic ease-in-out curve
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    default:
      return p;
  }
}

/**
 * Interpolates rotation using shortest angular distance to prevent unnecessary full spins.
 */
export function interpolateRotation(r1: number, r2: number, progress: number): number {
  const delta = ((((r2 - r1) % 360) + 540) % 360) - 180;
  return r1 + delta * progress;
}

/**
 * Returns the un-animated base property value from the element.
 */
export function getBasePropertyValue(element: CanvasElement, property: KeyframeProperty): number {
  switch (property) {
    case 'x':
      return typeof element.x === 'number' && !isNaN(element.x) ? element.x : 0;
    case 'y':
      return typeof element.y === 'number' && !isNaN(element.y) ? element.y : 0;
    case 'width':
      return typeof element.width === 'number' && !isNaN(element.width) ? element.width : 50;
    case 'height':
      return typeof element.height === 'number' && !isNaN(element.height) ? element.height : 50;
    case 'rotation':
      return typeof (element as any).rotation === 'number' && !isNaN((element as any).rotation)
        ? (element as any).rotation
        : 0;
    case 'opacity':
      return typeof element.opacity === 'number' && !isNaN(element.opacity) ? element.opacity : 1;
    case 'volume':
      return typeof (element as any).volume === 'number' && !isNaN((element as any).volume) ? (element as any).volume : 1;
    default:
      return 0;
  }
}

/**
 * Evaluates a single animatable property for an element at a given project timestamp.
 */
export function evaluateElementProperty(
  element: CanvasElement,
  property: KeyframeProperty,
  currentTime: number
): number {
  const baseValue = getBasePropertyValue(element, property);
  const keyframes = (element.keyframes || [])
    .filter((k) => k.property === property)
    .sort((a, b) => a.time - b.time);

  // If no keyframes exist for this property, return the element's base value
  if (keyframes.length === 0) {
    return baseValue;
  }

  // Calculate element-relative time
  const t = currentTime - element.startTime;

  // Before or at first keyframe: hold first keyframe value (never jump to last keyframe)
  if (t <= keyframes[0].time) {
    return keyframes[0].value;
  }

  // After or at last keyframe: hold final keyframe value
  if (t >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find surrounding keyframe pair (k1 and k2)
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];

    if (t >= k1.time && t <= k2.time) {
      const duration = k2.time - k1.time;
      if (duration <= 0.00001) {
        return k2.value;
      }

      const rawProgress = (t - k1.time) / duration;
      const progress = applyEasing(rawProgress, k1.easing || 'linear');

      if (property === 'rotation') {
        const val = interpolateRotation(k1.value, k2.value, progress);
        return isNaN(val) ? baseValue : val;
      }

      const val = k1.value + (k2.value - k1.value) * progress;
      if (isNaN(val)) return baseValue;

      if (property === 'opacity') {
        return Math.max(0, Math.min(1, val));
      }
      if (property === 'width' || property === 'height') {
        return Math.max(0.1, val);
      }
      return val;
    }
  }

  return baseValue;
}

/**
 * Shared evaluation function for both editor preview and FFmpeg export.
 */
export function getAnimatedElementProps(element: CanvasElement, currentTime: number): AnimatedElementProps {
  return {
    x: evaluateElementProperty(element, 'x', currentTime),
    y: evaluateElementProperty(element, 'y', currentTime),
    width: evaluateElementProperty(element, 'width', currentTime),
    height: evaluateElementProperty(element, 'height', currentTime),
    rotation: evaluateElementProperty(element, 'rotation', currentTime),
    opacity: evaluateElementProperty(element, 'opacity', currentTime),
    volume: (element.type === 'audio' || (element as any).volume !== undefined)
      ? evaluateElementProperty(element, 'volume', currentTime)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Entrance & exit transition presets ("more animations": fade, slides,
// zoom-in, pop-in). Evaluated ON TOP of keyframed props so both systems
// compose. Single shared engine used by CanvasStage preview, XpAssistant
// preview, and the canvas export renderer — guaranteeing parity.
// ---------------------------------------------------------------------------

/** Slide distance in canvas percentage points at progress 0. */
export const TRANSITION_SLIDE_DISTANCE = 20;

export interface TransitionState {
  /** 0 (hidden) .. 1 (fully visible) — multiply with keyframed opacity. */
  opacity: number;
  /** Canvas-percentage-point offsets to add to x/y. */
  offsetX: number;
  offsetY: number;
  /** Scale multiplier applied around the element center. */
  scale: number;
}

function easeOutCubic(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return 1 - Math.pow(1 - c, 3);
}

function backOut(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

/**
 * Per-side (entrance or exit) transition contribution at a 0..1 progress
 * value where 0 = hidden/start and 1 = fully visible.
 */
function evaluateTransitionSide(
  animation: EntranceAnimation,
  progress: number
): TransitionState {
  const p = Math.max(0, Math.min(1, progress));
  const idle: TransitionState = { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };
  if (!animation || animation === 'none' || p >= 1) return idle;

  const e = easeOutCubic(p);
  const hidden = 1 - e;
  switch (animation) {
    case 'fade':
      return { opacity: e, offsetX: 0, offsetY: 0, scale: 1 };
    case 'slide-left':
      return { opacity: e, offsetX: -hidden * TRANSITION_SLIDE_DISTANCE, offsetY: 0, scale: 1 };
    case 'slide-right':
      return { opacity: e, offsetX: hidden * TRANSITION_SLIDE_DISTANCE, offsetY: 0, scale: 1 };
    case 'slide-up':
      return { opacity: e, offsetX: 0, offsetY: -hidden * TRANSITION_SLIDE_DISTANCE, scale: 1 };
    case 'slide-down':
      return { opacity: e, offsetX: 0, offsetY: hidden * TRANSITION_SLIDE_DISTANCE, scale: 1 };
    case 'zoom-in':
      return { opacity: e, offsetX: 0, offsetY: 0, scale: Math.max(0.001, 0.4 + 0.6 * e) };
    case 'pop-in': {
      const b = backOut(p);
      return { opacity: e, offsetX: 0, offsetY: 0, scale: Math.max(0.001, 0.4 + 0.6 * b) };
    }
    default:
      return idle;
  }
}

/**
 * Evaluates the combined entrance + exit transition state for an element.
 * Falls back to legacy fadeInDuration/fadeOutDuration (assistant/audio-era
 * fields) when no entrance/exit preset is set, so older projects keep working
 * without double-applying when a preset IS set.
 */
export function evaluateTransitions(element: CanvasElement, currentTime: number): TransitionState {
  const el = element as any;
  const entrance: EntranceAnimation = el.entranceAnimation || 'none';
  const exit: EntranceAnimation = el.exitAnimation || 'none';
  const entranceDur = Math.max(0, Number(el.entranceDuration ?? 0.5) || 0);
  const exitDur = Math.max(0, Number(el.exitDuration ?? 0.5) || 0);
  const rel = Math.max(0, Math.min(element.duration, currentTime - element.startTime));

  let inState: TransitionState = { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };
  let outState: TransitionState = { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };

  if (entrance !== 'none' && entranceDur > 0) {
    inState = evaluateTransitionSide(entrance, entranceDur <= 0 ? 1 : rel / entranceDur);
  } else if ((entrance === 'none' || !el.entranceAnimation) && el.fadeInDuration > 0 && rel < el.fadeInDuration) {
    // Legacy fade-in fallback (e.g. assistant clips authored before presets).
    inState = { opacity: Math.max(0, Math.min(1, rel / el.fadeInDuration)), offsetX: 0, offsetY: 0, scale: 1 };
  }

  if (exit !== 'none' && exitDur > 0) {
    const timeLeft = element.duration - rel;
    outState = evaluateTransitionSide(exit, exitDur <= 0 ? 1 : timeLeft / exitDur);
  } else if ((exit === 'none' || !el.exitAnimation) && el.fadeOutDuration > 0 && element.duration - rel < el.fadeOutDuration) {
    outState = {
      opacity: Math.max(0, Math.min(1, (element.duration - rel) / el.fadeOutDuration)),
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };
  }

  return {
    opacity: Math.max(0, Math.min(1, inState.opacity * outState.opacity)),
    offsetX: inState.offsetX + outState.offsetX,
    offsetY: inState.offsetY + outState.offsetY,
    scale: Math.max(0.001, inState.scale * outState.scale),
  };
}

/**
 * Base keyframed props with entrance/exit transitions applied.
 * Geometry stays centered: scale shrinks/grows width/height around the
 * element center, slides add canvas-percentage offsets.
 */
export function getTransitionedElementProps(
  element: CanvasElement,
  currentTime: number
): AnimatedElementProps {
  const base = getAnimatedElementProps(element, currentTime);
  if (element.type === 'audio') return base;
  const tr = evaluateTransitions(element, currentTime);
  if (tr.opacity === 1 && tr.offsetX === 0 && tr.offsetY === 0 && tr.scale === 1) {
    return base;
  }
  const scale = Math.max(0.001, tr.scale);
  const newW = Math.max(0.1, base.width * scale);
  const newH = Math.max(0.1, base.height * scale);
  const cx = base.x + base.width / 2;
  const cy = base.y + base.height / 2;
  return {
    ...base,
    x: cx - newW / 2 + tr.offsetX,
    y: cy - newH / 2 + tr.offsetY,
    width: newW,
    height: newH,
    opacity: Math.max(0, Math.min(1, base.opacity * tr.opacity)),
  };
}

/**
 * Evaluates the effective audio volume at currentTime taking into account keyframes and fade in/out curves.
 */
export function evaluateAudioVolume(element: CanvasElement, currentTime: number): number {
  const baseVol = evaluateElementProperty(element, 'volume', currentTime);
  const relTime = currentTime - element.startTime;
  let fadeMultiplier = 1;

  const audioEl = element as any;
  if (audioEl.fadeInDuration && audioEl.fadeInDuration > 0 && relTime < audioEl.fadeInDuration) {
    fadeMultiplier = Math.max(0, Math.min(1, relTime / audioEl.fadeInDuration));
  }
  if (
    audioEl.fadeOutDuration &&
    audioEl.fadeOutDuration > 0 &&
    element.duration - relTime < audioEl.fadeOutDuration
  ) {
    const outFactor = Math.max(0, Math.min(1, (element.duration - relTime) / audioEl.fadeOutDuration));
    fadeMultiplier = Math.min(fadeMultiplier, outFactor);
  }

  return Math.max(0, Math.min(1, baseVol * fadeMultiplier));
}

/**
 * Adds or updates a keyframe for a property on an element at a given element-relative timestamp.
 * If a keyframe already exists for the property near the timestamp (within tolerance), updates it.
 */
export function addOrUpdateKeyframe(
  element: CanvasElement,
  property: KeyframeProperty,
  relativeTime: number,
  value: number,
  easing: KeyframeEasing = 'linear',
  tolerance = 0.05
): CanvasElement {
  const clampedTime = Math.max(0, Math.min(element.duration, Number(relativeTime.toFixed(3))));
  const keyframes = [...(element.keyframes || [])];

  const existingForProp = keyframes.filter((k) => k.property === property);

  // If this is the first keyframe for this property and placed at > tolerance,
  // also create an initial keyframe at t=0 with the base property value so the animation
  // starts smoothly from the original state and never glitches at frame 0.
  if (existingForProp.length === 0 && clampedTime > tolerance) {
    const initialBaseVal = getBasePropertyValue(element, property);
    keyframes.push({
      id: `kf-${Date.now()}-start-${Math.random().toString(36).substring(2, 6)}`,
      time: 0,
      property,
      value: initialBaseVal,
      easing,
    });
  }

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
    const newKf: Keyframe = {
      id: `kf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: clampedTime,
      property,
      value,
      easing,
    };
    keyframes.push(newKf);
  }

  keyframes.sort((a, b) => a.time - b.time);

  return {
    ...element,
    keyframes,
  };
}

/**
 * Updates an existing keyframe by ID (e.g. dragging to new time or changing value/easing).
 */
export function updateKeyframeById(
  element: CanvasElement,
  keyframeId: string,
  updates: Partial<Omit<Keyframe, 'id'>>
): CanvasElement {
  const keyframes = (element.keyframes || []).map((k) => {
    if (k.id !== keyframeId) return k;
    const updated = { ...k, ...updates };
    if (typeof updated.time === 'number') {
      updated.time = Math.max(0, Math.min(element.duration, Number(updated.time.toFixed(3))));
    }
    return updated;
  });

  keyframes.sort((a, b) => a.time - b.time);

  return {
    ...element,
    keyframes,
  };
}

/**
 * Removes a specific keyframe by ID.
 */
export function removeKeyframe(element: CanvasElement, keyframeId: string): CanvasElement {
  return {
    ...element,
    keyframes: (element.keyframes || []).filter((k) => k.id !== keyframeId),
  };
}

/**
 * Removes all keyframes for a given property on an element.
 */
export function removePropertyKeyframes(element: CanvasElement, property: KeyframeProperty): CanvasElement {
  return {
    ...element,
    keyframes: (element.keyframes || []).filter((k) => k.property !== property),
  };
}

/**
 * Clears all keyframes on an element.
 */
export function clearAllKeyframes(element: CanvasElement): CanvasElement {
  return {
    ...element,
    keyframes: [],
  };
}

/**
 * Finds a keyframe for a property near the specified element time.
 */
export function findKeyframeAtTime(
  element: CanvasElement,
  property: KeyframeProperty,
  relativeTime: number,
  tolerance = 0.05
): Keyframe | undefined {
  return (element.keyframes || []).find(
    (k) => k.property === property && Math.abs(k.time - relativeTime) <= tolerance
  );
}

/**
 * Gets the closest previous keyframe project timestamp.
 */
export function getPrevKeyframeProjectTime(
  element: CanvasElement,
  currentProjectTime: number,
  property?: KeyframeProperty
): number | null {
  const currentElTime = currentProjectTime - element.startTime;
  const times: number[] = (element.keyframes || [])
    .filter((k) => (property ? k.property === property : true) && k.time < currentElTime - 0.02)
    .map((k) => k.time);

  if (element.type === 'assistant' && !property) {
    const dKfs = (element as AssistantElement).dialogueKeyframes || [];
    for (const dk of dKfs) {
      if (dk.time < currentElTime - 0.02) {
        times.push(dk.time);
      }
    }
  }

  if (times.length === 0) return null;
  times.sort((a, b) => b - a);
  return Number((element.startTime + times[0]).toFixed(3));
}

/**
 * Gets the closest next keyframe project timestamp.
 */
export function getNextKeyframeProjectTime(
  element: CanvasElement,
  currentProjectTime: number,
  property?: KeyframeProperty
): number | null {
  const currentElTime = currentProjectTime - element.startTime;
  const times: number[] = (element.keyframes || [])
    .filter((k) => (property ? k.property === property : true) && k.time > currentElTime + 0.02)
    .map((k) => k.time);

  if (element.type === 'assistant' && !property) {
    const dKfs = (element as AssistantElement).dialogueKeyframes || [];
    for (const dk of dKfs) {
      if (dk.time > currentElTime + 0.02) {
        times.push(dk.time);
      }
    }
  }

  if (times.length === 0) return null;
  times.sort((a, b) => a - b);
  return Number((element.startTime + times[0]).toFixed(3));
}

export interface EvaluatedAssistantDialogue {
  dialogueText: string;
  pose: AssistantPose;
  bubblePosition: BubblePosition;
  showDialogue: boolean;
  activeKeyframeTime: number; // element-relative timestamp when active dialogue chunk started
}

/**
 * Evaluates the active assistant dialogue text, character pose/status, and bubble position at a given project time.
 */
export function evaluateAssistantDialogue(
  element: AssistantElement,
  currentTime: number
): EvaluatedAssistantDialogue {
  const relTime = Math.max(0, currentTime - element.startTime);
  const basePose: AssistantPose = element.pose || 'idle';
  const basePos: BubblePosition = element.bubblePosition || 'left';
  const baseText = element.dialogueText || '';
  const baseShow = element.showDialogue !== false;

  const kfs = (element.dialogueKeyframes || [])
    .slice()
    .sort((a, b) => a.time - b.time);

  if (kfs.length === 0) {
    return {
      dialogueText: baseText,
      pose: basePose,
      bubblePosition: basePos,
      showDialogue: baseShow,
      activeKeyframeTime: 0,
    };
  }

  // Before or at first keyframe: hold first keyframe values
  if (relTime <= kfs[0].time) {
    return {
      dialogueText: kfs[0].dialogueText,
      pose: kfs[0].pose || basePose,
      bubblePosition: kfs[0].bubblePosition || basePos,
      showDialogue: kfs[0].showDialogue !== undefined ? kfs[0].showDialogue : baseShow,
      activeKeyframeTime: kfs[0].time,
    };
  }

  // Find the active keyframe (latest where k.time <= relTime)
  let activeKf = kfs[0];
  for (let i = 0; i < kfs.length; i++) {
    if (relTime >= kfs[i].time) {
      activeKf = kfs[i];
    } else {
      break;
    }
  }

  return {
    dialogueText: activeKf.dialogueText,
    pose: activeKf.pose || basePose,
    bubblePosition: activeKf.bubblePosition || basePos,
    showDialogue: activeKf.showDialogue !== undefined ? activeKf.showDialogue : baseShow,
    activeKeyframeTime: activeKf.time,
  };
}

/**
 * Adds or updates a dialogue keyframe at a given element-relative timestamp.
 */
export function addOrUpdateDialogueKeyframe(
  element: AssistantElement,
  relativeTime: number,
  data: {
    dialogueText: string;
    pose?: AssistantPose;
    bubblePosition?: BubblePosition;
    showDialogue?: boolean;
  },
  tolerance = 0.15
): AssistantElement {
  const clampedTime = Math.max(0, Math.min(element.duration, Number(relativeTime.toFixed(3))));
  const kfs = [...(element.dialogueKeyframes || [])];

  // If this is the first dialogue keyframe and placed at > tolerance,
  // also add an initial dialogue keyframe at t=0 with the base properties so
  // dialogue from t=0 to relativeTime remains preserved as intended!
  if (kfs.length === 0 && clampedTime > tolerance) {
    kfs.push({
      id: `dkf-${Date.now()}-start-${Math.random().toString(36).substring(2, 6)}`,
      time: 0,
      dialogueText: element.dialogueText || '',
      pose: element.pose || 'idle',
      bubblePosition: element.bubblePosition || 'left',
      showDialogue: element.showDialogue !== false,
    });
  }

  const existingIdx = kfs.findIndex((k) => Math.abs(k.time - clampedTime) <= tolerance);

  if (existingIdx >= 0) {
    kfs[existingIdx] = {
      ...kfs[existingIdx],
      dialogueText: data.dialogueText,
      pose: data.pose || kfs[existingIdx].pose || element.pose || 'idle',
      bubblePosition: data.bubblePosition || kfs[existingIdx].bubblePosition || element.bubblePosition || 'left',
      showDialogue: data.showDialogue !== undefined ? data.showDialogue : (kfs[existingIdx].showDialogue ?? true),
      time: clampedTime,
    };
  } else {
    kfs.push({
      id: `dkf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: clampedTime,
      dialogueText: data.dialogueText,
      pose: data.pose || element.pose || 'idle',
      bubblePosition: data.bubblePosition || element.bubblePosition || 'left',
      showDialogue: data.showDialogue !== undefined ? data.showDialogue : true,
    });
  }

  kfs.sort((a, b) => a.time - b.time);

  return {
    ...element,
    dialogueKeyframes: kfs,
  };
}

/**
 * Updates a dialogue keyframe directly by its unique ID.
 */
export function updateDialogueKeyframeById(
  element: AssistantElement,
  keyframeId: string,
  updates: Partial<Omit<DialogueKeyframe, 'id'>>
): AssistantElement {
  const kfs = (element.dialogueKeyframes || []).map((k) =>
    k.id === keyframeId ? { ...k, ...updates } : k
  );
  return {
    ...element,
    dialogueKeyframes: kfs,
  };
}

/**
 * Removes a dialogue keyframe by ID.
 */
export function removeDialogueKeyframe(
  element: AssistantElement,
  keyframeId: string
): AssistantElement {
  return {
    ...element,
    dialogueKeyframes: (element.dialogueKeyframes || []).filter((k) => k.id !== keyframeId),
  };
}
