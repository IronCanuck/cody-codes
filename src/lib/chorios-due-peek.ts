/**
 * Shared due / next-up logic for Chorios, used on the member dashboard without
 * importing the full Chorios app. Keep in sync with `ChoriosApp.tsx` schedule rules.
 */
export type ChoriosDueChore = {
  title: string;
  cadence: 'weekly' | 'monthly' | 'yearly';
  weekday: number;
  dayOfMonth: number;
  month: number;
  reminderTime: string;
  lastCompletedAt: string | null;
  snoozeUntil: string | null;
  silencedDueAt: string | null;
};

function parseHm(reminderTime: string): { h: number; m: number } {
  const [a, b] = reminderTime.split(':').map((x) => parseInt(x, 10));
  const h = Number.isFinite(a) ? Math.min(23, Math.max(0, a!)) : 9;
  const m = Number.isFinite(b) ? Math.min(59, Math.max(0, b!)) : 0;
  return { h, m };
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampDom(year: number, monthIndex0: number, dom: number): number {
  const max = daysInMonth(year, monthIndex0);
  return Math.min(Math.max(1, dom), max);
}

function getNextDueInstantAfter(chore: ChoriosDueChore, after: Date): Date {
  const { h, m } = parseHm(chore.reminderTime);
  const t = after.getTime();

  if (chore.cadence === 'weekly') {
    for (let i = 0; i < 8; i++) {
      const d = new Date(after);
      d.setDate(after.getDate() + i);
      d.setHours(h, m, 0, 0);
      if (d.getDay() === chore.weekday && d.getTime() > t) return d;
    }
    const d = new Date(after);
    d.setDate(after.getDate() + 8);
    d.setHours(h, m, 0, 0);
    return d;
  }

  if (chore.cadence === 'monthly') {
    let y = after.getFullYear();
    let mo = after.getMonth();
    for (let iter = 0; iter < 36; iter++) {
      const dom = clampDom(y, mo, chore.dayOfMonth);
      const d = new Date(y, mo, dom, h, m, 0, 0);
      if (d.getTime() > t) return d;
      mo += 1;
      if (mo > 11) {
        mo = 0;
        y += 1;
      }
    }
    return new Date(y, mo, 1, h, m, 0, 0);
  }

  const month1 = chore.month;
  let y = after.getFullYear();
  for (let iter = 0; iter < 400; iter++) {
    const dom = clampDom(y, month1 - 1, chore.dayOfMonth);
    const d = new Date(y, month1 - 1, dom, h, m, 0, 0);
    if (d.getTime() > t) return d;
    y += 1;
  }
  return new Date(y, month1 - 1, 1, h, m, 0, 0);
}

function anchorInstantForNextDue(chore: ChoriosDueChore): Date {
  return chore.lastCompletedAt ? new Date(chore.lastCompletedAt) : new Date();
}

function isChoreDueNow(chore: ChoriosDueChore, now: Date): boolean {
  const after = anchorInstantForNextDue(chore);
  const nextDue = getNextDueInstantAfter(chore, after);
  if (now < nextDue) return false;
  if (chore.snoozeUntil && now < new Date(chore.snoozeUntil)) return false;
  if (chore.silencedDueAt === nextDue.toISOString()) return false;
  return true;
}

function formatDueLabel(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeDueLabel(nextDue: Date, now: Date): string {
  const dayMs = 86_400_000;
  const diff = nextDue.getTime() - now.getTime();
  if (diff < 0) return 'Overdue';
  if (diff < 60_000) return 'Due now';
  if (diff < dayMs) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  }
  const days = Math.floor(diff / dayMs);
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `in ${days} days`;
  return formatDueLabel(nextDue);
}

const CHORIOS_STORAGE_VERSION = 2 as const;

export type ChoriosGlance = {
  total: number;
  dueNow: number;
  nextTitle: string | null;
  nextWhenLabel: string | null;
  reminder: string | null;
};

function coerceChore(row: unknown): ChoriosDueChore | null {
  if (!row || typeof row !== 'object') return null;
  const c = row as Record<string, unknown>;
  if (typeof c.title !== 'string') return null;
  if (c.cadence !== 'weekly' && c.cadence !== 'monthly' && c.cadence !== 'yearly') return null;
  return {
    title: c.title,
    cadence: c.cadence,
    weekday: typeof c.weekday === 'number' ? c.weekday : 0,
    dayOfMonth: typeof c.dayOfMonth === 'number' ? c.dayOfMonth : 1,
    month: typeof c.month === 'number' ? c.month : 1,
    reminderTime: typeof c.reminderTime === 'string' ? c.reminderTime : '09:00',
    lastCompletedAt: typeof c.lastCompletedAt === 'string' ? c.lastCompletedAt : null,
    snoozeUntil: typeof c.snoozeUntil === 'string' ? c.snoozeUntil : null,
    silencedDueAt: typeof c.silencedDueAt === 'string' ? c.silencedDueAt : null,
  };
}

export function getChoriosGlanceFromLocalStorage(userId: string): ChoriosGlance | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(`chorios:${userId}`);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as { version?: number; chores?: unknown[] };
  } catch {
    return null;
  }
  if (parsed?.version !== CHORIOS_STORAGE_VERSION || !Array.isArray(parsed.chores)) return null;
  const chores: ChoriosDueChore[] = [];
  for (const row of parsed.chores) {
    const ch = coerceChore(row);
    if (ch) chores.push(ch);
  }
  if (chores.length === 0) {
    return { total: 0, dueNow: 0, nextTitle: null, nextWhenLabel: null, reminder: 'Add your first chore in Chorios' };
  }

  const now = new Date();
  let dueNow = 0;
  const withNext: { chore: ChoriosDueChore; nextDue: Date }[] = [];
  for (const chore of chores) {
    if (isChoreDueNow(chore, now)) dueNow++;
    const after = anchorInstantForNextDue(chore);
    const nextDue = getNextDueInstantAfter(chore, after);
    withNext.push({ chore, nextDue });
  }
  withNext.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  const next = withNext[0];
  const nextTitle = next ? next.chore.title : null;
  const nextWhenLabel = next ? relativeDueLabel(next.nextDue, now) : null;

  let reminder: string | null = null;
  if (dueNow > 0) {
    reminder = `${dueNow} chore${dueNow === 1 ? '' : 's'} need attention now`;
  } else if (next) {
    reminder = `Next: ${next.chore.title} — ${nextWhenLabel}`;
  }
  return {
    total: chores.length,
    dueNow,
    nextTitle,
    nextWhenLabel,
    reminder,
  };
}
