import { Job, Settings } from './supabase';
import { toLocalDateInputValue } from './time';

export type PayPeriod = {
  start: Date;
  end: Date;
  index: number;
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getPayPeriodForDate(date: Date, settings: Settings): PayPeriod {
  const anchor = startOfDay(new Date(settings.pay_period_anchor_date + 'T12:00:00'));
  const target = startOfDay(date);
  const len = Math.max(1, settings.pay_period_length_days);
  const diffDays = Math.floor((target.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  const index = Math.floor(diffDays / len);
  const start = addDays(anchor, index * len);
  const end = addDays(start, len - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end, index };
}

export function shiftPayPeriod(period: PayPeriod, settings: Settings, offset: number): PayPeriod {
  const anchor = startOfDay(new Date(settings.pay_period_anchor_date + 'T12:00:00'));
  const len = Math.max(1, settings.pay_period_length_days);
  const newIndex = period.index + offset;
  const start = addDays(anchor, newIndex * len);
  const end = addDays(start, len - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end, index: newIndex };
}

export function jobsInPeriod(jobs: Job[], period: PayPeriod): Job[] {
  return jobs.filter((j) => {
    const d = new Date(j.job_date + 'T12:00:00');
    return d >= period.start && d <= period.end;
  });
}

export type WeekBreakdown = {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  jobs: Job[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
};

export function groupByWeekInPeriod(
  jobs: Job[],
  period: PayPeriod,
  settings: Settings,
): WeekBreakdown[] {
  const weeks: WeekBreakdown[] = [];
  let cursor = new Date(period.start);

  while (cursor <= period.end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > period.end) weekEnd.setTime(period.end.getTime());
    weekEnd.setHours(23, 59, 59, 999);

    const weekJobs = jobs.filter((j) => {
      const d = new Date(j.job_date + 'T12:00:00');
      return d >= weekStart && d <= weekEnd;
    });

    const totalHours = weekJobs.reduce((s, j) => s + Number(j.hours_worked || 0), 0);
    const threshold = Number(settings.overtime_threshold_hours);
    const regularHours = Math.min(totalHours, threshold);
    const overtimeHours = Math.max(0, totalHours - threshold);
    const rate = Number(settings.hourly_rate);
    const multiplier = Number(settings.overtime_multiplier);
    const regularPay = regularHours * rate;
    const overtimePay = overtimeHours * rate * multiplier;

    weeks.push({
      weekStart,
      weekEnd,
      label: `${toLocalDateInputValue(weekStart)} to ${toLocalDateInputValue(weekEnd)}`,
      jobs: weekJobs,
      totalHours,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
    });

    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }

  return weeks;
}

export type EarningsSummary = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  weeks: WeekBreakdown[];
};

export function computeEarnings(
  jobs: Job[],
  period: PayPeriod,
  settings: Settings,
): EarningsSummary {
  const periodJobs = jobsInPeriod(jobs, period);
  const weeks = groupByWeekInPeriod(periodJobs, period, settings);
  const totals = weeks.reduce(
    (acc, w) => ({
      totalHours: acc.totalHours + w.totalHours,
      regularHours: acc.regularHours + w.regularHours,
      overtimeHours: acc.overtimeHours + w.overtimeHours,
      regularPay: acc.regularPay + w.regularPay,
      overtimePay: acc.overtimePay + w.overtimePay,
    }),
    { totalHours: 0, regularHours: 0, overtimeHours: 0, regularPay: 0, overtimePay: 0 },
  );
  return {
    ...totals,
    totalPay: totals.regularPay + totals.overtimePay,
    weeks,
  };
}

export function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPeriodLabel(period: PayPeriod): string {
  const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = period.start.toLocaleDateString([], fmt);
  const endStr = period.end.toLocaleDateString([], {
    ...fmt,
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}
