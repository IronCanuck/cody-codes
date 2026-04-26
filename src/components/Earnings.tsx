import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Landmark,
  X,
  Copy,
  Trash2,
} from 'lucide-react';
import { supabase, Job, Settings, SavedDailyReport } from '../lib/supabase';
import {
  estimateAlbertaEmploymentNet,
  netAfterExtraPayPeriodTax,
  ALBERTA_NET_DISCLAIMER,
} from '../lib/canada-alberta-estimate';
import {
  computeEarnings,
  formatMoney,
  formatPeriodLabel,
  getPayPeriodForDate,
  shiftPayPeriod,
  type DayBreakdown,
  type PayPeriod,
} from '../lib/earnings';
import {
  canonicalizeClockPairForWorkDay,
  combineDateAndTime,
  formatDate,
  formatTime,
  getWorkDayHoursWithLunch,
  getWorkDayHoursWithLunchAnchored,
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from '../lib/time';
import { QuarterHourTimeInput } from './QuarterHourTimeInput';
import { generatePayPeriodPDF } from '../lib/pdf';
import { generatePayPeriodPNG } from '../lib/png';

type Props = {
  jobs: Job[];
  settings: Settings;
  dailyReports: SavedDailyReport[];
  onSuccess: (msg: string) => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onEditJob: (j: Job) => void;
  onDeleteJobsForDate: (date: string) => Promise<void>;
  onDuplicateDay: (sourceDate: string, targetDate: string) => Promise<boolean>;
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

function addOneCalendarDayYmd(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toLocalDateInputValue(d);
}

export function Earnings({
  jobs,
  settings,
  dailyReports,
  onSuccess,
  onSaved,
  onError,
  onEditJob,
  onDeleteJobsForDate,
  onDuplicateDay,
}: Props) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(() => getPayPeriodForDate(new Date(), settings));
  const [dayActionBusy, setDayActionBusy] = useState<string | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState('');
  const [duplicateSaving, setDuplicateSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickDate, setQuickDate] = useState(() => toLocalDateInputValue(new Date()));
  const [quickStart, setQuickStart] = useState('');
  const [quickEnd, setQuickEnd] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [summarySelectedDates, setSummarySelectedDates] = useState<string[]>([]);
  const [summaryBulkMode, setSummaryBulkMode] = useState(false);
  const [summaryBulkBusy, setSummaryBulkBusy] = useState(false);
  const [dayTimeSaving, setDayTimeSaving] = useState<string | null>(null);
  const summarySelectAllRef = useRef<HTMLInputElement>(null);

  const defaultLogDate = useMemo(() => defaultLogDateForPeriod(period), [period]);

  const periodKey = `${toLocalDateInputValue(period.start)}-${toLocalDateInputValue(period.end)}`;
  useEffect(() => {
    setSummarySelectedDates([]);
    setSummaryBulkMode(false);
  }, [periodKey]);

  const earnings = useMemo(
    () => computeEarnings(jobs, period, settings, dailyReports),
    [jobs, period, settings, dailyReports],
  );

  const duplicateSourceJobs = useMemo(() => {
    if (!duplicateSource) return [];
    return jobs
      .filter((j) => j.job_date === duplicateSource)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [duplicateSource, jobs]);

  const existingJobsOnTarget = useMemo(() => {
    if (!duplicateTarget || !/^\d{4}-\d{2}-\d{2}$/.test(duplicateTarget)) return 0;
    return jobs.filter((j) => j.job_date === duplicateTarget).length;
  }, [jobs, duplicateTarget]);

  const currency = settings.currency_symbol;
  const otRate = Number(settings.hourly_rate) * Number(settings.overtime_multiplier);

  const abNet = useMemo(
    () => estimateAlbertaEmploymentNet(earnings.totalPay, settings.pay_period_length_days),
    [earnings.totalPay, settings.pay_period_length_days],
  );

  const extraTaxPerPeriod = Math.max(0, Number(settings.extra_tax_per_pay_period) || 0);
  const projectedNet = useMemo(
    () => netAfterExtraPayPeriodTax(abNet.periodNet, settings.extra_tax_per_pay_period),
    [abNet.periodNet, settings.extra_tax_per_pay_period],
  );

  const summaryDayYmds = useMemo(() => earnings.days.map((d) => d.date), [earnings.days]);
  const allSummaryRowsSelected =
    summaryDayYmds.length > 0 &&
    summarySelectedDates.length === summaryDayYmds.length &&
    summaryDayYmds.every((d) => summarySelectedDates.includes(d));

  useEffect(() => {
    const el = summarySelectAllRef.current;
    if (!el || !summaryBulkMode) return;
    el.indeterminate =
      summarySelectedDates.length > 0 && summarySelectedDates.length < summaryDayYmds.length;
  }, [summaryBulkMode, summarySelectedDates, summaryDayYmds.length]);

  const toggleSummaryDateSelected = (ymd: string) => {
    setSummarySelectedDates((prev) =>
      prev.includes(ymd) ? prev.filter((d) => d !== ymd) : [...prev, ymd].sort(),
    );
  };

  const toggleSelectAllSummaryRows = () => {
    if (allSummaryRowsSelected) setSummarySelectedDates([]);
    else setSummarySelectedDates([...summaryDayYmds]);
  };

  const runBulkEditSummary = () => {
    if (summarySelectedDates.length === 0) return;
    const sorted = [...summarySelectedDates].sort();
    const first = sorted[0];
    navigate(`/consaltyapp/log?date=${encodeURIComponent(first)}`);
    onSuccess(
      sorted.length > 1
        ? `Opened work log for ${formatDate(first)}. Change the work date on that page to edit your other selected days.`
        : `Opened work log for ${formatDate(first)}.`,
    );
    setSummarySelectedDates([]);
    setSummaryBulkMode(false);
  };

  const runBulkDuplicateSummary = () => {
    if (summarySelectedDates.length !== 1) {
      onError('Select one day to duplicate, or use the copy icon on a single row.');
      return;
    }
    const d = summarySelectedDates[0];
    const day = earnings.days.find((x) => x.date === d);
    if (!day || day.jobs.length === 0) {
      onError('No job entries to duplicate for that day.');
      return;
    }
    setDuplicateSource(d);
    setDuplicateTarget(addOneCalendarDayYmd(d));
    setSummarySelectedDates([]);
  };

  const persistWorkDayTimes = useCallback(
    async (
      d: DayBreakdown,
      nextStartHhmm: string | null,
      nextEndHhmm: string | null,
    ) => {
      if (!d.workDayClockSource || !d.dayStartTime || !d.dayEndTime) return;
      const baseStartIso =
        nextStartHhmm != null ? combineDateAndTime(d.date, nextStartHhmm) : d.dayStartTime;
      const baseEndIso =
        nextEndHhmm != null ? combineDateAndTime(d.date, nextEndHhmm) : d.dayEndTime;
      const { startIso, endIso } = canonicalizeClockPairForWorkDay(
        d.date,
        baseStartIso,
        baseEndIso,
      );
      const { hours } = getWorkDayHoursWithLunch(startIso, endIso);
      if (hours <= 0) {
        onError('End time must be after start time on that day.');
        return;
      }
      setDayTimeSaving(d.date);
      try {
        if (d.workDayClockSource === 'report') {
          if (!d.dailyReportId) {
            onError('Missing report record for this day.');
            return;
          }
          const { error } = await supabase
            .from('saved_daily_reports')
            .update({
              day_start_time: startIso,
              day_end_time: endIso,
              day_hours: hours,
            })
            .eq('id', d.dailyReportId);
          if (error) throw error;
        } else {
          if (!d.singleJobId) {
            onError('Missing job entry for this day.');
            return;
          }
          const { error } = await supabase
            .from('jobs')
            .update({
              start_time: startIso,
              end_time: endIso,
              hours_worked: hours,
            })
            .eq('id', d.singleJobId);
          if (error) throw error;
        }
        onSaved('Work day times updated');
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not save times');
      } finally {
        setDayTimeSaving(null);
      }
    },
    [onError, onSaved],
  );

  const runBulkDeleteSummary = async () => {
    const sorted = [...summarySelectedDates].sort();
    const datesWithJobs = sorted.filter(
      (ymd) => (earnings.days.find((x) => x.date === ymd)?.jobs.length ?? 0) > 0,
    );
    if (datesWithJobs.length === 0) {
      onError('No job entries to delete on the selected days.');
      return;
    }
    if (
      !window.confirm(
        `Delete all job entries for ${datesWithJobs.length} day${datesWithJobs.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSummaryBulkBusy(true);
    try {
      for (const ymd of datesWithJobs) {
        await onDeleteJobsForDate(ymd);
      }
      onSaved(`Removed entries for ${datesWithJobs.length} day${datesWithJobs.length === 1 ? '' : 's'}.`);
      setSummarySelectedDates([]);
      setSummaryBulkMode(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setSummaryBulkBusy(false);
    }
  };

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

  const openQuickLog = () => {
    setQuickDate(defaultLogDate);
    setQuickStart('');
    setQuickEnd('');
    setQuickLogOpen(true);
  };

  const submitQuickLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickDate || !quickStart || !quickEnd) {
      onError('Set date, start time, and end time.');
      return;
    }
    const startIso = combineDateAndTime(quickDate, quickStart);
    const endIso = combineDateAndTime(quickDate, quickEnd);
    const { startIso: canonStart, endIso: canonEnd } = canonicalizeClockPairForWorkDay(
      quickDate,
      startIso,
      endIso,
    );
    const { hours: payHours } = getWorkDayHoursWithLunch(canonStart, canonEnd);
    if (payHours <= 0) {
      onError('End time must be after start time on that day.');
      return;
    }
    setQuickSaving(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        job_date: quickDate,
        start_time: canonStart,
        end_time: canonEnd,
        hours_worked: payHours,
        activity: 'Hours',
        site: '',
        notes: '',
      });
      if (error) throw error;
      onSaved(`Logged ${payHours.toFixed(2)} hours for ${formatDate(quickDate)}`);
      setQuickLogOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save hours');
    } finally {
      setQuickSaving(false);
    }
  };

  const closeDuplicateModal = () => {
    if (duplicateSaving) return;
    setDuplicateSource(null);
    setDuplicateTarget('');
  };

  const confirmDuplicate = async (e: FormEvent) => {
    e.preventDefault();
    if (!duplicateSource) return;
    setDuplicateSaving(true);
    try {
      const ok = await onDuplicateDay(duplicateSource, duplicateTarget);
      if (ok) {
        setDuplicateSource(null);
        setDuplicateTarget('');
      }
    } finally {
      setDuplicateSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {quickLogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          role="presentation"
          onClick={() => !quickSaving && setQuickLogOpen(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-log-title"
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={submitQuickLog}
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-jd-green-50">
              <h2 id="quick-log-title" className="text-lg font-bold text-jd-green-800">
                Add hours
              </h2>
              <button
                type="button"
                onClick={() => !quickSaving && setQuickLogOpen(false)}
                className="p-1.5 rounded-lg text-jd-green-800 hover:bg-jd-green-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="quick-log-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="quick-log-date"
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quick-log-start"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Start
                  </label>
                  <QuarterHourTimeInput
                    id="quick-log-start"
                    value={quickStart}
                    onChange={setQuickStart}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="quick-log-end"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    End
                  </label>
                  <QuarterHourTimeInput
                    id="quick-log-end"
                    value={quickEnd}
                    onChange={setQuickEnd}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Saves as a single work block with activity &ldquo;Hours&rdquo;. Use Log work for
                full daily details and daily reports.
              </p>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickLogOpen(false)}
                disabled={quickSaving}
                className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quickSaving}
                className="px-4 py-2 text-sm font-semibold bg-jd-green-600 hover:bg-jd-green-700 text-white rounded-lg disabled:opacity-60"
              >
                {quickSaving ? 'Saving…' : 'Save hours'}
              </button>
            </div>
          </form>
        </div>
      )}

      {duplicateSource && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          role="presentation"
          onClick={closeDuplicateModal}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-day-title"
            onClick={(ev) => ev.stopPropagation()}
            onSubmit={confirmDuplicate}
            className="w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-slate-50">
              <div>
                <h2 id="duplicate-day-title" className="text-lg font-bold text-slate-900">
                  Duplicate work day
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Copying from <span className="font-semibold">{formatDate(duplicateSource)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeDuplicateModal}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 shrink-0"
                aria-label="Close"
                disabled={duplicateSaving}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto min-h-0">
              {duplicateSourceJobs.length === 0 && (
                <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  No job entries found for this day anymore. Close and try again.
                </p>
              )}
              <div>
                <label
                  htmlFor="duplicate-target-date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Copy to date
                </label>
                <input
                  id="duplicate-target-date"
                  type="date"
                  value={duplicateTarget}
                  onChange={(e) => setDuplicateTarget(e.target.value)}
                  className="w-full sm:max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Defaults to the day after the source. Change this if the copies should land on
                  a different work day.
                </p>
              </div>
              {existingJobsOnTarget > 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {formatDate(duplicateTarget)} already has {existingJobsOnTarget}{' '}
                  {existingJobsOnTarget === 1 ? 'entry' : 'entries'}. The duplicate will be added
                  in addition to those.
                </p>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  {duplicateSourceJobs.length} job {duplicateSourceJobs.length === 1 ? 'row' : 'rows'}{' '}
                  to copy
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-100 text-gray-600 sticky top-0">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 font-medium">Time</th>
                          <th className="px-2 sm:px-3 py-2 font-medium text-right">Hrs</th>
                          <th className="px-2 sm:px-3 py-2 font-medium">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateSourceJobs.map((j) => {
                          const hrs = getWorkDayHoursWithLunchAnchored(
                            j.job_date,
                            j.start_time,
                            j.end_time,
                          ).hours.toFixed(2);
                          const timeRange = `${formatTime(j.start_time)} – ${formatTime(j.end_time)}`;
                          return (
                            <tr key={j.id} className="border-t border-gray-100">
                              <td className="px-2 sm:px-3 py-1.5 text-gray-700 whitespace-nowrap">
                                {timeRange}
                              </td>
                              <td className="px-2 sm:px-3 py-1.5 text-right font-medium text-gray-800">
                                {hrs}
                              </td>
                              <td className="px-2 sm:px-3 py-1.5 text-gray-600">
                                {j.site ? (
                                  <span className="font-medium text-gray-800">{j.site} — </span>
                                ) : null}
                                {j.activity}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Times and details are copied as shown. To adjust them after duplicating, open{' '}
                  <span className="font-medium">Log</span> for the target day.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeDuplicateModal}
                disabled={duplicateSaving}
                className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  duplicateSaving ||
                  duplicateSourceJobs.length === 0 ||
                  !duplicateTarget ||
                  duplicateSource === duplicateTarget
                }
                className="px-4 py-2 text-sm font-semibold bg-jd-green-600 hover:bg-jd-green-700 text-white rounded-lg disabled:opacity-50 disabled:pointer-events-none"
              >
                {duplicateSaving ? 'Copying…' : 'Copy jobs to this date'}
              </button>
            </div>
          </form>
        </div>
      )}

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

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden has-[[aria-expanded='true']]:overflow-visible">
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
            <button
              type="button"
              onClick={openQuickLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-jd-green-600 hover:bg-jd-green-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              <Plus size={16} /> Add hours
            </button>
            <Link
              to={`/consaltyapp/log?date=${encodeURIComponent(defaultLogDate)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-jd-green-600 text-jd-green-800 text-sm font-semibold rounded-lg hover:bg-jd-green-50"
            >
              Log work
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

        <div className="px-6 pt-2 pb-4">
          <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/80 flex items-start gap-3">
              <div className="rounded-lg p-2 bg-slate-200/80 text-slate-800 shrink-0">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Estimated take-home (Alberta)</h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  Gross for this pay period is annualized (× 365 / {settings.pay_period_length_days}{' '}
                  days) and run through 2025 federal and Alberta tax brackets, basic personal
                  credits, plus CPP and EI—similar to a salaried paycheque, not a contractor invoice.
                </p>
              </div>
            </div>
            {earnings.totalPay > 0 ? (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Est. net (this pay period)
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-jd-green-700 tabular-nums">
                      {formatMoney(projectedNet, currency)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      After about {(abNet.effectiveTotalRate * 100).toFixed(1)}% in tax + CPP + EI;
                      annualized gross ≈ {formatMoney(abNet.annualGross, currency)}/yr
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-sm">
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                      Federal
                    </div>
                    <div className="font-semibold text-slate-800 tabular-nums">
                      {formatMoney(abNet.periodFederalTax, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                      Alberta
                    </div>
                    <div className="font-semibold text-slate-800 tabular-nums">
                      {formatMoney(abNet.periodAbTax, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                      CPP
                    </div>
                    <div className="font-semibold text-slate-800 tabular-nums">
                      {formatMoney(abNet.periodCpp, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">EI</div>
                    <div className="font-semibold text-slate-800 tabular-nums">
                      {formatMoney(abNet.periodEi, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3 sm:col-span-2 lg:col-span-1">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                      Extra withholding
                    </div>
                    <div className="font-semibold text-slate-800 tabular-nums">
                      {extraTaxPerPeriod > 0
                        ? formatMoney(extraTaxPerPeriod, currency)
                        : '—'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Per pay period · Settings
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
                  {ALBERTA_NET_DISCLAIMER} Varies with RRSP, dependents, other income, and actual
                  payroll settings.
                </p>
              </div>
            ) : (
              <p className="p-4 text-sm text-slate-500">Log pay in this period to see a net estimate.</p>
            )}
          </div>
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openQuickLog}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-jd-green-600 hover:bg-jd-green-700 text-white font-semibold rounded-lg text-sm"
                  >
                    <Plus size={16} /> Add hours
                  </button>
                  <Link
                    to={`/consaltyapp/log?date=${encodeURIComponent(defaultLogDate)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-jd-green-600 text-jd-green-800 font-semibold rounded-lg text-sm hover:bg-jd-green-50"
                  >
                    Log work for this period
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {earnings.days.length > 0 && (
          <div className="px-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900">Daily work summary</h3>
              {summaryBulkMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryBulkMode(false);
                    setSummarySelectedDates([]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-jd-green-600 text-jd-green-800 bg-white hover:bg-jd-green-50"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSummaryBulkMode(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-jd-green-600 text-white hover:bg-jd-green-700"
                >
                  <Pencil size={14} />
                  Bulk edit
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Payroll hours and regular vs overtime from each work day (includes submitted daily
              report times when available).
            </p>
            {summaryBulkMode && summarySelectedDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-jd-green-50 border border-jd-green-200 rounded-lg">
                <span className="text-sm font-semibold text-jd-green-900">
                  {summarySelectedDates.length} day
                  {summarySelectedDates.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={runBulkEditSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-jd-green-600 text-white hover:bg-jd-green-700"
                  >
                    <Pencil size={14} />
                    Edit selected
                  </button>
                  <button
                    type="button"
                    onClick={runBulkDuplicateSummary}
                    disabled={summarySelectedDates.length !== 1}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                    title={
                      summarySelectedDates.length === 1
                        ? 'Copy this day to another date'
                        : 'Select one day to duplicate'
                    }
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => void runBulkDeleteSummary()}
                    disabled={summaryBulkBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-300 text-red-800 bg-white hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummarySelectedDates([])}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-jd-green-800 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <div
              className={`border border-gray-200 rounded-lg ${
                summaryBulkMode ? 'overflow-visible' : 'overflow-x-auto'
              }`}
            >
              <table
                className={`w-full text-sm ${
                  summaryBulkMode
                    ? "border-separate border-spacing-0 [&_tbody>tr:has([aria-expanded='true'])]:relative [&_tbody>tr:has([aria-expanded='true'])]:z-50"
                    : ''
                }`}
              >
                <thead className="bg-jd-green-600 text-white">
                  <tr>
                    {summaryBulkMode ? (
                      <th className="w-10 px-2 py-2 text-center font-semibold" scope="col">
                        <span className="sr-only">Select row</span>
                        <input
                          ref={summarySelectAllRef}
                          type="checkbox"
                          checked={allSummaryRowsSelected}
                          onChange={toggleSelectAllSummaryRows}
                          className="h-4 w-4 rounded border-white/50 text-jd-green-700 focus:ring-jd-green-500"
                          aria-label="Select all days in this summary"
                        />
                      </th>
                    ) : null}
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-left px-4 py-2 font-semibold">Work day</th>
                    <th className="text-right px-4 py-2 font-semibold">Total</th>
                    <th className="text-right px-4 py-2 font-semibold">Regular</th>
                    <th className="text-right px-4 py-2 font-semibold">Overtime</th>
                    <th className="text-right px-4 py-2 font-semibold">Pay</th>
                    <th className="text-right px-4 py-2 font-semibold whitespace-nowrap">
                      Actions
                    </th>
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
                    const hasJobs = d.jobs.length > 0;
                    const busy = dayActionBusy === d.date;
                    const rowSelected = summarySelectedDates.includes(d.date);
                    return (
                      <tr
                        key={d.date}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        {summaryBulkMode ? (
                          <td className="w-10 px-2 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={rowSelected}
                              onChange={() => toggleSummaryDateSelected(d.date)}
                              className="h-4 w-4 rounded border-gray-400 text-jd-green-700 focus:ring-jd-green-500"
                              aria-label={`Select ${formatDate(d.date)}`}
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                          {formatDate(d.date)}
                        </td>
                        <td
                          className={`px-2 sm:px-4 py-2 text-gray-600 align-middle ${
                            summaryBulkMode && d.workDayClockSource
                              ? 'whitespace-normal min-w-[11rem]'
                              : 'whitespace-nowrap'
                          }`}
                        >
                          {summaryBulkMode &&
                          d.workDayClockSource &&
                          d.dayStartTime &&
                          d.dayEndTime ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <QuarterHourTimeInput
                                value={toLocalTimeInputValue(new Date(d.dayStartTime))}
                                onChange={(hhmm) => void persistWorkDayTimes(d, hhmm, null)}
                                deferCommit
                                disabled={dayTimeSaving === d.date || busy}
                                className="w-[5.25rem] text-xs px-1 py-0.5 rounded border border-gray-300 bg-white"
                              />
                              <span className="text-gray-400 shrink-0" aria-hidden>
                                –
                              </span>
                              <QuarterHourTimeInput
                                value={toLocalTimeInputValue(new Date(d.dayEndTime))}
                                onChange={(hhmm) => void persistWorkDayTimes(d, null, hhmm)}
                                deferCommit
                                disabled={dayTimeSaving === d.date || busy}
                                className="w-[5.25rem] text-xs px-1 py-0.5 rounded border border-gray-300 bg-white"
                              />
                            </div>
                          ) : (
                            range
                          )}
                        </td>
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
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasJobs) {
                                  const first = [...d.jobs].sort((a, b) =>
                                    a.start_time.localeCompare(b.start_time),
                                  )[0];
                                  onEditJob(first);
                                } else {
                                  navigate(
                                    `/consaltyapp/log?date=${encodeURIComponent(d.date)}`,
                                  );
                                }
                              }}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-jd-green-800 hover:bg-jd-green-50 border border-transparent hover:border-jd-green-200"
                              title={hasJobs ? 'Edit first task for this day' : 'Open log for this day'}
                              aria-label={hasJobs ? 'Edit first task for this day' : 'Open log for this day'}
                            >
                              <Pencil size={14} className="shrink-0" />
                            </button>
                            <button
                              type="button"
                              disabled={!hasJobs || busy}
                              onClick={() => {
                                setDuplicateSource(d.date);
                                setDuplicateTarget(addOneCalendarDayYmd(d.date));
                              }}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 disabled:opacity-40 disabled:pointer-events-none"
                              title={
                                hasJobs
                                  ? 'Copy all job entries — choose the target day in the dialog'
                                  : 'No job entries to duplicate'
                              }
                              aria-label="Duplicate this day to another date"
                            >
                              <Copy size={14} className="shrink-0" />
                            </button>
                            <button
                              type="button"
                              disabled={!hasJobs || busy}
                              onClick={async () => {
                                setDayActionBusy(d.date);
                                try {
                                  await onDeleteJobsForDate(d.date);
                                } catch (e) {
                                  onError(e instanceof Error ? e.message : 'Delete failed');
                                } finally {
                                  setDayActionBusy(null);
                                }
                              }}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-40 disabled:pointer-events-none"
                              title={hasJobs ? 'Delete all job entries for this day' : 'No job entries to delete'}
                              aria-label="Delete all job entries for this day"
                            >
                              <Trash2 size={14} className="shrink-0" />
                            </button>
                          </div>
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
                    <th className="text-right px-2 py-2 w-12" scope="col">
                      <span className="sr-only">Edit</span>
                    </th>
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
                          {getWorkDayHoursWithLunchAnchored(
                            j.job_date,
                            j.start_time,
                            j.end_time,
                          ).hours.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {j.site ? (
                            <span className="font-medium text-gray-800">{j.site} — </span>
                          ) : null}
                          {j.activity}
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap w-12">
                          <button
                            type="button"
                            onClick={() => onEditJob(j)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-jd-green-800 hover:bg-jd-green-50 border border-transparent hover:border-jd-green-200"
                            title="Edit this task"
                            aria-label="Edit this task"
                          >
                            <Pencil size={14} />
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
