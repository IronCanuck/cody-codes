import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  BellOff,
  Check,
  Download,
  Flame,
  ListChecks,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const STORAGE_VERSION = 2 as const;

type Cadence = 'weekly' | 'monthly' | 'yearly';

type FlameAccent = 'red' | 'orange' | 'yellow' | 'gold';

type Chore = {
  id: string;
  title: string;
  notes: string;
  cadence: Cadence;
  /** 0–6, Sun–Sat (Date.getDay()) — weekly only */
  weekday: number;
  /** 1–31 — monthly & yearly */
  dayOfMonth: number;
  /** 1–12 — yearly only */
  month: number;
  reminderTime: string;
  categoryId: string | null;
  accent: FlameAccent;
  sortOrder: number;
  lastCompletedAt: string | null;
  snoozeUntil: string | null;
  /** ISO of due instant user dismissed for this cycle */
  silencedDueAt: string | null;
};

type Category = {
  id: string;
  label: string;
  accent: FlameAccent;
};

type ChoriosSettings = {
  reminderIntervalSec: number;
  defaultReminderTime: string;
  systemNotificationsEnabled: boolean;
  groupByCategory: boolean;
};

type PersistedSnapshot = {
  version: typeof STORAGE_VERSION;
  chores: Chore[];
  categories: Category[];
  settings: ChoriosSettings;
};

