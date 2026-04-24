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

export function toLocalTimeInputValue(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return '';
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
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
