import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ShieldAlert, Check } from 'lucide-react';
import {
  supabase,
  Flha,
  FlhaHazard,
  FlhaInput,
  FlhaRiskLevel,
  FlhaTarget,
  FLHA_PPE_OPTIONS,
} from '../lib/supabase';

type Props = {
  target: FlhaTarget;
  existing: Flha | null;
  /** Pre-fills worker name when creating a new FLHA. */
  defaultWorkerName?: string;
  /** Active Consalty company id; required for inserts (existing rows keep their own). */
  companyId: string | null;
  onSaved: (msg: string, flha: Flha) => void;
  onDeleted: (msg: string, flha: Flha) => void;
  onError: (msg: string) => void;
  onClose: () => void;
};

function describeTarget(t: FlhaTarget): { activity: string; site: string; date: string } {
  if (t.kind === 'job') {
    return { activity: t.job.activity, site: t.job.site, date: t.job.job_date };
  }
  return { activity: t.activity, site: t.site, date: t.workDate };
}

function newHazardRow(): FlhaHazard & { id: string } {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    description: '',
    risk_level: 'low',
    controls: '',
  };
}

const RISK_LEVELS: { id: FlhaRiskLevel; label: string; classes: string }[] = [
  { id: 'low', label: 'Low', classes: 'bg-jd-green-100 text-jd-green-800 border-jd-green-300' },
  { id: 'medium', label: 'Medium', classes: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'high', label: 'High', classes: 'bg-red-100 text-red-800 border-red-300' },
];

