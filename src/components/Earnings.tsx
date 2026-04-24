import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Zap,
  CalendarDays,
  FileText,
  FileImage,
  Plus,
  Pencil,
  List,
} from 'lucide-react';
import { Job, Settings, SavedDailyReport } from '../lib/supabase';
import {
  computeEarnings,
  formatMoney,
  formatPeriodLabel,
  getPayPeriodForDate,
  shiftPayPeriod,
  type PayPeriod,
} from '../lib/earnings';
import { formatDate, formatTime, toLocalDateInputValue } from '../lib/time';
import { generatePayPeriodPDF } from '../lib/pdf';
import { generatePayPeriodPNG } from '../lib/png';

type Props = {
  jobs: Job[];
  settings: Settings;
  dailyReports: SavedDailyReport[];
  onSuccess: (msg: string) => void;
  onEditJob: (j: Job) => void;
};

function isDateInPayPeriod(ymd: string, p: PayPeriod): boolean {
  const s = toLocalDateInputValue(p.start);
  const e = toLocalDateInputValue(p.end);
  return ymd >= s && ymd <= e;
}

function defaultLogDateForPeriod(p: PayPeriod): string {
  const today = toLocalDateInputValue(new Date());
  if (isDateInPayPeriod(today, p)) return today;
  return toLocalDateInputValue(p.start);
}

