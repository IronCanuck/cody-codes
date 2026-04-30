import {
  FIREWATCH_STORAGE_VERSION,
  type Firefighter,
  type FireWatchSnapshot,
  type ShiftCode,
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

function isShiftCode(value: unknown): value is ShiftCode {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

export function loadSnapshot(userId: string | undefined): FireWatchSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FireWatchSnapshot & {
      firefighters?: Array<Firefighter & { platoon?: ShiftCode }>;
    };
    if (parsed?.version !== FIREWATCH_STORAGE_VERSION || !Array.isArray(parsed.firefighters)) {
      return null;
    }
    const firefighters: Firefighter[] = parsed.firefighters
      .map((f) => {
        if (!f || typeof f.id !== 'string' || typeof f.name !== 'string') return null;
        const code = isShiftCode(f.shift) ? f.shift : isShiftCode(f.platoon) ? f.platoon : null;
        if (!code) return null;
        const out: Firefighter = {
          id: f.id,
          name: f.name,
          shift: code,
        };
        if (typeof f.role === 'string') out.role = f.role;
        return out;
      })
      .filter((f): f is Firefighter => f !== null);
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