export function FlhaModal({
  target,
  existing,
  defaultWorkerName = '',
  companyId,
  onSaved,
  onDeleted,
  onError,
  onClose,
}: Props) {
  const meta = describeTarget(target);
  const [taskDescription, setTaskDescription] = useState('');
  const [location, setLocation] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(meta.date);
  const [workerName, setWorkerName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [hazards, setHazards] = useState<(FlhaHazard & { id: string })[]>([newHazardRow()]);
  const [ppe, setPpe] = useState<Set<string>>(new Set());
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setTaskDescription(existing.task_description || meta.activity || '');
      setLocation(existing.location || meta.site || '');
      setAssessmentDate(existing.assessment_date || meta.date);
      setWorkerName(existing.worker_name || defaultWorkerName || '');
      setSupervisorName(existing.supervisor_name || '');
      setAdditionalNotes(existing.additional_notes || '');
      const loaded = (existing.hazards || []).map((h) => ({ ...newHazardRow(), ...h }));
      setHazards(loaded.length > 0 ? loaded : [newHazardRow()]);
      setPpe(new Set(existing.ppe_required || []));
      setSigned(!!existing.signed_at);
    } else {
      setTaskDescription(meta.activity || '');
      setLocation(meta.site || '');
      setAssessmentDate(meta.date);
      setWorkerName(defaultWorkerName || '');
      setSupervisorName('');
      setAdditionalNotes('');
      setHazards([newHazardRow()]);
      setPpe(new Set());
      setSigned(false);
    }
  }, [existing, meta.activity, meta.site, meta.date, defaultWorkerName]);

  const togglePpe = (item: string) => {
    setPpe((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const updateHazard = (id: string, patch: Partial<FlhaHazard>) => {
    setHazards((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const addHazard = () => setHazards((prev) => [...prev, newHazardRow()]);
  const removeHazard = (id: string) =>
    setHazards((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));

  const cleanedHazards = useMemo<FlhaHazard[]>(
    () =>
      hazards
        .map(({ id: _id, ...rest }) => rest)
        .filter((h) => h.description.trim() !== '' || h.controls.trim() !== ''),
    [hazards],
  );

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;
    if (!taskDescription.trim()) {
      onError('Add a task description before saving the FLHA.');
      return;
    }
    if (!existing && !companyId) {
      onError('Pick a company first to save the FLHA.');
      return;
    }
    setSaving(true);
    const payload: FlhaInput = {
      company_id: existing?.company_id ?? companyId,
      job_id: target.kind === 'job' ? target.job.id : null,
      client_task_key: target.kind === 'task' ? target.clientTaskKey : (existing?.client_task_key ?? null),
      assessment_date: assessmentDate,
      location: location.trim(),
      task_description: taskDescription.trim(),
      hazards: cleanedHazards,
      ppe_required: Array.from(ppe),
      additional_notes: additionalNotes.trim(),
      worker_name: workerName.trim(),
      supervisor_name: supervisorName.trim(),
      signed_at: signed ? (existing?.signed_at || new Date().toISOString()) : null,
    };

    const nowIso = new Date().toISOString();
    let savedData: Flha | null = null;
    let saveError: { message: string } | null = null;

    if (existing) {
      const { data, error } = await supabase
        .from('flhas')
        .update({ ...payload, updated_at: nowIso })
        .eq('id', existing.id)
        .select()
        .single();
      savedData = data as Flha | null;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from('flhas')
        .insert({ ...payload, updated_at: nowIso })
        .select()
        .single();
      savedData = data as Flha | null;
      saveError = error;
    }

    setSaving(false);
    if (saveError || !savedData) {
      onError(saveError?.message || 'Failed to save FLHA');
      return;
    }
    onSaved(existing ? 'FLHA updated' : 'FLHA created', savedData);
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm('Delete this FLHA? This cannot be undone.')) return;
    setDeleting(true);
    const { error } = await supabase.from('flhas').delete().eq('id', existing.id);
    setDeleting(false);
    if (error) {
      onError(error.message);
      return;
    }
    onDeleted('FLHA deleted', existing);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="presentation"
      onClick={() => !saving && !deleting && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="flha-title"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-3xl max-h-[min(92vh,860px)] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-jd-green-50">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldAlert className="text-jd-green-700 shrink-0" size={22} />
            <div className="min-w-0">
              <h2 id="flha-title" className="text-lg font-bold text-jd-green-800 truncate">
                {existing ? 'Edit Field Level Hazard Assessment' : 'New Field Level Hazard Assessment'}
              </h2>
              <p className="text-xs text-jd-green-700/80 truncate">
                {meta.activity || 'Task'} {meta.site ? `· ${meta.site}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !saving && !deleting && onClose()}
            className="p-1.5 rounded-lg text-jd-green-800 hover:bg-jd-green-100 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="flha-date" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment date
              </label>
              <input
                id="flha-date"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="flha-location" className="block text-sm font-medium text-gray-700 mb-1">
                Location / site
              </label>
              <input
                id="flha-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where the task is performed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="flha-task" className="block text-sm font-medium text-gray-700 mb-1">
              Task description
            </label>
            <textarea
              id="flha-task"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Hazards & controls</h3>
              <button
                type="button"
                onClick={addHazard}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-jd-green-600 text-white hover:bg-jd-green-700"
              >
                <Plus size={14} /> Add hazard
              </button>
            </div>
            <div className="space-y-3">
              {hazards.map((h, idx) => (
                <div key={h.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Hazard {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHazard(h.id)}
                      disabled={hazards.length === 1}
                      className="p-1 rounded text-red-600 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Remove hazard"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea
                      value={h.description}
                      onChange={(e) => updateHazard(h.id, { description: e.target.value })}
                      placeholder="What is the hazard? (e.g. slip on wet floor)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
                    />
                    <textarea
                      value={h.controls}
                      onChange={(e) => updateHazard(h.id, { controls: e.target.value })}
                      placeholder="Controls / mitigation (e.g. wet-floor sign, mop spill, wear non-slip footwear)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none bg-white"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-600">Residual risk:</span>
                    {RISK_LEVELS.map((rl) => (
                      <button
                        key={rl.id}
                        type="button"
                        onClick={() => updateHazard(h.id, { risk_level: rl.id })}
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          h.risk_level === rl.id
                            ? rl.classes
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {rl.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Required PPE</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FLHA_PPE_OPTIONS.map((item) => {
                const checked = ppe.has(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => togglePpe(item)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left ${
                      checked
                        ? 'bg-jd-green-600 border-jd-green-700 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-4 h-4 rounded border ${
                        checked ? 'bg-white border-white text-jd-green-700' : 'border-gray-400'
                      }`}
                    >
                      {checked ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="flha-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Additional notes
            </label>
            <textarea
              id="flha-notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="Emergency contacts, muster point, special conditions, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="flha-worker" className="block text-sm font-medium text-gray-700 mb-1">
                Worker name
              </label>
              <input
                id="flha-worker"
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
            <div>
              <label htmlFor="flha-supervisor" className="block text-sm font-medium text-gray-700 mb-1">
                Supervisor name
              </label>
              <input
                id="flha-supervisor"
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-jd-yellow-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-400 text-jd-green-600 focus:ring-jd-green-500"
            />
            <span className="text-sm text-gray-800">
              I confirm I have reviewed the hazards, controls, and PPE listed above before starting this
              task.
            </span>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <div>
            {existing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-jd-green-600 text-white hover:bg-jd-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Create FLHA'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
