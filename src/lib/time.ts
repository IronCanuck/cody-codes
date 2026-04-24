export function computeHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.round(((e - s) / (1000 * 60 * 60)) * 100) / 100;
}

/** Raw span over this many hours gets an unpaid lunch deduction. */
const WORK_DAY_LUNCH_DEDUCT_AFTER_HOURS = 6;
const UNPAID_LUNCH_HOURS = 0.5;

export type WorkDayHoursWithLunch = {
  /** Hours used for pay/totals (after lunch deduction when applicable). */
  hours: number;
  /** Uncorrected clock span. */
  rawHours: number;
  /** True when raw span exceeded the threshold and lunch was subtracted. */
  lunchDeducted: boolean;
};

/**
 * Work-day span in hours, with 30 min unpaid lunch removed when the raw span
 * is strictly longer than 6 hours.
 */
export function getWorkDayHoursWithLunch(
  start: string,
  end: string,
): WorkDayHoursWithLunch {
  const rawHours = computeHours(start, end);
  if (rawHours <= 0) {
    return { hours: 0, rawHours: 0, lunchDeducted: false };
  }
  const lunchDeducted = rawHours > WORK_DAY_LUNCH_DEDUCT_AFTER_HOURS;
  const hours = lunchDeducted
    ? Math.max(0, Math.round((rawHours - UNPAID_LUNCH_HOURS) * 100) / 100)
    : rawHours;
  return { hours, rawHours, lunchDeducted };
}

export function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function toLocalDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Job time pickers use 15-minute steps (`<input type="time" step={...}>`). */
export const TIME_INPUT_STEP_MINUTES = 15;
export const TIME_INPUT_STEP_SECONDS = TIME_INPUT_STEP_MINUTES * 60;

/** Minute values shown in custom quarter-hour time popovers (native wheels often ignore `step`). */
export const QUARTER_HOUR_MINUTES = [0, 15, 30, 45] as const;

export type TwelveHourParts = {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
};

/**
 * Parse `HH:MM` (24h) to 12h parts; minutes aligned to {@link QUARTER_HOUR_MINUTES}
 * via {@link toLocalTimeInputValue}.
 */
export function timeInputToTwelveHour(hhmm: string): TwelveHourParts | null {
  if (!hhmm?.trim()) return null;
  const [hs, ms] = hhmm.trim().split(':');
  const h24 = parseInt(hs, 10);
  const mn = parseInt(ms, 10);
  if (!Number.isFinite(h24) || !Number.isFinite(mn)) return null;
  const norm = toLocalTimeInputValue(new Date(2000, 0, 1, h24, mn, 0, 0));
  const [h2s, m2s] = norm.split(':');
  const h2 = parseInt(h2s, 10);
  const m2 = parseInt(m2s, 10);
  const period = h2 >= 12 ? 'PM' : 'AM';
  let hour12 = h2 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m2, period };
}

/** Build `HH:MM` (24h) from 12h clock parts (minutes should be a quarter-hour). */
export function twelveHourToTimeInput(parts: TwelveHourParts): string {
  const { hour12, minute, period } = parts;
  let h24: number;
  if (period === 'AM') {
    h24 = hour12 === 12 ? 0 : hour12;
  } else {
    h24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Locale display string for a `HH:MM` value (e.g. "7:00 PM"). */
export function formatTimeInputDisplay(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * `HH:MM` for `<input type="time">`, rounded to {@link TIME_INPUT_STEP_MINUTES}.
 * Used for "Now" and when loading an existing entry so values match the input step.
 */
export function toLocalTimeInputValue(d: Date): string {
  const dayMinutes = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  let r = Math.round(dayMinutes / TIME_INPUT_STEP_MINUTES) * TIME_INPUT_STEP_MINUTES;
  const maxMins = 24 * 60 - TIME_INPUT_STEP_MINUTES;
  r = Math.min(r, maxMins);
  const h = Math.floor(r / 60);
  const m = r % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return '';
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

/** Next calendar day as `YYYY-MM-DD` (local), for overnight shifts. */
export function addOneCalendarDayYmd(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toLocalDateInputValue(d);
}

/**
 * Rebuild start/end instants on `anchorYmd` using the local wall-clock from stored
 * ISO strings. Fixes rows where `job_date` was changed (e.g. duplicate day) but
 * timestamps were left on the source date, which inflated spans by multiples of 24h.
 * If end is not after start on the anchor day, end is placed on the following day
 * (overnight shift).
 */
export function canonicalizeClockPairForWorkDay(
  anchorYmd: string,
  startIso: string,
  endIso: string,
): { startIso: string; endIso: string } {
  const startHhmm = toLocalTimeInputValue(new Date(startIso));
  const endHhmm = toLocalTimeInputValue(new Date(endIso));
  let startComb = combineDateAndTime(anchorYmd, startHhmm);
  let endComb = combineDateAndTime(anchorYmd, endHhmm);
  if (computeHours(startComb, endComb) <= 0) {
    endComb = combineDateAndTime(addOneCalendarDayYmd(anchorYmd), endHhmm);
  }
  return { startIso: startComb, endIso: endComb };
}

/** {@link getWorkDayHoursWithLunch} after {@link canonicalizeClockPairForWorkDay}. */
export function getWorkDayHoursWithLunchAnchored(
  anchorYmd: string,
  startIso: string,
  endIso: string,
): WorkDayHoursWithLunch {
  const { startIso: s, endIso: e } = canonicalizeClockPairForWorkDay(anchorYmd, startIso, endIso);
  return getWorkDayHoursWithLunch(s, e);
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
