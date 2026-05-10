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
    const parsed = JSON.parse(raw) as Partial<StickySnapshot> & { version?: number };
    if (
      !parsed ||
      typeof parsed.version !== 'number' ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.notes)
    ) {
      return null;
    }

    let snapshot: StickySnapshot;
    if (parsed.version === 1) {
      snapshot = migrateV1ToV2(parsed as unknown as LegacySnapshotV1);
    } else if (parsed.version === STICKY_STORAGE_VERSION) {
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
        settings: parsed.settings ?? defaultSnapshot().settings,
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
