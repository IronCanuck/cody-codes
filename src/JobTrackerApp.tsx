import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { CompanyProvider, useCompanies } from './contexts/CompanyContext';
import { CompaniesManager } from './components/CompaniesManager';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { Reports } from './components/Reports';
import { StatsBar } from './components/StatsBar';
import { NetTakeHomeCard } from './components/NetTakeHomeCard';
import { RecentActivity } from './components/RecentActivity';
import { Earnings } from './components/Earnings';
import { Settings } from './components/Settings';
import { Toast, ToastState } from './components/Toast';
import { FlhaModal } from './components/FlhaModal';
import type { JobTrackerOutletContext } from './lib/job-tracker-outlet';
import { useJobTrackerOutlet } from './lib/job-tracker-outlet';
import { getStoredEmployeeFullName, setStoredEmployeeFullName } from './lib/employee-name-storage';
import {
  supabase,
  Job,
  Settings as SettingsType,
  DEFAULT_SETTINGS,
  SavedDailyReport,
  Flha,
  FlhaTarget,
} from './lib/supabase';
import { canonicalizeClockPairForWorkDay, getWorkDayHoursWithLunch } from './lib/time';

const SETTINGS_ROW_INSERT = {
  hourly_rate: DEFAULT_SETTINGS.hourly_rate,
  overtime_multiplier: DEFAULT_SETTINGS.overtime_multiplier,
  overtime_threshold_hours: DEFAULT_SETTINGS.overtime_threshold_hours,
  pay_period_length_days: DEFAULT_SETTINGS.pay_period_length_days,
  pay_period_anchor_date: DEFAULT_SETTINGS.pay_period_anchor_date,
  currency_symbol: DEFAULT_SETTINGS.currency_symbol,
  extra_tax_per_pay_period: DEFAULT_SETTINGS.extra_tax_per_pay_period,
} as const;

