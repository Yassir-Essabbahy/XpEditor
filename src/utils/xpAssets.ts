/**
 * Windows XP Asset Registry
 * Central catalog of authentic Windows XP assets integrated into XP Studio:
 * Wallpapers, System Sounds, Icons, Cursors, and Assistant Overlays.
 */

export interface XpWallpaperPreset {
  id: string;
  name: string;
  src: string;
}

export interface XpSoundPreset {
  id: string;
  name: string;
  description: string;
  src: string;
  duration: number; // in seconds
}

export interface XpIconPreset {
  id: string;
  label: string;
  src: string;
}

export interface XpCursorPreset {
  id: string;
  label: string;
  src: string;
}

// 1. Authentic Windows XP Wallpapers
export const XP_WALLPAPERS: XpWallpaperPreset[] = [
  { id: 'bliss-classic', name: 'Bliss (Default Wallpaper)', src: '/assets/WindowsXp_Background.jpg' },
  { id: 'bliss-png', name: 'Bliss (High Res PNG)', src: '/assets/xp/wallpapers/Bliss.png' },
  { id: 'autumn', name: 'Autumn', src: '/assets/xp/wallpapers/Autumn.png' },
  { id: 'azul', name: 'Azul', src: '/assets/xp/wallpapers/Azul.png' },
  { id: 'ascent', name: 'Ascent', src: '/assets/xp/wallpapers/Ascent.png' },
  { id: 'crystal', name: 'Crystal', src: '/assets/xp/wallpapers/Crystal.png' },
  { id: 'follow', name: 'Follow', src: '/assets/xp/wallpapers/Follow.png' },
  { id: 'friend', name: 'Friend', src: '/assets/xp/wallpapers/Friend.png' },
  { id: 'home', name: 'Home', src: '/assets/xp/wallpapers/Home.png' },
  { id: 'moon-flower', name: 'Moon Flower', src: '/assets/xp/wallpapers/Moon_flower.png' },
  { id: 'peace', name: 'Peace', src: '/assets/xp/wallpapers/Peace.png' },
  { id: 'power', name: 'Power', src: '/assets/xp/wallpapers/Power.png' },
  { id: 'purple-flower', name: 'Purple Flower', src: '/assets/xp/wallpapers/Purple_flower.png' },
  { id: 'radiance', name: 'Radiance', src: '/assets/xp/wallpapers/Radiance.png' },
  { id: 'red-moon-desert', name: 'Red Moon Desert', src: '/assets/xp/wallpapers/Red_moon_desert.png' },
  { id: 'ripple', name: 'Ripple', src: '/assets/xp/wallpapers/Ripple.png' },
  { id: 'stonehenge', name: 'Stonehenge', src: '/assets/xp/wallpapers/Stonehenge.png' },
  { id: 'tulips', name: 'Tulips', src: '/assets/xp/wallpapers/Tulips.png' },
  { id: 'vortec-space', name: 'Vortec Space', src: '/assets/xp/wallpapers/Vortec_space.png' },
  { id: 'wind', name: 'Wind', src: '/assets/xp/wallpapers/Wind.png' },
  { id: 'xp-home', name: 'Windows XP Home Edition', src: '/assets/xp/wallpapers/Windows_XP_Home_Edition.png' },
  { id: 'xp-pro', name: 'Windows XP Professional', src: '/assets/xp/wallpapers/Windows_XP_Professional.png' },
];

