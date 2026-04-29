import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Layers,
  LogOut,
  Menu,
  Plus,
  Settings as SettingsIcon,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { defaultSnapshot, loadSnapshot, newId, saveSnapshot } from './storage';
import { StickyContext, type StickyContextValue } from './StickyContext';
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_COLOR_TOKENS,
  type StickyCategory,
  type StickyCategoryColor,
  type StickyMedia,
  type StickyNote as StickyNoteType,
  type StickySnapshot,
} from './types';
import { StickyBoard } from './StickyBoard';
import { StickySettings } from './StickySettings';

function pickStartingPosition(notes: StickyNoteType[]): { x: number; y: number } {
  const gap = 24;
  const baseX = 60;
  const baseY = 60;
  const defaultWidth = 240;
  const defaultHeight = 220;
  const rowWrapAt = 1140;

  if (notes.length === 0) return { x: baseX, y: baseY };

  const last = notes.reduce((acc, n) => (n.createdAt > acc.createdAt ? n : acc), notes[0]);
  const lastWidth = last.width || defaultWidth;
  const lastHeight = last.height || defaultHeight;

  let nextX = last.x + lastWidth + gap;
  let nextY = last.y;

  if (nextX + defaultWidth > rowWrapAt) {
    nextX = baseX;
    nextY = last.y + lastHeight + gap;
  }

  return { x: nextX, y: nextY };
}

function StickyShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<StickySnapshot>(() => defaultSnapshot());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<StickyCategoryColor>('cyan');

  useEffect(() => {
    document.title = 'Sticky · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    setData(stored ?? defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const persist = useCallback(
    (next: StickySnapshot | ((prev: StickySnapshot) => StickySnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const addNote = useCallback(
    (categoryId: string | null): string => {
      const id = newId('note');
      const now = new Date().toISOString();
      persist((prev) => {
        const pos = pickStartingPosition(prev.notes);
        const z = prev.nextZ + 1;
        const note: StickyNoteType = {
          id,
          text: '',
          categoryId: categoryId ?? prev.settings.defaultCategoryId ?? prev.categories[0]?.id ?? null,
          x: pos.x,
          y: pos.y,
          width: 240,
          height: 220,
          zIndex: z,
          rotation: (Math.random() - 0.5) * 4,
          media: [],
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, notes: [...prev.notes, note], nextZ: z };
      });
      return id;
    },
    [persist],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<StickyNoteType>) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
        ),
      }));
    },
    [persist],
  );

  const removeNote = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
    },
    [persist],
  );

  const bringToFront = useCallback(
    (id: string) => {
      persist((prev) => {
        const z = prev.nextZ + 1;
        return {
          ...prev,
          nextZ: z,
          notes: prev.notes.map((n) => (n.id === id ? { ...n, zIndex: z } : n)),
        };
      });
    },
    [persist],
  );

  const attachMedia = useCallback(
    (id: string, media: StickyMedia) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id
            ? { ...n, media: [...n.media, media], updatedAt: new Date().toISOString() }
            : n,
        ),
      }));
    },
    [persist],
  );

  const detachMedia = useCallback(
    (noteId: string, mediaId: string) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === noteId
            ? {
                ...n,
                media: n.media.filter((m) => m.id !== mediaId),
                updatedAt: new Date().toISOString(),
              }
            : n,
        ),
      }));
    },
    [persist],
  );

  const addCategory = useCallback(
    (name: string, color: StickyCategoryColor) => {
      const id = newId('cat');
      persist((prev) => ({
        ...prev,
        categories: [...prev.categories, { id, name, color }],
      }));
      return id;
    },
    [persist],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<StickyCategory>) => {
      persist((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [persist],
  );

  const removeCategory = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        notes: prev.notes.map((n) => (n.categoryId === id ? { ...n, categoryId: null } : n)),
        settings: {
          ...prev.settings,
          defaultCategoryId:
            prev.settings.defaultCategoryId === id ? null : prev.settings.defaultCategoryId,
        },
      }));
    },
    [persist],
  );

  const setDefaultCategory = useCallback(
    (id: string | null) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, defaultCategoryId: id } }));
    },
    [persist],
  );

  const toggleGrid = useCallback(() => {
    persist((prev) => ({ ...prev, settings: { ...prev.settings, showGrid: !prev.settings.showGrid } }));
  }, [persist]);

  const toggleGlow = useCallback(() => {
    persist((prev) => ({ ...prev, settings: { ...prev.settings, glow: !prev.settings.glow } }));
  }, [persist]);

  const clearAllNotes = useCallback(() => {
    persist((prev) => ({ ...prev, notes: [], nextZ: 1 }));
  }, [persist]);

  const contextValue = useMemo<StickyContextValue>(
    () => ({
      data,
      hydrated,
      addNote,
      updateNote,
      removeNote,
      bringToFront,
      attachMedia,
      detachMedia,
      addCategory,
      updateCategory,
      removeCategory,
      setDefaultCategory,
      toggleGrid,
      toggleGlow,
      clearAllNotes,
    }),
    [
      data,
      hydrated,
      addNote,
      updateNote,
      removeNote,
      bringToFront,
      attachMedia,
      detachMedia,
      addCategory,
      updateCategory,
      removeCategory,
      setDefaultCategory,
      toggleGrid,
      toggleGlow,
      clearAllNotes,
    ],
  );

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const handleAddCategoryFromMenu = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    addCategory(name, newCategoryColor);
    setNewCategoryName('');
  };

  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of data.notes) {
      const key = note.categoryId ?? '__unfiled';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [data.notes]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-miami-night-deep">
        <p className="text-miami-pink-light text-sm font-medium">Sign in to use Sticky.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-miami-night-deep">
        <p className="text-miami-cyan text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <StickyContext.Provider value={contextValue}>
      <div className="min-h-screen bg-miami-night-deep text-miami-ink flex flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-miami-pink/30 bg-gradient-to-r from-miami-night-deep via-miami-surface to-miami-night shadow-[0_8px_30px_-10px_rgba(255,46,147,0.45)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
            <Link to="/sticky" className="min-w-0 flex items-center gap-3">
              <span className="shrink-0 rounded-lg bg-gradient-to-br from-miami-pink-bright to-miami-cyan p-2 ring-1 ring-white/30 shadow-lg shadow-miami-pink/30">
                <StickyNote className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-wide">
                  Sticky
                </h1>
                <p className="text-[11px] sm:text-xs text-miami-pink-light/90 truncate">
                  Neon reminders board
                </p>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-miami-pink/45 bg-miami-night/60 text-miami-pink-light hover:bg-miami-pink/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-pink"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label="Open Sticky menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-miami-night-deep/70 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!menuOpen}
          aria-label="Sticky menu"
          className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-gradient-to-b from-miami-surface via-miami-surface to-miami-night-deep border-l border-miami-pink/35 shadow-[0_0_60px_rgba(255,46,147,0.25)] flex flex-col transition-transform duration-200 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-miami-pink/25">
            <p className="text-sm font-bold tracking-widest uppercase bg-gradient-to-r from-miami-pink-light to-miami-cyan bg-clip-text text-transparent">
              Sticky menu
            </p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-miami-pink-light hover:bg-miami-pink/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-miami-pink"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <nav className="space-y-1.5" aria-label="Sticky pages">
              <NavLink
                to="/sticky"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-miami-pink/20 text-miami-pink-light border border-miami-pink/45'
                      : 'text-miami-ink/85 hover:bg-miami-pink/10 border border-transparent'
                  }`
                }
              >
                <Layers className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Board
              </NavLink>
              <NavLink
                to="/sticky/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-miami-cyan/20 text-miami-cyan border border-miami-cyan/45'
                      : 'text-miami-ink/85 hover:bg-miami-cyan/10 border border-transparent'
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Settings
              </NavLink>
            </nav>

            <section aria-labelledby="sticky-menu-categories" className="space-y-2">
              <div className="flex items-center justify-between">
                <h2
                  id="sticky-menu-categories"
                  className="text-[11px] font-bold tracking-widest uppercase text-miami-cyan"
                >
                  Note categories
                </h2>
                <span className="text-[11px] text-miami-mute">{data.categories.length}</span>
              </div>
              <ul className="space-y-1.5">
                {data.categories.map((category) => {
                  const tokens = CATEGORY_COLOR_TOKENS[category.color];
                  return (
                    <li
                      key={category.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-miami-pink/15 bg-miami-night/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${tokens.dot} shadow-[0_0_8px_currentColor]`} />
                        <span className="text-sm text-miami-ink truncate">{category.name}</span>
                      </div>
                      <span className="text-[11px] text-miami-mute">
                        {noteCounts[category.id] ?? 0}
                      </span>
                    </li>
                  );
                })}
                {data.categories.length === 0 && (
                  <li className="text-xs text-miami-mute italic px-2 py-1">
                    No categories yet — add one below.
                  </li>
                )}
              </ul>

              <div className="rounded-xl border border-miami-pink/25 bg-miami-night/55 p-3 space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-miami-pink-light">
                  New category
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Birthdays, Groceries..."
                    className="mt-1 w-full rounded-lg border border-miami-pink/30 bg-miami-night-deep px-2.5 py-1.5 text-sm text-miami-ink placeholder:text-miami-mute focus:outline-none focus:ring-2 focus:ring-miami-pink"
                  />
                </label>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-miami-cyan mb-1">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_COLOR_OPTIONS.map((opt) => {
                      const tokens = CATEGORY_COLOR_TOKENS[opt.value];
                      const active = newCategoryColor === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewCategoryColor(opt.value)}
                          className={`h-7 w-7 rounded-full ring-2 transition-all ${tokens.dot} ${
                            active
                              ? 'ring-white ring-offset-2 ring-offset-miami-night scale-110'
                              : 'ring-transparent hover:ring-white/40'
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
                  type="button"
                  onClick={handleAddCategoryFromMenu}
                  disabled={!newCategoryName.trim()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-miami-pink-bright to-miami-cyan px-3 py-2 text-sm font-bold text-white shadow-md shadow-miami-pink/30 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Add category
                </button>
              </div>
            </section>
          </div>

          <div className="p-3 border-t border-miami-pink/25 space-y-2 bg-miami-night-deep/65">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-miami-cyan/45 bg-miami-cyan/15 px-3 py-2.5 text-sm font-semibold text-miami-cyan hover:bg-miami-cyan/25"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              All apps
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-miami-pink/45 bg-miami-pink/15 px-3 py-2.5 text-sm font-semibold text-miami-pink-light hover:bg-miami-pink/25"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Back to codycodes.ca
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-miami-pink/35 px-3 py-2.5 text-sm font-semibold text-miami-pink-light hover:bg-miami-pink/15"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full">
          <Outlet />
        </main>

        <footer className="border-t border-miami-pink/15 bg-miami-night-deep/70 py-3">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 text-[11px] text-miami-mute flex items-center gap-2">
            <Trash2 className="h-3 w-3 text-miami-pink-light" aria-hidden />
            Drag any note onto the trash zone, or hit the bin button on the note, to throw it away.
          </div>
        </footer>
      </div>
    </StickyContext.Provider>
  );
}

export function StickyApp() {
  return (
    <Routes>
      <Route element={<StickyShell />}>
        <Route index element={<StickyBoard />} />
        <Route path="settings" element={<StickySettings />} />
      </Route>
    </Routes>
  );
}
