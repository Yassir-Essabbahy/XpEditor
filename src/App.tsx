import React, { useState, useEffect, useRef } from 'react';
import './styles/editor.css';
import { Header } from './components/Header/Header';
import { AssetLibrary } from './components/Sidebar/AssetLibrary';
import { PropertyInspector } from './components/Inspector/PropertyInspector';
import { LayersPanel } from './components/Layers/LayersPanel';
import { CanvasStage } from './components/Preview/CanvasStage';
import { PlaybackControls } from './components/Preview/PlaybackControls';
import { Timeline } from './components/Timeline/Timeline';
import { ExportModal } from './components/Export/ExportModal';
import { xpSoundGen } from './utils/xpSounds';
import { 
  CanvasElement, 
  CompositionSettings, 
  EditorState,
  ProjectData,
  ProjectAsset,
  AudioElement
} from './types/editor';
import { evaluateAudioVolume } from './utils/keyframeAnimation';
import { FolderGit2, Layers } from 'lucide-react';

const DEFAULT_PROJECT_ASSETS: ProjectAsset[] = [
  {
    id: 'asset-bliss',
    name: 'Windows XP Bliss Background',
    type: 'image',
    src: '/assets/WindowsXp_Background.jpg',
  },
  {
    id: 'asset-paint',
    name: 'Paint Canvas',
    type: 'image',
    src: '/assets/Paint.jpg',
  },
  {
    id: 'asset-cdplayer',
    name: 'CD Player Display',
    type: 'image',
    src: '/assets/CDPlayer.jpg',
  },
  {
    id: 'asset-error',
    name: 'Critical System Error',
    type: 'image',
    src: '/assets/Error.jpg',
  },
  {
    id: 'asset-notepad',
    name: 'Notepad Document',
    type: 'image',
    src: '/assets/Notepad.jpg',
  },
  {
    id: 'asset-clippy',
    name: 'Clippy Assistant',
    type: 'image',
    src: '/assets/xp/assistants/clippy/clippy.png',
  },
];

