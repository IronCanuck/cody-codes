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
  BookmarkPlus,
} from 'lucide-react';
import { supabase, Job } from '../lib/supabase';
import {
  combineDateAndTime,
  computeHours,
  getWorkDayHoursWithLunch,
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from '../lib/time';
import { QuarterHourTimeInput } from './QuarterHourTimeInput';
import { dailyWorkReportPdfBlob } from '../lib/pdf';
import { dailyWorkReportPngBlob } from '../lib/png';
import {
  getTaskPresets,
  subscribeTaskPresets,
  addTaskPresetLocation,
  addTaskPresetActivity,
  type TaskPresets,
} from '../lib/task-presets';

type Props = {
  editing?: Job | null;
  /** When logging (not editing), pre-fill the work day from e.g. ?date= on the Log page */
  initialWorkDate?: string | null;
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

type DailyFormState = {
  workDate: string;
  dayStartTime: string;
  dayEndTime: string;
  blocks: TaskBlock[];
};

const DAILY_FORM_DRAFT_KEY = (workDate: string) => `jobTracker:dailyForm:${workDate}`;

function isTaskBlock(x: unknown): x is TaskBlock {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.startTime === 'string' &&
    typeof o.endTime === 'string' &&
    typeof o.site === 'string' &&
    typeof o.activity === 'string' &&
    typeof o.notes === 'string'
  );
}

function isDailyFormState(x: unknown): x is DailyFormState {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.workDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.workDate)) return false;
  if (typeof o.dayStartTime !== 'string' || typeof o.dayEndTime !== 'string') return false;
  if (!Array.isArray(o.blocks) || o.blocks.length < 1) return false;
  return o.blocks.every(isTaskBlock);
}

