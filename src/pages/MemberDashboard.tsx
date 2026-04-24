import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PAYWALLED_APPS } from '../lib/member-apps';

export function MemberDashboard() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Your apps · Cody James Fairburn';
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      closeBtnRef.current?.focus();
    }
  }, [menuOpen]);

  const handleSignOut = useCallback(async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  }, [navigate, signOut]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-cody-finnish hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-cody-finnish tracking-tight truncate">
                Your apps
              </h1>
              {session?.user?.email && (
                <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
              )}
            </div>
          </div>
          <Link
            to="/"
            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-cody-finnish shrink-0"
          >
            codycodes.ca
          </Link>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="Apps menu"
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,20rem)] bg-white border-r border-slate-200 shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
          <p className="text-sm font-bold text-cody-finnish">Apps</p>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Paywalled apps">
          {PAYWALLED_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.path}
                className="flex gap-3 rounded-xl border border-transparent px-3 py-3 hover:bg-cody-finnish/5 hover:border-cody-finnish/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cody-gold/15 text-cody-finnish">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-cody-finnish text-sm block">{app.title}</span>
                  <span className="text-xs text-slate-600 line-clamp-2 mt-0.5">{app.description}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-cody-finnish mt-1 opacity-60"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish"
          >
            Sign out
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-cody-gold-dark mb-2">
          Cody James Fairburn
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-cody-finnish tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-xl">
          Open an app from the menu or choose one below. More tools will show up here as they ship.
        </p>

        <ul className="mt-10 grid gap-4">
          {PAYWALLED_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <li key={app.id}>
                <Link
                  to={app.path}
                  className="group flex gap-4 rounded-2xl border-2 border-cody-finnish/15 bg-white p-5 shadow-sm hover:border-cody-finnish/35 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
                >
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-cody-gold/90 to-cody-gold p-3 ring-2 ring-cody-finnish/10 group-hover:ring-cody-finnish/25 transition-shadow">
                    <Icon className="text-cody-finnish" size={26} strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="font-bold text-cody-finnish text-lg">{app.title}</h3>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">{app.description}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cody-finnish group-hover:gap-2 transition-all">
                      Open
                      <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
