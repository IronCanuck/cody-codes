import type { InventoryPhoto } from './types';
import { newId } from './storage';

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.84;
/** Hard limit per image after compression so localStorage stays usable. */
const MAX_BYTES = 500 * 1024;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file'));
    };
    img.src = url;
  });
}

function approxDataUrlBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export async function compressImageFile(file: File): Promise<InventoryPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }
  const img = await loadImageFromFile(file);
  const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * ratio));
  const targetH = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (approxDataUrlBytes(dataUrl) > MAX_BYTES && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (approxDataUrlBytes(dataUrl) > MAX_BYTES) {
    const c2 = document.createElement('canvas');
    const r2 = 0.8;
    c2.width = Math.max(1, Math.round(canvas.width * r2));
    c2.height = Math.max(1, Math.round(canvas.height * r2));
    const ctx2 = c2.getContext('2d');
    if (ctx2) {
      ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
      dataUrl = c2.toDataURL('image/jpeg', 0.7);
    }
  }

  return {
    id: newId('photo'),
    dataUrl,
    mime: 'image/jpeg',
    name: file.name || 'photo',
    width: targetW,
    height: targetH,
  };
}
