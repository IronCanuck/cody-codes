import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { Reports } from './components/Reports';
import { StatsBar } from './components/StatsBar';
import { Earnings } from './components/Earnings';
import { Settings } from './components/Settings';
import { Toast, ToastState } from './components/Toast';
import type { JobTrackerOutletContext } from './lib/job-tracker-outlet';
import { useJobTrackerOutlet } from './lib/job-tracker-outlet';
import { getStoredEmployeeFullName, setStoredEmployeeFullName } from './lib/employee-name-storage';
import {
  supabase,
  Job,
  Settings as SettingsType,
  DEFAULT_SETTINGS,
  SavedDailyReport,
} from './lib/supabase';

const SETTINGS_ROW_INSERT = {
  hourly_rate: DEFAULT_SETTINGS.hourly_rate,
  overtime_multiplier: DEFAULT_SETTINGS.overtime_multiplier,
  overtime_threshold_hours: DEFAULT_SETTINGS.overtime_threshold_hours,
  pay_period_length_days: DEFAULT_SETTINGS.pay_period_length_days,
  pay_period_anchor_date: DEFAULT_SETTINGS.pay_period_anchor_date,
  currency_symbol: DEFAULT_SETTINGS.currency_symbol,
} as const;
export function JobTrackerDashboardPage() {
  const { jobs, settings, dailyReports } = useJobTrackerOutlet();
  return <StatsBar jobs={jobs} settings={settings} dailyReports={dailyReports} />;
}

