import { useState, FormEvent, useEffect } from 'react';
import { Save, DollarSign, Clock, Calendar, Percent } from 'lucide-react';
import { Settings as SettingsType } from '../lib/supabase';

type Props = {
  settings: SettingsType;
  onSave: (s: SettingsType) => Promise<void>;
};

export function Settings({ settings, onSave }: Props) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
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
            Weekly hours beyond the threshold are paid at the multiplier below.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Weekly Threshold (hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.overtime_threshold_hours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    overtime_threshold_hours: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
          </div>
          <div className="mt-3 bg-jd-yellow-50 border border-jd-yellow-200 rounded-lg px-4 py-2.5 text-sm text-jd-green-800">
            Overtime rate will be{' '}
            <span className="font-bold">
              {form.currency_symbol}
              {(form.hourly_rate * form.overtime_multiplier).toFixed(2)}/hr
            </span>{' '}
            after {form.overtime_threshold_hours} hrs in a week.
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
    </div>
  );
}