// 2. Authentic Windows XP System Audio
export const XP_SOUNDS: XpSoundPreset[] = [
  { id: 'startup', name: 'Windows XP Startup', description: 'Iconic Orchestral Chime', src: '/assets/xp/sounds/startup.wav', duration: 4.0 },
  { id: 'shutdown', name: 'Windows XP Shutdown', description: 'Four-Note Descending Chime', src: '/assets/xp/sounds/shutdown.wav', duration: 3.0 },
  { id: 'logon', name: 'Windows XP Logon', description: 'User Welcome Chime', src: '/assets/xp/sounds/logon.wav', duration: 2.5 },
  { id: 'logoff', name: 'Windows XP Logoff', description: 'User Session Logoff', src: '/assets/xp/sounds/logoff.wav', duration: 2.5 },
  { id: 'critical_stop', name: 'Critical Stop', description: 'Classic Deep Error Chord', src: '/assets/xp/sounds/critical_stop.wav', duration: 1.0 },
  { id: 'error', name: 'Standard Error', description: 'System Warning/Error', src: '/assets/xp/sounds/error.wav', duration: 1.0 },
  { id: 'exclamation', name: 'Exclamation', description: 'Alert / Attention Prompt', src: '/assets/xp/sounds/exclamation.wav', duration: 1.0 },
  { id: 'ding', name: 'Ding', description: 'Default System Beep Ding', src: '/assets/xp/sounds/ding.wav', duration: 0.8 },
  { id: 'balloon', name: 'Balloon Tooltip', description: 'Taskbar Notification Pop', src: '/assets/xp/sounds/balloon.wav', duration: 0.6 },
  { id: 'recycle', name: 'Recycle Bin Empty', description: 'Paper Crumple Sound', src: '/assets/xp/sounds/recycle.wav', duration: 1.2 },
  { id: 'hardware_insert', name: 'Hardware Insert', description: 'USB Device Connected Chime', src: '/assets/xp/sounds/hardware_insert.wav', duration: 1.0 },
  { id: 'hardware_remove', name: 'Hardware Remove', description: 'USB Device Disconnected Chime', src: '/assets/xp/sounds/hardware_remove.wav', duration: 1.0 },
  { id: 'information_bar', name: 'Information Bar', description: 'IE Security Notification Bar', src: '/assets/xp/sounds/information_bar.wav', duration: 0.8 },
  { id: 'popup_blocked', name: 'Pop-up Blocked', description: 'Security Warning Pop', src: '/assets/xp/sounds/popup_blocked.wav', duration: 1.0 },
];

// 3. Authentic Windows XP Desktop & Dialog Icons
export const XP_ICONS: XpIconPreset[] = [
  { id: 'my-computer', label: 'My Computer', src: '/assets/xp/icons/my_computer.png' },
  { id: 'my-documents', label: 'My Documents', src: '/assets/xp/icons/my_documents.png' },
  { id: 'recycle-bin', label: 'Recycle Bin', src: '/assets/xp/icons/recycle_bin.png' },
  { id: 'recycle-bin-full', label: 'Recycle Bin (Full)', src: '/assets/xp/icons/recycle_bin_full.png' },
  { id: 'folder', label: 'Folder', src: '/assets/xp/icons/folder.png' },
  { id: 'internet', label: 'Internet Explorer', src: '/assets/xp/icons/internet_explorer.png' },
  { id: 'notepad', label: 'Notepad Document', src: '/assets/xp/icons/notepad.png' },
  { id: 'search', label: 'Search', src: '/assets/xp/icons/search.png' },
  { id: 'help', label: 'Help and Support', src: '/assets/xp/icons/help.png' },
  { id: 'error', label: 'Critical Error', src: '/assets/xp/icons/error.png' },
  { id: 'warning', label: 'Warning', src: '/assets/xp/icons/warning.png' },
  { id: 'info', label: 'Information', src: '/assets/xp/icons/info.png' },
  { id: 'question', label: 'Question', src: '/assets/xp/icons/question.png' },
];

export const XP_ICON_PATHS: Record<string, string> = {
  'my-computer': '/assets/xp/icons/my_computer.png',
  'my-documents': '/assets/xp/icons/my_documents.png',
  'recycle-bin': '/assets/xp/icons/recycle_bin.png',
  'recycle-bin-full': '/assets/xp/icons/recycle_bin_full.png',
  'folder': '/assets/xp/icons/folder.png',
  'internet': '/assets/xp/icons/internet_explorer.png',
  'notepad': '/assets/xp/icons/notepad.png',
  'search': '/assets/xp/icons/search.png',
  'help': '/assets/xp/icons/help.png',
  'error': '/assets/xp/icons/error.png',
  'warning': '/assets/xp/icons/warning.png',
  'info': '/assets/xp/icons/info.png',
  'question': '/assets/xp/icons/question.png',
};

