export type ElementType = 
  | 'wallpaper'
  | 'xp-window'
  | 'image-viewer'
  | 'dialog'
  | 'desktop-icon'
  | 'text'
  | 'cursor'
  | 'taskbar'
  | 'audio'
  | 'video'
  | 'assistant';

export type KeyframeProperty = 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'volume';
export type KeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export type EntranceAnimation =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'pop-in';

export interface Keyframe {
  id: string;
  time: number; // in seconds relative to element startTime (0 <= time <= duration)
  property: KeyframeProperty;
  value: number;
  easing?: KeyframeEasing;
}

export interface BaseElement {
  id: string;
  name: string;
  type: ElementType;
  trackId: string;
  startTime: number; // in seconds
  duration: number;  // in seconds
  x: number;         // percentage in canvas (0 - 100)
  y: number;         // percentage in canvas (0 - 100)
  width: number;     // percentage in canvas (0 - 100)
  height: number;    // percentage in canvas (0 - 100)
  rotation?: number; // rotation in degrees around center (default 0)
  zIndex: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  keyframes?: Keyframe[];
  // Entrance & exit motion presets (visual elements; evaluated on top of keyframes)
  entranceAnimation?: EntranceAnimation;
  entranceDuration?: number; // seconds (default 0.5, 0 = instant)
  exitAnimation?: EntranceAnimation;
  exitDuration?: number; // seconds (default 0.5, 0 = instant)
}

export interface DesktopIconItem {
  id: string;
  label: string;
  iconType: 'my-computer' | 'recycle-bin' | 'recycle-bin-full' | 'folder' | 'internet' | 'my-documents' | 'notepad' | 'search' | 'help' | 'error' | 'warning' | 'info' | 'question' | string;
  x: number; // percentage
  y: number; // percentage
}

export interface WallpaperElement extends BaseElement {
  type: 'wallpaper';
  imageSrc: string;
  showDesktopIcons?: boolean;
  showTaskbar?: boolean;
  desktopIcons?: DesktopIconItem[];
}

export interface XpWindowElement extends BaseElement {
  type: 'xp-window';
  title: string;
  icon?: string;
  windowType: 'generic' | 'notepad' | 'paint' | 'cdplayer' | 'error' | 'message-box';
  isActive: boolean;
  hasMenuBar: boolean;
  menuItems?: string[];
  hasStatusBar?: boolean;
  statusText?: string;
  contentImageSrc?: string;
  contentText?: string;
  fitMode?: 'contain' | 'cover';
  isMaximized?: boolean;
}

export interface ImageViewerElement extends BaseElement {
  type: 'image-viewer';
  title: string;
  imageSrc: string;
  imageName: string;
  zoomLevel?: number;
  rotation?: number; // 0, 90, 180, 270
  fitMode?: 'contain' | 'cover' | 'none';
  isActive: boolean;
}

export interface DialogElement extends BaseElement {
  type: 'dialog';
  dialogTitle: string;
  message: string;
  iconType: 'error' | 'warning' | 'info' | 'question';
  buttonLayout?: 'ok' | 'ok-cancel' | 'yes-no' | 'retry-cancel';
  soundEffect?: boolean;
}

export interface DesktopIconElement extends BaseElement {
  type: 'desktop-icon';
  label: string;
  iconType: 'my-computer' | 'recycle-bin' | 'recycle-bin-full' | 'folder' | 'internet' | 'my-documents' | 'notepad' | 'search' | 'help' | 'error' | 'warning' | 'info' | 'question' | string;
  isSelected?: boolean;
}

export interface CursorElement extends BaseElement {
  type: 'cursor';
  cursorType: 'default' | 'pointer' | 'hourglass' | 'text' | 'move' | 'busy' | 'helpsel' | 'no' | 'up' | 'size_ns' | 'size_we' | string;
  showMovementPath?: boolean;
  clickEffect?: 'none' | 'ripple' | 'press';
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  balloonStyle?: boolean;
  balloonTitle?: string;
}

export interface TaskbarElement extends BaseElement {
  type: 'taskbar';
  startMenuOpen?: boolean;
  timeString?: string;
  activeWindowTitles?: string[];
}

export interface AudioElement extends BaseElement {
  type: 'audio';
  audioSrc: string;
  volume: number; // 0 to 1
  loop?: boolean;
  fadeInDuration?: number; // seconds
  fadeOutDuration?: number; // seconds
}

export interface VideoElement extends BaseElement {
  type: 'video';
  videoSrc: string;
  volume: number;
  fitMode?: 'contain' | 'cover';
  loop?: boolean;
}

export type AssistantCharacter = 'clippy';
export type AssistantPose = 'idle' | 'think' | 'noted' | 'listen' | 'check' | 'cool';
export type BubblePosition = 'left' | 'right' | 'top' | 'top-left' | 'top-right';

export interface DialogueKeyframe {
  id: string;
  time: number; // element-relative timestamp in seconds
  dialogueText: string;
  pose?: AssistantPose; // character pose / status
  bubblePosition?: BubblePosition; // speech bubble placement
  showDialogue?: boolean; // bubble visibility status
}

export interface AssistantElement extends BaseElement {
  type: 'assistant';
  character: AssistantCharacter;
  pose: AssistantPose;
  isAnimated?: boolean;
  animationSpeed?: number;
  
  // Dialogue bubble settings
  showDialogue?: boolean;
  dialogueText?: string;
  bubblePosition?: BubblePosition;
  bubbleWidth?: number; // percentage of canvas (e.g. 24)
  bubbleBgColor?: string; // e.g. '#FFFFE1'
  bubbleTextColor?: string; // e.g. '#000000'
  bubbleBorderColor?: string; // e.g. '#000000'
  bubbleFontSize?: number; // e.g. 12
  bubbleFontFamily?: string; // e.g. 'Tahoma, sans-serif'
  bubblePadding?: number; // e.g. 10
  bubbleCornerRadius?: number; // e.g. 8
  
  // Typewriter text animation
  typewriterEffect?: boolean;
  typewriterSpeed?: number; // characters per second (default 25)

  // Optional fade-in / fade-out
  fadeInDuration?: number; // seconds (0 for none)
  fadeOutDuration?: number; // seconds (0 for none)

  // Dialogue keyframe animation
  dialogueKeyframes?: DialogueKeyframe[];
}

export type CanvasElement = 
  | WallpaperElement 
  | XpWindowElement 
  | ImageViewerElement
  | DialogElement
  | DesktopIconElement
  | CursorElement 
  | TextElement 
  | TaskbarElement
  | AudioElement
  | VideoElement
  | AssistantElement;

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'overlay' | 'audio';
  color: string;
  muted?: boolean;
  locked?: boolean;
}

export interface CompositionSettings {
  width: number;
  height: number;
  fps: number;
  duration: number; // total duration in seconds
  aspectRatio: '16:9' | '4:3';
}

export interface EditorState {
  currentTime: number;
  isPlaying: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  zoom: number; // timeline zoom
  previewZoom: number; // preview canvas scale
  selectedElementId: string | null;
  activeSidebarTab: 'assets' | 'properties' | 'layers';
}

export interface ProjectAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  src: string;
  thumbnail?: string;
  size?: number;
  addedAt?: string;
}

export interface ProjectData {
  version: string;
  name: string;
  settings: CompositionSettings;
  elements: CanvasElement[];
  assets?: ProjectAsset[];
  savedAt: string;
}