export const App: React.FC = () => {
  // Project metadata and modals
  const [projectName, setProjectName] = useState<string>('Windows XP Simulation');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const triggeredAudioRef = useRef<Set<string>>(new Set());
  const activeAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Composition settings (default 10s, fully extendable without upper limit)
  const [settings, setSettings] = useState<CompositionSettings>({
    width: 1280,
    height: 720,
    fps: 30,
    duration: 10,
    aspectRatio: '16:9',
  });

  // Editor interaction state
  const [editorState, setEditorState] = useState<EditorState>({
    currentTime: 0,
    isPlaying: false,
    isLooping: false,
    isMuted: false,
    zoom: 1.2,
    previewZoom: 1,
    selectedElementId: 'win-1',
    activeSidebarTab: 'assets',
  });

  // Default visual composition elements (classic XP desktop simulation preset)
  const [elements, setElements] = useState<CanvasElement[]>([
    {
      id: 'bg-1',
      name: 'Windows XP Bliss Background',
      type: 'wallpaper',
      trackId: 'track-1',
      startTime: 0,
      duration: 10,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 1,
      opacity: 1,
      visible: true,
      locked: false,
      imageSrc: '/assets/WindowsXp_Background.jpg',
    },
    {
      id: 'win-1',
      name: 'untitled - Paint',
      type: 'xp-window',
      trackId: 'track-2',
      startTime: 0,
      duration: 10,
      x: 10,
      y: 8,
      width: 52,
      height: 58,
      zIndex: 10,
      opacity: 1,
      visible: true,
      locked: false,
      title: 'untitled - Paint',
      windowType: 'paint',
      contentImageSrc: '/assets/Paint.jpg',
      isActive: true,
      hasMenuBar: true,
      hasStatusBar: true,
      statusText: 'For Help, click Help Topics on the Help Menu.',
    },
    {
      id: 'viewer-1',
      name: 'CD Player Image Viewer',
      type: 'image-viewer',
      trackId: 'track-2',
      startTime: 0.5,
      duration: 9.5,
      x: 38,
      y: 18,
      width: 55,
      height: 54,
      zIndex: 15,
      opacity: 1,
      visible: true,
      locked: false,
      title: 'CDPlayer.jpg - Windows Picture and Fax Viewer',
      imageSrc: '/assets/CDPlayer.jpg',
      imageName: 'CDPlayer.jpg',
      zoomLevel: 1,
      rotation: 0,
      fitMode: 'contain',
      isActive: true,
    },
    {
      id: 'win-2',
      name: 'Critical System Error',
      type: 'xp-window',
      trackId: 'track-2',
      startTime: 2,
      duration: 8,
      x: 28,
      y: 35,
      width: 40,
      height: 32,
      zIndex: 20,
      opacity: 1,
      visible: true,
      locked: false,
      title: 'System Error',
      windowType: 'error',
      contentImageSrc: '/assets/Error.jpg',
      isActive: true,
      hasMenuBar: false,
      hasStatusBar: false,
    },
    {
      id: 'taskbar-1',
      name: 'Windows XP Taskbar',
      type: 'taskbar',
      trackId: 'track-1',
      startTime: 0,
      duration: 10,
      x: 0,
      y: 93,
      width: 100,
      height: 7,
      zIndex: 30,
      opacity: 1,
      visible: true,
      locked: true,
    },
    {
      id: 'cursor-1',
      name: 'XP Mouse Pointer',
      type: 'cursor',
      trackId: 'track-3',
      startTime: 1,
      duration: 9,
      x: 52,
      y: 44,
      width: 4,
      height: 6,
      zIndex: 50,
      opacity: 1,
      visible: true,
      locked: false,
      cursorType: 'default',
    }
  ]);

  // Project media assets (persistent in .xpproj and offline safe)
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(() => {
    try {
      const saved = localStorage.getItem('xpeditor_saved_project');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assets && Array.isArray(parsed.assets) && parsed.assets.length > 0) {
          return parsed.assets;
        }
      }
    } catch (e) {}
    return DEFAULT_PROJECT_ASSETS;
  });

  const projectAssetsRef = useRef<ProjectAsset[]>(projectAssets);
  projectAssetsRef.current = projectAssets;

  const handleImportAsset = (asset: ProjectAsset) => {
    setProjectAssets((prev) => {
      const exists = prev.some((a) => a.src === asset.src || a.id === asset.id);
      if (exists) return prev;
      return [...prev, asset];
    });
  };

  const handleSetWallpaper = (src: string) => {
    recordSnapshot();
    setElements((prev) => {
      const bg = prev.find((el) => el.type === 'wallpaper');
      if (bg) {
        return prev.map((el) => el.id === bg.id ? ({ ...el, imageSrc: src } as CanvasElement) : el);
      } else {
        const newBg: CanvasElement = {
          id: `bg-${Date.now()}`,
          name: 'Windows XP Wallpaper',
          type: 'wallpaper',
          trackId: 'track-1',
          startTime: 0,
          duration: settingsRef.current.duration,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 1,
          opacity: 1,
          visible: true,
          locked: false,
          imageSrc: src,
        };
        return [newBg, ...prev];
      }
    });
  };

  // Synchronized state references for zero-stale event listeners
  const elementsRef = useRef<CanvasElement[]>(elements);
  elementsRef.current = elements;

  const settingsRef = useRef<CompositionSettings>(settings);
  settingsRef.current = settings;

  const editorStateRef = useRef<EditorState>(editorState);
  editorStateRef.current = editorState;

  const projectNameRef = useRef<string>(projectName);
  projectNameRef.current = projectName;

  // Clipboard for copy / paste
  const clipboardRef = useRef<CanvasElement | null>(null);

  // Undo / Redo history stacks (max 50 snapshots)
  const historyRef = useRef<{ past: CanvasElement[][]; future: CanvasElement[][] }>({
    past: [],
    future: [],
  });

  const recordSnapshot = (snapElements = elementsRef.current) => {
    historyRef.current.past.push(JSON.parse(JSON.stringify(snapElements)));
    if (historyRef.current.past.length > 50) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleUndo = () => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop()!;
    historyRef.current.future.push(JSON.parse(JSON.stringify(elementsRef.current)));
    setElements(previous);
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(true);

    const currSelected = editorStateRef.current.selectedElementId;
    if (currSelected && !previous.some((el) => el.id === currSelected)) {
      setEditorState((prev) => ({ ...prev, selectedElementId: previous[0]?.id || null }));
    }
  };

  const handleRedo = () => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop()!;
    historyRef.current.past.push(JSON.parse(JSON.stringify(elementsRef.current)));
    setElements(next);
    setCanUndo(true);
    setCanRedo(historyRef.current.future.length > 0);

    const currSelected = editorStateRef.current.selectedElementId;
    if (currSelected && !next.some((el) => el.id === currSelected)) {
      setEditorState((prev) => ({ ...prev, selectedElementId: next[0]?.id || null }));
    }
  };

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const stopAllAudio = () => {
    activeAudioMapRef.current.forEach((audio) => {
      try {
        audio.pause();
      } catch (e) {}
    });
    activeAudioMapRef.current.clear();
    triggeredAudioRef.current.clear();
  };

  const handleTogglePlay = () => {
    setEditorState((prev) => {
      if (prev.isPlaying) {
        stopAllAudio();
      } else {
        triggeredAudioRef.current.clear();
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  };

  const handleSeek = (time: number) => {
    stopAllAudio();
    setEditorState((prev) => ({
      ...prev,
      currentTime: Math.max(0, Math.min(settingsRef.current.duration, time)),
    }));
  };

  // Playback timer loop with synchronized audio & volume keyframe automation
  useEffect(() => {
    if (!editorState.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopAllAudio();
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setEditorState((prev) => {
        const prevTime = prev.currentTime;
        const nextTime = prevTime + delta;

        // Synchronized audio playback with volume keyframing & fade in / fade out curves
        if (!editorStateRef.current.isMuted) {
          elementsRef.current.forEach((el) => {
            if (el.type === 'audio') {
              const isWithinDuration = nextTime >= el.startTime && nextTime <= (el.startTime + el.duration);
              let audioObj = activeAudioMapRef.current.get(el.id);

              if (isWithinDuration) {
                const currentVol = evaluateAudioVolume(el, nextTime);
                if (!audioObj) {
                  if (el.audioSrc === 'builtin:error') {
                    if (!triggeredAudioRef.current.has(el.id)) {
                      triggeredAudioRef.current.add(el.id);
                      xpSoundGen.playErrorSound(currentVol);
                    }
                  } else if (el.audioSrc === 'builtin:balloon') {
                    if (!triggeredAudioRef.current.has(el.id)) {
                      triggeredAudioRef.current.add(el.id);
                      xpSoundGen.playNotificationSound(currentVol);
                    }
                  } else if (el.audioSrc === 'builtin:startup') {
                    if (!triggeredAudioRef.current.has(el.id)) {
                      triggeredAudioRef.current.add(el.id);
                      xpSoundGen.playStartupChord(currentVol);
                    }
                  } else if (el.audioSrc) {
                    audioObj = new Audio(el.audioSrc);
                    audioObj.currentTime = Math.max(0, nextTime - el.startTime);
                    audioObj.volume = Math.max(0, Math.min(1, currentVol));
                    audioObj.loop = !!(el as AudioElement).loop;
                    audioObj.play().catch(() => {});
                    activeAudioMapRef.current.set(el.id, audioObj);
                  }
                } else {
                  // Continuous real-time volume adjustment for keyframes & fades
                  audioObj.volume = Math.max(0, Math.min(1, currentVol));
                }
              } else if (audioObj) {
                audioObj.pause();
                activeAudioMapRef.current.delete(el.id);
              }
            }
          });
        } else {
          // Muted: silence any active audio
          activeAudioMapRef.current.forEach((a) => {
            a.volume = 0;
          });
        }

        if (nextTime >= settingsRef.current.duration) {
          stopAllAudio();
          if (editorStateRef.current.isLooping) {
            return { ...prev, currentTime: 0, isPlaying: true };
          }
          return { ...prev, currentTime: 0, isPlaying: false };
        }
        return { ...prev, currentTime: nextTime };
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopAllAudio();
    };
  }, [editorState.isPlaying]);

  // Element handlers
  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) => {
      const updated = prev.map((el) => (el.id === id ? ({ ...el, ...updates } as CanvasElement) : el));
      // Ensure project duration accommodates any lengthened/shifted element
      const maxEnd = Math.max(0, ...updated.map((el) => el.startTime + el.duration));
      if (maxEnd > settingsRef.current.duration) {
        setSettings((s) => ({ ...s, duration: Math.ceil(maxEnd) }));
      }
      return updated;
    });
  };

  const handleDeleteElement = (id: string) => {
    recordSnapshot();
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (editorStateRef.current.selectedElementId === id) {
      setEditorState((prev) => ({ ...prev, selectedElementId: null }));
    }
  };

  const handleAddElement = (preset: Partial<CanvasElement>) => {
    recordSnapshot();

    // 1. If adding a wallpaper, update existing background or add wallpaper seamlessly
    if (preset.type === 'wallpaper' || ((preset as any).imageSrc && preset.name?.toLowerCase().includes('wallpaper'))) {
      const wallSrc = (preset as any).imageSrc || (preset as any).contentImageSrc || '/assets/WindowsXp_Background.jpg';
      handleSetWallpaper(wallSrc);
      return;
    }

    const newId = `el-${Date.now()}`;
    const highestZ = Math.max(0, ...elementsRef.current.map((el) => el.zIndex)) + 1;
    const startTime = preset.startTime ?? editorStateRef.current.currentTime;
    const duration = preset.duration ?? 5;

    // Bridge contentImageSrc and imageSrc across element types to prevent blank windows
    const resolvedContentImage = (preset as any).contentImageSrc || ((preset.type === 'xp-window') ? (preset as any).imageSrc : undefined);
    const resolvedImageSrc = (preset as any).imageSrc || ((preset.type === 'image-viewer') ? (preset as any).contentImageSrc : undefined);

    const newElement: CanvasElement = {
      id: newId,
      name: preset.name || 'New Element',
      type: preset.type || 'xp-window',
      trackId: (preset.type === 'cursor' || preset.type === 'text') 
        ? 'track-3' 
        : ((preset.type as any) === 'wallpaper' || preset.type === 'taskbar' || preset.type === 'desktop-icon') 
          ? 'track-1' 
          : (preset.type === 'audio')
            ? 'track-4'
            : 'track-2',
      startTime,
      duration,
      x: preset.x ?? 25,
      y: preset.y ?? 20,
      width: preset.width ?? 50,
      height: preset.height ?? 40,
      zIndex: highestZ,
      opacity: 1,
      visible: true,
      locked: false,
      ...preset,
      ...(resolvedContentImage ? { contentImageSrc: resolvedContentImage } : {}),
      ...(resolvedImageSrc ? { imageSrc: resolvedImageSrc } : {}),
    } as CanvasElement;

    const end = startTime + duration;
    if (end > settingsRef.current.duration) {
      setSettings((s) => ({ ...s, duration: Math.ceil(end) }));
    }

    setElements((prev) => [...prev, newElement]);
    setEditorState((prev) => ({ ...prev, selectedElementId: newId }));
  };

  const handleSplitClip = (id: string, splitTime: number) => {
    const target = elementsRef.current.find((el) => el.id === id);
    if (!target) return;
    if (splitTime <= target.startTime || splitTime >= (target.startTime + target.duration)) return;

    recordSnapshot();
    const firstHalfDuration = splitTime - target.startTime;
    const secondHalfDuration = target.duration - firstHalfDuration;

    // Partition keyframes at the split point so each half keeps only its own
    // animation, with second-half times re-based to the new clip origin.
    const firstKfs = (target.keyframes || []).filter((k) => k.time < firstHalfDuration - 0.001);
    const secondKfs = (target.keyframes || [])
      .filter((k) => k.time >= firstHalfDuration - 0.001)
      .map((k) => ({ ...k, time: Number((k.time - firstHalfDuration).toFixed(3)) }));
    let firstDkf: any = undefined;
    let secondDkf: any = undefined;
    if ((target as any).dialogueKeyframes) {
      const dKfs = (target as any).dialogueKeyframes as any[];
      firstDkf = dKfs.filter((k) => k.time < firstHalfDuration - 0.001);
      secondDkf = dKfs
        .filter((k) => k.time >= firstHalfDuration - 0.001)
        .map((k) => ({ ...k, time: Number((k.time - firstHalfDuration).toFixed(3)) }));
    }

    const updatedOriginal: CanvasElement = {
      ...target,
      duration: firstHalfDuration,
      keyframes: firstKfs,
      ...(firstDkf !== undefined ? { dialogueKeyframes: firstDkf } : {}),
    } as CanvasElement;
    const secondPart: CanvasElement = {
      ...target,
      id: `${target.id}-split-${Date.now()}`,
      startTime: splitTime,
      duration: secondHalfDuration,
      keyframes: secondKfs,
      ...(secondDkf !== undefined ? { dialogueKeyframes: secondDkf } : {}),
    } as CanvasElement;

    setElements((prev) => [
      ...prev.map((el) => (el.id === id ? updatedOriginal : el)),
      secondPart,
    ]);
  };

  const handleReorderLayer = (id: string, direction: 'up' | 'down') => {
    recordSnapshot();
    const target = elementsRef.current.find((el) => el.id === id);
    if (!target) return;
    const newZ = direction === 'up' ? target.zIndex + 2 : Math.max(1, target.zIndex - 2);
    handleUpdateElement(id, { zIndex: newZ });
  };

  const handleCopy = () => {
    const selected = elementsRef.current.find((el) => el.id === editorStateRef.current.selectedElementId);
    if (selected) {
      clipboardRef.current = JSON.parse(JSON.stringify(selected));
    }
  };

  const handlePaste = () => {
    if (!clipboardRef.current) return;
    recordSnapshot();
    const newId = `el-${Date.now()}`;
    const highestZ = Math.max(0, ...elementsRef.current.map((el) => el.zIndex)) + 1;
    const pasted: CanvasElement = {
      ...JSON.parse(JSON.stringify(clipboardRef.current)),
      id: newId,
      name: `${clipboardRef.current.name} (Copy)`,
      x: Math.min(80, clipboardRef.current.x + 3),
      y: Math.min(80, clipboardRef.current.y + 3),
      startTime: editorStateRef.current.currentTime,
      zIndex: highestZ,
    };
    const end = pasted.startTime + pasted.duration;
    if (end > settingsRef.current.duration) {
      setSettings((s) => ({ ...s, duration: Math.ceil(end) }));
    }
    setElements((prev) => [...prev, pasted]);
    setEditorState((prev) => ({ ...prev, selectedElementId: newId }));
  };

  const handleDuplicate = () => {
    const selected = elementsRef.current.find((el) => el.id === editorStateRef.current.selectedElementId);
    if (!selected) return;
    recordSnapshot();
    const newId = `el-${Date.now()}`;
    const highestZ = Math.max(0, ...elementsRef.current.map((el) => el.zIndex)) + 1;
    const duplicated: CanvasElement = {
      ...JSON.parse(JSON.stringify(selected)),
      id: newId,
      name: `${selected.name} (Copy)`,
      x: Math.min(80, selected.x + 3),
      y: Math.min(80, selected.y + 3),
      startTime: selected.startTime,
      zIndex: highestZ,
    };
    setElements((prev) => [...prev, duplicated]);
    setEditorState((prev) => ({ ...prev, selectedElementId: newId }));
  };

  const handleSaveProject = (customName?: string) => {
    const nameToUse = customName || projectNameRef.current;
    const projectData: ProjectData = {
      version: '1.0',
      name: nameToUse,
      settings: settingsRef.current,
      elements: elementsRef.current,
      assets: projectAssetsRef.current,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('xpeditor_saved_project', JSON.stringify(projectData));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nameToUse.replace(/[^a-zA-Z0-9_-]/g, '_') || 'xp_simulation'}.xpproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveProjectAs = () => {
    const newName = window.prompt('Save Project As - Enter project name:', projectNameRef.current);
    if (newName && newName.trim()) {
      setProjectName(newName.trim());
      handleSaveProject(newName.trim());
    }
  };

  const handleOpenProject = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text) as ProjectData;
        if (data && data.elements && data.settings) {
          setProjectName(data.name || 'Imported Project');
          setSettings(data.settings);
          setElements(data.elements);
          if (data.assets && Array.isArray(data.assets)) {
            setProjectAssets(data.assets);
          }
          triggeredAudioRef.current.clear();
          historyRef.current = { past: [], future: [] };
          setCanUndo(false);
          setCanRedo(false);
          setEditorState((prev) => ({
            ...prev,
            currentTime: 0,
            isPlaying: false,
            selectedElementId: data.elements[0]?.id || null,
          }));
        } else {
          alert('Invalid project file format: missing settings or elements.');
        }
      } catch (err) {
        console.error('Failed to parse project file:', err);
        alert('Could not open file: invalid project JSON format.');
      }
    };
    reader.readAsText(file);
  };

  // Keyboard shortcut listener (robust, zero stale-state, preserves text editing)
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true;
      }
      if (target.isContentEditable) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // A keyframe deletion in the Timeline calls preventDefault() — never
      // escalate that into deleting the whole clip.
      if (e.defaultPrevented) return;
      const inInput = isEditableTarget(e.target);
      const isCtrl = e.ctrlKey || e.metaKey;

      // 1. Project Shortcuts (work even inside inputs)
      if (isCtrl && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSaveProjectAs();
        return;
      }
      if (isCtrl && !e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // 2. Escape cancels current input focus or deselects element
      if (e.code === 'Escape') {
        if (inInput) {
          (e.target as HTMLElement).blur();
        } else {
          setEditorState((prev) => ({ ...prev, selectedElementId: null }));
        }
        return;
      }

      // If user is typing in a text field, DO NOT trigger editor canvas/timeline shortcuts!
      if (inInput) return;

      // 3. Undo / Redo
      if (isCtrl && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((isCtrl && e.shiftKey && e.code === 'KeyZ') || (isCtrl && e.code === 'KeyY')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 4. Clipboard & Selection
      if (isCtrl && e.code === 'KeyC') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (isCtrl && e.code === 'KeyV') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (isCtrl && e.code === 'KeyD') {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (isCtrl && e.code === 'KeyA') {
        e.preventDefault();
        if (elementsRef.current.length > 0) {
          setEditorState((prev) => ({ ...prev, selectedElementId: elementsRef.current[0].id }));
        }
        return;
      }

      // 5. Delete / Backspace
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (editorStateRef.current.selectedElementId) {
          e.preventDefault();
          handleDeleteElement(editorStateRef.current.selectedElementId);
        }
        return;
      }

      // 6. Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // 7. Timeline navigation
      const fps = settingsRef.current.fps || 30;
      const frameDuration = 1 / fps;
      const currTime = editorStateRef.current.currentTime;
      const totalDur = settingsRef.current.duration;

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : frameDuration;
        handleSeek(Math.max(0, currTime - step));
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : frameDuration;
        handleSeek(Math.min(totalDur, currTime + step));
        return;
      }
      if (e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
        return;
      }
      if (e.code === 'End') {
        e.preventDefault();
        handleSeek(totalDur);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedElement = elements.find((el) => el.id === editorState.selectedElementId) || null;

  return (
    <div className="editor-root">
      {/* 1. Modern Neutral Top Navigation & Controls */}
      <Header
        projectName={projectName}
        onUpdateProjectName={setProjectName}
        settings={settings}
        onUpdateSettings={(newS) => {
          setSettings((prev) => {
            const updated = { ...prev, ...newS };
            if (newS.duration !== undefined) {
              const minNeeded = Math.max(1, ...elementsRef.current.map((el) => el.startTime + el.duration));
              updated.duration = Math.max(minNeeded, newS.duration);
            }
            return updated;
          });
        }}
        onExportClick={() => setIsExportModalOpen(true)}
        onSaveProject={() => handleSaveProject()}
        onOpenProject={handleOpenProject}
        onSaveProjectAs={handleSaveProjectAs}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddElement={(type) => {
          if (type === 'image-viewer') {
            handleAddElement({
              name: 'Picture Viewer',
              type: 'image-viewer',
              title: 'photo.jpg - Windows Picture and Fax Viewer',
              imageSrc: '/assets/Paint.jpg',
              imageName: 'photo.jpg',
              zoomLevel: 1,
              rotation: 0,
              fitMode: 'contain',
              isActive: true,
              width: 56,
              height: 52,
            });
          } else if (type === 'xp-window') {
            handleAddElement({
              name: 'Notepad Window',
              type: 'xp-window',
              title: 'Untitled - Notepad',
              windowType: 'notepad',
              contentImageSrc: '/assets/Notepad.jpg',
              hasMenuBar: true,
              hasStatusBar: true,
            });
          } else if (type === 'dialog') {
            handleAddElement({
              name: 'System Error Alert',
              type: 'dialog',
              dialogTitle: 'System Error',
              message: 'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01).',
              iconType: 'error',
              buttonLayout: 'ok',
              width: 38,
              height: 25,
            });
          } else if (type === 'cursor') {
            handleAddElement({
              name: 'Mouse Pointer',
              type: 'cursor',
              cursorType: 'default',
            });
          }
        }}
      />

      {/* 2. Main Workspace */}
      <div className="editor-workspace">
        {/* Left Sidebar: Assets & Layers */}
        <aside className="editor-sidebar" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab-btn ${editorState.activeSidebarTab === 'assets' ? 'active' : ''}`}
              onClick={() => setEditorState((prev) => ({ ...prev, activeSidebarTab: 'assets' }))}
            >
              <FolderGit2 size={14} />
              <span>Assets</span>
            </button>
            <button
              className={`sidebar-tab-btn ${editorState.activeSidebarTab === 'layers' ? 'active' : ''}`}
              onClick={() => setEditorState((prev) => ({ ...prev, activeSidebarTab: 'layers' }))}
            >
              <Layers size={14} />
              <span>Layers</span>
            </button>
          </div>

          <div className="sidebar-content">
            {editorState.activeSidebarTab === 'assets' && (
              <AssetLibrary 
                onAddElement={handleAddElement} 
                projectAssets={projectAssets}
                onImportAsset={handleImportAsset}
                onSetWallpaper={handleSetWallpaper}
              />
            )}
            {editorState.activeSidebarTab === 'layers' && (
              <LayersPanel
                elements={elements}
                selectedElementId={editorState.selectedElementId}
                onSelectElement={(id) => setEditorState((prev) => ({ ...prev, selectedElementId: id }))}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onReorderLayer={handleReorderLayer}
              />
            )}
          </div>
        </aside>

        {/* Center Stage & Monitor Area */}
        <section className="editor-stage-area">
          <CanvasStage
            elements={elements}
            currentTime={editorState.currentTime}
            settings={settings}
            selectedElementId={editorState.selectedElementId}
            previewZoom={editorState.previewZoom}
            onSelectElement={(id) => setEditorState((prev) => ({ ...prev, selectedElementId: id }))}
            onUpdateElement={handleUpdateElement}
            onZoomChange={(zoom) => setEditorState((prev) => ({ ...prev, previewZoom: zoom }))}
            onInteractionStart={() => recordSnapshot()}
            onSeek={handleSeek}
          />

          {/* Transport / Playback Controls Bar */}
          <PlaybackControls
            currentTime={editorState.currentTime}
            duration={settings.duration}
            isPlaying={editorState.isPlaying}
            isLooping={editorState.isLooping}
            isMuted={editorState.isMuted}
            onTogglePlay={handleTogglePlay}
            onToggleLoop={() => setEditorState((prev) => ({ ...prev, isLooping: !prev.isLooping }))}
            onToggleMute={() => setEditorState((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
            onSeek={handleSeek}
            onStepFrame={(frames) => {
              const delta = frames * (1 / settings.fps);
              handleSeek(editorState.currentTime + delta);
            }}
          />
        </section>

        {/* Dedicated Right Panel: Inspector ALWAYS mounted and visible */}
        <aside className="editor-inspector" onClick={(e) => e.stopPropagation()}>
          <div className="panel-header">
            <span>Inspector</span>
            {selectedElement && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                {selectedElement.name}
              </span>
            )}
          </div>
          <div className="inspector-body">
            <PropertyInspector
              selectedElement={selectedElement}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              projectAssets={projectAssets}
              onImportAsset={handleImportAsset}
              currentTime={editorState.currentTime}
              onSeek={handleSeek}
              onInteractionStart={() => recordSnapshot()}
            />
          </div>
        </aside>
      </div>

      {/* 3. Bottom Multi-Track Timeline */}
      <Timeline
        elements={elements}
        currentTime={editorState.currentTime}
        duration={settings.duration}
        zoom={editorState.zoom}
        selectedElementId={editorState.selectedElementId}
        onSeek={handleSeek}
        onSelectElement={(id) => setEditorState((prev) => ({ ...prev, selectedElementId: id }))}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
        onSplitClip={handleSplitClip}
        onZoomChange={(zoom) => setEditorState((prev) => ({ ...prev, zoom }))}
        onExtendDuration={(newDur) => {
          setSettings((prev) => ({ ...prev, duration: newDur }));
        }}
        onInteractionStart={() => recordSnapshot()}
      />

      {/* Hidden file input for opening projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xpproj,application/json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Export MP4 Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={settings}
        elements={elements}
        projectName={projectName}
      />
    </div>
  );
};

export default App;