export function JobTrackerLogPage() {
  const { editing, setEditing, onSaved, onError } = useJobTrackerOutlet();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const initialWorkDate =
    !editing && dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <JobForm
          editing={editing}
          initialWorkDate={initialWorkDate}
          onSaved={onSaved}
          onError={onError}
          onCancelEdit={() => setEditing(null)}
        />
      </div>
      <div className="lg:col-span-2">
        <div className="bg-gradient-to-br from-jd-yellow-400 to-jd-yellow-500 rounded-xl shadow-lg border-2 border-jd-green-600 p-5">
          <h3 className="font-bold text-jd-green-800 text-lg mb-2">Quick tips</h3>
          <ul className="text-jd-green-800 text-sm space-y-2">
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>
                Set <strong>overall work hours</strong> for pay. <strong>Task blocks</strong> are optional
                — add them when you want a detailed log; skip them when you only need hours for your
                paycheque.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>
                <strong>Submit daily report</strong> saves your hours (and any tasks you entered), stores
                PDF/PNG in your report archive, and sets up tomorrow&apos;s work day automatically.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>Use the "Now" buttons to stamp the current time on any clock field.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>Editing a row from History still uses a single job form, just for that entry.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function JobTrackerHistoryPage() {
  const { jobs, loading, onEdit, onDelete } = useJobTrackerOutlet();
  return <JobList jobs={jobs} onEdit={onEdit} onDelete={onDelete} loading={loading} />;
}

export function JobTrackerEarningsPage() {
  const {
    jobs,
    settings,
    dailyReports,
    onEarningsSuccess,
    onEdit,
    onSaved,
    onError,
    onDeleteJobsForDate,
    onDuplicateDay,
  } = useJobTrackerOutlet();
  if (!settings) {
    return <div className="text-gray-500 text-center py-12">Loading settings...</div>;
  }
  return (
    <Earnings
      jobs={jobs}
      settings={settings}
      dailyReports={dailyReports}
      onSuccess={onEarningsSuccess}
      onSaved={onSaved}
      onError={onError}
      onEditJob={onEdit}
      onDeleteJobsForDate={onDeleteJobsForDate}
      onDuplicateDay={onDuplicateDay}
    />
  );
}

export function JobTrackerReportsPage() {
  const { jobs, dailyReports, dailyReportsLoading, dailyReportsError, onReportSuccess } =
    useJobTrackerOutlet();
  return (
    <Reports
      jobs={jobs}
      dailyReports={dailyReports}
      dailyReportsLoading={dailyReportsLoading}
      dailyReportsError={dailyReportsError}
      onSuccess={onReportSuccess}
    />
  );
}

export function JobTrackerSettingsPage() {
  const { settings, onSettingsSave } = useJobTrackerOutlet();
  if (!settings) {
    return <div className="text-gray-500 text-center py-12">Loading settings...</div>;
  }
  return <Settings settings={settings} onSave={onSettingsSave} />;
}

export function JobTrackerApp() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dailyReports, setDailyReports] = useState<SavedDailyReport[]>([]);
  const [dailyReportsLoading, setDailyReportsLoading] = useState(true);
  const [dailyReportsError, setDailyReportsError] = useState<string | null>(null);
  const [dismissArchiveBanner, setDismissArchiveBanner] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    document.title = 'Consalty — Job & hour tracker | Cody James Fairburn';
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('job_date', { ascending: false })
      .order('start_time', { ascending: false });
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const loadDailyReports = async () => {
    setDailyReportsLoading(true);
    setDailyReportsError(null);
    const { data, error } = await supabase
      .from('saved_daily_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setDailyReports([]);
      setDismissArchiveBanner(false);
      const msg = error.message || 'Unknown error';
      setDailyReportsError(
        /42P01|relation|does not exist|schema cache|PGRST205/i.test(msg)
          ? 'Report archive unavailable: the saved_daily_reports table or policy is missing. Apply Supabase migrations from the project (supabase/migrations), or run the SQL for saved_daily_reports in the Supabase SQL editor.'
          : msg,
      );
    } else {
      setDailyReports((data as SavedDailyReport[]) || []);
      setDailyReportsError(null);
    }
    setDailyReportsLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) {
      setToast({ message: error.message, type: 'error' });
      return;
    }
    const mergeLocalName = (row: SettingsType | Record<string, unknown>): SettingsType => {
      const r = row as SettingsType;
      const fromDb = typeof r.full_name === 'string' ? r.full_name : '';
      const fromLocal = getStoredEmployeeFullName();
      return { ...r, full_name: fromLocal || fromDb };
    };

    if (data) {
      setSettings(mergeLocalName(data as SettingsType));
    } else {
      const { data: created, error: createErr } = await supabase
        .from('settings')
        .insert(SETTINGS_ROW_INSERT)
        .select()
        .maybeSingle();
      if (createErr) {
        setToast({ message: createErr.message, type: 'error' });
      } else if (created) {
        setSettings(mergeLocalName(created as SettingsType));
      }
    }
  };

  useEffect(() => {
    loadJobs();
    loadSettings();
    void loadDailyReports();
  }, []);

  const handleSaveSettings = async (next: SettingsType) => {
    setStoredEmployeeFullName(next.full_name);
    const { error } = await supabase
      .from('settings')
      .update({
        hourly_rate: next.hourly_rate,
        overtime_multiplier: next.overtime_multiplier,
        overtime_threshold_hours: next.overtime_threshold_hours,
        pay_period_length_days: next.pay_period_length_days,
        pay_period_anchor_date: next.pay_period_anchor_date,
        currency_symbol: next.currency_symbol,
        updated_at: new Date().toISOString(),
      })
      .eq('id', next.id);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setSettings({ ...next, full_name: getStoredEmployeeFullName() });
      setToast({ message: 'Settings saved', type: 'success' });
    }
  };

  const handleSaved = (msg: string) => {
    setToast({ message: msg, type: 'success' });
    setEditing(null);
    loadJobs();
    void loadDailyReports();
  };

  const handleError = (msg: string) => {
    setToast({ message: msg, type: 'error' });
  };

  const handleEdit = (j: Job) => {
    setEditing(j);
    navigate('/consaltyapp/log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job entry? This cannot be undone.')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Job deleted', type: 'success' });
      loadJobs();
    }
  };

  const handleDeleteJobsForDate = async (date: string) => {
    const dayJobs = jobs.filter((j) => j.job_date === date);
    if (dayJobs.length === 0) {
      setToast({
        message: 'No job entries to delete for that day. Hours may come only from a daily report.',
        type: 'error',
      });
      return;
    }
    if (
      !confirm(
        `Delete all ${dayJobs.length} job ${dayJobs.length === 1 ? 'entry' : 'entries'} for ${date}? This cannot be undone.`,
      )
    ) {
      return;
    }
    const ids = dayJobs.map((j) => j.id);
    const { error } = await supabase.from('jobs').delete().in('id', ids);
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({
        message:
          dayJobs.length === 1 ? 'Job entry deleted' : `${dayJobs.length} job entries deleted`,
        type: 'success',
      });
      loadJobs();
      void loadDailyReports();
    }
  };

  const handleDuplicateDay = async (
    sourceDate: string,
    targetDate: string,
  ): Promise<boolean> => {
    const dayJobs = jobs
      .filter((j) => j.job_date === sourceDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (dayJobs.length === 0) {
      setToast({
        message: 'No job entries to duplicate. Add tasks on the log page for that day first.',
        type: 'error',
      });
      return false;
    }
    if (targetDate === sourceDate) {
      setToast({ message: 'Choose a different day than the source to copy to.', type: 'error' });
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setToast({ message: 'Invalid target date.', type: 'error' });
      return false;
    }
    const rows = dayJobs.map((j) => ({
      job_date: targetDate,
      start_time: j.start_time,
      end_time: j.end_time,
      hours_worked: j.hours_worked,
      activity: j.activity,
      site: j.site,
      notes: j.notes,
    }));
    const { error } = await supabase.from('jobs').insert(rows);
    if (error) {
      setToast({ message: error.message, type: 'error' });
      return false;
    }
    setToast({
      message: `Copied ${dayJobs.length} ${dayJobs.length === 1 ? 'entry' : 'entries'} to ${targetDate}`,
      type: 'success',
    });
    loadJobs();
    return true;
  };

  const outletContext: JobTrackerOutletContext = {
    jobs,
    dailyReports,
    dailyReportsLoading,
    dailyReportsError,
    settings,
    loading,
    editing,
    setEditing,
    onSaved: handleSaved,
    onError: handleError,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDeleteJobsForDate: handleDeleteJobsForDate,
    onDuplicateDay: handleDuplicateDay,
    onSettingsSave: handleSaveSettings,
    onReportSuccess: (m) => setToast({ message: m, type: 'success' }),
    onEarningsSuccess: (m) => setToast({ message: m, type: 'success' }),
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onSignOut={() => void signOut()} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {dailyReportsError && !dismissArchiveBanner ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-3 justify-between items-start"
          >
            <p className="leading-snug">{dailyReportsError}</p>
            <button
              type="button"
              onClick={() => setDismissArchiveBanner(true)}
              className="shrink-0 font-semibold text-amber-900 hover:text-amber-950 underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <Outlet context={outletContext} />
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-sm text-gray-500 space-y-2">
        <p>Consalty — track your work, one job at a time</p>
        <p>
          <Link to="/dashboard" className="text-jd-green-600 hover:text-jd-green-700 font-medium">
            ← Your apps
          </Link>
        </p>
      </footer>
    </div>
  );
}
