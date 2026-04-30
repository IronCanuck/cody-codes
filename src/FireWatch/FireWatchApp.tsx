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
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { defaultSnapshot, loadSnapshot, newId, saveSnapshot } from './storage';
import { FireWatchContext, type FireWatchContextValue } from './FireWatchContext';
import { FireWatchDashboard } from './FireWatchDashboard';
import { FireWatchSettings } from './FireWatchSettings';
import type { Firefighter, FireWatchSnapshot } from './types';

function FireWatchShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<FireWatchSnapshot>(() => defaultSnapshot());

  useEffect(() => {
    document.title = 'Fire Watch · Cody James Fairburn';
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
    (next: FireWatchSnapshot | ((prev: FireWatchSnapshot) => FireWatchSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const addFirefighter = useCallback(
    (input: Omit<Firefighter, 'id'>): string => {
      const id = newId('ff');
      persist((prev) => ({
        ...prev,
        firefighters: [...prev.firefighters, { id, ...input }],
      }));
      return id;
    },
    [persist],
  );

  const updateFirefighter = useCallback(
    (id: string, patch: Partial<Omit<Firefighter, 'id'>>) => {
      persist((prev) => ({
        ...prev,
        firefighters: prev.firefighters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
    },
    [persist],
  );

  const removeFirefighter = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        firefighters: prev.firefighters.filter((f) => f.id !== id),
      }));
    },
    [persist],
  );

  const ctxValue = useMemo<FireWatchContextValue>(
    () => ({ data, hydrated, addFirefighter, updateFirefighter, removeFirefighter }),
    [data, hydrated, addFirefighter, updateFirefighter, removeFirefighter],
  );

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-firewatch-coal">
        <p className="text-firewatch-spark text-sm font-medium">Sign in to use Fire Watch.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-firewatch-coal">
        <p className="text-firewatch-spark-light text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <FireWatchContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-firewatch-cream text-firewatch-ink flex flex-col">
        <header className="sticky top-0 z-30 border-b border-firewatch-flame/30 bg-gradient-to-r from-firewatch-coal via-firewatch-ash to-firewatch-smoke text-firewatch-cream shadow-[0_8px_30px_-10px_rgba(216,67,21,0.6)]">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
            <Link to="/fire-watch" className="min-w-0 flex items-center gap-3">
              <span className="shrink-0 rounded-lg bg-gradient-to-br from-firewatch-spark via-firewatch-ember to-firewatch-flame-deep p-2 ring-1 ring-firewatch-spark/40 shadow-lg shadow-firewatch-flame/40">
                <Flame className="h-5 w-5 text-firewatch-coal" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base text-firewatch-cream tracking-wide">
                  Fire Watch
                </h1>
                <p className="text-[11px] sm:text-xs text-firewatch-spark-light/85 truncate">
                  Calgary FD shift tracker
                </p>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-firewatch-flame/45 bg-firewatch-coal/55 text-firewatch-spark-light hover:bg-firewatch-flame/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-spark"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label="Open Fire Watch menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-firewatch-coal/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!menuOpen}
          aria-label="Fire Watch menu"
          className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-gradient-to-b from-firewatch-coal via-firewatch-ash to-firewatch-smoke text-firewatch-cream border-l border-firewatch-flame/30 shadow-[0_0_60px_rgba(255,87,34,0.3)] flex flex-col transition-transform duration-200 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-firewatch-flame/30">
            <p className="text-sm font-bold tracking-widest uppercase bg-gradient-to-r from-firewatch-spark via-firewatch-ember to-firewatch-spark-light bg-clip-text text-transparent">
              Fire Watch menu
            </p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-firewatch-spark-light hover:bg-firewatch-flame/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-firewatch-spark"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1.5" aria-label="Fire Watch pages">
            <NavLink
              to="/fire-watch"
              end
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-firewatch-flame/25 text-firewatch-spark-light border border-firewatch-flame/55'
                    : 'text-firewatch-cream/85 hover:bg-firewatch-flame/15 border border-transparent'
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Dashboard
            </NavLink>
            <NavLink
              to="/fire-watch/settings"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-firewatch-spark/20 text-firewatch-spark-light border border-firewatch-spark/55'
                    : 'text-firewatch-cream/85 hover:bg-firewatch-spark/15 border border-transparent'
                }`
              }
            >
              <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Crew settings
            </NavLink>

            <div className="mt-5 rounded-xl border border-firewatch-flame/25 bg-firewatch-coal/55 p-3 text-xs text-firewatch-cream/85 leading-relaxed">
              <p className="font-bold text-firewatch-spark-light mb-1">Tip</p>
              Add the firefighters that ride on each shift (A, B, C, D) and their names will show
              up next to every upcoming date.
            </div>
          </nav>

          <div className="p-3 border-t border-firewatch-flame/30 space-y-2 bg-firewatch-coal/65">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-firewatch-spark/45 bg-firewatch-spark/15 px-3 py-2.5 text-sm font-semibold text-firewatch-spark-light hover:bg-firewatch-spark/25"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              All apps
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-firewatch-flame/45 bg-firewatch-flame/15 px-3 py-2.5 text-sm font-semibold text-firewatch-spark-light hover:bg-firewatch-flame/25"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Back to codycodes.ca
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-firewatch-rust/45 px-3 py-2.5 text-sm font-semibold text-firewatch-spark-light hover:bg-firewatch-rust/15"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    </FireWatchContext.Provider>
  );
}

export function FireWatchApp() {
  return (
    <Routes>
      <Route element={<FireWatchShell />}>
        <Route index element={<FireWatchDashboard />} />
        <Route path="settings" element={<FireWatchSettings />} />
      </Route>
    </Routes>
  );
}
