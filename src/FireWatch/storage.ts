import {
  FIREWATCH_STORAGE_VERSION,
  type Firefighter,
  type FireWatchSnapshot,
} from './types';

export function newId(prefix = 'fw'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `firewatch:${userId}`;
}

export function defaultSnapshot(): FireWatchSnapshot {
  return {
    version: FIREWATCH_STORAGE_VERSION,
    firefighters: [],
  };
}

export function loadSnapshot(userId: string | undefined): FireWatchSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FireWatchSnapshot;
    if (parsed?.version !== FIREWATCH_STORAGE_VERSION || !Array.isArray(parsed.firefighters)) {
      return null;
    }
    const firefighters: Firefighter[] = parsed.firefighters
      .filter(
        (f): f is Firefighter =>
          !!f &&
          typeof f.id === 'string' &&
          typeof f.name === 'string' &&
          (f.platoon === 'A' || f.platoon === 'B' || f.platoon === 'C' || f.platoon === 'D'),
      )
      .map((f) => ({
        id: f.id,
        name: f.name,
        role: typeof f.role === 'string' ? f.role : undefined,
        platoon: f.platoon,
      }));
    return { version: FIREWATCH_STORAGE_VERSION, firefighters };
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: FireWatchSnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}
