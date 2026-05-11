import { newId } from './storage';
import type { FamilyMediaItem, FamilyMediaKind, FamilyPortrait } from './types';

const PORTRAIT_MAX_DIM = 720;
const PORTRAIT_QUALITY = 0.82;
const PORTRAIT_MAX_BYTES = 220 * 1024;

const PHOTO_MAX_DIM = 1600;
const PHOTO_QUALITY = 0.85;
const PHOTO_MAX_BYTES = 600 * 1024;

/**
 * Hard cap for video uploads (~6 MB). Anything larger and the localStorage
 * snapshot becomes unusable; users should paste an external URL instead.
 */
const VIDEO_MAX_BYTES = 6 * 1024 * 1024;

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

async function compressImage(
  file: File,
  maxDim: number,
  startQuality: number,
  maxBytes: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImageFromFile(file);
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * ratio));
  const targetH = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let quality = startQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (approxDataUrlBytes(dataUrl) > maxBytes && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (approxDataUrlBytes(dataUrl) > maxBytes) {
    const c2 = document.createElement('canvas');
    const r2 = 0.75;
    c2.width = Math.max(1, Math.round(canvas.width * r2));
    c2.height = Math.max(1, Math.round(canvas.height * r2));
    const ctx2 = c2.getContext('2d');
    if (ctx2) {
      ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
      dataUrl = c2.toDataURL('image/jpeg', 0.7);
    }
  }
  return { dataUrl, width: targetW, height: targetH };
}

export async function compressPortrait(file: File): Promise<FamilyPortrait> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported for portraits.');
  }
  const { dataUrl, width, height } = await compressImage(
    file,
    PORTRAIT_MAX_DIM,
    PORTRAIT_QUALITY,
    PORTRAIT_MAX_BYTES,
  );
  return {
    id: newId('portrait'),
    source: 'uploaded',
    src: dataUrl,
    mime: 'image/jpeg',
    name: file.name || 'portrait',
    width,
    height,
  };
}

export async function compressAlbumPhoto(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported for album photos.');
  }
  return compressImage(file, PHOTO_MAX_DIM, PHOTO_QUALITY, PHOTO_MAX_BYTES);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function readVideoUpload(file: File): Promise<{
  dataUrl: string;
  mime: string;
}> {
  if (!file.type.startsWith('video/')) {
    throw new Error('Only video files are supported here.');
  }
  if (file.size > VIDEO_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Video is ${mb} MB — too large for in-app storage. Paste an external URL instead.`,
    );
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { dataUrl, mime: file.type || 'video/mp4' };
}

/**
 * Build a media item from an uploaded photo file.
 */
export async function buildUploadedPhoto(
  file: File,
  albumId: string,
): Promise<FamilyMediaItem> {
  const { dataUrl, width, height } = await compressAlbumPhoto(file);
  return {
    id: newId('media'),
    albumId,
    kind: 'photo',
    source: 'uploaded',
    src: dataUrl,
    posterSrc: '',
    mime: 'image/jpeg',
    name: file.name || 'photo',
    width,
    height,
    caption: '',
    takenAt: '',
    taggedMemberIds: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build a media item from an uploaded video file.
 */
export async function buildUploadedVideo(
  file: File,
  albumId: string,
): Promise<FamilyMediaItem> {
  const { dataUrl, mime } = await readVideoUpload(file);
  return {
    id: newId('media'),
    albumId,
    kind: 'video',
    source: 'uploaded',
    src: dataUrl,
    posterSrc: '',
    mime,
    name: file.name || 'video',
    width: 0,
    height: 0,
    caption: '',
    takenAt: '',
    taggedMemberIds: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build a media item from an external URL the user pasted in.
 */
export function buildMediaFromUrl(
  url: string,
  kind: FamilyMediaKind,
  albumId: string,
): FamilyMediaItem {
  return {
    id: newId('media'),
    albumId,
    kind,
    source: 'url',
    src: url,
    posterSrc: '',
    mime: kind === 'photo' ? 'image/*' : 'video/*',
    name: url.split('/').pop() || url,
    width: 0,
    height: 0,
    caption: '',
    takenAt: '',
    taggedMemberIds: [],
    createdAt: new Date().toISOString(),
  };
}

const YT_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export type VideoEmbed =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'direct'; src: string };

/**
 * Detects YouTube / Vimeo URLs so we can render an embed player instead of a
 * broken `<video>` tag for pages that ship those formats.
 */
export function classifyVideoSource(url: string): VideoEmbed {
  const yt = YT_RE.exec(url);
  if (yt) {
    return { kind: 'youtube', id: yt[1], embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  }
  const vm = VIMEO_RE.exec(url);
  if (vm) {
    return { kind: 'vimeo', id: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  }
  return { kind: 'direct', src: url };
}