// 4. Authentic Windows XP Cursors
export const XP_CURSORS: XpCursorPreset[] = [
  { id: 'default', label: 'Standard Arrow', src: '/assets/xp/cursors/arrow.png' },
  { id: 'pointer', label: 'Link Hand Pointer', src: '/assets/xp/cursors/pointer.png' },
  { id: 'hourglass', label: 'Busy / Hourglass', src: '/assets/xp/cursors/wait.png' },
  { id: 'busy', label: 'Arrow with Hourglass', src: '/assets/xp/cursors/busy.png' },
  { id: 'text', label: 'I-Beam Text Selector', src: '/assets/xp/cursors/ibeam.png' },
  { id: 'move', label: '4-Way Move Cursor', src: '/assets/xp/cursors/move.png' },
  { id: 'helpsel', label: 'Help Select', src: '/assets/xp/cursors/helpsel.png' },
  { id: 'no', label: 'Unavailable / No', src: '/assets/xp/cursors/no.png' },
  { id: 'up', label: 'Vertical Arrow', src: '/assets/xp/cursors/up.png' },
  { id: 'size_ns', label: 'Resize Vertical', src: '/assets/xp/cursors/size_ns.png' },
  { id: 'size_we', label: 'Resize Horizontal', src: '/assets/xp/cursors/size_we.png' },
];

export const XP_CURSOR_PATHS: Record<string, string> = {
  'default': '/assets/xp/cursors/arrow.png',
  'pointer': '/assets/xp/cursors/pointer.png',
  'hourglass': '/assets/xp/cursors/wait.png',
  'wait': '/assets/xp/cursors/wait.png',
  'busy': '/assets/xp/cursors/busy.png',
  'text': '/assets/xp/cursors/ibeam.png',
  'move': '/assets/xp/cursors/move.png',
  'helpsel': '/assets/xp/cursors/helpsel.png',
  'no': '/assets/xp/cursors/no.png',
  'up': '/assets/xp/cursors/up.png',
  'size_ns': '/assets/xp/cursors/size_ns.png',
  'size_we': '/assets/xp/cursors/size_we.png',
};

// 5. Windows XP Assistants & Poses
export interface XpAssistantPosePreset {
  id: string;
  label: string;
  src: string;
}

export const XP_ASSISTANT_POSES: XpAssistantPosePreset[] = [
  { id: 'idle', label: 'Idle / Standing', src: '/assets/xp/assistants/clippy/clippy_idle.png' },
  { id: 'think', label: 'Thinking / Questioning', src: '/assets/xp/assistants/clippy/clippy_think.png' },
  { id: 'noted', label: 'Taking Notes', src: '/assets/xp/assistants/clippy/clippy_noted.png' },
  { id: 'listen', label: 'Listening Closely', src: '/assets/xp/assistants/clippy/clippy_listen.png' },
  { id: 'check', label: 'Ready / Approved', src: '/assets/xp/assistants/clippy/clippy_check.png' },
  { id: 'cool', label: 'Cool / Sunglasses', src: '/assets/xp/assistants/clippy/clippy_cool.png' },
];

export const XP_ASSISTANT_POSE_MAP: Record<string, string> = {
  'idle': '/assets/xp/assistants/clippy/clippy_idle.png',
  'think': '/assets/xp/assistants/clippy/clippy_think.png',
  'noted': '/assets/xp/assistants/clippy/clippy_noted.png',
  'listen': '/assets/xp/assistants/clippy/clippy_listen.png',
  'check': '/assets/xp/assistants/clippy/clippy_check.png',
  'cool': '/assets/xp/assistants/clippy/clippy_cool.png',
};

export const XP_ASSISTANT_SHEET = '/assets/xp/assistants/clippy/clippy_idle_sheet.png';

// Play sound preview helper
let currentAudio: HTMLAudioElement | null = null;
export function playXpSound(soundSrc: string) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audio = new Audio(soundSrc);
    currentAudio = audio;
    audio.play().catch((err) => {
      console.warn('Audio preview playback blocked or failed:', err);
    });
  } catch (err) {
    console.error('Audio play error:', err);
  }
}
