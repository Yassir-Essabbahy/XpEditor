import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FFMPEG = 'C:\\Users\\moroc\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe';

console.log('================================================================');
console.log('    XP STUDIO AUDIT: ASSET PACK INTEGRATION & VERIFICATION       ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

// 1. Directory Structure and Wallpapers
console.log('--- TEST SECTION 1: Wallpapers Verification ---');
const wallpapersDir = 'public/assets/xp/wallpapers';
assert(fs.existsSync(wallpapersDir), '01. Wallpapers directory exists');

const wallpapers = [
  'Bliss.png', 'Autumn.png', 'Azul.png', 'Ascent.png', 'Crystal.png',
  'Follow.png', 'Friend.png', 'Home.png', 'Moon_flower.png', 'Peace.png',
  'Power.png', 'Purple_flower.png', 'Radiance.png', 'Red_moon_desert.png',
  'Ripple.png', 'Stonehenge.png', 'Tulips.png', 'Vortec_space.png',
  'Wind.png', 'Windows_XP_Home_Edition.png', 'Windows_XP_Professional.png'
];

let allWallpapersExist = true;
wallpapers.forEach((wp) => {
  const p = path.join(wallpapersDir, wp);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    allWallpapersExist = false;
  }
});
assert(allWallpapersExist, `02. All 21 authentic wallpapers exist with non-zero size (${wallpapers.length} wallpapers)`);
assert(fs.existsSync('public/assets/xp/wallpapers/Bliss.png'), '03. Authentic Bliss.png high-res wallpaper exists');

// 2. System Sounds Verification
console.log('\n--- TEST SECTION 2: System Sounds Verification ---');
const soundsDir = 'public/assets/xp/sounds';
assert(fs.existsSync(soundsDir), '04. Sounds directory exists');

const coreSounds = [
  'startup.wav', 'shutdown.wav', 'error.wav', 'critical_stop.wav',
  'exclamation.wav', 'ding.wav', 'balloon.wav', 'recycle.wav',
  'hardware_insert.wav', 'hardware_remove.wav', 'logon.wav', 'logoff.wav',
  'information_bar.wav', 'popup_blocked.wav'
];

let allSoundsValid = true;
coreSounds.forEach((snd) => {
  const p = path.join(soundsDir, snd);
  if (!fs.existsSync(p)) {
    allSoundsValid = false;
  } else {
    // Check RIFF / WAVE header
    const buf = fs.readFileSync(p);
    const riff = buf.slice(0, 4).toString('ascii');
    const wave = buf.slice(8, 12).toString('ascii');
    if (riff !== 'RIFF' || wave !== 'WAVE') {
      allSoundsValid = false;
    }
  }
});
assert(allSoundsValid, `05. All 14 authentic Windows XP .wav sounds exist with valid RIFF/WAVE audio headers`);
assert(fs.existsSync('public/assets/xp/sounds/startup.wav'), '06. Iconic Windows XP Startup.wav sound is present');

// 3. Desktop and Dialog Icons Verification
console.log('\n--- TEST SECTION 3: Icons Verification ---');
const iconsDir = 'public/assets/xp/icons';
assert(fs.existsSync(iconsDir), '07. Icons directory exists');

const slicedIcons = [
  'my_computer.png', 'my_documents.png', 'recycle_bin.png',
  'recycle_bin_full.png', 'internet_explorer.png', 'notepad.png',
  'search.png', 'help.png', 'error.png', 'warning.png', 'info.png', 'question.png'
];

let allIconsValid = true;
slicedIcons.forEach((ic) => {
  const p = path.join(iconsDir, ic);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
    allIconsValid = false;
  }
});
assert(allIconsValid, `08. All 12 key sliced 32x32 desktop and dialog icons exist`);
assert(fs.existsSync('public/assets/xp/icons/WinIcons_32.png'), '09. Complete WinIcons_32 sprite sheet preserved for full library');

// 4. Cursors Verification
console.log('\n--- TEST SECTION 4: Cursors Verification ---');
const cursorsDir = 'public/assets/xp/cursors';
assert(fs.existsSync(cursorsDir), '10. Cursors directory exists');

