import { type Platoon } from './types';

/**
 * Calgary Fire Department platoon rotation, derived from the IAFF Local 255
 * 2026 Shift Calendar. The published calendar follows a continuous 8-day cycle
 * starting Saturday, November 1, 2025 (UTC-anchored to keep DST stable):
 *
 *   Nov 1 2025 → C
 *   Nov 2 2025 → A
 *   Nov 3 2025 → D
 *   Nov 4 2025 → B
 *   Nov 5 2025 → A
 *   Nov 6 2025 → C
 *   Nov 7 2025 → B
 *   Nov 8 2025 → D
 *
 * The cycle repeats indefinitely, which lets us derive the on-duty platoon for
 * any past or future date.
 */
const CYCLE: readonly Platoon[] = ['C', 'A', 'D', 'B', 'A', 'C', 'B', 'D'];

const REFERENCE_UTC_MS = Date.UTC(2025, 10, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function localDayKey(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function platoonForDate(date: Date): Platoon {
  const key = localDayKey(date);
  const days = Math.round((key - REFERENCE_UTC_MS) / MS_PER_DAY);
  const idx = ((days % CYCLE.length) + CYCLE.length) % CYCLE.length;
  return CYCLE[idx];
}

export type ShiftEntry = {
  date: Date;
  iso: string;
  weekday: string;
  weekdayShort: string;
  monthDay: string;
  platoon: Platoon;
};

export function nextShifts(count: number, from: Date = new Date()): ShiftEntry[] {
  const start = startOfLocalDay(from);
  const out: ShiftEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(formatShift(d));
  }
  return out;
}

export function nextShiftsForPlatoon(
  platoon: Platoon,
  count: number,
  from: Date = new Date(),
): ShiftEntry[] {
  const start = startOfLocalDay(from);
  const out: ShiftEntry[] = [];
  // Each platoon appears twice in the 8-day cycle, so scan up to count*5 days for safety.
  const maxScan = Math.max(count * 5, 40);
  for (let i = 0; i < maxScan && out.length < count; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (platoonForDate(d) === platoon) {
      out.push(formatShift(d));
    }
  }
  return out;
}

export function formatShift(date: Date): ShiftEntry {
  const platoon = platoonForDate(date);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const weekdayShort = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return {
    date,
    iso: date.toISOString().slice(0, 10),
    weekday,
    weekdayShort,
    monthDay,
    platoon,
  };
}

export function todayTomorrowDayAfter(): {
  today: ShiftEntry;
  tomorrow: ShiftEntry;
  dayAfter: ShiftEntry;
} {
  const [today, tomorrow, dayAfter] = nextShifts(3);
  return { today, tomorrow, dayAfter };
}

export function platoonAccent(platoon: Platoon): {
  badge: string;
  ring: string;
  text: string;
  bgSoft: string;
  borderSoft: string;
  label: string;
} {
  switch (platoon) {
    case 'A':
      return {
        badge: 'bg-firewatch-rust text-white',
        ring: 'ring-firewatch-rust/40',
        text: 'text-firewatch-rust',
        bgSoft: 'bg-firewatch-rust/10',
        borderSoft: 'border-firewatch-rust/30',
        label: 'Alpha',
      };
    case 'B':
      return {
        badge: 'bg-firewatch-flame-deep text-white',
        ring: 'ring-firewatch-flame-deep/40',
        text: 'text-firewatch-flame-deep',
        bgSoft: 'bg-firewatch-flame-deep/10',
        borderSoft: 'border-firewatch-flame-deep/30',
        label: 'Bravo',
      };
    case 'C':
      return {
        badge: 'bg-firewatch-ember text-white',
        ring: 'ring-firewatch-ember/40',
        text: 'text-firewatch-ember',
        bgSoft: 'bg-firewatch-ember/10',
        borderSoft: 'border-firewatch-ember/30',
        label: 'Charlie',
      };
    case 'D':
      return {
        badge: 'bg-firewatch-spark text-firewatch-ink',
        ring: 'ring-firewatch-gold/45',
        text: 'text-firewatch-smoke',
        bgSoft: 'bg-firewatch-spark/15',
        borderSoft: 'border-firewatch-gold/40',
        label: 'Delta',
      };
  }
}
