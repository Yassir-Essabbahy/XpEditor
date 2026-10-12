# XP Studio — Windows XP Asset Manifest

This document records the asset inventory, origins, integration points, and bloat reduction rationale for the authentic Windows XP asset pack integrated into **XP Studio**.

---

## 1. Source Archive & Attribution

* **Source Archive:** `Assets/WinXp.zip` (84.7 MB archive, 87.81 MB uncompressed, 330 total files)
* **Master Backup Location:** Preserved intact at `Assets/WinXp.zip` outside the public runtime build to prevent accidental modification or loss.
* **Creator / Curator Attribution:** [NullTale (itch.io)](https://nulltale.itch.io/)
* **Original Intellectual Property:** Microsoft Corporation (Windows XP Luna aesthetic, system sounds, iconic wallpapers, Tahoma typography, and system icons).
* **Licensing / Usage Context:** Intended for artistic and nostalgic simulation within the XP Studio desktop video editor composition system.

---

## 2. Integrated Asset Inventory

All runtime assets are organized under `public/assets/xp/` and accessible across the application via Vite static serving (`/assets/xp/...`).

### A. Wallpapers (`public/assets/xp/wallpapers/`) — 21 High-Resolution PNGs (9.65 MB)
* `Bliss.png` — The iconic Charles O'Rear green rolling hill landscape (XP default).
* `Autumn.png` — Classic vibrant fall foliage in nature.
* `Azul.png` — Vibrant deep blue ocean seascape.
* `Ascent.png` — Classic misty mountain peak.
* `Crystal.png` — Abstract crystal glass structure.
* `Follow.png` — Footpath winding through trees.
* `Friend.png` — Dog companion in nature.
* `Home.png` — Warm cottage architecture.
* `Moon_flower.png` — Nighttime white blossom with celestial background.
* `Peace.png` — Minimalist calm Zen landscape.
* `Power.png` — Lightning and storm electricity.
* `Purple_flower.png` — Macro photography of purple petals.
* `Radiance.png` — Solar lens flare and light rays.
* `Red_moon_desert.png` — Crimson desert dunes under night sky.
* `Ripple.png` — Water ripple abstract pattern.
* `Stonehenge.png` — Prehistoric stone monument in England.
* `Tulips.png` — Classic field of colorful spring tulips.
* `Vortec_space.png` — Deep space cosmic vortex.
* `Wind.png` — Windblown trees against sky.
* `Windows_XP_Home_Edition.png` — Official Windows XP Home Edition branded backdrop.
* `Windows_XP_Professional.png` — Official Windows XP Professional branded backdrop.

### B. System Sounds (`public/assets/xp/sounds/`) — 17 Authentic RIFF/WAVE Files (1.40 MB)
* `startup.wav` (4.0s) — The iconic orchestral chime played when Windows XP boots.
* `shutdown.wav` (3.0s) — Four-note descending farewell chime played on system shutdown.
* `logon.wav` (2.5s) — Melodic welcoming chime played upon user logon.
* `logoff.wav` (2.5s) — Soft chime played upon user logoff.
* `critical_stop.wav` (1.0s) — Classic deep error chord for fatal system errors.
* `error.wav` (1.0s) — Standard Windows warning/error sound.
* `exclamation.wav` (1.0s) — System exclamation sound for attention prompts.
* `ding.wav` (0.8s) — Default system ding alert.
* `balloon.wav` (0.6s) — Taskbar notification balloon chime.
* `recycle.wav` (1.2s) — Authentic paper crumple sound when emptying the Recycle Bin.
* `hardware_insert.wav` (1.0s) — Rising chime when a USB device or hardware is plugged in.
* `hardware_remove.wav` (1.0s) — Falling chime when a USB device or hardware is unplugged.
* `information_bar.wav` (0.8s) — Browser notification / security alert bar chime.
* `popup_blocked.wav` (1.0s) — Pop-up blocker notification sound.
* `notify.wav` (1.0s) — System notification tone.
* `minimize.wav` (0.5s) — Window minimize swoosh effect.
* `restore.wav` (0.5s) — Window restore / un-minimize sound.

### C. Desktop & Dialog Icons (`public/assets/xp/icons/`) — Sliced 32×32 PNGs & Sprite Sheets (1.29 MB)
* Sliced Individual 32×32 Icons:
  * `my_computer.png` — Classic CRT monitor, tower, and keyboard icon.
  * `my_documents.png` — Classic yellow folder icon with document tab.
  * `recycle_bin.png` — Empty transparent wireframe mesh wastebasket.
  * `recycle_bin_full.png` — Wastebasket full of discarded paper.
  * `internet_explorer.png` — Iconic blue globe with green continents.
  * `notepad.png` — Notepad text document with folded corner.
  * `folder.png` — Yellow directory folder.
  * `error.png` — Red circle with white Stop 'X'.
  * `warning.png` — Yellow triangle with black exclamation mark.
  * `info.png` — Blue circle with white lowercase 'i'.
  * `question.png` — Blue circle with white question mark '?'.
  * `help.png` — Help speech bubble with blue question mark.
  * `search.png` — Magnifying glass with search flashlight.
* Complete Sprite Sheets (for custom icon lookups):
  * `WinIcons_32.png` (459 KB, 23×22 grid = 506 authentic 32×32 XP icons).
  * `WinIcons_48.png` (725 KB, high-resolution 48×48 sprite sheet).
  * `WinIcons_16.png` (154 KB, 16×16 compact status/menu sprite sheet).

### D. Cursors (`public/assets/xp/cursors/`) — 14 Crisp PNG Cursors (< 25 KB)
* `arrow.png` — Default Windows XP black-bordered white cursor arrow.
* `pointer.png` — Link hand cursor with pointing index finger.
* `wait.png` — Classic blue-tinted hourglass cursor.
* `busy.png` — Arrow cursor with companion mini-hourglass.
* `ibeam.png` — Text selection I-beam.
* `move.png` — 4-direction crosshair movement cursor.
* `helpsel.png` — Arrow cursor with question mark badge.
* `no.png` — Universal slash circle (unavailable/disabled).
* `up.png` — Upward vertical pointing arrow.
* `pen.png` — Handwriting pen stylus cursor.
* `size_ns.png` — Vertical resize cursor.
* `size_we.png` — Horizontal resize cursor.
* `size_nwse.png` — Diagonal resize cursor (top-left to bottom-right).
* `size_nesw.png` — Diagonal resize cursor (top-right to bottom-left).

### E. Fonts (`public/assets/xp/fonts/`) — (383 KB)
* `tahoma.ttf` — Authentic Windows XP system font.
* Registered in `src/styles/editor.css` via `@font-face` so all canvas, preview, and exported titles render identical typography across all platforms.

### F. UI & System Graphics (`public/assets/xp/ui/`) — (190 KB)
* `windows_logo.png` — Classic 4-color waving Windows flag logo.
* `minesweeper.png` — Authentic Minesweeper board graphic.
* `boot_settings_screen.png` — Classic BIOS / Windows XP text-mode boot setup graphic.

### G. Clippy Assistant & Poses (`public/assets/xp/assistants/clippy/`) — (1.32 MB)
* `clippy.png` — Transparent, 240×240 pixel-perfect 32-bit RGBA master render of Microsoft Office Assistant Clippy.
* `clippy_idle.png` — Default upright attentive idle pose (240×240 transparent RGBA).
* `clippy_think.png` — Eyebrows arched, looking upward in deep thought (240×240 transparent RGBA).
* `clippy_noted.png` — Holding paper and yellow pencil writing notes (240×240 transparent RGBA).
* `clippy_listen.png` — Leaning forward with hand cupping ear listening closely (240×240 transparent RGBA).
* `clippy_check.png` — Thumbs-up / approved ready gesture (240×240 transparent RGBA).
* `clippy_cool.png` — Wearing cool black sunglasses (240×240 transparent RGBA).
* `clippy_idle_sheet.png` — Authentic 33-frame continuous sprite sheet (7920×240 transparent RGBA) supporting 12 FPS looping animation.

---

## 3. Preserved Existing Application Assets

The following existing assets were untouched and remain in active use:
* `public/assets/WindowsXp_Background.jpg` — Classic default wallpaper used in default project templates.
* `public/assets/Error.jpg` — Critical system error graphic used by default error window elements.
* `public/assets/Paint.jpg` — MS Paint UI content graphic.
* `public/assets/CDPlayer.jpg` — CD Player UI content graphic.
* `public/assets/Notepad.jpg` — Notepad document text content graphic.

---

## 4. Excluded Assets & Bloat Reduction Rationale

| Asset Category in Source Pack | Size in Zip / Uncompressed | Decision | Rationale |
| :--- | :--- | :--- | :--- |
| `Clip/ase/*.ase` (25 Aseprite project files) | **~30.0 MB** | **Excluded** | Proprietary raw editor format unusable by browsers, canvas, or FFmpeg. Standard PNG renders were extracted instead. |
| `Clip/sheets/*.png` (23 extra large sprite sheets) | **~41.8 MB** | **Excluded** | Giant 20,000–35,000px wide sheets for non-essential Clippy actions (e.g. airplane, shovel, sleep) unnecessarily bloat repository size. Kept only high-utility `clippy.png` (29 KB) and idle sheet. |
| Duplicate Cursor Variants (3D Gold / Silver / Inverted) | **~30 KB** (180+ duplicate files) | **Excluded** | Redundant non-standard color variants cluttering the directory. Kept the authentic default Windows XP cursor set. |
| Hashed Logo PNGs (`a35069...png`, `ee826d...png`) | **~1.38 MB** | **Excluded** | Duplicate or unreferenced raw image dumps from web scraping. Kept crisp `windows_logo.png` and `boot_settings_screen.png`. |
| **Total Bloat Eliminated** | **> 73.0 MB** | — | Clean integration achieved at **14.05 MB** (< 20 MB target). |

---

## 5. Application Integration Points

1. **`src/utils/xpAssets.ts`**:
   * Central registry exposing `XP_WALLPAPERS`, `XP_SOUNDS`, `XP_ICONS`, `XP_CURSORS`, `XP_ICON_PATHS`, `XP_CURSOR_PATHS`, `XP_ASSISTANT_POSES`, `XP_ASSISTANT_POSE_MAP`, and `XP_ASSISTANT_SHEET`.
   * Includes `playXpSound(src)` helper for live audio previewing in UI.
2. **`src/components/Sidebar/AssetLibrary.tsx`**:
   * **Presets Tab:** Added authentic wallpapers (Autumn, Azul, Stonehenge), authentic desktop icons (My Documents, Internet Explorer), and first-class Clippy Assistant companion preset with default dialogue.
   * **Audio & SFX Tab:** Added full gallery of all 14 authentic Windows XP system sounds with live "▶ Test" playback buttons and "+ Add" 1-click timeline track insertion.
3. **`src/components/Inspector/PropertyInspector.tsx`**:
   * **Wallpaper Inspector:** Added "Built-in Windows XP Wallpapers" select dropdown allowing instant switching between all 21 wallpapers.
   * **Desktop Icon Inspector:** Dropdown populated from `XP_ICONS` catalog with authentic labels.
   * **Cursor Inspector:** Dropdown populated from `XP_CURSORS` catalog.
   * **Assistant Inspector:** Full controls for character pose, 12 FPS animated sprite loop, speed slider, fade in/out durations, dialogue speech toggle, multiline text, 5 directional bubble placements, and custom color/geometry styling.
4. **`src/components/XpAssets/XpAssistant.tsx`**:
   * Transparent overlay with alpha transparency, sprite sheet canvas rendering, and authentic Windows XP dialogue speech bubble with vector pointer tails.
5. **`src/components/XpAssets/XpDesktopIcon.tsx` & `XpWallpaper.tsx`**:
   * Renders pixel-perfect 32×32 authentic PNG icons with drop shadows and graceful fallbacks.
6. **`src/components/XpAssets/XpCursor.tsx`**:
   * Renders authentic cursor PNGs with crisp scaling and SVG vector fallbacks.
7. **`src/utils/compositionRenderer.ts` & `src/components/Export/ExportModal.tsx`**:
   * Canvas 2D frame preloading and rendering updated so all wallpapers, icons, cursors, dialog graphics, and animated assistant characters with speech bubbles render with 100% visual parity in preview and exported MP4 video.

---

## 6. How to Add or Update Assets

1. **Add a new Wallpaper:**
   * Place the PNG image in `public/assets/xp/wallpapers/<Name>.png`.
   * Add entry `{ id: '...', name: '...', src: '/assets/xp/wallpapers/<Name>.png' }` to `XP_WALLPAPERS` in `src/utils/xpAssets.ts`.
2. **Add a new Sound Effect:**
   * Place the `.wav` audio file in `public/assets/xp/sounds/<name>.wav`.
   * Add entry `{ id: '...', name: '...', description: '...', src: '/assets/xp/sounds/<name>.wav', duration: <sec> }` to `XP_SOUNDS` in `src/utils/xpAssets.ts`.
3. **Add a new Desktop Icon:**
   * Place the 32×32 PNG in `public/assets/xp/icons/<name>.png`.
   * Register the ID and path in `XP_ICONS` and `XP_ICON_PATHS` in `src/utils/xpAssets.ts`.
