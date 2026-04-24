import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Calendar,
  CalendarDays,
  CalendarRange,
  FileImage,
  Archive,
} from 'lucide-react';
import { Job, supabase, SavedDailyReport } from '../lib/supabase';
import {
  getMonthBounds,
  getWeekBounds,
  toLocalDateInputValue,
  formatDate,
} from '../lib/time';
import { generateDailyPDF, generateWeeklyPDF, generateMonthlyPDF } from '../lib/pdf';
import { generateDailyPNG, generateWeeklyPNG, generateMonthlyPNG } from '../lib/png';

type Format = 'pdf' | 'png';

type Props = {
  jobs: Job[];
  onSuccess: (msg: string) => void;
};

export function Reports({ jobs, onSuccess }: Props) {
  const today = new Date();
  const [format, setFormat] = useState<Format>('pdf');
  const [dailyDate, setDailyDate] = useState(toLocalDateInputValue(today));
  const [weeklyDate, setWeeklyDate] = useState(toLocalDateInputValue(today));
  const [monthlyMonth, setMonthlyMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [archived, setArchived] = useState<SavedDailyReport[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setArchivedLoading(true);
      const { data, error } = await supabase
        .from('saved_daily_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!cancelled) {
        if (error) {
          setArchived([]);
        } else {
          setArchived((data as SavedDailyReport[]) || []);
        }
        setArchivedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobs.length]);

  const getDailyJobs = () => jobs.filter((j) => j.job_date === dailyDate);

  const getWeeklyJobs = () => {
    const { start, end } = getWeekBounds(new Date(weeklyDate + 'T12:00:00'));
    return jobs.filter((j) => {
      const d = new Date(j.job_date + 'T12:00:00');
      return d >= start && d <= end;
    });
  };

  const getMonthlyJobs = () => {
    const [y, m] = monthlyMonth.split('-').map(Number);
    const { start, end } = getMonthBounds(new Date(y, m - 1, 15));
    return jobs.filter((j) => {
      const d = new Date(j.job_date + 'T12:00:00');
      return d >= start && d <= end;
    });
  };

  const handleDaily = async () => {
    setBusy('daily');
    try {
      const list = getDailyJobs().sort((a, b) =>
        a.start_time.localeCompare(b.start_time),
      );
      if (format === 'pdf') {
        generateDailyPDF(dailyDate, list);
      } else {
        await generateDailyPNG(dailyDate, list);
      }
      onSuccess(`Daily ${format.toUpperCase()} downloaded`);
    } finally {
      setBusy(null);
    }
  };

  const handleWeekly = async () => {
    setBusy('weekly');
    try {
      const { start, end } = getWeekBounds(new Date(weeklyDate + 'T12:00:00'));
      const list = getWeeklyJobs().sort((a, b) => {
        if (a.job_date !== b.job_date) return a.job_date.localeCompare(b.job_date);
        return a.start_time.localeCompare(b.start_time);
      });
      const s = toLocalDateInputValue(start);
      const e = toLocalDateInputValue(end);
      if (format === 'pdf') {
        generateWeeklyPDF(s, e, list);
      } else {
        await generateWeeklyPNG(s, e, list);
      }
      onSuccess(`Weekly ${format.toUpperCase()} downloaded`);
    } finally {
      setBusy(null);
    }
  };

  const handleMonthly = async () => {
    setBusy('monthly');
    try {
      const [y, m] = monthlyMonth.split('-').map(Number);
      const list = getMonthlyJobs().sort((a, b) => {
        if (a.job_date !== b.job_date) return a.job_date.localeCompare(b.job_date);
        return a.start_time.localeCompare(b.start_time);
      });
      if (format === 'pdf') {
        generateMonthlyPDF(y, m - 1, list);
      } else {
        await generateMonthlyPNG(y, m - 1, list);
      }
      onSuccess(`Monthly ${format.toUpperCase()} downloaded`);
    } finally {
      setBusy(null);
    }
  };

  const dailyCount = getDailyJobs().length;
  const weeklyCount = getWeeklyJobs().length;
  const monthlyCount = getMonthlyJobs().length;

  const dailyHours = getDailyJobs().reduce(
    (s, j) => s + Number(j.hours_worked || 0),
    0,
  );
  const weeklyHours = getWeeklyJobs().reduce(
    (s, j) => s + Number(j.hours_worked || 0),
    0,
  );
  const monthlyHours = getMonthlyJobs().reduce(
    (s, j) => s + Number(j.hours_worked || 0),
    0,
  );

  const weekBounds = getWeekBounds(new Date(weeklyDate + 'T12:00:00'));

  const cards = [
    {
      key: 'daily',
      title: 'Daily Report',
      Icon: Calendar,
      description: 'Export all jobs for a single day.',
      input: (
        <input
          type="date"
          value={dailyDate}
          onChange={(e) => setDailyDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none text-sm"
        />
      ),
      summary: `${dailyCount} job${dailyCount === 1 ? '' : 's'} • ${dailyHours.toFixed(2)} hours`,
      onDownload: handleDaily,
    },
    {
      key: 'weekly',
      title: 'Weekly Report',
      Icon: CalendarDays,
      description: 'Pick any date - exports that Mon-Sun week.',
      input: (
        <>
          <input
            type="date"
            value={weeklyDate}
            onChange={(e) => setWeeklyDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Week: {formatDate(toLocalDateInputValue(weekBounds.start))} –{' '}
            {formatDate(toLocalDateInputValue(weekBounds.end))}
          </p>
        </>
      ),
      summary: `${weeklyCount} job${weeklyCount === 1 ? '' : 's'} • ${weeklyHours.toFixed(2)} hours`,
      onDownload: handleWeekly,
    },
    {
      key: 'monthly',
      title: 'Monthly Report',
      Icon: CalendarRange,
      description: 'Export all jobs for an entire month.',
      input: (
        <input
          type="month"
          value={monthlyMonth}
          onChange={(e) => setMonthlyMonth(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none text-sm"
        />
      ),
      summary: `${monthlyCount} job${monthlyCount === 1 ? '' : 's'} • ${monthlyHours.toFixed(2)} hours`,
      onDownload: handleMonthly,
    },
  ];

  const openSignedUrl = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('job-reports').createSignedUrl(path, 3600);
    if (error) {
      window.alert(`Could not open file: ${error.message}`);
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-jd-green-600 to-jd-green-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="bg-jd-yellow-400 rounded-lg p-2.5">
            <FileText className="text-jd-green-800" size={24} />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">Reports</h2>
            <p className="text-jd-green-100 text-sm mt-0.5">
              Download professional reports of your logged work
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Export Format:</span>
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFormat('pdf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              format === 'pdf'
                ? 'bg-white text-jd-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={16} /> PDF
          </button>
          <button
            onClick={() => setFormat('png')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              format === 'png'
                ? 'bg-white text-jd-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileImage size={16} /> PNG
          </button>
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {format === 'pdf'
            ? 'Multi-page document, great for printing.'
            : 'Single image, great for sharing or screenshots.'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="bg-jd-green-50 rounded-lg p-2">
            <Archive size={18} className="text-jd-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Submitted daily reports (database + storage)</h3>
            <p className="text-sm text-gray-500">
              PDF and PNG created when you use Submit daily report on the Log page. Links expire
              after one hour.
            </p>
          </div>
        </div>
        {archivedLoading ? (
          <p className="text-sm text-gray-500 py-2">Loading archive…</p>
        ) : archived.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No submitted reports yet. After you submit a day, the files appear here.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {archived.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-gray-50/50"
              >
                <div>
                  <span className="font-semibold text-gray-900">{formatDate(r.report_date)}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {r.job_count} task{r.job_count === 1 ? '' : 's'} · {Number(r.day_hours).toFixed(2)} day
                    hrs
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openSignedUrl(r.pdf_storage_path)}
                    disabled={!r.pdf_storage_path}
                    className="text-sm font-semibold text-jd-green-700 bg-jd-green-50 border border-jd-green-200 px-3 py-1.5 rounded-lg hover:bg-jd-green-100 disabled:opacity-50"
                  >
                    Open PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void openSignedUrl(r.png_storage_path)}
                    disabled={!r.png_storage_path}
                    className="text-sm font-semibold text-jd-green-700 bg-jd-green-50 border border-jd-green-200 px-3 py-1.5 rounded-lg hover:bg-jd-green-100 disabled:opacity-50"
                  >
                    Open PNG
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.Icon;
          const isBusy = busy === c.key;
          return (
            <div
              key={c.title}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="bg-jd-green-50 rounded-lg p-2">
                    <Icon size={18} className="text-jd-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{c.description}</p>
              </div>
              <div className="px-5 py-4 flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Select Period
                </label>
                {c.input}
                <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                  {c.summary}
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={c.onDownload}
                  disabled={isBusy}
                  className="w-full bg-jd-green-600 hover:bg-jd-green-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Download size={16} />
                  {isBusy
                    ? 'Generating...'
                    : `Download ${format.toUpperCase()}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
