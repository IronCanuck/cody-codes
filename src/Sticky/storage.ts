import { supabase } from '../lib/supabase';
import {
  STICKY_STORAGE_VERSION,
  type StickyBoardItem,
  type StickyCategory,
  type StickyNote,
  type StickySnapshot,
} from './types';

export function newId(prefix = 'st'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `sticky:${userId}`;
}

const DEFAULT_CATEGORIES: StickyCategory[] = [
  { id: 'cat-reminders', name: 'Reminders', color: 'pink' },
  { id: 'cat-ideas', name: 'Ideas', color: 'cyan' },
  { id: 'cat-todo', name: 'To-do', color: 'purple' },
];

const DEFAULT_BOARD_ID = 'board-default';

function defaultBoard(): StickyBoardItem {
  const now = new Date().toISOString();
  return { id: DEFAULT_BOARD_ID, name: 'My Board', createdAt: now, updatedAt: now };
}

export function defaultSnapshot(): StickySnapshot {
  const board = defaultBoard();
  return {
    version: STICKY_STORAGE_VERSION,
    boards: [board],
    activeBoardId: board.id,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    notes: [],
    nextZ: 1,
    settings: {
      showGrid: true,
      defaultCategoryId: 'cat-reminders',
      glow: true,
      theme: 'light',
    },
  };
}

type LegacySnapshotV1 = Omit<StickySnapshot, 'version' | 'boards' | 'activeBoardId' | 'notes'> & {
  version: 1;
  notes: Array<Omit<StickyNote, 'boardId'> & { boardId?: string }>;
};

function migrateV1ToV2(legacy: LegacySnapshotV1): StickySnapshot {
  const board = defaultBoard();
  return {
    version: STICKY_STORAGE_VERSION,
    boards: [board],
    activeBoardId: board.id,
    categories: legacy.categories,
    notes: legacy.notes.map((n) => ({ ...n, boardId: n.boardId ?? board.id })),
    nextZ: typeof legacy.nextZ === 'number' ? legacy.nextZ : 1,
    settings: legacy.settings,
  };
}

export function loadSnapshot(userId: string | undefined): StickySnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> & {
      categories?: unknown;
      notes?: unknown;
    };
    if (
      !parsed ||
      typeof parsed.version !== 'number' ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.notes)
    ) {
      return null;
    }
    const version = parsed.version as number;

    let snapshot: StickySnapshot;
    if (version === 1) {
      snapshot = migrateV1ToV2(parsed as unknown as LegacySnapshotV1);
    } else if (version === STICKY_STORAGE_VERSION) {
      const boardsValid = Array.isArray(parsed.boards) && parsed.boards.length > 0;
      const fallbackBoard = defaultBoard();
      const boards: StickyBoardItem[] = boardsValid
        ? (parsed.boards as StickyBoardItem[])
        : [fallbackBoard];
      const activeBoardId =
        typeof parsed.activeBoardId === 'string' &&
        boards.some((b) => b.id === parsed.activeBoardId)
          ? parsed.activeBoardId
          : boards[0].id;
      const fallbackId = boards[0].id;
      const notes = (parsed.notes as StickyNote[]).map((n) => ({
        ...n,
        boardId:
          typeof n.boardId === 'string' && boards.some((b) => b.id === n.boardId)
            ? n.boardId
            : fallbackId,
      }));
      snapshot = {
        version: STICKY_STORAGE_VERSION,
        boards,
        activeBoardId,
        categories: parsed.categories as StickyCategory[],
        notes,
        nextZ: typeof parsed.nextZ === 'number' ? parsed.nextZ : 1,
        settings:
          (parsed.settings as StickySnapshot['settings'] | undefined) ??
          defaultSnapshot().settings,
      };
    } else {
      return null;
    }

    const fallbackSettings = defaultSnapshot().settings;
    const mergedSettings = {
      ...fallbackSettings,
      ...(snapshot.settings ?? {}),
    };
    if (mergedSettings.theme !== 'dark' && mergedSettings.theme !== 'light') {
      mergedSettings.theme = 'light';
    }

    return {
      ...snapshot,
      nextZ: typeof snapshot.nextZ === 'number' ? snapshot.nextZ : 1,
      settings: mergedSettings,
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: StickySnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // Silently ignore storage quota errors; user can free space via settings.
  }
}

export function parseSnapshotIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Coerce a remote JSON blob into a valid StickySnapshot, running the same
 * migrations / fallbacks that `loadSnapshot` uses for local data.
 */
