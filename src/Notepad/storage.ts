import { supabase } from '../lib/supabase';
import {
  NOTEPAD_STORAGE_VERSION,
  type NotepadFolder,
  type NotepadNote,
  type NotepadSettings,
  type NotepadSnapshot,
} from './types';

export function newId(prefix = 'np'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `notepad:${userId}`;
}

export function defaultSettings(): NotepadSettings {
  return {
    fontFamily: 'serif',
    showRules: true,
    showMarginLine: true,
  };
}

export function defaultSnapshot(): NotepadSnapshot {
  return {
    version: NOTEPAD_STORAGE_VERSION,
    folders: [],
    notes: [],
    activeNoteId: null,
    activeFolderId: null,
    settings: defaultSettings(),
  };
}

function isFolder(value: unknown): value is NotepadFolder {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return typeof f.id === 'string' && typeof f.name === 'string';
}

function isNote(value: unknown): value is NotepadNote {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  return typeof n.id === 'string' && typeof n.title === 'string';
}

function coalesce(parsed: unknown): NotepadSnapshot | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  if (typeof root.version !== 'number' || root.version !== NOTEPAD_STORAGE_VERSION) return null;
  const foldersRaw = Array.isArray(root.folders) ? root.folders : [];
  const notesRaw = Array.isArray(root.notes) ? root.notes : [];
  const folders: NotepadFolder[] = foldersRaw.filter(isFolder).map((f) => ({
    id: f.id,
    name: f.name,
    parentId: typeof f.parentId === 'string' ? f.parentId : null,
    createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date().toISOString(),
    updatedAt: typeof f.updatedAt === 'string' ? f.updatedAt : new Date().toISOString(),
  }));
  const folderIds = new Set(folders.map((f) => f.id));
  const notes: NotepadNote[] = notesRaw.filter(isNote).map((n) => ({
    id: n.id,
    folderId: typeof n.folderId === 'string' && folderIds.has(n.folderId) ? n.folderId : null,
    title: n.title,
    bodyHtml: typeof n.bodyHtml === 'string' ? n.bodyHtml : '',
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date().toISOString(),
    updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString(),
  }));
  const settingsRaw = (root.settings as Partial<NotepadSettings> | undefined) ?? {};
  const settings: NotepadSettings = {
    ...defaultSettings(),
    ...settingsRaw,
  };
  if (!['serif', 'sans', 'mono', 'handwriting'].includes(settings.fontFamily)) {
    settings.fontFamily = 'serif';
  }

  const noteIds = new Set(notes.map((n) => n.id));
  const activeNoteId =
    typeof root.activeNoteId === 'string' && noteIds.has(root.activeNoteId)
      ? root.activeNoteId
      : null;
  const activeFolderId =
    typeof root.activeFolderId === 'string' && folderIds.has(root.activeFolderId)
      ? root.activeFolderId
      : null;
  const savedAt = typeof root.savedAt === 'string' ? root.savedAt : undefined;

  return {
    version: NOTEPAD_STORAGE_VERSION,
    folders,
    notes,
    activeNoteId,
    activeFolderId,
    settings,
    savedAt,
  };
}

export function loadSnapshot(userId: string | undefined): NotepadSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    return coalesce(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: NotepadSnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // Storage quota errors silently ignored — user can clear cache.
  }
}

export function parseSnapshotIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

export function hasMeaningfulNotepadData(data: NotepadSnapshot): boolean {
  return data.folders.length > 0 || data.notes.length > 0;
}

export function coalesceRemoteSnapshot(raw: unknown): NotepadSnapshot | null {
  return coalesce(raw);
}

export async function upsertNotepadCloud(
  userId: string,
  snapshot: NotepadSnapshot,
): Promise<{ errorMessage: string | null }> {
  const updatedAt = snapshot.savedAt ?? new Date().toISOString();
  const { error } = await supabase.from('notepad_snapshots').upsert(
    {
      user_id: userId,
      snapshot: { ...snapshot, savedAt: updatedAt },
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.warn('Notepad cloud sync failed', error);
    return { errorMessage: error.message || 'Account sync failed' };
  }
  return { errorMessage: null };
}

export async function fetchNotepadCloud(
  userId: string,
): Promise<{ snapshot: NotepadSnapshot | null; updatedAt: string | null; errorMessage: string | null }> {
  const { data: row, error } = await supabase
    .from('notepad_snapshots')
    .select('snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Notepad cloud load failed', error);
    return { snapshot: null, updatedAt: null, errorMessage: error.message || 'Account load failed' };
  }
  const snap = row?.snapshot != null ? coalesceRemoteSnapshot(row.snapshot) : null;
  return { snapshot: snap, updatedAt: row?.updated_at ?? null, errorMessage: null };
}
