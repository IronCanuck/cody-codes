import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Job, Settings } from '../lib/supabase';
import {
  computeEarnings,
  formatMoney,
  formatPeriodLabel,
  getPayPeriodForDate,
  shiftPayPeriod,
} from '../lib/earnings';
import { formatDate } from '../lib/time';
import { generatePayPeriodPDF } from '../lib/pdf';
import { generatePayPeriodPNG } from '../lib/png';

type Props = {
  jobs: Job[];
  settings: Settings;
  onSuccess: (msg: string) => void;
};

export function Earnings({ jobs, settings, onSuccess }: Props) {
  const [period, setPeriod] = useState(() => getPayPeriodForDate(new Date(), settings));
  const [exporting, setExporting] = useState(false);

  const earnings = useMemo(
    () => computeEarnings(jobs, period, settings),
    [jobs, period, settings],
  );

  const currency = settings.currency_symbol;
  const threshold = Number(settings.overtime_threshold_hours);
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
              const pct = Math.min(100, (w.totalHours / threshold) * 100);
              const isOver = w.overtimeHours > 0;
              const barColor = isOver
                ? 'bg-jd-yellow-400'
                : pct > 80
                  ? 'bg-jd-green-400'
                  : 'bg-jd-green-600';
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
                    <div className="text-sm font-bold text-jd-green-700">
                      {formatMoney(w.regularPay + w.overtimePay, currency)}
                    </div>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden mb-2 relative border border-gray-200">
                    <div
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                    {isOver && (
                      <div
                        className="absolute top-0 right-0 h-full bg-jd-yellow-500"
                        style={{
                          width: `${Math.min(100, (w.overtimeHours / threshold) * 100)}%`,
                        }}
                      />
                    )}
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
              <div className="text-sm text-gray-500 text-center py-8">
                No hours logged in this pay period.
              </div>
            )}
          </div>
        </div>

        {earnings.weeks.some((w) => w.jobs.length > 0) && (
          <div className="px-6 pb-6">
            <h3 className="font-bold text-gray-900 mb-3">Daily Log</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-jd-green-600 text-white">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-right px-4 py-2 font-semibold">Hours</th>
                    <th className="text-left px-4 py-2 font-semibold">Activity</th>
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
