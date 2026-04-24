const STORAGE_KEY = 'jobTracker:taskPresets:v1';

export type TaskPresets = {
  locations: string[];
  activities: string[];
};

const PRESETS_EVENT = 'jobTracker:taskPresets';

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string');
}

function normalizeList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function isTaskPresets(x: unknown): x is TaskPresets {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return isStringArray(o.locations) && isStringArray(o.activities);
}

function notifyPresetsChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(PRESETS_EVENT));
  } catch {
    /* ignore */
  }
}

export function getTaskPresets(): TaskPresets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { locations: [], activities: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isTaskPresets(parsed)) return { locations: [], activities: [] };
    return {
      locations: normalizeList(parsed.locations),
      activities: normalizeList(parsed.activities),
    };
  } catch {
    return { locations: [], activities: [] };
  }
}

export function setTaskPresets(next: TaskPresets): TaskPresets {
  const normalized: TaskPresets = {
    locations: normalizeList(next.locations),
    activities: normalizeList(next.activities),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* storage full or disabled */
  }
  notifyPresetsChanged();
  return normalized;
}

export function subscribeTaskPresets(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(PRESETS_EVENT, handler);
  return () => window.removeEventListener(PRESETS_EVENT, handler);
}

export function addTaskPresetLocation(value: string): TaskPresets {
  const cur = getTaskPresets();
  const t = value.trim();
  if (!t) return cur;
  return setTaskPresets({
    ...cur,
    locations: [...cur.locations, t],
  });
}

export function addTaskPresetActivity(value: string): TaskPresets {
  const cur = getTaskPresets();
  const t = value.trim();
  if (!t) return cur;
  return setTaskPresets({
    ...cur,
    activities: [...cur.activities, t],
  });
}

export function removeTaskPresetLocation(value: string): TaskPresets {
  const cur = getTaskPresets();
  const key = value.trim().toLowerCase();
  return setTaskPresets({
    ...cur,
    locations: cur.locations.filter((s) => s.toLowerCase() !== key),
  });
}

export function removeTaskPresetActivity(value: string): TaskPresets {
  const cur = getTaskPresets();
  const key = value.trim().toLowerCase();
  return setTaskPresets({
    ...cur,
    activities: cur.activities.filter((s) => s.toLowerCase() !== key),
  });
}