export function Earnings({ jobs, settings, dailyReports, onSuccess, onEditJob }: Props) {
  const [period, setPeriod] = useState(() => getPayPeriodForDate(new Date(), settings));
  const [exporting, setExporting] = useState(false);

  const defaultLogDate = useMemo(() => defaultLogDateForPeriod(period), [period]);

  const earnings = useMemo(
    () => computeEarnings(jobs, period, settings, dailyReports),
    [jobs, period, settings, dailyReports],
  );

  const currency = settings.currency_symbol;
  const otRate = Number(settings.hourly_rate) * Number(settings.overtime_multiplier);

  const summaryCards = [
    {
      label: 'Total Earnings',
      value: formatMoney(earnings.totalPay, currency),
      sub: `${earnings.totalHours.toFixed(2)} hrs total`,
      Icon: DollarSign,
      highlight: true,
    },
    {
      label: 'Regular Pay',
      value: formatMoney(earnings.regularPay, currency),
      sub: `${earnings.regularHours.toFixed(2)} hrs @ ${currency}${Number(settings.hourly_rate).toFixed(2)}`,
      Icon: Clock,
    },
    {
      label: 'Overtime Pay',
      value: formatMoney(earnings.overtimePay, currency),
      sub: `${earnings.overtimeHours.toFixed(2)} hrs @ ${currency}${otRate.toFixed(2)}`,
      Icon: Zap,
    },
    {
      label: 'Avg Per Day',
      value: formatMoney(
        earnings.totalPay / Math.max(1, settings.pay_period_length_days),
        currency,
      ),
      sub: `over ${settings.pay_period_length_days} days`,
      Icon: TrendingUp,
    },
  ];

  const downloadReport = async (fmt: 'pdf' | 'png') => {
    setExporting(true);
    try {
      if (fmt === 'pdf') {
        generatePayPeriodPDF(period, earnings, settings);
      } else {
        await generatePayPeriodPNG(period, earnings, settings);
      }
      onSuccess(`Pay period ${fmt.toUpperCase()} downloaded`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-jd-green-600 to-jd-green-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="bg-jd-yellow-400 rounded-lg p-2.5">
              <DollarSign className="text-jd-green-800" size={24} />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Earnings & Hours</h2>
              <p className="text-jd-green-100 text-sm mt-0.5">
                Track hours worked and estimated wages per pay period
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadReport('pdf')}
              disabled={exporting}
              className="bg-jd-yellow-400 hover:bg-jd-yellow-500 disabled:opacity-60 text-jd-green-800 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
            >
              <FileText size={16} /> PDF
            </button>
            <button
              onClick={() => downloadReport('png')}
              disabled={exporting}
              className="bg-white hover:bg-gray-100 disabled:opacity-60 text-jd-green-800 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border border-jd-green-200"
            >
              <FileImage size={16} /> PNG
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
          <button
            onClick={() => setPeriod(shiftPayPeriod(period, settings, -1))}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white text-gray-700 font-medium text-sm"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="text-center flex-1">
            <div className="text-xs uppercase font-semibold text-gray-500 tracking-wide">
              Pay Period
            </div>
            <div className="font-bold text-gray-900 text-base sm:text-lg flex items-center justify-center gap-2">
              <CalendarDays size={16} className="text-jd-green-600" />
              {formatPeriodLabel(period)}
            </div>
          </div>
          <button
            onClick={() => setPeriod(shiftPayPeriod(period, settings, 1))}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white text-gray-700 font-medium text-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-gray-600">
            These totals use hours from logged jobs. Add or change entries below, or on Log Job.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/consaltyapp/log?date=${encodeURIComponent(defaultLogDate)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-jd-green-600 hover:bg-jd-green-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              <Plus size={16} /> Log work
            </Link>
            <Link
              to="/consaltyapp/history"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50"
            >
              <List size={16} /> History
            </Link>
          </div>
        </div>

        <p className="px-6 pt-4 text-xs text-gray-500">
          Regular vs overtime is calculated per calendar day: Mon–Fri first 8 hrs regular, Sat first
          4 hrs regular, Sun all overtime. Days with a submitted daily report use your{' '}
          <strong className="text-gray-700">total work day</strong> hours for that split; other days
          use the sum of logged tasks.
        </p>

        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((c) => {
            const Icon = c.Icon;
            return (
              <div
                key={c.label}
                className={`rounded-xl border p-4 ${
                  c.highlight
                    ? 'bg-jd-green-50 border-jd-green-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {c.label}
                  </span>
                  <div
                    className={`rounded-lg p-1.5 ${
                      c.highlight ? 'bg-jd-yellow-400' : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={c.highlight ? 'text-jd-green-800' : 'text-gray-600'}
                    />
                  </div>
                </div>
                <div
                  className={`text-xl font-bold ${
                    c.highlight ? 'text-jd-green-700' : 'text-gray-900'
                  }`}
                >
                  {c.value}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{c.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6">
          <h3 className="font-bold text-gray-900 mb-3">Weekly Breakdown</h3>
          <div className="space-y-3">
            {earnings.weeks.map((w, i) => {
              const isOver = w.overtimeHours > 0;
              const regPct =
                w.totalHours > 0 ? (w.regularHours / w.totalHours) * 100 : 0;
              const otPct =
                w.totalHours > 0 ? (w.overtimeHours / w.totalHours) * 100 : 0;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    isOver
                      ? 'bg-jd-yellow-50 border-jd-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="font-semibold text-gray-800 text-sm">
                      Week {i + 1}:{' '}
                      {w.weekStart.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      –{' '}
                      {w.weekEnd.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        to={`/consaltyapp/log?date=${encodeURIComponent(toLocalDateInputValue(w.weekStart))}`}
                        className="text-xs font-semibold text-jd-green-700 hover:underline"
                      >
                        Log (week)
                      </Link>
                      <div className="text-sm font-bold text-jd-green-700">
                        {formatMoney(w.regularPay + w.overtimePay, currency)}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden mb-2 flex border border-gray-200">
                    <div
                      className="h-full bg-jd-green-600 transition-all"
                      style={{ width: `${regPct}%` }}
                      title="Regular hours"
                    />
                    <div
                      className="h-full bg-jd-yellow-400 transition-all"
                      style={{ width: `${otPct}%` }}
                      title="Overtime hours"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span>
                      <span className="font-semibold text-gray-800">Total:</span>{' '}
                      {w.totalHours.toFixed(2)} hrs
                    </span>
                    <span>
                      Regular: <span className="font-semibold">{w.regularHours.toFixed(2)} hrs</span>
                    </span>
                    {w.overtimeHours > 0 && (
                      <span className="text-jd-green-700 font-semibold">
                        Overtime: {w.overtimeHours.toFixed(2)} hrs
                      </span>
                    )}
                    <span>{w.jobs.length} jobs</span>
                  </div>
                </div>
              );
            })}
            {earnings.weeks.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-8 space-y-3">
                <p>No hours logged in this pay period.</p>
                <Link
                  to={`/consaltyapp/log?date=${encodeURIComponent(defaultLogDate)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-jd-green-600 hover:bg-jd-green-700 text-white font-semibold rounded-lg text-sm"
                >
                  <Plus size={16} /> Log work for this period
                </Link>
              </div>
            )}
          </div>
        </div>

        {earnings.days.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="font-bold text-gray-900 mb-3">Daily work summary</h3>
            <p className="text-sm text-gray-500 mb-3">
              Payroll hours and regular vs overtime from each work day (includes submitted daily
              report times when available).
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-jd-green-600 text-white">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-left px-4 py-2 font-semibold">Work day</th>
                    <th className="text-right px-4 py-2 font-semibold">Total</th>
                    <th className="text-right px-4 py-2 font-semibold">Regular</th>
                    <th className="text-right px-4 py-2 font-semibold">Overtime</th>
                    <th className="text-right px-4 py-2 font-semibold">Pay</th>
                    <th className="text-right px-4 py-2 font-semibold">Log</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.days.map((d, idx) => {
                    const dayPay = d.regularPay + d.overtimePay;
                    const range =
                      d.dayStartTime && d.dayEndTime
                        ? `${formatTime(d.dayStartTime)} – ${formatTime(d.dayEndTime)}`
                        : '—';
                    return (
                      <tr
                        key={d.date}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {formatDate(d.date)}
                        </td>
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{range}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-800">
                          {d.totalHours.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {d.regularHours.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {d.overtimeHours.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-jd-green-700">
                          {formatMoney(dayPay, currency)}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <Link
                            to={`/consaltyapp/log?date=${encodeURIComponent(d.date)}`}
                            className="text-xs font-semibold text-jd-green-700 hover:underline"
                          >
                            Log
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {earnings.weeks.some((w) => w.jobs.length > 0) && (
          <div className="px-6 pb-6">
            <h3 className="font-bold text-gray-900 mb-3">Task log</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-jd-green-600 text-white">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-right px-4 py-2 font-semibold">Hours</th>
                    <th className="text-left px-4 py-2 font-semibold">Activity</th>
                    <th className="text-right px-4 py-2 font-semibold">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.weeks
                    .flatMap((w) => w.jobs)
                    .sort((a, b) => {
                      if (a.job_date !== b.job_date)
                        return a.job_date.localeCompare(b.job_date);
                      return a.start_time.localeCompare(b.start_time);
                    })
                    .map((j, idx) => (
                      <tr
                        key={j.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {formatDate(j.job_date)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-800">
                          {Number(j.hours_worked).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {j.site ? (
                            <span className="font-medium text-gray-800">{j.site} — </span>
                          ) : null}
                          {j.activity}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onEditJob(j)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-jd-green-700 hover:underline"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
