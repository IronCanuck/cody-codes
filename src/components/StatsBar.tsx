import { Clock, CalendarDays, CalendarRange, DollarSign } from 'lucide-react';
import { Job, Settings, SavedDailyReport } from '../lib/supabase';
import { getMonthBounds, getWeekBounds, toLocalDateInputValue } from '../lib/time';
import {
  computeEarnings,
  formatMoney,
  getPayPeriodForDate,
} from '../lib/earnings';

type Props = {
  jobs: Job[];
  settings: Settings | null;
  dailyReports?: SavedDailyReport[];
};

export function StatsBar({ jobs, settings, dailyReports = [] }: Props) {
  const now = new Date();
  const today = toLocalDateInputValue(now);
  const week = getWeekBounds(now);
  const month = getMonthBounds(now);

  const inRange = (j: Job, start: Date, end: Date) => {
    const d = new Date(j.job_date + 'T12:00:00');
    return d >= start && d <= end;
  };

  const sumHours = (list: Job[]) =>
    list.reduce((s, j) => s + Number(j.hours_worked || 0), 0);

  const todayJobs = jobs.filter((j) => j.job_date === today);
  const weekJobs = jobs.filter((j) => inRange(j, week.start, week.end));
  const monthJobs = jobs.filter((j) => inRange(j, month.start, month.end));

  const periodEarnings = settings
    ? computeEarnings(jobs, getPayPeriodForDate(now, settings), settings, dailyReports)
    : null;

  const cards: {
    label: string;
    value: string;
    sub: string;
    Icon: typeof Clock;
    highlight?: boolean;
  }[] = [
    {
      label: 'Today',
      value: `${sumHours(todayJobs).toFixed(1)} hrs`,
      sub: `${todayJobs.length} ${todayJobs.length === 1 ? 'shift' : 'shifts'}`,
      Icon: Clock,
    },
    {
      label: 'This Week',
      value: `${sumHours(weekJobs).toFixed(1)} hrs`,
      sub: `${weekJobs.length} ${weekJobs.length === 1 ? 'shift' : 'shifts'}`,
      Icon: CalendarDays,
    },
    {
      label: 'This Month',
      value: `${sumHours(monthJobs).toFixed(1)} hrs`,
      sub: `${monthJobs.length} ${monthJobs.length === 1 ? 'shift' : 'shifts'}`,
      Icon: CalendarRange,
    },
    {
      label: 'Pay Period',
      value: periodEarnings
        ? formatMoney(periodEarnings.totalPay, settings!.currency_symbol)
        : '—',
      sub: periodEarnings
        ? `${periodEarnings.totalHours.toFixed(1)} hrs${
            periodEarnings.overtimeHours > 0
              ? ` • ${periodEarnings.overtimeHours.toFixed(1)} OT`
              : ''
          }`
        : 'Configure in Settings',
      Icon: DollarSign,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.Icon;
        return (
          <div
            key={c.label}
            className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${
              c.highlight
                ? 'bg-jd-green-50 border-jd-green-300 hover:border-jd-green-500'
                : 'bg-white border-gray-200 hover:border-jd-green-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {c.label}
              </span>
              <div
                className={`rounded-lg p-1.5 ${
                  c.highlight ? 'bg-jd-yellow-400' : 'bg-jd-green-50'
                }`}
              >
                <Icon
                  size={16}
                  className={c.highlight ? 'text-jd-green-800' : 'text-jd-green-600'}
                />
              </div>
            </div>
            <div
              className={`text-2xl font-bold ${
                c.highlight ? 'text-jd-green-700' : 'text-gray-900'
              }`}
            >
              {c.value}
            </div>
            <span className="text-xs text-gray-500">{c.sub}</span>
          </div>
        );
      })}
    </div>
  );
}
