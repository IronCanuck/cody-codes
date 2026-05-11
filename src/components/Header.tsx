import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Leaf,
  LogOut,
  Plus,
  List,
  FileText,
  DollarSign,
  Settings,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCompanies } from '../contexts/CompanyContext';

export const CONSALTY_APP_BASE = '/consaltyapp';

/** Member hub (all apps) after sign-in */
const MEMBER_HUB_PATH = '/dashboard';

type Props = {
  onSignOut?: () => void;
};

const navItems: { to: string; label: string; icon: typeof Leaf; end?: boolean }[] = [
  { to: CONSALTY_APP_BASE, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `${CONSALTY_APP_BASE}/log`, label: 'Log Job', icon: Plus },
  { to: `${CONSALTY_APP_BASE}/earnings`, label: 'Earnings', icon: DollarSign },
  { to: `${CONSALTY_APP_BASE}/reports`, label: 'Reports', icon: FileText },
  { to: `${CONSALTY_APP_BASE}/history`, label: 'History', icon: List },
  { to: `${CONSALTY_APP_BASE}/companies`, label: 'Companies', icon: Building2 },
  { to: `${CONSALTY_APP_BASE}/settings`, label: 'Settings', icon: Settings },
];

function drawerLinkClass(isActive: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium text-sm transition-all ${
    isActive
      ? 'bg-jd-yellow-400 text-jd-green-800 shadow'
      : 'text-white hover:bg-jd-green-700/80'
  }`;
}

function CompanySwitcher() {
  const { companies, activeCompany, setActiveCompanyId } = useCompanies();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = activeCompany?.name ?? (companies.length === 0 ? 'Add a company' : 'Pick company');

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 max-w-[10rem] sm:max-w-[14rem] rounded-lg border border-jd-yellow-400/60 bg-jd-green-700/60 hover:bg-jd-green-700 text-white px-2.5 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:ring-2 focus-visible:ring-jd-yellow-400"
        title="Switch company"
      >
        <Building2 size={16} aria-hidden className="shrink-0 text-jd-yellow-300" />
        <span className="truncate">{label}</span>
        <ChevronDown size={14} aria-hidden className="shrink-0 opacity-80" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 max-h-[60vh] overflow-y-auto rounded-lg border border-jd-green-200 bg-white shadow-xl ring-1 ring-black/5 z-50"
        >
          {companies.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              No companies yet. Add one to get started.
            </p>
          ) : (
            <ul className="py-1">
              {companies.map((c) => {
                const active = c.id === activeCompany?.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setActiveCompanyId(c.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm ${
                        active
                          ? 'bg-jd-green-50 text-jd-green-800 font-semibold'
                          : 'text-gray-800 hover:bg-jd-green-50/60'
                      }`}
                    >
                      <span className="flex-1 truncate">{c.name}</span>
                      {active ? <Check size={16} aria-hidden className="text-jd-green-600" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-gray-100">
            <Link
              to={`${CONSALTY_APP_BASE}/companies`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-jd-green-700 hover:bg-jd-green-50"
            >
              <Plus size={16} aria-hidden />
              Manage companies
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({ onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header className="bg-jd-green-600 border-b-4 border-jd-yellow-400 shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          <Link
            to={CONSALTY_APP_BASE}
            className="flex items-center gap-3 min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-jd-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-jd-green-600"
          >
            <div className="bg-jd-yellow-400 rounded-full p-2 shadow-inner shrink-0">
              <Leaf className="text-jd-green-700" size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                Consalty
              </h1>
              <p className="text-jd-green-100 text-xs leading-tight">Job Tracker</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <CompanySwitcher />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2.5 rounded-lg text-white hover:bg-jd-green-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-jd-yellow-400"
              aria-expanded={menuOpen}
              aria-controls="landscape-log-nav-menu"
              aria-label="Open menu"
            >
              <Menu size={26} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div
            id="landscape-log-nav-menu"
            className="absolute right-0 top-0 flex h-full w-full max-w-[min(100%,20rem)] flex-col border-l-4 border-jd-yellow-400 bg-jd-green-600 shadow-2xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-jd-green-500 px-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-jd-green-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-jd-yellow-400"
                aria-label="Close menu"
              >
                <X size={24} aria-hidden />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => drawerLinkClass(isActive)}
                  >
                    <Icon size={20} className="shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
              <NavLink
                to={MEMBER_HUB_PATH}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => drawerLinkClass(isActive)}
              >
                <ArrowLeft size={20} className="shrink-0" />
                Return to Cody Codes
              </NavLink>
            </nav>
            {onSignOut && (
              <div className="shrink-0 border-t border-jd-green-500 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-3 font-medium text-sm text-white hover:bg-jd-green-700"
                >
                  <LogOut size={20} aria-hidden />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
