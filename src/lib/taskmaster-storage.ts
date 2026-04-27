import {
  type BoardColumn,
  type PersistedSnapshot,
  DEFAULT_COLUMN_TITLES,
  STORAGE_VERSION,
} from './taskmaster-types';

export function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function makeDefaultColumns(): BoardColumn[] {
  return DEFAULT_COLUMN_TITLES.map((title, i) => ({
    id: newId(),
    title,
    order: i,
  }));
}

export function defaultSnapshot(): PersistedSnapshot {
  const pId = newId();
  return {
    version: STORAGE_VERSION,
    activeProjectId: pId,
    projects: [
      {
        id: pId,
        name: 'My first project',
        columns: makeDefaultColumns(),
        tasks: [],
      },
    ],
  };
}

export function storageKeyForUser(userId: string) {
  return `taskmaster:${userId}`;
}

export function loadSnapshot(userId: string | undefined): PersistedSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.projects) || !parsed.activeProjectId) {
      return null;
    }
    if (parsed.projects.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: PersistedSnapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

/** Best-effort validation for import / restore from JSON */
export function parsePersistedSnapshotJson(raw: string): PersistedSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isObject(parsed)) throw new Error('Invalid export format.');
  if (parsed.version !== STORAGE_VERSION) {
    throw new Error(`This backup uses a different data version. Expected ${STORAGE_VERSION}.`);
  }
  if (typeof parsed.activeProjectId !== 'string') {
    throw new Error('The backup is missing a project reference.');
  }
  if (!Array.isArray(parsed.projects) || parsed.projects.length === 0) {
    throw new Error('The backup has no projects.');
  }
  for (const p of parsed.projects) {
    if (!isObject(p) || typeof p.id !== 'string' || typeof p.name !== 'string') {
      throw new Error('A project in the file is not valid.');
    }
    if (!Array.isArray(p.columns) || !Array.isArray(p.tasks)) {
      throw new Error('A project in the file is not valid.');
    }
    for (const c of p.columns as unknown[]) {
      if (!isObject(c) || typeof c.id !== 'string' || typeof c.title !== 'string' || typeof c.order !== 'number') {
        throw new Error('A column in the file is not valid.');
      }
    }
    for (const t of p.tasks as unknown[]) {
      if (
        !isObject(t) ||
        typeof t.id !== 'string' ||
        typeof t.title !== 'string' ||
        typeof t.columnId !== 'string' ||
        typeof t.order !== 'number' ||
        typeof t.createdAt !== 'string'
      ) {
        throw new Error('A task in the file is not valid.');
      }
    }
  }
  return parsed as unknown as PersistedSnapshot;
}