const DEFAULT_SETTINGS: ChoriosSettings = {
  reminderIntervalSec: 60,
  defaultReminderTime: '09:00',
  systemNotificationsEnabled: false,
  groupByCategory: true,
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ACCENT_RING: Record<FlameAccent, string> = {
  red: 'ring-flames-red border-flames-red/40',
  orange: 'ring-flames-orange border-flames-orange/40',
  yellow: 'ring-flames-yellow border-flames-yellow/40',
  gold: 'ring-amber-400 border-amber-400/50',
};

const ACCENT_BG: Record<FlameAccent, string> = {
  red: 'bg-flames-red/15 text-flames-red-dark',
  orange: 'bg-flames-orange/15 text-flames-orange-dark',
  yellow: 'bg-flames-yellow/25 text-amber-900',
  gold: 'bg-amber-100/80 text-amber-900',
};

const ACCENT_DOT: Record<FlameAccent, string> = {
  red: 'bg-flames-red',
  orange: 'bg-flames-orange',
  yellow: 'bg-flames-yellow',
  gold: 'bg-amber-400',
};

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ch-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function storageKeyForUser(userId: string) {
  return `chorios:${userId}`;
}

function parseHm(reminderTime: string): { h: number; m: number } {
  const [a, b] = reminderTime.split(':').map((x) => parseInt(x, 10));
  const h = Number.isFinite(a) ? Math.min(23, Math.max(0, a)) : 9;
  const m = Number.isFinite(b) ? Math.min(59, Math.max(0, b)) : 0;
  return { h, m };
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampDom(year: number, monthIndex0: number, dom: number): number {
  const max = daysInMonth(year, monthIndex0);
  return Math.min(Math.max(1, dom), max);
}

/** First schedule strictly after `after` */
function getNextDueInstantAfter(chore: Chore, after: Date): Date {
  const { h, m } = parseHm(chore.reminderTime);
  const t = after.getTime();

  if (chore.cadence === 'weekly') {
    for (let i = 0; i < 8; i++) {
      const d = new Date(after);
      d.setDate(after.getDate() + i);
      d.setHours(h, m, 0, 0);
      if (d.getDay() === chore.weekday && d.getTime() > t) return d;
    }
    const d = new Date(after);
    d.setDate(after.getDate() + 8);
    d.setHours(h, m, 0, 0);
    return d;
  }

  if (chore.cadence === 'monthly') {
    let y = after.getFullYear();
    let mo = after.getMonth();
    for (let iter = 0; iter < 36; iter++) {
      const dom = clampDom(y, mo, chore.dayOfMonth);
      const d = new Date(y, mo, dom, h, m, 0, 0);
      if (d.getTime() > t) return d;
      mo += 1;
      if (mo > 11) {
        mo = 0;
        y += 1;
      }
    }
    return new Date(y, mo, 1, h, m, 0, 0);
  }

  const month1 = chore.month;
  let y = after.getFullYear();
  for (let iter = 0; iter < 400; iter++) {
    const dom = clampDom(y, month1 - 1, chore.dayOfMonth);
    const d = new Date(y, month1 - 1, dom, h, m, 0, 0);
    if (d.getTime() > t) return d;
    y += 1;
  }
  return new Date(y, month1 - 1, 1, h, m, 0, 0);
}

function defaultSnapshot(): PersistedSnapshot {
  return {
    version: STORAGE_VERSION,
    chores: [],
    categories: [
      { id: newId(), label: 'Home', accent: 'red' },
      { id: newId(), label: 'Outdoor', accent: 'orange' },
    ],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadSnapshot(userId: string | undefined): PersistedSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.chores)) return null;
    return {
      ...defaultSnapshot(),
      ...parsed,
      categories: Array.isArray(parsed.categories) ? parsed.categories : defaultSnapshot().categories,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string | undefined, data: PersistedSnapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // quota
  }
}

function formatDueLabel(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ReminderToast = {
  id: string;
  choreId: string;
  message: string;
  dueIso: string;
};

export function ChoriosApp() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [data, setData] = useState<PersistedSnapshot>(() => defaultSnapshot());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Cadence>('weekly');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteChoreId, setDeleteChoreId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ReminderToast[]>([]);
  const firedKeysRef = useRef<Set<string>>(new Set());

  const persist = useCallback(
    (next: PersistedSnapshot | ((prev: PersistedSnapshot) => PersistedSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  useEffect(() => {
    document.title = 'Chorios · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    if (stored) setData(stored);
    else setData(defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  const choresForTab = useMemo(() => {
    return data.chores
      .filter((c) => c.cadence === tab)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [data.chores, tab]);

  const checkDue = useCallback(() => {
    if (!hydrated) return;
    const now = new Date();
    const sysOn = data.settings.systemNotificationsEnabled;
    const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted';

    for (const chore of data.chores) {
      const after = new Date(chore.lastCompletedAt || 0);
      const nextDue = getNextDueInstantAfter(chore, after);
      if (now < nextDue) continue;
      if (chore.snoozeUntil && now < new Date(chore.snoozeUntil)) continue;
      if (chore.silencedDueAt === nextDue.toISOString()) continue;

      const key = `${chore.id}:${nextDue.toISOString()}`;
      if (!firedKeysRef.current.has(key)) {
        firedKeysRef.current.add(key);
        const msg = `${chore.title} — due ${formatDueLabel(nextDue)}`;
        setToasts((prev) => {
          if (prev.some((t) => t.choreId === chore.id && t.dueIso === nextDue.toISOString())) return prev;
          const next = [...prev, { id: newId(), choreId: chore.id, message: msg, dueIso: nextDue.toISOString() }];
          return next.slice(-5);
        });
        if (sysOn && canNotify) {
          try {
            new Notification('Chorios reminder', { body: msg, tag: key });
          } catch {
            // ignore
          }
        }
      }
    }
  }, [data.chores, data.settings.systemNotificationsEnabled, hydrated]);

  useEffect(() => {
    checkDue();
    const ms = Math.max(15, data.settings.reminderIntervalSec) * 1000;
    const id = window.setInterval(checkDue, ms);
    return () => window.clearInterval(id);
  }, [checkDue, data.settings.reminderIntervalSec]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') checkDue();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [checkDue]);

  const removeToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const snoozeChore = (choreId: string, dueIso: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    persist((d) => ({
      ...d,
      chores: d.chores.map((c) =>
        c.id === choreId ? { ...c, snoozeUntil: until, silencedDueAt: null } : c,
      ),
    }));
    setToasts((t) => t.filter((x) => !(x.choreId === choreId && x.dueIso === dueIso)));
  };

  const dismissToastOnly = (choreId: string, dueIso: string) => {
    persist((d) => ({
      ...d,
      chores: d.chores.map((c) => (c.id === choreId ? { ...c, silencedDueAt: dueIso } : c)),
    }));
    setToasts((t) => t.filter((x) => !(x.choreId === choreId && x.dueIso === dueIso)));
  };

  const completeChore = (choreId: string, dueIso: string | null) => {
    const now = new Date().toISOString();
    persist((d) => ({
      ...d,
      chores: d.chores.map((c) =>
        c.id === choreId
          ? { ...c, lastCompletedAt: now, snoozeUntil: null, silencedDueAt: null }
          : c,
      ),
    }));
    for (const k of [...firedKeysRef.current]) {
      if (k.startsWith(`${choreId}:`)) firedKeysRef.current.delete(k);
    }
    if (dueIso) {
      setToasts((t) => t.filter((x) => !(x.choreId === choreId && x.dueIso === dueIso)));
    } else {
      setToasts((t) => t.filter((x) => x.choreId !== choreId));
    }
  };

  const moveChore = (chore: Chore, dir: -1 | 1) => {
    const list = choresForTab;
    const idx = list.findIndex((c) => c.id === chore.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= list.length) return;
    const other = list[j]!;
    persist((d) => ({
      ...d,
      chores: d.chores.map((c) => {
        if (c.id === chore.id) return { ...c, sortOrder: other.sortOrder };
        if (c.id === other.id) return { ...c, sortOrder: chore.sortOrder };
        return c;
      }),
    }));
  };

  const addCategory = (label: string) => {
    const l = label.trim();
    if (!l) return;
    persist((d) => ({
      ...d,
      categories: [...d.categories, { id: newId(), label: l, accent: 'orange' }],
    }));
  };

  const deleteCategory = (id: string) => {
    persist((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      chores: d.chores.map((c) => (c.categoryId === id ? { ...c, categoryId: null } : c)),
    }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chorios-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PersistedSnapshot;
        if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.chores)) {
          window.alert('Invalid Chorios backup file.');
          return;
        }
        persist({
          ...defaultSnapshot(),
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        });
      } catch {
        window.alert('Could not read backup.');
      }
    };
    reader.readAsText(file);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flames-surface">
        <p className="text-flames-red-dark text-sm font-medium">Sign in to use Chorios.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flames-surface">
        <p className="text-flames-orange-dark text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-flames-surface text-flames-dark flex flex-col">
      <header className="sticky top-0 z-30 border-b border-flames-orange/30 bg-gradient-to-r from-flames-red via-flames-orange to-flames-yellow text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0 rounded-lg bg-black/15 p-1.5 ring-1 ring-white/25">
              <Flame className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">Chorios</h1>
              <p className="text-[10px] sm:text-xs text-white/85 truncate hidden sm:block">
                Weekly, monthly & yearly chores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-white/40 p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Settings"
            >
              <Settings2 className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-white/95 hover:text-white border border-white/40 rounded-lg px-2 sm:px-3 py-1.5 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">Apps</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 flex-1 flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Chore cadence"
          className="flex rounded-xl border border-flames-orange/25 bg-flames-cream p-1 shadow-sm"
        >
          {(['weekly', 'monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
              className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold capitalize transition-colors ${
                tab === c
                  ? 'bg-gradient-to-br from-flames-red to-flames-orange text-white shadow'
                  : 'text-flames-dark/70 hover:bg-white/80'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingChore(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-flames-red text-white px-4 py-2 text-sm font-semibold shadow hover:bg-flames-red-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-flames-orange focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add chore
          </button>
        </div>

        {choresForTab.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-flames-orange/35 bg-white/60 py-12 px-4 text-center">
            <ListChecks className="h-10 w-10 mx-auto text-flames-orange mb-3" strokeWidth={1.75} />
            <p className="text-flames-dark font-medium">No {tab} chores yet</p>
            <p className="text-sm text-flames-dark/65 mt-1">Add one to get reminders on your schedule.</p>
          </div>
        ) : (
          <ChoreListGrouped
            chores={choresForTab}
            categories={data.categories}
            groupByCategory={data.settings.groupByCategory}
            onEdit={(c) => {
              setEditingChore(c);
              setCreating(false);
            }}
            onDelete={setDeleteChoreId}
            onMove={moveChore}
            onComplete={(c) => completeChore(c.id, null)}
          />
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-50 flex flex-col gap-2 sm:left-auto sm:right-5 sm:w-96 max-h-[50vh] overflow-y-auto pointer-events-auto">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="animate-slide-in rounded-xl border-l-4 border-flames-red bg-white shadow-xl ring-1 ring-flames-orange/20 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <AlarmClock className="h-5 w-5 text-flames-red shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-sm font-medium text-flames-dark flex-1">{t.message}</p>
                <button
                  type="button"
                  onClick={() => {
                    dismissToastOnly(t.choreId, t.dueIso);
                    removeToast(t.id);
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                  aria-label="Dismiss reminder"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    completeChore(t.choreId, t.dueIso);
                    removeToast(t.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-flames-red text-white text-xs font-semibold px-2.5 py-1.5 hover:bg-flames-red-dark"
                >
                  <Check className="h-3.5 w-3.5" />
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => snoozeChore(t.choreId, t.dueIso, 15)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-flames-orange/40 text-flames-orange-dark hover:bg-flames-orange/10"
                >
                  15 min
                </button>
                <button
                  type="button"
                  onClick={() => snoozeChore(t.choreId, t.dueIso, 60)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-flames-orange/40 text-flames-orange-dark hover:bg-flames-orange/10"
                >
                  1 hr
                </button>
                <button
                  type="button"
                  onClick={() => snoozeChore(t.choreId, t.dueIso, 24 * 60)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-flames-yellow/50 text-amber-900 hover:bg-flames-yellow/20"
                >
                  Tomorrow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editingChore) && (
        <ChoreModal
          chore={editingChore}
          cadenceDefault={tab}
          categories={data.categories}
          defaultReminderTime={data.settings.defaultReminderTime}
          onClose={() => {
            setCreating(false);
            setEditingChore(null);
          }}
          onSave={(draft) => {
            if (editingChore) {
              persist((d) => ({
                ...d,
                chores: d.chores.map((c) => (c.id === draft.id ? draft : c)),
              }));
            } else {
              const maxOrder =
                data.chores.filter((c) => c.cadence === draft.cadence).length > 0
                  ? Math.max(...data.chores.filter((c) => c.cadence === draft.cadence).map((c) => c.sortOrder))
                  : -1;
              persist((d) => ({
                ...d,
                chores: [...d.chores, { ...draft, sortOrder: maxOrder + 1 }],
              }));
            }
            setCreating(false);
            setEditingChore(null);
          }}
        />
      )}

      {deleteChoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-flames-orange/20">
            <p className="font-semibold text-flames-dark">Delete this chore?</p>
            <p className="text-sm text-slate-600 mt-1">This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteChoreId(null)}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  persist((d) => ({
                    ...d,
                    chores: d.chores.filter((c) => c.id !== deleteChoreId),
                  }));
                  setDeleteChoreId(null);
                }}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-flames-red text-white hover:bg-flames-red-dark"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          settings={data.settings}
          categories={data.categories}
          onClose={() => setSettingsOpen(false)}
          onSaveSettings={(s) => persist((d) => ({ ...d, settings: s }))}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onRequestNotificationPermission={async () => {
            if (typeof Notification === 'undefined') return 'unsupported';
            if (Notification.permission === 'granted') return 'granted';
            if (Notification.permission === 'denied') return 'denied';
            const r = await Notification.requestPermission();
            return r;
          }}
          onExport={exportJson}
          onImport={importJson}
          onClearAll={() => {
            if (window.confirm('Erase all Chorios data for this account on this device?')) {
              persist(defaultSnapshot());
            }
          }}
        />
      )}
    </div>
  );
}

function ChoreListGrouped({
  chores,
  categories,
  groupByCategory,
  onEdit,
  onDelete,
  onMove,
  onComplete,
}: {
  chores: Chore[];
  categories: Category[];
  groupByCategory: boolean;
  onEdit: (c: Chore) => void;
  onDelete: (id: string) => void;
  onMove: (c: Chore, dir: -1 | 1) => void;
  onComplete: (c: Chore) => void;
}) {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  if (!groupByCategory) {
    return (
      <ul className="space-y-2">
        {chores.map((c) => (
          <ChoreRow
            key={c.id}
            chore={c}
            category={c.categoryId ? catMap.get(c.categoryId) : undefined}
            onEdit={() => onEdit(c)}
            onDelete={() => onDelete(c.id)}
            onMove={(dir) => onMove(c, dir)}
            onComplete={() => onComplete(c)}
          />
        ))}
      </ul>
    );
  }

  const groups = new Map<string | null, Chore[]>();
  for (const c of chores) {
    const k = c.categoryId;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  const keys = [...groups.keys()].sort((a, b) => {
    const la = a ? catMap.get(a)?.label ?? '' : '';
    const lb = b ? catMap.get(b)?.label ?? '' : '';
    if (a === null) return 1;
    if (b === null) return -1;
    return la.localeCompare(lb);
  });

  return (
    <div className="space-y-6">
      {keys.map((key) => {
        const list = groups.get(key)!;
        const label = key ? catMap.get(key)?.label ?? 'Category' : 'Uncategorized';
        const acc = key ? catMap.get(key)?.accent : undefined;
        return (
          <section key={key ?? 'none'}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-flames-orange-dark mb-2 flex items-center gap-2">
              {acc && <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[acc]}`} aria-hidden />}
              {label}
            </h2>
            <ul className="space-y-2">
              {list.map((c) => (
                <ChoreRow
                  key={c.id}
                  chore={c}
                  category={c.categoryId ? catMap.get(c.categoryId) : undefined}
                  onEdit={() => onEdit(c)}
                  onDelete={() => onDelete(c.id)}
                  onMove={(dir) => onMove(c, dir)}
                  onComplete={() => onComplete(c)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ChoreRow({
  chore,
  category,
  onEdit,
  onDelete,
  onMove,
  onComplete,
}: {
  chore: Chore;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onComplete: () => void;
}) {
  const after = new Date(chore.lastCompletedAt || 0);
  const nextDue = getNextDueInstantAfter(chore, after);
  const schedule =
    chore.cadence === 'weekly'
      ? `${WEEKDAY_LABELS[chore.weekday]} · ${chore.reminderTime}`
      : chore.cadence === 'monthly'
        ? `Day ${chore.dayOfMonth} · ${chore.reminderTime}`
        : `${chore.month}/${chore.dayOfMonth} · ${chore.reminderTime}`;

  return (
    <li
      className={`rounded-2xl border bg-white p-3 sm:p-4 shadow-sm ring-2 ring-transparent ${ACCENT_RING[chore.accent]}`}
    >
      <div className="flex gap-3">
        <div className={`shrink-0 rounded-xl p-2 ${ACCENT_BG[chore.accent]}`}>
          <ListChecks className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-flames-dark leading-snug">{chore.title}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onMove(-1)}
                className="p-1 rounded hover:bg-flames-surface text-flames-dark/50"
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                className="p-1 rounded hover:bg-flames-surface text-flames-dark/50"
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded hover:bg-flames-surface text-flames-orange-dark"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-50 text-flames-red"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {chore.notes ? (
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{chore.notes}</p>
          ) : null}
          <p className="text-xs text-flames-dark/60 mt-2">
            <span className="font-medium text-flames-orange-dark">{schedule}</span>
            <span className="mx-1.5">·</span>
            Next: <span className="font-medium">{formatDueLabel(nextDue)}</span>
          </p>
          {category ? (
            <p className="text-[10px] mt-1 font-medium text-flames-dark/50">{category.label}</p>
          ) : null}
          <button
            type="button"
            onClick={onComplete}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-flames-red hover:text-flames-red-dark"
          >
            <Check className="h-3.5 w-3.5" />
            Mark done now
          </button>
        </div>
      </div>
    </li>
  );
}

function ChoreModal({
  chore,
  cadenceDefault,
  categories,
  defaultReminderTime,
  onClose,
  onSave,
}: {
  chore: Chore | null;
  cadenceDefault: Cadence;
  categories: Category[];
  defaultReminderTime: string;
  onClose: () => void;
  onSave: (c: Chore) => void;
}) {
  const [title, setTitle] = useState(chore?.title ?? '');
  const [notes, setNotes] = useState(chore?.notes ?? '');
  const [cadence, setCadence] = useState<Cadence>(chore?.cadence ?? cadenceDefault);
  const [weekday, setWeekday] = useState(chore?.weekday ?? 0);
  const [dayOfMonth, setDayOfMonth] = useState(chore?.dayOfMonth ?? 1);
  const [month, setMonth] = useState(chore?.month ?? 1);
  const [reminderTime, setReminderTime] = useState(chore?.reminderTime ?? defaultReminderTime);
  const [categoryId, setCategoryId] = useState<string | null>(chore?.categoryId ?? null);
  const [accent, setAccent] = useState<FlameAccent>(chore?.accent ?? 'red');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const next: Chore = {
      id: chore?.id ?? newId(),
      title: t,
      notes: notes.trim(),
      cadence,
      weekday,
      dayOfMonth: Math.min(31, Math.max(1, dayOfMonth)),
      month: Math.min(12, Math.max(1, month)),
      reminderTime,
      categoryId,
      accent,
      sortOrder: chore?.sortOrder ?? 0,
      lastCompletedAt: chore?.lastCompletedAt ?? null,
      snoozeUntil: chore?.snoozeUntil ?? null,
      silencedDueAt: chore?.silencedDueAt ?? null,
    };
    onSave(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/45">
      <div
        className="bg-flames-cream rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto border border-flames-orange/25"
        role="dialog"
        aria-modal="true"
        aria-label={chore ? 'Edit chore' : 'New chore'}
      >
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-flames-orange/20 bg-gradient-to-r from-white to-flames-yellow/10">
          <p className="font-bold text-flames-dark">{chore ? 'Edit chore' : 'New chore'}</p>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/80" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flames-orange"
              placeholder="e.g. Clean gutters"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-flames-orange"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-flames-orange"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {cadence === 'weekly' && (
            <div>
              <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Day of week</label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm bg-white"
              >
                {WEEKDAY_LABELS.map((lbl, i) => (
                  <option key={lbl} value={i}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cadence === 'monthly' && (
            <div>
              <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Day of month (1–31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
              />
            </div>
          )}
          {cadence === 'yearly' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Month</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Reminder time</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Category</label>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm bg-white"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Accent</label>
            <div className="flex flex-wrap gap-2">
              {(['red', 'orange', 'yellow', 'gold'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccent(a)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize border-2 ${
                    accent === a ? ACCENT_RING[a] + ' ' + ACCENT_BG[a] : 'border-slate-200 bg-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-flames-red text-white text-sm font-semibold hover:bg-flames-red-dark"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({
  settings,
  categories,
  onClose,
  onSaveSettings,
  onAddCategory,
  onDeleteCategory,
  onRequestNotificationPermission,
  onExport,
  onImport,
  onClearAll,
}: {
  settings: ChoriosSettings;
  categories: Category[];
  onClose: () => void;
  onSaveSettings: (s: ChoriosSettings) => void;
  onAddCategory: (label: string) => void;
  onDeleteCategory: (id: string) => void;
  onRequestNotificationPermission: () => Promise<'granted' | 'denied' | 'default' | 'unsupported'>;
  onExport: () => void;
  onImport: (f: File) => void;
  onClearAll: () => void;
}) {
  const [local, setLocal] = useState(settings);
  const [newCat, setNewCat] = useState('');
  const [permHint, setPermHint] = useState<string | null>(null);

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/45">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto border border-flames-orange/20">
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-flames-orange/15 bg-flames-surface">
          <p className="font-bold text-flames-dark flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-flames-orange" />
            Settings
          </p>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Reminder check interval</label>
            <select
              value={local.reminderIntervalSec}
              onChange={(e) =>
                setLocal((s) => ({ ...s, reminderIntervalSec: parseInt(e.target.value, 10) }))
              }
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute</option>
              <option value={120}>Every 2 minutes</option>
              <option value={300}>Every 5 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-flames-dark/80 mb-1">Default time for new chores</label>
            <input
              type="time"
              value={local.defaultReminderTime}
              onChange={(e) => setLocal((s) => ({ ...s, defaultReminderTime: e.target.value }))}
              className="w-full rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={local.groupByCategory}
              onChange={(e) => setLocal((s) => ({ ...s, groupByCategory: e.target.checked }))}
              className="rounded border-flames-orange text-flames-red focus:ring-flames-orange"
            />
            <span className="text-sm font-medium text-flames-dark">Group chores by category</span>
          </label>
          <div className="rounded-xl border border-flames-orange/25 p-3 bg-flames-cream/50">
            <div className="flex items-center gap-2 mb-2">
              {local.systemNotificationsEnabled ? (
                <Bell className="h-4 w-4 text-flames-orange" />
              ) : (
                <BellOff className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-flames-dark">System notifications</span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              Browser or device alerts when a chore is due (app must be allowed to notify; background delivery on
              mobile may be limited without native plugins).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const r = await onRequestNotificationPermission();
                  if (r === 'granted') setPermHint('Notifications allowed.');
                  else if (r === 'denied') setPermHint('Notifications blocked in browser settings.');
                  else if (r === 'unsupported') setPermHint('Not supported in this environment.');
                  else setPermHint('Permission prompt dismissed.');
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-flames-orange text-white hover:bg-flames-orange-dark"
              >
                Request permission
              </button>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={local.systemNotificationsEnabled}
                  onChange={(e) => setLocal((s) => ({ ...s, systemNotificationsEnabled: e.target.checked }))}
                  disabled={typeof Notification !== 'undefined' && Notification.permission !== 'granted'}
                  className="rounded border-flames-orange"
                />
                Enable after granting
              </label>
            </div>
            {permHint ? <p className="text-xs text-flames-red-dark mt-2">{permHint}</p> : null}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-flames-orange-dark mb-2">Categories</p>
            <ul className="space-y-1.5 mb-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm rounded-lg px-2 py-1 bg-slate-50">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[c.accent]}`} />
                    {c.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(c.id)}
                    className="text-flames-red text-xs font-semibold"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="New category"
                className="flex-1 rounded-xl border border-flames-orange/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  onAddCategory(newCat);
                  setNewCat('');
                }}
                className="rounded-xl bg-flames-yellow text-flames-dark px-3 text-sm font-bold hover:bg-flames-yellow-light"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-flames-orange/40 hover:bg-flames-orange/10"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-flames-orange/40 hover:bg-flames-orange/10 cursor-pointer">
              <Upload className="h-4 w-4" />
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onClearAll}
            className="w-full py-2 rounded-xl border border-red-200 text-flames-red text-sm font-semibold hover:bg-red-50"
          >
            Clear all Chorios data…
          </button>

          <button
            type="button"
            onClick={() => {
              onSaveSettings(local);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-flames-red to-flames-orange text-white font-bold shadow"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
