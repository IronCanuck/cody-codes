import type { BirthdayEntry, CandlesSnapshot } from './types';

export const CANDLES_STORAGE_VERSION = 1 as const;

export function storageKeyForUser(userId: string | undefined): string {
  return `candles:${userId ?? 'anonymous'}`;
}

export function newId(prefix = 'birthday'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSnapshot(): CandlesSnapshot {
  return {
    version: CANDLES_STORAGE_VERSION,
    birthdays: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeBirthdayEntry(value: unknown): BirthdayEntry | null {
  if (!isRecord(value)) return null;
  const id = stringOrEmpty(value.id);
  const name = stringOrEmpty(value.name).trim();
  const birthDate = stringOrEmpty(value.birthDate);
  if (!id || !name || !birthDate) return null;
  const now = new Date().toISOString();
  return {
    id,
    name,
    birthDate,
    relationship: stringOrEmpty(value.relationship),
    favoriteCake: stringOrEmpty(value.favoriteCake),
    notes: stringOrEmpty(value.notes),
    createdAt: stringOrEmpty(value.createdAt) || now,
    updatedAt: stringOrEmpty(value.updatedAt) || now,
  };
}

export function parsePersistedSnapshotJson(text: string): CandlesSnapshot {
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed) || parsed.version !== CANDLES_STORAGE_VERSION) {
    return defaultSnapshot();
  }
  const birthdays = Array.isArray(parsed.birthdays)
    ? parsed.birthdays
        .map((entry) => normalizeBirthdayEntry(entry))
        .filter((entry): entry is BirthdayEntry => entry !== null)
    : [];
  return {
    version: CANDLES_STORAGE_VERSION,
    birthdays,
  };
}

export function loadSnapshot(userId: string | undefined): CandlesSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    return raw ? parsePersistedSnapshotJson(raw) : null;
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, snapshot: CandlesSnapshot): void {
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(snapshot));
  } catch {
    // Local storage can be unavailable in private browsing or full-storage states.
  }
}
