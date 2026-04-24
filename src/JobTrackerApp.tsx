import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header, Tab } from './components/Header';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { Reports } from './components/Reports';
import { StatsBar } from './components/StatsBar';
import { Earnings } from './components/Earnings';
import { Settings } from './components/Settings';
import { Toast, ToastState } from './components/Toast';
import {
  supabase,
  Job,
  Settings as SettingsType,
  DEFAULT_SETTINGS,
} from './lib/supabase';

export function JobTrackerApp() {
  const [tab, setTab] = useState<Tab>('log');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    document.title = 'Consalty — Job & hour tracker | Cody Codes';
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
    setTab('log');
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

  return (
    <div className="min-h-screen bg-white">
      <Header active={tab} onChange={setTab} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StatsBar jobs={jobs} settings={settings} />

        {tab === 'log' && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <JobForm
                editing={editing}
                onSaved={handleSaved}
                onError={handleError}
                onCancelEdit={() => setEditing(null)}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-jd-yellow-400 to-jd-yellow-500 rounded-xl shadow-lg border-2 border-jd-green-600 p-5">
                <h3 className="font-bold text-jd-green-800 text-lg mb-2">Quick Tips</h3>
                <ul className="text-jd-green-800 text-sm space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span>Use the "Now" buttons to instantly stamp the current time.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span>Hours are auto-calculated as you set start and end times.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span>
                      Visit the Earnings tab to see estimated wages for each pay period.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">•</span>
                    <span>
                      Set your hourly rate and overtime rules in Settings.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <JobList
            jobs={jobs}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        )}

        {tab === 'earnings' &&
          (settings ? (
            <Earnings
              jobs={jobs}
              settings={settings}
              onSuccess={(m) => setToast({ message: m, type: 'success' })}
            />
          ) : (
            <div className="text-gray-500 text-center py-12">Loading settings...</div>
          ))}

        {tab === 'reports' && (
          <Reports jobs={jobs} onSuccess={(m) => setToast({ message: m, type: 'success' })} />
        )}

        {tab === 'settings' &&
          (settings ? (
            <Settings settings={settings} onSave={handleSaveSettings} />
          ) : (
            <div className="text-gray-500 text-center py-12">Loading settings...</div>
          ))}
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-sm text-gray-500 space-y-2">
        <p>Landscape Log — track your work, one job at a time</p>
        <p>
          <Link to="/" className="text-jd-green-600 hover:text-jd-green-700 font-medium">
            ← codycodes.ca
          </Link>
        </p>
      </footer>
    </div>
  );
}
