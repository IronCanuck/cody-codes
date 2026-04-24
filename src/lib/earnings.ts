import { Job, Settings, SavedDailyReport } from './supabase';
import { getWorkDayHoursWithLunch, toLocalDateInputValue } from './time';

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

/** 0 = Sunday … 6 = Saturday (local calendar). */
function dayOfWeekFromDateString(yyyyMmDd: string): number {
  return new Date(yyyyMmDd + 'T12:00:00').getDay();
}

/**
 * Mon–Fri: first 8h regular, rest overtime.
 * Saturday: first 4h regular, rest overtime.
 * Sunday: all overtime.
 */
export function splitHoursByWeekday(
  totalHours: number,
  dayOfWeek: number,
): { regular: number; overtime: number } {
  if (totalHours <= 0) return { regular: 0, overtime: 0 };
  if (dayOfWeek === 0) {
    return { regular: 0, overtime: totalHours };
  }
  if (dayOfWeek === 6) {
    return {
      regular: Math.min(totalHours, 4),
      overtime: Math.max(0, totalHours - 4),
    };
  }
  return {
    regular: Math.min(totalHours, 8),
    overtime: Math.max(0, totalHours - 8),
  };
}

function latestReportByDate(reports: SavedDailyReport[]): Map<string, SavedDailyReport> {
  const map = new Map<string, SavedDailyReport>();
  const sorted = [...reports].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of sorted) {
    map.set(r.report_date, r);
  }
  return map;
}

function collectDatesInPeriod(
  periodJobs: Job[],
  dailyReports: SavedDailyReport[],
  period: PayPeriod,
): string[] {
  const dates = new Set<string>();
  for (const j of periodJobs) dates.add(j.job_date);
  for (const r of dailyReports) {
    const t = new Date(r.report_date + 'T12:00:00');
    if (t >= period.start && t <= period.end) dates.add(r.report_date);
  }
  return [...dates].sort();
}

export type DayBreakdown = {
  date: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  jobs: Job[];
  dayStartTime: string | null;
  dayEndTime: string | null;
  /** Set when start/end come from an archived daily report (editable in bulk mode). */
  workDayClockSource: 'report' | 'single_job' | null;
  dailyReportId: string | null;
  singleJobId: string | null;
};

function buildDayBreakdowns(
  periodJobs: Job[],
  period: PayPeriod,
  repMap: Map<string, SavedDailyReport>,
  dailyReports: SavedDailyReport[],
  settings: Settings,
): DayBreakdown[] {
  const rate = Number(settings.hourly_rate);
  const mult = Number(settings.overtime_multiplier);

  const byDateJobs = new Map<string, Job[]>();
  for (const j of periodJobs) {
    const list = byDateJobs.get(j.job_date) ?? [];
    list.push(j);
    byDateJobs.set(j.job_date, list);
  }

  const dates = collectDatesInPeriod(periodJobs, dailyReports, period);
  const days: DayBreakdown[] = [];

  for (const date of dates) {
    const dayJobs = byDateJobs.get(date) ?? [];
    const report = repMap.get(date);
    const fromTasks = dayJobs.reduce((s, j) => s + Number(j.hours_worked || 0), 0);
    const repStart = report?.day_start_time?.trim();
    const repEnd = report?.day_end_time?.trim();
    const hasReportClock = Boolean(repStart && repEnd);
    const single = dayJobs.length === 1 ? dayJobs[0] : null;
    const hasSingleJobClock = Boolean(
      single?.start_time && single?.end_time,
    );

    let totalHours: number;
    let dayStartTime: string | null = null;
    let dayEndTime: string | null = null;
    let workDayClockSource: DayBreakdown['workDayClockSource'] = null;
    let dailyReportId: string | null = null;
    let singleJobId: string | null = null;

    if (hasReportClock) {
      totalHours = getWorkDayHoursWithLunch(repStart!, repEnd!).hours;
      dayStartTime = repStart!;
      dayEndTime = repEnd!;
      workDayClockSource = 'report';
      dailyReportId = report!.id;
    } else if (dayJobs.length === 1 && hasSingleJobClock) {
      const j = dayJobs[0];
      totalHours = getWorkDayHoursWithLunch(j.start_time, j.end_time).hours;
      dayStartTime = j.start_time;
      dayEndTime = j.end_time;
      workDayClockSource = 'single_job';
      singleJobId = j.id;
    } else {
      totalHours = report != null ? Number(report.day_hours) : fromTasks;
    }

    if (totalHours <= 0 && dayJobs.length === 0) continue;

    const dow = dayOfWeekFromDateString(date);
    const { regular: regH, overtime: otH } = splitHoursByWeekday(totalHours, dow);

    days.push({
      date,
      totalHours,
      regularHours: regH,
      overtimeHours: otH,
      regularPay: regH * rate,
      overtimePay: otH * rate * mult,
      jobs: dayJobs,
      dayStartTime,
      dayEndTime,
      workDayClockSource,
      dailyReportId,
      singleJobId,
    });
  }

  return days;
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

function groupDaysIntoWeeks(days: DayBreakdown[], period: PayPeriod): WeekBreakdown[] {
  const weeks: WeekBreakdown[] = [];
  let cursor = new Date(period.start);

  while (cursor <= period.end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > period.end) weekEnd.setTime(period.end.getTime());
    weekEnd.setHours(23, 59, 59, 999);

    const weekDays = days.filter((d) => {
      const t = new Date(d.date + 'T12:00:00');
      return t >= weekStart && t <= weekEnd;
    });

    const weekJobs = weekDays.flatMap((d) => d.jobs);
    const totalHours = weekDays.reduce((s, d) => s + d.totalHours, 0);
    const regularHours = weekDays.reduce((s, d) => s + d.regularHours, 0);
    const overtimeHours = weekDays.reduce((s, d) => s + d.overtimeHours, 0);
    const regularPay = weekDays.reduce((s, d) => s + d.regularPay, 0);
    const overtimePay = weekDays.reduce((s, d) => s + d.overtimePay, 0);

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
  days: DayBreakdown[];
};

export function computeEarnings(
  jobs: Job[],
  period: PayPeriod,
  settings: Settings,
  dailyReports: SavedDailyReport[] = [],
): EarningsSummary {
  const periodJobs = jobsInPeriod(jobs, period);
  const repMap = latestReportByDate(dailyReports);
  const days = buildDayBreakdowns(periodJobs, period, repMap, dailyReports, settings);
  const weeks = groupDaysIntoWeeks(days, period);
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
    days,
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
