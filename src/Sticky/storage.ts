import {
  STICKY_STORAGE_VERSION,
  type StickyCategory,
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

export function defaultSnapshot(): StickySnapshot {
  return {
    version: STICKY_STORAGE_VERSION,
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

export function loadSnapshot(userId: string | undefined): StickySnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StickySnapshot;
    if (
      parsed?.version !== STICKY_STORAGE_VERSION ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.notes)
    ) {
      return null;
    }
    const fallbackSettings = defaultSnapshot().settings;
    const mergedSettings = {
      ...fallbackSettings,
      ...(parsed.settings ?? {}),
    };
    if (mergedSettings.theme !== 'dark' && mergedSettings.theme !== 'light') {
      mergedSettings.theme = 'light';
    }
    return {
      ...parsed,
      nextZ: typeof parsed.nextZ === 'number' ? parsed.nextZ : 1,
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
