import { useState, FormEvent, useEffect } from 'react';
import { Save, DollarSign, Clock, Calendar, Percent, MapPin, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { Settings as SettingsType } from '../lib/supabase';
import {
  getTaskPresets,
  setTaskPresets,
  removeTaskPresetLocation,
  removeTaskPresetActivity,
  subscribeTaskPresets,
} from '../lib/task-presets';

type Props = {
  settings: SettingsType;
  onSave: (s: SettingsType) => Promise<void>;
};

export function Settings({ settings, onSave }: Props) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [presetLocations, setPresetLocations] = useState(() => getTaskPresets().locations);
  const [presetActivities, setPresetActivities] = useState(() => getTaskPresets().activities);
  const [newLocation, setNewLocation] = useState('');
  const [newActivity, setNewActivity] = useState('');

  useEffect(() => {
    setForm({ ...settings, full_name: settings.full_name ?? '' });
  }, [settings]);

  useEffect(() => {
    const p = getTaskPresets();
    setPresetLocations(p.locations);
    setPresetActivities(p.activities);
    return subscribeTaskPresets(() => {
      const next = getTaskPresets();
      setPresetLocations(next.locations);
      setPresetActivities(next.activities);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const addLocationPreset = () => {
    const t = newLocation.trim();
    if (!t) return;
    const next = setTaskPresets({
      locations: [...presetLocations, t],
      activities: presetActivities,
    });
    setPresetLocations(next.locations);
    setNewLocation('');
  };

  const addActivityPreset = () => {
    const t = newActivity.trim();
    if (!t) return;
    const next = setTaskPresets({
      locations: presetLocations,
      activities: [...presetActivities, t],
    });
    setPresetActivities(next.activities);
    setNewActivity('');
  };

  const deleteLocation = (value: string) => {
    const next = removeTaskPresetLocation(value);
    setPresetLocations(next.locations);
  };

  const deleteActivity = (value: string) => {
    const next = removeTaskPresetActivity(value);
    setPresetActivities(next.activities);
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-gradient-to-br from-jd-green-600 to-jd-green-700 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="px-6 py-5">
          <h2 className="text-white text-xl font-bold">Pay & Settings</h2>
          <p className="text-jd-green-100 text-sm mt-0.5">
            Configure your hourly rate, overtime rules, and pay periods
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6"
      >
        <section>
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <ClipboardList size={18} className="text-jd-green-600" /> Your name
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Used as the default filename when you export pay-period PDFs or PNGs (e.g. to send to a
            supervisor). Suggested: your full name as it should appear on the document.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
            <input
              type="text"
              autoComplete="name"
              value={form.full_name ?? ''}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g., Jordan Smith"
              className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            />
          </div>
        </section>

        <section className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <DollarSign size={18} className="text-jd-green-600" /> Wage
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Your base hourly pay rate and display currency.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Hourly Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.hourly_rate}
                onChange={(e) =>
                  setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                maxLength={3}
                value={form.currency_symbol}
                onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Percent size={18} className="text-jd-green-600" /> Overtime
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Earnings use daily rules: Monday–Friday the first 8 hours are regular time; Saturday
            the first 4 hours are regular; Sunday is overtime for the full day. Hours beyond those
            limits use the multiplier below.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Overtime Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={form.overtime_multiplier}
              onChange={(e) =>
                setForm({
                  ...form,
                  overtime_multiplier: parseFloat(e.target.value) || 1,
                })
              }
              className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            />
          </div>
          <div className="mt-3 bg-jd-yellow-50 border border-jd-yellow-200 rounded-lg px-4 py-2.5 text-sm text-jd-green-800">
            Overtime rate:{' '}
            <span className="font-bold">
              {form.currency_symbol}
              {(form.hourly_rate * form.overtime_multiplier).toFixed(2)}/hr
            </span>
            .
          </div>
        </section>

        <section className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Calendar size={18} className="text-jd-green-600" /> Pay Period
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Set how often you get paid and a known start date. Defaults to bi-weekly (14
            days).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Period Length (days)
              </label>
              <select
                value={form.pay_period_length_days}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pay_period_length_days: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
              >
                <option value={7}>Weekly (7 days)</option>
                <option value={14}>Bi-Weekly (14 days)</option>
                <option value={15}>Semi-Monthly (15 days)</option>
                <option value={28}>4 Weeks (28 days)</option>
                <option value={30}>Monthly (30 days)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Anchor Start Date
              </label>
              <input
                type="date"
                value={form.pay_period_anchor_date}
                onChange={(e) =>
                  setForm({ ...form, pay_period_anchor_date: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5">
            <Clock size={13} className="mt-0.5 flex-shrink-0" />
            The anchor date is any known first day of a pay period. All past and future
            periods are calculated from it.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-jd-green-600 hover:bg-jd-green-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6 mt-6">
        <section>
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <ClipboardList size={18} className="text-jd-green-600" /> Common tasks &amp; locations
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Saved on this device. Use them when logging your daily task chart: locations autocomplete,
            and tasks can be picked from a list. Add or remove entries here anytime.
          </p>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-jd-green-800 mb-2 flex items-center gap-2">
                <MapPin size={16} /> Locations / sites
              </h4>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLocationPreset();
                    }
                  }}
                  placeholder="e.g., Johnson Residence"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                />
                <button
                  type="button"
                  onClick={addLocationPreset}
                  className="sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-jd-green-600 hover:bg-jd-green-700 text-white font-semibold rounded-lg"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
              {presetLocations.length === 0 ? (
                <p className="text-sm text-gray-400">No saved locations yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/80">
                  {presetLocations.map((loc) => (
                    <li
                      key={loc}
                      className="flex items-start justify-between gap-2 text-sm bg-white border border-gray-200 rounded-md px-3 py-2"
                    >
                      <span className="text-gray-800 break-words">{loc}</span>
                      <button
                        type="button"
                        onClick={() => deleteLocation(loc)}
                        className="shrink-0 text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-jd-green-800 mb-2 flex items-center gap-2">
                <ClipboardList size={16} /> Task descriptions
              </h4>
              <div className="space-y-2 mb-3">
                <textarea
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="e.g., Mowed lawn, trimmed hedges, blew walkways"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={addActivityPreset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-jd-green-600 hover:bg-jd-green-700 text-white font-semibold rounded-lg"
                >
                  <Plus size={18} />
                  Add task text
                </button>
              </div>
              {presetActivities.length === 0 ? (
                <p className="text-sm text-gray-400">No saved task descriptions yet.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/80">
                  {presetActivities.map((act) => (
                    <li
                      key={act}
                      className="flex items-start justify-between gap-2 text-sm bg-white border border-gray-200 rounded-md px-3 py-2"
                    >
                      <span className="text-gray-800 whitespace-pre-wrap break-words" title={act}>
                        {act.length > 200 ? `${act.slice(0, 200)}…` : act}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteActivity(act)}
                        className="shrink-0 text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