export function JobTrackerDashboardPage() {
  const { jobs, settings, dailyReports, loading } = useJobTrackerOutlet();
  return (
    <div className="space-y-6">
      {settings ? (
        <NetTakeHomeCard jobs={jobs} settings={settings} dailyReports={dailyReports} />
      ) : null}
      <StatsBar jobs={jobs} settings={settings} dailyReports={dailyReports} />
      <RecentActivity jobs={jobs} loading={loading} />
    </div>
  );
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
  const { jobs, flhas, loading, onEdit, onDelete, onOpenFlha } = useJobTrackerOutlet();
  return (
    <JobList
      jobs={jobs}
      flhas={flhas}
      onEdit={onEdit}
      onDelete={onDelete}
      onOpenFlha={onOpenFlha}
      loading={loading}
    />
  );
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

export function JobTrackerCompaniesPage() {
  return <CompaniesManager />;
}

export function JobTrackerApp() {
  return (
    <CompanyProvider>
      <JobTrackerAppShell />
    </CompanyProvider>
  );
}

function JobTrackerAppShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const {
    activeCompanyId,
    activeCompany,
    companies,
    loading: companiesLoading,
    error: companiesError,
  } = useCompanies();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [flhas, setFlhas] = useState<Flha[]>([]);
  const [flhaTarget, setFlhaTarget] = useState<FlhaTarget | null>(null);
  const [dailyReports, setDailyReports] = useState<SavedDailyReport[]>([]);
  const [dailyReportsLoading, setDailyReportsLoading] = useState(true);
  const [dailyReportsError, setDailyReportsError] = useState<string | null>(null);
  const [dismissArchiveBanner, setDismissArchiveBanner] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const suffix = activeCompany?.name ? ` · ${activeCompany.name}` : '';
    document.title = `Consalty${suffix} — Job & hour tracker | Cody James Fairburn`;
  }, [activeCompany?.name]);

  const loadJobs = async (companyId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('job_date', { ascending: false })
      .order('start_time', { ascending: false });
    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const loadDailyReports = async (companyId: string) => {
    setDailyReportsLoading(true);
    setDailyReportsError(null);
    const { data, error } = await supabase
      .from('saved_daily_reports')
      .select('*')
      .eq('company_id', companyId)
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

  const loadSettings = async (companyId: string) => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('company_id', companyId)
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
      const extraTax =
        typeof r.extra_tax_per_pay_period === 'number'
          ? r.extra_tax_per_pay_period
          : DEFAULT_SETTINGS.extra_tax_per_pay_period;
      return { ...r, full_name: fromLocal || fromDb, extra_tax_per_pay_period: extraTax };
    };

    if (data) {
      setSettings(mergeLocalName(data as SettingsType));
    } else {
      const { data: created, error: createErr } = await supabase
        .from('settings')
        .insert({ ...SETTINGS_ROW_INSERT, company_id: companyId })
        .select()
        .maybeSingle();
      if (createErr) {
        setToast({ message: createErr.message, type: 'error' });
      } else if (created) {
        setSettings(mergeLocalName(created as SettingsType));
      }
    }
  };

  const loadFlhas = async (companyId: string) => {
    const { data, error } = await supabase
      .from('flhas')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });
    if (error) {
      if (/42P01|relation|does not exist|schema cache|PGRST205|company_id/i.test(error.message || '')) {
        setToast({
          message:
            'FLHA archive unavailable: the flhas table or its company_id column is missing. Apply Supabase migrations (supabase/migrations).',
          type: 'error',
        });
      }
      setFlhas([]);
    } else {
      setFlhas((data as Flha[]) || []);
    }
  };

  useEffect(() => {
    if (!activeCompanyId) {
      setJobs([]);
      setSettings(null);
      setDailyReports([]);
      setFlhas([]);
      setLoading(false);
      setDailyReportsLoading(false);
      return;
    }
    setSettings(null);
    void loadJobs(activeCompanyId);
    void loadSettings(activeCompanyId);
    void loadDailyReports(activeCompanyId);
    void loadFlhas(activeCompanyId);
  }, [activeCompanyId]);

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
        extra_tax_per_pay_period: next.extra_tax_per_pay_period,
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
    if (activeCompanyId) {
      void loadJobs(activeCompanyId);
      void loadDailyReports(activeCompanyId);
    }
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
      if (activeCompanyId) void loadJobs(activeCompanyId);
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
      if (activeCompanyId) {
        void loadJobs(activeCompanyId);
        void loadDailyReports(activeCompanyId);
      }
    }
  };

  const handleDuplicateDay = async (
    sourceDate: string,
    targetDate: string,
  ): Promise<boolean> => {
    if (!activeCompanyId) {
      setToast({ message: 'Pick a company first to copy entries.', type: 'error' });
      return false;
    }
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
    const rows = dayJobs.map((j) => {
      const { startIso, endIso } = canonicalizeClockPairForWorkDay(
        targetDate,
        j.start_time,
        j.end_time,
      );
      const { hours } = getWorkDayHoursWithLunch(startIso, endIso);
      return {
        company_id: activeCompanyId,
        job_date: targetDate,
        start_time: startIso,
        end_time: endIso,
        hours_worked: hours,
        activity: j.activity,
        site: j.site,
        notes: j.notes,
      };
    });
    const { error } = await supabase.from('jobs').insert(rows);
    if (error) {
      setToast({ message: error.message, type: 'error' });
      return false;
    }
    setToast({
      message: `Copied ${dayJobs.length} ${dayJobs.length === 1 ? 'entry' : 'entries'} to ${targetDate}`,
      type: 'success',
    });
    void loadJobs(activeCompanyId);
    return true;
  };

  const handleOpenFlha = (target: FlhaTarget) => setFlhaTarget(target);

  const existingFlhaForTarget = (() => {
    if (!flhaTarget) return null;
    if (flhaTarget.kind === 'job') {
      return flhas.find((f) => f.job_id === flhaTarget.job.id) || null;
    }
    return flhas.find((f) => f.client_task_key === flhaTarget.clientTaskKey) || null;
  })();

  const outletContext: JobTrackerOutletContext = {
    jobs,
    flhas,
    onOpenFlha: handleOpenFlha,
    dailyReports,
    dailyReportsLoading,
    dailyReportsError,
    settings,
    loading,
    editing,
    setEditing,
    activeCompanyId,
    activeCompany,
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

  const showCompaniesGate =
    !companiesLoading && !companiesError && companies.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <Header onSignOut={() => void signOut()} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {companiesError ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="leading-snug">{companiesError}</p>
          </div>
        ) : null}

        {showCompaniesGate ? (
          <CompaniesGate />
        ) : (
          <>
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
          </>
        )}
      </main>

      {flhaTarget ? (
        <FlhaModal
          target={flhaTarget}
          existing={existingFlhaForTarget}
          defaultWorkerName={settings?.full_name || ''}
          companyId={activeCompanyId}
          onSaved={(msg, saved) => {
            setFlhas((prev) => {
              const others = prev.filter((f) => f.id !== saved.id);
              return [saved, ...others];
            });
            setToast({ message: msg, type: 'success' });
            setFlhaTarget(null);
          }}
          onDeleted={(msg, removed) => {
            setFlhas((prev) => prev.filter((f) => f.id !== removed.id));
            setToast({ message: msg, type: 'success' });
            setFlhaTarget(null);
          }}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
          onClose={() => setFlhaTarget(null)}
        />
      ) : null}

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

function CompaniesGate() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-jd-green-300 bg-jd-green-50/40 p-8 text-center max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-jd-green-800 mb-2">Add your first company</h2>
      <p className="text-jd-green-900/80 mb-6">
        Consalty keeps your jobs, hours, settings, and report archive separate per company.
        Add one to start tracking work.
      </p>
      <Link
        to="/consaltyapp/companies"
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-jd-green-600 hover:bg-jd-green-700 text-white font-semibold shadow"
      >
        Add a company
      </Link>
    </div>
  );
}