export function coalesceRemoteSnapshot(raw: unknown): StickySnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown> & {
    categories?: unknown;
    notes?: unknown;
  };
  if (
    typeof parsed.version !== 'number' ||
    !Array.isArray(parsed.categories) ||
    !Array.isArray(parsed.notes)
  ) {
    return null;
  }

  const version = parsed.version as number;
  let snapshot: StickySnapshot;
  if (version === 1) {
    snapshot = (function () {
      const board = defaultBoard();
      const legacy = parsed as unknown as {
        categories: StickyCategory[];
        notes: Array<Omit<StickyNote, 'boardId'> & { boardId?: string }>;
        nextZ?: number;
        settings: StickySnapshot['settings'];
      };
      return {
        version: STICKY_STORAGE_VERSION,
        boards: [board],
        activeBoardId: board.id,
        categories: legacy.categories,
        notes: legacy.notes.map((n) => ({ ...n, boardId: n.boardId ?? board.id })),
        nextZ: typeof legacy.nextZ === 'number' ? legacy.nextZ : 1,
        settings: legacy.settings,
      } satisfies StickySnapshot;
    })();
  } else if (version === STICKY_STORAGE_VERSION) {
    const boardsValid = Array.isArray(parsed.boards) && (parsed.boards as unknown[]).length > 0;
    const fallbackBoard = defaultBoard();
    const boards: StickyBoardItem[] = boardsValid
      ? (parsed.boards as StickyBoardItem[])
      : [fallbackBoard];
    const activeBoardId =
      typeof parsed.activeBoardId === 'string' &&
      boards.some((b) => b.id === parsed.activeBoardId)
        ? (parsed.activeBoardId as string)
        : boards[0].id;
    const fallbackId = boards[0].id;
    const notes = (parsed.notes as StickyNote[]).map((n) => ({
      ...n,
      boardId:
        typeof n.boardId === 'string' && boards.some((b) => b.id === n.boardId)
          ? n.boardId
          : fallbackId,
    }));
    snapshot = {
      version: STICKY_STORAGE_VERSION,
      boards,
      activeBoardId,
      categories: parsed.categories as StickyCategory[],
      notes,
      nextZ: typeof parsed.nextZ === 'number' ? parsed.nextZ : 1,
      settings:
        (parsed.settings as StickySnapshot['settings'] | undefined) ??
        defaultSnapshot().settings,
    };
  } else {
    return null;
  }

  const fallbackSettings = defaultSnapshot().settings;
  const mergedSettings = {
    ...fallbackSettings,
    ...(snapshot.settings ?? {}),
  };
  if (mergedSettings.theme !== 'dark' && mergedSettings.theme !== 'light') {
    mergedSettings.theme = 'light';
  }

  const savedAt =
    typeof parsed.savedAt === 'string' && parsed.savedAt.length > 0
      ? (parsed.savedAt as string)
      : undefined;

  return {
    ...snapshot,
    savedAt,
    nextZ: typeof snapshot.nextZ === 'number' ? snapshot.nextZ : 1,
    settings: mergedSettings,
  };
}

/**
 * True if there is something worth storing in the cloud. Never upsert a
 * brand-new empty state from a fresh browser — that would wipe the row another
 * device already populated.
 */
export function hasMeaningfulStickyData(data: StickySnapshot): boolean {
  return data.notes.length > 0 || data.categories.length > 0 || data.boards.length > 1;
}

export async function upsertStickyCloud(
  userId: string,
  snapshot: StickySnapshot,
): Promise<{ errorMessage: string | null }> {
  const updatedAt = snapshot.savedAt ?? new Date().toISOString();
  const { error } = await supabase.from('sticky_snapshots').upsert(
    {
      user_id: userId,
      snapshot: { ...snapshot, savedAt: updatedAt },
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.warn('Sticky cloud sync failed', error);
    return { errorMessage: error.message || 'Account sync failed' };
  }
  return { errorMessage: null };
}

export async function fetchStickyCloud(
  userId: string,
): Promise<{ snapshot: StickySnapshot | null; updatedAt: string | null; errorMessage: string | null }> {
  const { data: row, error } = await supabase
    .from('sticky_snapshots')
    .select('snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Sticky cloud load failed', error);
    return { snapshot: null, updatedAt: null, errorMessage: error.message || 'Account load failed' };
  }
  const snap = row?.snapshot != null ? coalesceRemoteSnapshot(row.snapshot) : null;
  return { snapshot: snap, updatedAt: row?.updated_at ?? null, errorMessage: null };
}