function loadDailyFormDraft(workDate: string): DailyFormState | null {
  try {
    const raw = localStorage.getItem(DAILY_FORM_DRAFT_KEY(workDate));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDailyFormState(parsed) || parsed.workDate !== workDate) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDailyFormDraft(state: DailyFormState): void {
  try {
    localStorage.setItem(DAILY_FORM_DRAFT_KEY(state.workDate), JSON.stringify(state));
  } catch {
    /* storage full or disabled */
  }
}

function clearDailyFormDraft(workDate: string): void {
  try {
    localStorage.removeItem(DAILY_FORM_DRAFT_KEY(workDate));
  } catch {
    /* ignore */
  }
}

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

/** Block has no time or text — skipped on submit; day-level hours are used if all blocks are empty. */
function isTaskBlockEmpty(b: TaskBlock): boolean {
  return (
    !b.startTime &&
    !b.endTime &&
    !b.activity.trim() &&
    !b.site.trim() &&
    !b.notes.trim()
  );
}

const DAY_HOURS_ONLY_ACTIVITY = 'Work day — hours for pay (no task detail)';

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

function emptyDailyState(): DailyFormState {
  const now = new Date();
  return {
    workDate: toLocalDateInputValue(now),
    dayStartTime: toLocalTimeInputValue(now),
    dayEndTime: '',
    blocks: [newTaskBlock()],
  };
}

export function JobForm({ editing, initialWorkDate, onSaved, onError, onCancelEdit }: Props) {
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
  return (
    <DailyJobTrackerForm
      initialWorkDate={initialWorkDate}
      onSaved={onSaved}
      onError={onError}
    />
  );
}

const PRESET_SITES_LIST_ID = 'jt-preset-sites';

/** Common day-start presets for overall work hours (`HH:MM` for `<input type="time">`). */
const DAY_START_QUICK_TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00'] as const;

function addHoursToHhmm(hhmm: string, hours: number): string {
  const parts = hhmm.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const totalMinutes = h * 60 + m + hours * 60;
  const day = 24 * 60;
  const wrap = ((totalMinutes % day) + day) % day;
  const nh = Math.floor(wrap / 60);
  const nm = wrap % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Eight hours after each `DAY_START_QUICK_TIMES` value (for matching 8-hr day presets). */
const DAY_END_QUICK_TIMES = DAY_START_QUICK_TIMES.map((t) => addHoursToHhmm(t, 8));

function quickTimeChipLabel(hhmm: string): string {
  const parts = hhmm.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
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
  const [presets, setPresets] = useState<TaskPresets>(() => getTaskPresets());

  useEffect(() => {
    return subscribeTaskPresets(() => setPresets(getTaskPresets()));
  }, []);

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
  const { hours: payHours } = getWorkDayHoursWithLunch(startIso, endIso);

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
    if (payHours <= 0) {
      onError('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        job_date: form.date,
        start_time: startIso,
        end_time: endIso,
        hours_worked: payHours,
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
      noValidate
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
            <QuarterHourTimeInput
              value={form.startTime}
              onChange={(startTime) => setForm({ ...form, startTime })}
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
            <QuarterHourTimeInput
              value={form.endTime}
              onChange={(endTime) => setForm({ ...form, endTime })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="bg-jd-green-50 border border-jd-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-jd-green-800">Hours on activity</span>
          <span className="text-2xl font-bold text-jd-green-700">
            {payHours.toFixed(2)}
            <span className="text-sm font-medium ml-1 text-jd-green-600">hrs</span>
          </span>
        </div>

        <datalist id={PRESET_SITES_LIST_ID}>
          {presets.locations.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <MapPin size={14} /> Site / Location
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            list={presets.locations.length ? PRESET_SITES_LIST_ID : undefined}
            placeholder="e.g., Johnson Residence, Oak Street"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
          />
          {form.site.trim() ? (
            <button
              type="button"
              onClick={() => {
                addTaskPresetLocation(form.site);
                setPresets(getTaskPresets());
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-jd-green-800 hover:text-jd-green-900"
            >
              <BookmarkPlus size={14} aria-hidden />
              Save location to common list
            </button>
          ) : null}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <ClipboardList size={14} /> Work Activity Completed
          </label>
          {presets.activities.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) setForm((f) => ({ ...f, activity: v }));
              }}
              className="w-full mb-2 px-4 py-2 border border-jd-green-200 rounded-lg text-sm text-jd-green-900 bg-jd-green-50/80 focus:ring-2 focus:ring-jd-green-500 outline-none"
            >
              <option value="">Fill from saved task…</option>
              {presets.activities.map((a) => (
                <option key={a} value={a}>
                  {a.length > 80 ? `${a.slice(0, 80)}…` : a}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
            placeholder="e.g., Mowed front and back lawn, trimmed hedges along the driveway, blew clippings from walkway"
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none"
            required
          />
          {form.activity.trim() ? (
            <button
              type="button"
              onClick={() => {
                addTaskPresetActivity(form.activity);
                setPresets(getTaskPresets());
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-jd-green-800 hover:text-jd-green-900"
            >
              <BookmarkPlus size={14} aria-hidden />
              Save task text to common list
            </button>
          ) : null}
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
  initialWorkDate,
  onSaved,
  onError,
}: {
  initialWorkDate?: string | null;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const validInitial =
    initialWorkDate && /^\d{4}-\d{2}-\d{2}$/.test(initialWorkDate) ? initialWorkDate : null;

  const [form, setForm] = useState(() => {
    const wd = validInitial ?? toLocalDateInputValue(new Date());
    const fromDraft = loadDailyFormDraft(wd);
    if (fromDraft) return fromDraft;
    return { ...emptyDailyState(), workDate: wd };
  });
  const [submitting, setSubmitting] = useState(false);
  const [presets, setPresets] = useState<TaskPresets>(() => getTaskPresets());

  useEffect(() => {
    return subscribeTaskPresets(() => setPresets(getTaskPresets()));
  }, []);

  useEffect(() => {
    if (!validInitial) return;
    setForm((f) => {
      if (f.workDate === validInitial) return f;
      const d = loadDailyFormDraft(validInitial);
      if (d) return d;
      return { ...emptyDailyState(), workDate: validInitial };
    });
  }, [validInitial]);

  const setBlocks = (updater: TaskBlock[] | ((prev: TaskBlock[]) => TaskBlock[])) => {
    setForm((f) => ({
      ...f,
      blocks: typeof updater === 'function' ? updater(f.blocks) : updater,
    }));
  };

  const dayStartIso = combineDateAndTime(form.workDate, form.dayStartTime);
  const dayEndIso = combineDateAndTime(form.workDate, form.dayEndTime);
  const { hours: dayHours, lunchDeducted: dayLunchDeducted } = getWorkDayHoursWithLunch(
    dayStartIso,
    dayEndIso,
  );

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

  const saveTaskDraft = () => {
    saveDailyFormDraft(form);
    onSaved('Saved on this device — your tasks for this work day are kept until you submit.');
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

    const taskRows: {
      job_date: string;
      start_time: string;
      end_time: string;
      hours_worked: number;
      activity: string;
      site: string;
      notes: string;
    }[] = [];
    for (let i = 0; i < form.blocks.length; i++) {
      const b = form.blocks[i];
      if (isTaskBlockEmpty(b)) continue;
      if (!b.startTime || !b.endTime) {
        onError(
          `Task ${i + 1}: set both start and end time, or clear the task to log only overall hours above.`,
        );
        return;
      }
      if (!b.activity.trim()) {
        onError(
          `Task ${i + 1}: describe the work activity, or clear the task if you are only logging pay hours for the day.`,
        );
        return;
      }
      const s = combineDateAndTime(form.workDate, b.startTime);
      const en = combineDateAndTime(form.workDate, b.endTime);
      if (computeHours(s, en) <= 0) {
        onError(`Task ${i + 1}: end time must be after start time.`);
        return;
      }
      taskRows.push({
        job_date: form.workDate,
        start_time: s,
        end_time: en,
        hours_worked: computeHours(s, en),
        activity: b.activity.trim(),
        site: b.site.trim(),
        notes: b.notes.trim(),
      });
    }

    const rows =
      taskRows.length > 0
        ? taskRows
        : [
            {
              job_date: form.workDate,
              start_time: dayStartIso,
              end_time: dayEndIso,
              hours_worked: dayHours,
              activity: DAY_HOURS_ONLY_ACTIVITY,
              site: '',
              notes: '',
            },
          ];

    setSubmitting(true);
    try {

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
        const fromTasks = taskRows.length > 0;
        if (repErr) {
          onSaved(
            fromTasks
              ? `Saved ${inserted.length} task(s) and report files, but the report index failed: ${repErr.message}`
              : `Saved your work hours and report files, but the report index failed: ${repErr.message}`,
          );
        } else {
          onSaved(
            fromTasks
              ? `Daily report saved: ${inserted.length} task(s) logged, PDF and PNG stored for ${form.workDate}. Starting fresh for the next day.`
              : `Daily report saved: work hours for ${form.workDate} (no task log), PDF and PNG stored. Starting fresh for the next day.`,
          );
        }
      } else {
        const parts: string[] = [];
        if (upPdf) parts.push(`PDF: ${upPdf.message}`);
        if (upPng) parts.push(`PNG: ${upPng.message}`);
        const fromTasks = taskRows.length > 0;
        onSaved(
          fromTasks
            ? `Tasks saved on disk (${inserted.length} rows). Report files could not be uploaded (${parts.join(' ')}) — check the job-reports bucket in Supabase.`
            : `Work hours saved on disk. Report files could not be uploaded (${parts.join(' ')}) — check the job-reports bucket in Supabase.`,
        );
      }

      const submittedDate = form.workDate;
      clearDailyFormDraft(submittedDate);
      resetToNextDay(submittedDate);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to submit daily report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmitReport}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-jd-green-600 to-jd-green-700 px-6 py-4">
        <h2 className="text-white text-xl font-bold flex items-center gap-2">
          <Calendar size={20} />
          Daily job tracker
        </h2>
        <p className="text-jd-green-100 text-sm mt-1">
          Set your work hours for pay; add task blocks when you need a detailed log. Either way, submit
          when your day is done.
        </p>
      </div>

      <div className="p-6 space-y-5">
        <datalist id={PRESET_SITES_LIST_ID}>
          {presets.locations.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
            <Calendar size={14} /> Work day
          </label>
          <input
            type="date"
            value={form.workDate}
            onChange={(e) => {
              const newDate = e.target.value;
              if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
              const saved = loadDailyFormDraft(newDate);
              if (saved) {
                setForm(saved);
              } else {
                setForm({ ...emptyDailyState(), workDate: newDate });
              }
            }}
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
              <QuarterHourTimeInput
                value={form.dayStartTime}
                onChange={(dayStartTime) => setForm({ ...form, dayStartTime })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                required
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 self-center mr-0.5">
                  Quick set
                </span>
                {DAY_START_QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, dayStartTime: t })}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md border border-jd-green-200 bg-white text-jd-green-800 hover:bg-jd-green-50 focus:outline-none focus:ring-2 focus:ring-jd-green-400"
                  >
                    {quickTimeChipLabel(t)}
                  </button>
                ))}
              </div>
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
              <QuarterHourTimeInput
                value={form.dayEndTime}
                onChange={(dayEndTime) => setForm({ ...form, dayEndTime })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                required
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 self-center mr-0.5">
                  Quick set
                </span>
                {DAY_END_QUICK_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, dayEndTime: t })}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md border border-jd-green-200 bg-white text-jd-green-800 hover:bg-jd-green-50 focus:outline-none focus:ring-2 focus:ring-jd-green-400"
                  >
                    {quickTimeChipLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-jd-green-50 border border-jd-green-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-jd-green-800">Total work day</span>
            <span className="text-2xl font-bold text-jd-green-700">
              {dayHours.toFixed(2)}
              <span className="text-sm font-medium ml-1 text-jd-green-600">hrs</span>
            </span>
          </div>
          <p className="px-4 pb-3 text-xs text-jd-green-800/80 leading-snug border-t border-jd-green-200/80 pt-2">
            {dayLunchDeducted
              ? '0.5 hr (30 min) unpaid lunch has been subtracted from your clock time; this total is what gets saved for the day.'
              : 'If your shift is longer than 6 hours, 0.5 hr (30 min) unpaid lunch is subtracted from clock time in the total above.'}
          </p>
        </div>

        <div className="pt-1 border-t border-gray-100">
          <h3 className="text-sm font-bold text-jd-green-800 mb-1">Tasks for this day</h3>
          <p className="text-xs text-gray-600 mb-3">
            Optional. Leave blank to record only the overall hours above for your paycheque.
          </p>
          <div className="space-y-4">
            {form.blocks.map((block, index) => (
              <TaskBlockCard
                key={block.id}
                index={index}
                block={block}
                workDate={form.workDate}
                presets={presets}
                onPresetsUpdated={() => setPresets(getTaskPresets())}
                onChange={(p) => updateBlock(block.id, p)}
                onSaveDraft={saveTaskDraft}
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
            Saves your hours (and any task lines you filled in), uploads PDF and PNG to your report
            archive, then clears the form and sets the work day to tomorrow.
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
  presets,
  onPresetsUpdated,
  onChange,
  onSaveDraft,
  onRemove,
  canDelete,
}: {
  index: number;
  block: TaskBlock;
  workDate: string;
  presets: TaskPresets;
  onPresetsUpdated: () => void;
  onChange: (p: Partial<TaskBlock>) => void;
  onSaveDraft: () => void;
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold text-jd-green-800">Task {index + 1}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSaveDraft}
            title="Save all tasks and day times for this work day on this device"
            className="flex items-center gap-1.5 text-xs font-semibold text-jd-green-800 bg-white border border-jd-green-300 hover:bg-jd-green-50 px-2.5 py-1.5 rounded-lg shadow-sm"
          >
            <Save size={14} aria-hidden />
            Save task
          </button>
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
          <QuarterHourTimeInput
            value={block.startTime}
            onChange={(startTime) => onChange({ startTime })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
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
          <QuarterHourTimeInput
            value={block.endTime}
            onChange={(endTime) => onChange({ endTime })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
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
          list={presets.locations.length ? PRESET_SITES_LIST_ID : undefined}
          placeholder="e.g., Johnson Residence, Oak Street"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
        />
        {block.site.trim() ? (
          <button
            type="button"
            onClick={() => {
              addTaskPresetLocation(block.site);
              onPresetsUpdated();
            }}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-jd-green-800 hover:text-jd-green-900"
          >
            <BookmarkPlus size={14} aria-hidden />
            Save location to common list
          </button>
        ) : null}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
          <ClipboardList size={14} /> Work activity completed
          <span className="text-gray-400 font-normal">(if you add a task)</span>
        </label>
        {presets.activities.length > 0 ? (
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) onChange({ activity: v });
            }}
            className="w-full mb-2 px-4 py-2 border border-jd-green-200 rounded-lg text-sm text-jd-green-900 bg-jd-green-50/80 focus:ring-2 focus:ring-jd-green-500 outline-none"
          >
            <option value="">Fill from saved task…</option>
            {presets.activities.map((a) => (
              <option key={a} value={a}>
                {a.length > 80 ? `${a.slice(0, 80)}…` : a}
              </option>
            ))}
          </select>
        ) : null}
        <textarea
          value={block.activity}
          onChange={(e) => onChange({ activity: e.target.value })}
          placeholder="e.g., Mowed front and back lawn, trimmed hedges along the driveway, blew clippings from walkway"
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none resize-none bg-white"
        />
        {block.activity.trim() ? (
          <button
            type="button"
            onClick={() => {
              addTaskPresetActivity(block.activity);
              onPresetsUpdated();
            }}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-jd-green-800 hover:text-jd-green-900"
          >
            <BookmarkPlus size={14} aria-hidden />
            Save task text to common list
          </button>
        ) : null}
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
