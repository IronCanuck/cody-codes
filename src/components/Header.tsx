import {
  Leaf,
  LogOut,
  Plus,
  List,
  FileText,
  DollarSign,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

export const CONSALTY_APP_BASE = '/consaltyapp';

type Props = {
  onSignOut?: () => void;
};

const navItems: { to: string; label: string; icon: typeof Leaf; end?: boolean }[] = [
  { to: CONSALTY_APP_BASE, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `${CONSALTY_APP_BASE}/log`, label: 'Log Job', icon: Plus },
  { to: `${CONSALTY_APP_BASE}/history`, label: 'History', icon: List },
  { to: `${CONSALTY_APP_BASE}/earnings`, label: 'Earnings', icon: DollarSign },
  { to: `${CONSALTY_APP_BASE}/reports`, label: 'Reports', icon: FileText },
  { to: `${CONSALTY_APP_BASE}/settings`, label: 'Settings', icon: Settings },
];

export function Header({ onSignOut }: Props) {
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
                Landscape Log
              </h1>
              <p className="text-jd-green-100 text-xs leading-tight">Job Tracker</p>
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto max-w-[65vw] sm:max-w-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-jd-yellow-400 text-jd-green-800 shadow'
                          : 'text-white hover:bg-jd-green-700'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg font-medium text-sm text-white hover:bg-jd-green-700 border border-white/20"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
