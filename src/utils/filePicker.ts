// File picker & asset management helper supporting Tauri native file dialog and browser fallback

export interface PickedImageResult {
  name: string;
  src: string; // Base64 data URL for persistent offline storage and cross-platform reliability
  size?: number;
  type?: string;
}

// Convert File or Blob to Data URL
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Extract clean friendly filename from path or data URL
export function extractFriendlyName(pathOrUrl: string, fallback = 'image.jpg'): string {
  if (!pathOrUrl) return fallback;
  if (pathOrUrl.startsWith('data:')) {
    return fallback;
  }
  // Remove query string or hash
  const clean = pathOrUrl.split('?')[0].split('#')[0];
  const parts = clean.split(/[/\\]/);
  const last = parts[parts.length - 1];
  return last || fallback;
}

// Format window title without internal directory paths
export function formatFriendlyTitle(rawTitle: string, defaultApp = 'Windows XP'): string {
  if (!rawTitle) return defaultApp;
  // If title contains " - Windows Picture and Fax Viewer" or similar
  const suffixMatch = rawTitle.match(/(.*?)(\s*-\s*Windows Picture and Fax Viewer.*)$/i);
  if (suffixMatch) {
    const friendlyName = extractFriendlyName(suffixMatch[1].trim());
    return `${friendlyName}${suffixMatch[2]}`;
  }
  return extractFriendlyName(rawTitle);
}

// Pick image file using Tauri native dialog if available, or HTML5 file picker fallback
export async function pickImageFile(): Promise<PickedImageResult | null> {
  // 1. Try Tauri native dialog if available in Tauri environment
  try {
    const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (isTauri) {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const fs = await import('@tauri-apps/plugin-fs');

      const selected = await dialog.open({
        title: 'Import Image',
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        const filePath = selected;
        const name = extractFriendlyName(filePath);
        // Read file bytes and convert to data URL
        const bytes = await fs.readFile(filePath);
        const ext = name.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
        const blob = new Blob([bytes], { type: mimeType });
        const dataUrl = await fileToDataUrl(blob);
        return {
          name,
          src: dataUrl,
          size: bytes.byteLength,
          type: mimeType,
        };
      }
      return null;
    }
  } catch (err) {
    console.warn('Tauri dialog unavailable, falling back to browser file picker:', err);
  }

  // 2. HTML5 File input fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        resolve({
          name: file.name,
          src: dataUrl,
          size: file.size,
          type: file.type,
        });
      } catch (err) {
        console.error('Failed to read file:', err);
        resolve(null);
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
}

// Process a File object (from drag-and-drop or file input)
export async function processImageFile(file: File): Promise<PickedImageResult> {
  const dataUrl = await fileToDataUrl(file);
  return {
    name: file.name,
    src: dataUrl,
    size: file.size,
    type: file.type,
  };
}
