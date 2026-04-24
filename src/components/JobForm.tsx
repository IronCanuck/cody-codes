import { useState, useEffect, FormEvent } from 'react';
import {
  Clock,
  MapPin,
  ClipboardList,
  Save,
  Zap,
  Calendar,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';
import { supabase, Job } from '../lib/supabase';
import {
  combineDateAndTime,
  computeHours,
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from '../lib/time';
import { dailyWorkReportPdfBlob } from '../lib/pdf';
import { dailyWorkReportPngBlob } from '../lib/png';

type Props = {
  editing?: Job | null;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onCancelEdit?: () => void;
};

type TaskBlock = {
  id: string;
  startTime: string;
  endTime: string;
  site: string;
  activity: string;
  notes: string;
};

function newTaskBlock(): TaskBlock {
  return {
    id: crypto.randomUUID(),
    startTime: '',
    endTime: '',
    site: '',
    activity: '',
    notes: '',
  };
}

function emptySingleJobState() {
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

function emptyDailyState() {
  const now = new Date();
  return {
    workDate: toLocalDateInputValue(now),
    dayStartTime: toLocalTimeInputValue(now),
    dayEndTime: '',
    blocks: [newTaskBlock()],
  };
}

export function JobForm({ editing, onSaved, onError, onCancelEdit }: Props) {
  if (editing) {
    return (
      <SingleJobForm
        job={editing}
        onSaved={onSaved}
        onError={onError}
        onCancelEdit={onCancelEdit}
      />
    );
  }
  return <DailyJobTrackerForm onSaved={onSaved} onError={onError} />;
}

function SingleJobForm({
  job,
  onSaved,
  onError,
  onCancelEdit,
}: {
  job: Job;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onCancelEdit?: () => void;
}) {
  const [form, setForm] = useState(emptySingleJobState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = new Date(job.start_time);
    const e = new Date(job.end_time);
    setForm({
      date: job.job_date,
      startTime: toLocalTimeInputValue(s),
      endTime: toLocalTimeInputValue(e),
      site: job.site,
      activity: job.activity,
      notes: job.notes,
    });
  }, [job]);

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
      const { error } = await supabase.from('jobs').update(payload).eq('id', job.id);
      if (error) throw error;
      onSaved('Job updated');
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
          Edit Job Entry
        </h2>
        <p className="text-jd-green-100 text-sm mt-1">Update the details below</p>
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
            {saving ? 'Saving...' : 'Update Job'}
          </button>
          {onCancelEdit && (
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

function DailyJobTrackerForm({
  onSaved,
  onError,
}: {
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState(emptyDailyState);
  const [submitting, setSubmitting] = useState(false);

  const setBlocks = (updater: TaskBlock[] | ((prev: TaskBlock[]) => TaskBlock[])) => {
    setForm((f) => ({
      ...f,
      blocks: typeof updater === 'function' ? updater(f.blocks) : updater,
    }));
  };

  const dayStartIso = combineDateAndTime(form.workDate, form.dayStartTime);
  const dayEndIso = combineDateAndTime(form.workDate, form.dayEndTime);
  const dayHours = computeHours(dayStartIso, dayEndIso);

  const stampDayNow = (field: 'dayStartTime' | 'dayEndTime') => {
    setForm((f) => ({ ...f, [field]: toLocalTimeInputValue(new Date()) }));
  };

  const updateBlock = (id: string, partial: Partial<TaskBlock>) => {
    setBlocks((blocks) => blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks((blocks) => (blocks.length <= 1 ? blocks : blocks.filter((b) => b.id !== id)));
  };

  const addBlock = () => {
    setBlocks((blocks) => [...blocks, newTaskBlock()]);
  };

  const resetToNextDay = (fromDate: string) => {
    const t = new Date(fromDate + 'T12:00:00');
    t.setDate(t.getDate() + 1);
    const next = toLocalDateInputValue(t);
    const now = new Date();
    setForm({
      workDate: next,
      dayStartTime: toLocalTimeInputValue(now),
      dayEndTime: '',
      blocks: [newTaskBlock()],
    });
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.workDate || !form.dayStartTime || !form.dayEndTime) {
      onError('Please set the work day date and overall start and end times');
      return;
    }
    if (dayHours <= 0) {
      onError('Work day end time must be after start time');
      return;
    }

    for (let i = 0; i < form.blocks.length; i++) {
      const b = form.blocks[i];
      if (!b.startTime || !b.endTime) {
        onError(`Task ${i + 1}: set start and end time for each task (or remove empty tasks).`);
        return;
      }
      if (!b.activity.trim()) {
        onError(`Task ${i + 1}: describe the work activity.`);
        return;
      }
      const s = combineDateAndTime(form.workDate, b.startTime);
      const en = combineDateAndTime(form.workDate, b.endTime);
      if (computeHours(s, en) <= 0) {
        onError(`Task ${i + 1}: end time must be after start time.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const rows = form.blocks.map((b) => {
        const start = combineDateAndTime(form.workDate, b.startTime);
        const end = combineDateAndTime(form.workDate, b.endTime);
        return {
          job_date: form.workDate,
          start_time: start,
          end_time: end,
          hours_worked: computeHours(start, end),
          activity: b.activity.trim(),
          site: b.site.trim(),
          notes: b.notes.trim(),
        };
      });

      const { data: inserted, error: insertError } = await supabase
        .from('jobs')
        .insert(rows)
        .select('*');
      if (insertError) throw insertError;
      if (!inserted?.length) throw new Error('No jobs returned after insert');

      const pdfBlob = dailyWorkReportPdfBlob(
        form.workDate,
        dayStartIso,
        dayEndIso,
        inserted as Job[],
      );
      const pngBlob = await dailyWorkReportPngBlob(
        form.workDate,
        dayStartIso,
        dayEndIso,
        inserted as Job[],
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const folder = `${user?.id ?? 'me'}/${crypto.randomUUID()}`;
      const pdfPath = `${folder}/daily-${form.workDate}.pdf`;
      const pngPath = `${folder}/daily-${form.workDate}.png`;

      const { error: upPdf } = await supabase.storage
        .from('job-reports')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
      const { error: upPng } = await supabase.storage
        .from('job-reports')
        .upload(pngPath, pngBlob, { contentType: 'image/png', upsert: true });

      if (!upPdf && !upPng) {
        const { error: repErr } = await supabase.from('saved_daily_reports').insert({
          report_date: form.workDate,
          day_start_time: dayStartIso,
          day_end_time: dayEndIso,
          day_hours: dayHours,
          job_count: inserted.length,
          pdf_storage_path: pdfPath,
          png_storage_path: pngPath,
        });
        if (repErr) {
          onSaved(
            `Saved ${inserted.length} task(s) and report files, but the report index failed: ${repErr.message}`,
          );
        } else {
          onSaved(
            `Daily report saved: ${inserted.length} task(s) logged, PDF and PNG stored for ${form.workDate}. Starting fresh for the next day.`,
          );
        }
      } else {
        const parts: string[] = [];
        if (upPdf) parts.push(`PDF: ${upPdf.message}`);
        if (upPng) parts.push(`PNG: ${upPng.message}`);
        onSaved(
          `Tasks saved on disk (${inserted.length} rows). Report files could not be uploaded (${parts.join(' ')}) — check the job-reports bucket in Supabase.`,
        );
      }

      const submittedDate = form.workDate;
      resetToNextDay(submittedDate);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to submit daily report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmitReport}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-jd-green-600 to-jd-green-700 px-6 py-4">
        <h2 className="text-white text-xl font-bold flex items-center gap-2">
          <Calendar size={20} />
          Daily job tracker
        </h2>
        <p className="text-jd-green-100 text-sm mt-1">
          Set your overall work hours, then add a block for each task. Submit when your day is done.
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <Calendar size={14} /> Work day
          </label>
          <input
            type="date"
            value={form.workDate}
            onChange={(e) => setForm({ ...form, workDate: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            required
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-jd-green-800 mb-2">Overall work hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> Day start
                </span>
                <button
                  type="button"
                  onClick={() => stampDayNow('dayStartTime')}
                  className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                >
                  <Zap size={10} /> Now
                </button>
              </label>
              <input
                type="time"
                value={form.dayStartTime}
                onChange={(e) => setForm({ ...form, dayStartTime: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> Day end
                </span>
                <button
                  type="button"
                  onClick={() => stampDayNow('dayEndTime')}
                  className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                >
                  <Zap size={10} /> Now
                </button>
              </label>
              <input
                type="time"
                value={form.dayEndTime}
                onChange={(e) => setForm({ ...form, dayEndTime: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-jd-green-50 border border-jd-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-jd-green-800">Total work day</span>
          <span className="text-2xl font-bold text-jd-green-700">
            {dayHours.toFixed(2)}
            <span className="text-sm font-medium ml-1 text-jd-green-600">hrs</span>
          </span>
        </div>

        <div className="pt-1 border-t border-gray-100">
          <h3 className="text-sm font-bold text-jd-green-800 mb-3">Tasks for this day</h3>
          <div className="space-y-4">
            {form.blocks.map((block, index) => (
              <TaskBlockCard
                key={block.id}
                index={index}
                block={block}
                workDate={form.workDate}
                onChange={(p) => updateBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
                canDelete={form.blocks.length > 1}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addBlock}
            className="mt-3 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-jd-green-300 rounded-lg text-jd-green-700 font-semibold hover:bg-jd-green-50 transition-colors"
          >
            <Plus size={18} />
            Add task
          </button>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-jd-green-600 hover:bg-jd-green-700 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
          >
            <Send size={20} />
            {submitting ? 'Submitting...' : 'Submit daily report'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Saves all tasks, uploads PDF and PNG to your report archive, then clears the form and sets
            the work day to tomorrow.
          </p>
        </div>
      </div>
    </form>
  );
}

function TaskBlockCard({
  index,
  block,
  workDate,
  onChange,
  onRemove,
  canDelete,
}: {
  index: number;
  block: TaskBlock;
  workDate: string;
  onChange: (p: Partial<TaskBlock>) => void;
  onRemove: () => void;
  canDelete: boolean;
}) {
  const startIso = combineDateAndTime(workDate, block.startTime);
  const endIso = combineDateAndTime(workDate, block.endTime);
  const blockHours = computeHours(startIso, endIso);

  const stamp = (field: 'startTime' | 'endTime') => {
    onChange({ [field]: toLocalTimeInputValue(new Date()) });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50/50 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-jd-green-800">Task {index + 1}</span>
        {canDelete && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-50"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> Start time
            </span>
            <button
              type="button"
              onClick={() => stamp('startTime')}
              className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
            >
              <Zap size={10} /> Now
            </button>
          </label>
          <input
            type="time"
            value={block.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
            required
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> End time
            </span>
            <button
              type="button"
              onClick={() => stamp('endTime')}
              className="text-xs bg-jd-yellow-400 hover:bg-jd-yellow-500 text-jd-green-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1"
            >
              <Zap size={10} /> Now
            </button>
          </label>
          <input
            type="time"
            value={block.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
            required
          />
        </div>
      </div>

      <div className="bg-jd-green-50 border border-jd-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-jd-green-800">Hours on activity</span>
        <span className="text-xl font-bold text-jd-green-700">
          {blockHours.toFixed(2)}
          <span className="text-sm font-medium ml-1 text-jd-green-600">hrs</span>
        </span>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
          <MapPin size={14} /> Site / location
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={block.site}
          onChange={(e) => onChange({ site: e.target.value })}
          placeholder="e.g., Johnson Residence, Oak Street"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
          <ClipboardList size={14} /> Work activity completed
        </label>
        <textarea
          value={block.activity}
          onChange={(e) => onChange({ activity: e.target.value })}
          placeholder="e.g., Mowed front and back lawn, trimmed hedges along the driveway, blew clippings from walkway"
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none bg-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={block.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Any additional details, materials used, or follow-ups"
          rows={2}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none bg-white"
        />
      </div>
    </div>
  );
}
