import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, Home, LayoutGrid, List, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_LIBRARY_SCHEMES, PAYWALLED_APPS } from '../lib/member-apps';
import { loadMemberAppInsights, type AllMemberAppInsights, type AppInsight } from '../lib/member-app-insights';
import { SHOWCASE_PROJECTS } from '../lib/showcase-projects';

export function MemberDashboard() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showcaseView, setShowcaseView] = useState<'list' | 'card'>('list');
  const [appGlance, setAppGlance] = useState<AllMemberAppInsights | null>(null);

  useEffect(() => {
    document.title = 'Your apps · Cody James Fairburn';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadMemberAppInsights(session?.user?.id);
      if (!cancelled) setAppGlance(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

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
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-cody-finnish tracking-tight truncate">Your apps</h1>
            {session?.user?.email && (
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-cody-finnish"
            >
              codycodes.ca
            </Link>
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
          </div>
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
        className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-3rem,20rem)] bg-white border-l border-slate-200 shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
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
            const s = APP_LIBRARY_SCHEMES[app.scheme];
            return (
              <Link
                key={app.id}
                to={app.path}
                className={`flex gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${s.menuLink}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.menuIconWrap} ${s.menuIconColor}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`font-semibold text-sm block ${s.menuTitle}`}>{app.title}</span>
                  <span className="text-xs text-slate-600 line-clamp-2 mt-0.5">{app.description}</span>
                </span>
                <ArrowRight
                  className={`h-4 w-4 shrink-0 mt-1 ${s.menuArrow}`}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-2">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-cody-gold/40 bg-cody-gold/10 px-3 py-2.5 text-sm font-semibold text-cody-finnish hover:bg-cody-gold/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish"
          >
            <Home className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Back to codycodes.ca
          </Link>
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

        <section aria-labelledby="at-a-glance-heading" className="mt-10">
          <h3 id="at-a-glance-heading" className="text-lg font-bold text-cody-finnish">
            At a glance
          </h3>
          <p className="mt-1 text-slate-600 text-sm max-w-xl">
            Reminders and quick stats from your apps. Open an app to update the details.
          </p>
          <ul className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {PAYWALLED_APPS.map((app) => {
              const s = APP_LIBRARY_SCHEMES[app.scheme];
              const Icon = app.icon;
              const insight: AppInsight | undefined = appGlance?.[app.id];
              return (
                <li key={app.id}>
                  <Link
                    to={app.path}
                    className={`block rounded-2xl border-2 bg-white p-4 shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-full ${s.card}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex shrink-0 items-center justify-center rounded-lg p-2.5 ring-2 ${s.cardIconWrap}`}
                      >
                        <Icon className={s.cardIcon} size={22} strokeWidth={app.iconStrokeWidth ?? 2} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-bold text-sm ${s.cardTitle}`}>{app.title}</h4>
                        {insight ? (
                          <>
                            <dl className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600">
                              {insight.lines.map(
                                (row, i) =>
                                  row.value && (
                                    <div
                                      key={i}
                                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
                                    >
                                      {row.label ? (
                                        <>
                                          <dt className="text-slate-500 shrink-0">{row.label}</dt>
                                          <dd className="text-slate-800 font-medium text-right">{row.value}</dd>
                                        </>
                                      ) : (
                                        <dd className="text-slate-800 font-medium w-full">{row.value}</dd>
                                      )}
                                    </div>
                                  ),
                              )}
                            </dl>
                            {insight.reminder && (
                              <p
                                className={`mt-2 text-xs sm:text-sm font-medium leading-snug ${s.cardCta} opacity-90`}
                              >
                                {insight.reminder}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-slate-500 text-sm">Loading&hellip;</p>
                        )}
                      </div>
                    </div>
                    <p className={`mt-3 text-xs font-semibold ${s.cardCta} flex items-center gap-1`}>
                      Open app
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="app-library-heading" className="mt-10">
          <h3 id="app-library-heading" className="text-lg font-bold text-cody-finnish">
            App library
          </h3>
          <ul className="mt-4 grid gap-4">
            {PAYWALLED_APPS.map((app) => {
              const Icon = app.icon;
              const s = APP_LIBRARY_SCHEMES[app.scheme];
              return (
                <li key={app.id}>
                  <Link
                    to={app.path}
                    className={`group flex gap-4 rounded-2xl border-2 bg-white p-5 shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${s.card}`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-xl p-3 ring-2 transition-shadow ${s.cardIconWrap}`}
                    >
                      <Icon className={s.cardIcon} size={26} strokeWidth={app.iconStrokeWidth ?? 2} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className={`font-bold text-lg ${s.cardTitle}`}>{app.title}</h4>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed">{app.description}</p>
                      <p
                        className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all ${s.cardCta}`}
                      >
                        Open
                        <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="showcase-heading" className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h3 id="showcase-heading" className="text-lg font-bold text-cody-finnish">
                Showcase website suite
              </h3>
              <p className="mt-1 text-slate-600 text-sm sm:text-base max-w-xl">
                Public sites and portfolio work—each link opens in a new tab.
              </p>
            </div>
            <div
              className="inline-flex shrink-0 self-start rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
              role="group"
              aria-label="Showcase layout"
            >
              <button
                type="button"
                onClick={() => setShowcaseView('list')}
                aria-pressed={showcaseView === 'list'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-1 ${
                  showcaseView === 'list'
                    ? 'bg-cody-finnish text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => setShowcaseView('card')}
                aria-pressed={showcaseView === 'card'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-1 ${
                  showcaseView === 'card'
                    ? 'bg-cody-finnish text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Card
              </button>
            </div>
          </div>

          {showcaseView === 'list' ? (
            <ul className="mt-6 grid gap-4">
              {SHOWCASE_PROJECTS.map((project) => (
                <li key={project.href}>
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-4 rounded-2xl border-2 border-cody-finnish/15 bg-white p-5 shadow-sm hover:border-cody-finnish/35 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
                  >
                    <div className="shrink-0 w-[5.5rem] sm:w-28 h-[4.5rem] sm:h-24 rounded-xl overflow-hidden ring-2 ring-cody-finnish/10 group-hover:ring-cody-finnish/25 transition-shadow bg-slate-100">
                      <img
                        src={project.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="font-bold text-cody-finnish text-lg">{project.title}</h4>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed">{project.description}</p>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cody-finnish group-hover:gap-2 transition-all">
                        Visit site
                        <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {SHOWCASE_PROJECTS.map((project) => (
                <a
                  key={project.href}
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border-2 border-cody-finnish/15 bg-white shadow-sm transition-all hover:border-cody-finnish/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
                >
                  <div className="relative aspect-[5/3] w-full overflow-hidden border-b border-slate-100 bg-slate-200">
                    <img
                      src={project.image}
                      alt={`${project.title} — homepage preview`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <h4 className="font-bold text-cody-finnish text-base leading-snug pr-1">{project.title}</h4>
                    <p className="mt-2 text-slate-600 text-sm leading-relaxed flex-1">
                      {project.description}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cody-finnish group-hover:gap-2 transition-all">
                      Visit site
                      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
