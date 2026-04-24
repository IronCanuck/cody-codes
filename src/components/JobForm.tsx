import { useState, useEffect, FormEvent } from 'react';
import { Clock, MapPin, ClipboardList, Save, Zap, Calendar } from 'lucide-react';
import { supabase, Job } from '../lib/supabase';
import {
  combineDateAndTime,
  computeHours,
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from '../lib/time';

type Props = {
  editing?: Job | null;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onCancelEdit?: () => void;
};

function emptyState() {
  const now = new Date();
  return {
    date: toLocalDateInputValue(now),
    startTime: toLocalTimeInputValue(now),
    endTime: '',
    site: '',
    activity: '',
    notes: '',
  };
}

export function JobForm({ editing, onSaved, onError, onCancelEdit }: Props) {
  const [form, setForm] = useState(emptyState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      const s = new Date(editing.start_time);
      const e = new Date(editing.end_time);
      setForm({
        date: editing.job_date,
        startTime: toLocalTimeInputValue(s),
        endTime: toLocalTimeInputValue(e),
        site: editing.site,
        activity: editing.activity,
        notes: editing.notes,
      });
    } else {
      setForm(emptyState());
    }
  }, [editing]);

  const startIso = combineDateAndTime(form.date, form.startTime);
  const endIso = combineDateAndTime(form.date, form.endTime);
  const hours = computeHours(startIso, endIso);

  const stampNow = (field: 'startTime' | 'endTime') => {
    setForm((f) => ({ ...f, [field]: toLocalTimeInputValue(new Date()) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) {
      onError('Please fill in date and times');
      return;
    }
    if (!form.activity.trim()) {
      onError('Please describe the work activity');
      return;
    }
    if (hours <= 0) {
      onError('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        job_date: form.date,
        start_time: startIso,
        end_time: endIso,
        hours_worked: hours,
        activity: form.activity.trim(),
        site: form.site.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', editing.id);
        if (error) throw error;
        onSaved('Job updated');
      } else {
        const { error } = await supabase.from('jobs').insert(payload);
        if (error) throw error;
        onSaved('Job logged');
        setForm(emptyState());
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-jd-green-600 to-jd-green-700 px-6 py-4">
        <h2 className="text-white text-xl font-bold flex items-center gap-2">
          <ClipboardList size={20} />
          {editing ? 'Edit Job Entry' : 'Log New Job'}
        </h2>
        <p className="text-jd-green-100 text-sm mt-1">
          {editing ? 'Update the details below' : 'Record the work you completed'}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <Calendar size={14} /> Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> Start Time
              </span>
              <button
                type="button"
                onClick={() => stampNow('startTime')}
                className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              >
                <Zap size={10} /> Now
              </button>
            </label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> End Time
              </span>
              <button
                type="button"
                onClick={() => stampNow('endTime')}
                className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              >
                <Zap size={10} /> Now
              </button>
            </label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="bg-jd-green-50 border border-jd-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-jd-green-800">Hours on activity</span>
          <span className="text-2xl font-bold text-jd-green-700">
            {hours.toFixed(2)}
            <span className="text-sm font-medium ml-1 text-jd-green-600">hrs</span>
          </span>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <MapPin size={14} /> Site / Location
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            placeholder="e.g., Johnson Residence, Oak Street"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <ClipboardList size={14} /> Work Activity Completed
          </label>
          <textarea
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
            placeholder="e.g., Mowed front and back lawn, trimmed hedges along the driveway, blew clippings from walkway"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional details, materials used, or follow-ups"
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-jd-green-600 hover:bg-jd-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
          >
            <Save size={18} />
            {saving ? 'Saving...' : editing ? 'Update Job' : 'Save Job'}
          </button>
          {editing && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