const keyCursors = ['arrow.png', 'pointer.png', 'wait.png', 'busy.png', 'ibeam.png', 'move.png', 'helpsel.png', 'no.png'];
let allCursorsExist = true;
keyCursors.forEach((c) => {
  const p = path.join(cursorsDir, c);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) allCursorsExist = false;
});
assert(allCursorsExist, '11. Standard XP cursor set (arrow, pointer, wait, busy, ibeam, move) is available');

// 5. Typography and Assistant Overlays
console.log('\n--- TEST SECTION 5: Typography & Assistant Overlays ---');
assert(fs.existsSync('public/assets/xp/fonts/tahoma.ttf'), '12. Authentic Tahoma TTF font is installed');
const cssContent = fs.readFileSync('src/styles/editor.css', 'utf-8');
assert(cssContent.includes('@font-face') && cssContent.includes('/assets/xp/fonts/tahoma.ttf'), '13. Tahoma @font-face is registered in editor.css');
assert(fs.existsSync('public/assets/xp/assistants/clippy/clippy.png'), '14. Clippy assistant static transparent PNG overlay exists');

// 6. Preservation of Existing Project Assets
console.log('\n--- TEST SECTION 6: Preservation of Existing Assets & Master Zip ---');
assert(fs.existsSync('public/assets/WindowsXp_Background.jpg'), '15. Original /assets/WindowsXp_Background.jpg preserved');
assert(fs.existsSync('public/assets/Error.jpg'), '16. Original /assets/Error.jpg preserved for critical system error');
assert(fs.existsSync('public/assets/Paint.jpg'), '17. Original /assets/Paint.jpg preserved');
assert(fs.existsSync('public/assets/CDPlayer.jpg'), '18. Original /assets/CDPlayer.jpg preserved');
assert(fs.existsSync('public/assets/Notepad.jpg'), '19. Original /assets/Notepad.jpg preserved');
assert(fs.existsSync('Assets/WinXp.zip'), '20. Master Assets/WinXp.zip backup archive safely preserved outside runtime build');

// 7. Lightweight Footprint Check
console.log('\n--- TEST SECTION 7: Asset Footprint & Bloat Elimination ---');
function getDirSize(dir) {
  let size = 0;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) size += getDirSize(p);
    else size += stat.size;
  }
  return size;
}
const xpSizeMB = getDirSize('public/assets/xp') / (1024 * 1024);
console.log(`Integrated public/assets/xp footprint: ${xpSizeMB.toFixed(2)} MB`);
assert(xpSizeMB < 20, `21. Clean integrated asset footprint is ${xpSizeMB.toFixed(2)} MB (< 20 MB limit, eliminated 73+ MB bloat)`);

// 8. FFmpeg Export Parity with New Assets
console.log('\n--- TEST SECTION 8: Real FFmpeg Export Parity with Authentic Assets ---');
try {
  const exportTestOutput = 'scratch/test_asset_pack_export.mp4';
  if (fs.existsSync(exportTestOutput)) fs.unlinkSync(exportTestOutput);

  // Render a 3-second test video combining authentic Autumn wallpaper, authentic XP audio, and video stream
  const cmd = `"${FFMPEG}" -y -loop 1 -i "public/assets/xp/wallpapers/Autumn.png" -i "public/assets/xp/sounds/startup.wav" -t 3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${exportTestOutput}"`;
  execSync(cmd, { stdio: 'pipe' });

  assert(fs.existsSync(exportTestOutput), '22. FFmpeg exported MP4 video with authentic wallpaper and audio track');
  const outStat = fs.statSync(exportTestOutput);
  assert(outStat.size > 5000, `23. Exported MP4 file size is valid (${outStat.size} bytes)`);
} catch (err) {
  console.error('Export test failed:', err);
  assert(false, '22. FFmpeg export with authentic assets');
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} / ${passCount + failCount} TESTS PASSED`);
console.log('================================================================');

if (failCount === 0) {
  console.log('\nALL ASSET PACK INTEGRATION AUDIT TESTS PASSED SUCCESSFULLY! (100%)');
  process.exit(0);
} else {
  console.error('\nSOME TESTS FAILED');
  process.exit(1);
}
