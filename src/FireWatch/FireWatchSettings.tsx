import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useFireWatch } from './FireWatchContext';
import { shiftAccent } from './schedule';
import { SHIFT_CODES, type ShiftCode } from './types';

export function FireWatchSettings() {
  const { data, addFirefighter, updateFirefighter, removeFirefighter } = useFireWatch();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [shift, setShift] = useState<ShiftCode>('A');
  const [editingId, setEditingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const out: Record<ShiftCode, typeof data.firefighters> = { A: [], B: [], C: [], D: [] };
    for (const f of data.firefighters) out[f.shift].push(f);
    for (const k of SHIFT_CODES) out[k].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [data.firefighters]);

  const resetForm = () => {
    setName('');
    setRole('');
    setEditingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const trimmedRole = role.trim() || undefined;
    if (editingId) {
      updateFirefighter(editingId, { name: trimmed, role: trimmedRole, shift });
    } else {
      addFirefighter({ name: trimmed, role: trimmedRole, shift });
    }
    resetForm();
  };

  const startEdit = (id: string) => {
    const f = data.firefighters.find((x) => x.id === id);
    if (!f) return;
    setEditingId(f.id);
    setName(f.name);
    setRole(f.role ?? '');
    setShift(f.shift);
  };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto w-full space-y-8">
      <header>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-firewatch-ink">
          Crew settings
        </h2>
        <p className="mt-2 text-sm text-firewatch-smoke">
          Add firefighters by shift. Their names will appear beside every upcoming shift on the
          Fire Watch dashboard.
        </p>
      </header>

      <section
        aria-labelledby="firewatch-add"
        className="rounded-3xl border-2 border-firewatch-flame-deep/30 bg-firewatch-cream p-5 sm:p-6 shadow-md shadow-firewatch-flame/15"
      >
        <h3
          id="firewatch-add"
          className="text-base font-bold text-firewatch-flame-deep flex items-center gap-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {editingId ? 'Update firefighter' : 'Add firefighter'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-firewatch-smoke">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="J. Smith"
              className="mt-1 w-full rounded-xl border-2 border-firewatch-flame-deep/25 bg-white px-3 py-2 text-sm font-medium text-firewatch-ink placeholder:text-firewatch-smoke/50 focus:outline-none focus:border-firewatch-flame-deep focus:ring-2 focus:ring-firewatch-flame-deep/30"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-firewatch-smoke">
            Role / Rank <span className="font-medium text-firewatch-smoke/65">(optional)</span>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Captain, Engineer, etc."
              className="mt-1 w-full rounded-xl border-2 border-firewatch-flame-deep/25 bg-white px-3 py-2 text-sm font-medium text-firewatch-ink placeholder:text-firewatch-smoke/50 focus:outline-none focus:border-firewatch-flame-deep focus:ring-2 focus:ring-firewatch-flame-deep/30"
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-firewatch-smoke">
              Shift
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {SHIFT_CODES.map((code) => {
                const accent = shiftAccent(code);
                const active = shift === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setShift(code)}
                    aria-pressed={active}
                    className={`rounded-xl border-2 px-3 py-2.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-flame-deep focus-visible:ring-offset-1 ${
                      active
                        ? `${accent.badge} border-transparent shadow-md shadow-firewatch-flame/30`
                        : 'border-firewatch-flame-deep/25 bg-white text-firewatch-ink hover:border-firewatch-flame-deep/55'
                    }`}
                  >
                    <span className="block text-base font-black tracking-tight">{code}</span>
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-widest ${
                        active ? 'text-current opacity-90' : 'text-firewatch-smoke/80'
                      }`}
                    >
                      Shift
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-firewatch-flame-deep to-firewatch-ember px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-firewatch-flame/30 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-flame-deep focus-visible:ring-offset-2"
            >
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Add to shift {shift}
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-firewatch-smoke/30 px-3 py-2 text-sm font-semibold text-firewatch-smoke hover:bg-firewatch-smoke/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-flame-deep"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="firewatch-list" className="space-y-3">
        <h3
          id="firewatch-list"
          className="text-base font-bold text-firewatch-ink flex items-center gap-2"
        >
          <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Roster by shift
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHIFT_CODES.map((code) => {
            const accent = shiftAccent(code);
            const list = grouped[code];
            return (
              <li
                key={code}
                className={`rounded-2xl border-2 ${accent.borderSoft} bg-white p-4 shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${accent.badge}`}
                  >
                    {code}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${accent.text}`}>Shift {code}</p>
                    <p className="text-xs text-firewatch-smoke/80">
                      {list.length} member{list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                {list.length > 0 ? (
                  <ul className="mt-3 divide-y divide-firewatch-flame/10">
                    {list.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-firewatch-ink truncate">{f.name}</p>
                          {f.role && (
                            <p className="text-xs text-firewatch-smoke/80 truncate">{f.role}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(f.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-firewatch-smoke hover:bg-firewatch-flame/10 hover:text-firewatch-flame-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-flame-deep"
                            aria-label={`Edit ${f.name}`}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remove ${f.name} from shift ${code}?`)) {
                                removeFirefighter(f.id);
                                if (editingId === f.id) resetForm();
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-firewatch-rust hover:bg-firewatch-rust/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-rust"
                            aria-label={`Remove ${f.name}`}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-firewatch-smoke/70 italic">
                    No firefighters added to shift {code} yet.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
