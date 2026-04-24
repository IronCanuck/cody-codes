import { Leaf, LogOut, Plus, List, FileText, DollarSign, Settings } from 'lucide-react';

export type Tab = 'log' | 'history' | 'earnings' | 'reports' | 'settings';

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  onSignOut?: () => void;
};

const tabs: { id: Tab; label: string; icon: typeof Leaf }[] = [
  { id: 'log', label: 'Log Job', icon: Plus },
  { id: 'history', label: 'History', icon: List },
  { id: 'earnings', label: 'Earnings', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Header({ active, onChange, onSignOut }: Props) {
  return (
    <header className="bg-jd-green-600 border-b-4 border-jd-yellow-400 shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-jd-yellow-400 rounded-full p-2 shadow-inner shrink-0">
              <Leaf className="text-jd-green-700" size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                Landscape Log
              </h1>
              <p className="text-jd-green-100 text-xs leading-tight">Job Tracker</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto max-w-[65vw] sm:max-w-none">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-jd-yellow-400 text-jd-green-800 shadow'
                        : 'text-white hover:bg-jd-green-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </nav>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg font-medium text-sm text-white hover:bg-jd-green-700 border border-white/20"
                title="Sign out"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
