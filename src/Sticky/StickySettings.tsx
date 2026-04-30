import { useState, type FormEvent } from 'react';
import { Moon, Pencil, Plus, Sparkles, Sun, Trash2 } from 'lucide-react';
import { useSticky } from './StickyContext';
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_COLOR_TOKENS,
  type StickyCategory,
  type StickyCategoryColor,
} from './types';

export function StickySettings() {
  const {
    data,
    addCategory,
    updateCategory,
    removeCategory,
    setDefaultCategory,
    toggleGrid,
    toggleGlow,
    setTheme,
    clearAllNotes,
  } = useSticky();
  const isDark = data.settings.theme === 'dark';
  const [name, setName] = useState('');
  const [color, setColor] = useState<StickyCategoryColor>('pink');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ name: string; color: StickyCategoryColor }>(
    { name: '', color: 'pink' },
  );
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = addCategory(trimmed, color);
    if (!data.settings.defaultCategoryId) setDefaultCategory(id);
    setName('');
  };

  const startEdit = (category: StickyCategory) => {
    setEditingId(category.id);
    setEditingDraft({ name: category.name, color: category.color });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editingDraft.name.trim();
    if (!trimmed) return;
    updateCategory(editingId, { name: trimmed, color: editingDraft.color });
    setEditingId(null);
  };

  const totalNotes = data.notes.length;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      <header className="rounded-2xl border border-miami-pink/30 bg-gradient-to-br from-miami-night via-miami-surface to-miami-night-deep p-5 shadow-[0_10px_40px_-15px_rgba(0,229,255,0.4)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-miami-cyan to-miami-pink-light bg-clip-text text-transparent">
          Sticky settings
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
          Customize the vice
        </h2>
        <p className="mt-2 text-sm text-miami-mute max-w-2xl">
          Manage your note categories, theme tweaks, and clean up the board when you&apos;re ready
          for a fresh start.
        </p>
      </header>

      <section
        aria-labelledby="sticky-categories-heading"
        className="rounded-2xl border border-miami-pink/30 bg-miami-night/70 p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h3
            id="sticky-categories-heading"
            className="text-lg font-bold text-miami-pink-light flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-miami-cyan" strokeWidth={2.25} aria-hidden />
            Note categories
          </h3>
          <span className="text-xs text-miami-mute">{data.categories.length} total</span>
        </div>

        <form
          onSubmit={handleAdd}
          className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto] items-end rounded-xl border border-miami-cyan/30 bg-miami-night-deep/70 p-3"
        >
          <label className="text-[11px] font-semibold uppercase tracking-wider text-miami-cyan">
            Category name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Birthdays"
              className="mt-1 w-full rounded-lg border border-miami-pink/30 bg-miami-surface px-2.5 py-1.5 text-sm text-miami-ink placeholder:text-miami-mute focus:outline-none focus:ring-2 focus:ring-miami-cyan"
              required
            />
          </label>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-miami-cyan mb-1">
              Color
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLOR_OPTIONS.map((opt) => {
                const tokens = CATEGORY_COLOR_TOKENS[opt.value];
                const active = color === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={`h-7 w-7 rounded-full ring-2 transition-all ${tokens.dot} ${
                      active
                        ? 'ring-white ring-offset-2 ring-offset-miami-night-deep scale-110'
                        : 'ring-transparent hover:ring-white/50'
                    }`}
                    aria-label={opt.label}
                    aria-pressed={active}
                    title={opt.label}
                  />
                );
              })}
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-miami-pink-bright to-miami-cyan px-3 py-2 text-sm font-bold text-white shadow-md shadow-miami-pink/30 hover:opacity-95 disabled:opacity-50"
            disabled={!name.trim()}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Add
          </button>
        </form>

        <ul className="space-y-2">
          {data.categories.map((category) => {
            const tokens = CATEGORY_COLOR_TOKENS[category.color];
            const isEditing = editingId === category.id;
            const isDefault = data.settings.defaultCategoryId === category.id;
            return (
              <li
                key={category.id}
                className="rounded-xl border border-miami-pink/20 bg-miami-night-deep/65 p-3"
              >
                {isEditing ? (
                  <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto] items-end">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-miami-cyan">
                      Name
                      <input
                        type="text"
                        value={editingDraft.name}
                        onChange={(event) =>
                          setEditingDraft((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-miami-pink/30 bg-miami-surface px-2.5 py-1.5 text-sm text-miami-ink focus:outline-none focus:ring-2 focus:ring-miami-cyan"
                      />
                    </label>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-miami-cyan mb-1">
                        Color
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_COLOR_OPTIONS.map((opt) => {
                          const t2 = CATEGORY_COLOR_TOKENS[opt.value];
                          const active = editingDraft.color === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setEditingDraft((prev) => ({ ...prev, color: opt.value }))
                              }
                              className={`h-6 w-6 rounded-full ring-2 transition-all ${t2.dot} ${
                                active
                                  ? 'ring-white ring-offset-2 ring-offset-miami-night-deep'
                                  : 'ring-transparent hover:ring-white/50'
                              }`}
                              aria-label={opt.label}
                              aria-pressed={active}
                              title={opt.label}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editingDraft.name.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-miami-cyan-bright px-3 py-1.5 text-xs font-bold text-slate-900 hover:opacity-95 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-miami-pink/40 px-3 py-1.5 text-xs font-semibold text-miami-pink-light hover:bg-miami-pink/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`h-3.5 w-3.5 rounded-full ${tokens.dot} shadow-[0_0_8px_currentColor]`}
                        aria-hidden
                      />
                      <span className="text-sm font-bold text-miami-ink truncate">
                        {category.name}
                      </span>
                      {isDefault && (
                        <span className="ml-1 rounded-full border border-miami-cyan/40 bg-miami-cyan/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-miami-cyan">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultCategory(category.id)}
                          className="rounded-md border border-miami-cyan/35 bg-miami-cyan/10 px-2 py-1 text-[11px] font-semibold text-miami-cyan hover:bg-miami-cyan/20"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="rounded-md border border-miami-pink/35 bg-miami-pink/10 p-1.5 text-miami-pink-light hover:bg-miami-pink/20"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCategory(category.id)}
                        className="rounded-md border border-rose-400/50 bg-rose-500/10 p-1.5 text-rose-200 hover:bg-rose-500/20"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {data.categories.length === 0 && (
            <li className="text-sm text-miami-mute italic px-2 py-1">
              No categories yet — add your first one above.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-miami-cyan/30 bg-miami-night/70 p-5 space-y-3">
        <h3 className="text-lg font-bold text-miami-cyan flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-miami-pink-light" strokeWidth={2.25} aria-hidden />
          Board look & feel
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-miami-pink/20 bg-miami-night-deep/65 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-miami-ink flex items-center gap-2">
                {isDark ? (
                  <Moon className="h-4 w-4 text-miami-cyan" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Sun className="h-4 w-4 text-miami-sunset" strokeWidth={2.25} aria-hidden />
                )}
                Appearance
              </p>
              <p className="text-xs text-miami-mute">
                {isDark ? 'Dark mode — full neon Miami night.' : 'Light mode — soft daylight palette.'}
              </p>
            </div>
            <div
              role="group"
              aria-label="Theme"
              className="inline-flex rounded-full border border-miami-pink/30 bg-miami-night-deep/70 p-0.5"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={!isDark}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  !isDark
                    ? 'bg-gradient-to-r from-miami-yellow to-miami-sunset text-slate-900 shadow'
                    : 'text-miami-mute hover:text-miami-ink'
                }`}
              >
                <Sun className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={isDark}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  isDark
                    ? 'bg-gradient-to-r from-miami-pink-bright to-miami-cyan text-white shadow'
                    : 'text-miami-mute hover:text-miami-ink'
                }`}
              >
                <Moon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Dark
              </button>
            </div>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl border border-miami-pink/20 bg-miami-night-deep/65 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-miami-ink">Neon dot grid</p>
              <p className="text-xs text-miami-mute">Toggle the background grid texture.</p>
            </div>
            <button
              type="button"
              onClick={toggleGrid}
              aria-pressed={data.settings.showGrid}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                data.settings.showGrid ? 'bg-miami-cyan-bright' : 'bg-miami-mute/40'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  data.settings.showGrid ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </li>
          <li className="flex items-center justify-between gap-3 rounded-xl border border-miami-pink/20 bg-miami-night-deep/65 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-miami-ink">Note glow</p>
              <p className="text-xs text-miami-mute">Color rings around each note.</p>
            </div>
            <button
              type="button"
              onClick={toggleGlow}
              aria-pressed={data.settings.glow}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                data.settings.glow ? 'bg-miami-pink-bright' : 'bg-miami-mute/40'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  data.settings.glow ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 space-y-3">
        <h3 className="text-lg font-bold text-rose-100 flex items-center gap-2">
          <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Danger zone
        </h3>
        <p className="text-sm text-rose-100/80">
          You currently have <strong>{totalNotes}</strong> note{totalNotes === 1 ? '' : 's'} on the
          board. Removing them all can&apos;t be undone.
        </p>
        {confirmClear ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearAllNotes();
                setConfirmClear(false);
              }}
              className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white hover:bg-rose-600"
            >
              Yes, throw away all notes
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-rose-300/40 bg-transparent px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={totalNotes === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/50 bg-rose-500/15 px-3 py-2 text-sm font-bold text-rose-100 hover:bg-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Clear all notes
          </button>
        )}
      </section>
    </div>
  );
}
