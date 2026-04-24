import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
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
import {
  supabase,
  Job,
  Settings as SettingsType,
  DEFAULT_SETTINGS,
} from './lib/supabase';

export function JobTrackerDashboardPage() {
  const { jobs, settings } = useJobTrackerOutlet();
  return <StatsBar jobs={jobs} settings={settings} />;
}

export function JobTrackerLogPage() {
  const { editing, setEditing, onSaved, onError } = useJobTrackerOutlet();
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <JobForm
          editing={editing}
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
                Set <strong>overall work hours</strong> for the day, then add a <strong>task block</strong>{' '}
                for each job—add, delete, or change blocks anytime before you submit.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>
                <strong>Submit daily report</strong> logs every task, saves PDF/PNG to your report
                archive, and sets up tomorrow&apos;s work day automatically.
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
  const { jobs, settings, onEarningsSuccess } = useJobTrackerOutlet();
  if (!settings) {
    return <div className="text-gray-500 text-center py-12">Loading settings...</div>;
  }
  return (
    <Earnings jobs={jobs} settings={settings} onSuccess={onEarningsSuccess} />
  );
}

export function JobTrackerReportsPage() {
  const { jobs, onReportSuccess } = useJobTrackerOutlet();
  return <Reports jobs={jobs} onSuccess={onReportSuccess} />;
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
    if (data) {
      setSettings(data);
    } else {
      const { data: created, error: createErr } = await supabase
        .from('settings')
        .insert(DEFAULT_SETTINGS)
        .select()
        .maybeSingle();
      if (createErr) {
        setToast({ message: createErr.message, type: 'error' });
      } else if (created) {
        setSettings(created);
      }
    }
  };

  useEffect(() => {
    loadJobs();
    loadSettings();
  }, []);

  const handleSaveSettings = async (next: SettingsType) => {
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
      setSettings(next);
      setToast({ message: 'Settings saved', type: 'success' });
    }
  };

  const handleSaved = (msg: string) => {
    setToast({ message: msg, type: 'success' });
    setEditing(null);
    loadJobs();
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

  const outletContext: JobTrackerOutletContext = {
    jobs,
    settings,
    loading,
    editing,
    setEditing,
    onSaved: handleSaved,
    onError: handleError,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSettingsSave: handleSaveSettings,
    onReportSuccess: (m) => setToast({ message: m, type: 'success' }),
    onEarningsSuccess: (m) => setToast({ message: m, type: 'success' }),
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onSignOut={() => void signOut()} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Outlet context={outletContext} />
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-sm text-gray-500 space-y-2">
        <p>Landscape Log — track your work, one job at a time</p>
        <p>
          <Link to="/dashboard" className="text-jd-green-600 hover:text-jd-green-700 font-medium">
            ← Your apps
          </Link>
        </p>
      </footer>
    </div>
  );
}
