import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Sparkles, Timer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SHOWCASE_PROJECTS = [
  {
    title: 'Podium Nation Custom Apparel',
    description: 'Custom apparel for teams and events.',
    href: 'https://www.podiumnation.com',
    image: '/showcase/podiumnation.png',
  },
  {
    title: 'Grow Your Sport',
    description: 'Team development community.',
    href: 'https://www.growyoursport.com',
    image: '/showcase/growyoursport.png',
  },
  {
    title: 'Podium Lab',
    description: 'Performance training and scheduling system.',
    href: 'https://www.thepodiumlab.com',
    image: '/showcase/podiumlab.png',
  },
  {
    title: 'Podium HQ',
    description: 'All-in-one team and event management.',
    href: 'https://www.podiumhq.co',
    image: '/showcase/podiumhq.png',
  },
  {
    title: 'Wrestling Studio Pro',
    description: 'Wrestling match recording software.',
    href: 'https://www.wrestlingstudiopro.com',
    image: '/showcase/wrestlingstudiopro.png',
  },
  {
    title: 'Wrestling Dual Meet Scoreboard',
    description: 'Real-time wrestling scoreboard.',
    href: 'https://www.podiumwrestlinghq.com/',
    image: '/showcase/wrestlingdualscoreboard.png',
  },
  {
    title: 'Wrestling Round Robin Scoreboard',
    description: 'Round robin meet scoring.',
    href: 'https://www.quadmeet.ca',
    image: '/showcase/quadmeet.png',
  },
  {
    title: 'Calgary Spartan Wrestling Club',
    description: 'Club information and resources.',
    href: 'https://www.spartanwrestling.ca',
    image: '/showcase/spartanwrestling.png',
  },
  {
    title: 'Canada Wrestling HQ',
    description: 'Tournament database for Canadian wrestling.',
    href: 'https://www.wrestlingtournaments.ca',
    image: '/showcase/canadawrestlinghq.png',
  },
  {
    title: 'Fire Report Pro',
    description: 'Fire inspection management.',
    href: 'https://www.firereportpro.com',
    image: '/showcase/firereportpro.png',
  },
] as const;

export function ShellHome() {
  const { session } = useAuth();

  useEffect(() => {
    document.title = 'Codycodes.ca · Cody James Fairburn';
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="border-b border-slate-200/90 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl overflow-hidden bg-black shadow-sm ring-2 ring-cody-gold/40 ring-offset-2 ring-offset-white shrink-0">
              <img
                src="/cody-logo.png"
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-contain"
                decoding="async"
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-cody-finnish tracking-tight">Cody James Fairburn</p>
              <p className="text-xs text-slate-500">Diamond C Studios</p>
            </div>
          </a>
          <nav className="flex items-center gap-3 sm:gap-4">
            <a
              href="#products"
              className="text-sm font-medium text-cody-finnish hover:text-cody-finnish-dark transition-colors hidden sm:inline"
            >
              Products
            </a>
            {session ? (
              <Link
                to="/dashboard"
                className="text-sm font-medium text-cody-finnish hover:text-cody-finnish-dark transition-colors"
              >
                My apps
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-cody-finnish transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full">
        <section className="relative overflow-hidden border-b border-slate-100">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(to right, #003580 1px, transparent 1px),
                linear-gradient(to bottom, #003580 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-cody-gold/50 bg-cody-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cody-finnish mb-6">
              <Sparkles className="h-3.5 w-3.5 text-cody-gold-dark" strokeWidth={2.5} aria-hidden />
              Independent software
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-cody-finnish tracking-tight leading-[1.08] max-w-3xl">
              Practical tools for{' '}
              <span className="relative inline-block">
                real work
                <span
                  className="absolute left-0 -bottom-1 h-1 w-full rounded-full bg-gradient-to-r from-cody-gold via-cody-gold-light to-cody-gold"
                  aria-hidden
                />
              </span>
              .
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
              Codycodes.ca is home to the apps I build—focused, dependable, and built to save you
              time on the job.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {session ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-cody-gold px-5 py-3 text-base font-semibold text-cody-finnish-dark shadow-sm hover:bg-cody-gold-light transition-colors ring-2 ring-cody-gold-dark/25"
                >
                  My apps
                  <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-cody-gold px-5 py-3 text-base font-semibold text-cody-finnish-dark shadow-sm hover:bg-cody-gold-light transition-colors ring-2 ring-cody-gold-dark/25"
                >
                  Sign in
                  <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </Link>
              )}
              <a
                href="#products"
                className="inline-flex items-center text-base font-semibold text-cody-finnish hover:text-cody-finnish-dark underline decoration-2 decoration-cody-gold underline-offset-4"
              >
                Browse products
              </a>
            </div>
          </div>
        </section>

        <section id="products" className="scroll-mt-20 py-16 sm:py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-cody-finnish tracking-tight">
              Products
            </h2>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Start with Consalty—job and hour tracking built for crews and solo operators.
            </p>

            <ul className="mt-10 grid gap-6 sm:grid-cols-1 lg:grid-cols-1 max-w-2xl">
              <li>
                <Link
                  to="/consaltyapp"
                  className="group flex gap-5 rounded-2xl border-2 border-cody-finnish/20 bg-white p-6 shadow-sm hover:border-cody-finnish/40 hover:shadow-md transition-all"
                >
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-cody-gold/90 to-cody-gold p-3.5 ring-2 ring-cody-finnish/15 group-hover:ring-cody-finnish/30 transition-shadow">
                    <Timer className="text-cody-finnish" size={28} strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="font-bold text-cody-finnish text-xl">Consalty</h3>
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                      Job and hour tracker (Landscape Log)—log shifts, earnings, and reports in one
                      place.
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cody-finnish group-hover:gap-2 transition-all">
                      Open app
                      <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </p>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section id="showcase" className="scroll-mt-20 py-16 sm:py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-cody-finnish tracking-tight">
              More public projects
            </h2>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Other sites and tools you can try—each opens in a new tab.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SHOWCASE_PROJECTS.map((project) => (
                <a
                  key={project.href}
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-cody-finnish/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish focus-visible:ring-offset-2"
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
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-bold text-cody-finnish text-base leading-snug pr-1">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-slate-600 text-sm leading-relaxed flex-1">
                      {project.description}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cody-finnish group-hover:gap-2 transition-all">
                      Visit site
                      <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            <span className="font-semibold text-cody-finnish">Cody James Fairburn</span>
            <span className="mx-2 text-cody-gold" aria-hidden>
              ·
            </span>
            <a
              href="https://www.codycodes.ca"
              className="text-cody-finnish font-medium hover:text-cody-finnish-dark hover:underline decoration-cody-gold underline-offset-2"
            >
              codycodes.ca
            </a>
          </p>
          <p className="text-center sm:text-right">Practical software for everyday work.</p>
        </div>
      </footer>
    </div>
  );
}
