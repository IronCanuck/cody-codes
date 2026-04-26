import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const STORAGE_VERSION = 1 as const;

type Profile = {
  id: string;
  name: string;
  sortOrder: number;
};

type BankAccount = {
  id: string;
  profileId: string;
  name: string;
  balance: number;
  notes: string;
};

type BudgetCategory = {
  id: string;
  profileId: string;
  name: string;
  monthlyLimit: number;
  sortOrder: number;
};

type TransactionKind = 'income' | 'expense';

type Transaction = {
  id: string;
  profileId: string;
  accountId: string | null;
  categoryId: string | null;
  amount: number;
  /** ISO date yyyy-mm-dd */
  date: string;
  note: string;
  kind: TransactionKind;
};

type SavingsGoal = {
  id: string;
  profileId: string;
  name: string;
  target: number;
  current: number;
  sortOrder: number;
};

type BudgetPalSnapshot = {
  version: typeof STORAGE_VERSION;
  activeProfileId: string;
  profiles: Profile[];
  bankAccounts: BankAccount[];
  budgetCategories: BudgetCategory[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
};

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `bp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function storageKeyForUser(userId: string) {
  return `budgetpal:${userId}`;
}

function defaultSnapshot(): BudgetPalSnapshot {
  const pId = newId();
  return {
    version: STORAGE_VERSION,
    activeProfileId: pId,
    profiles: [{ id: pId, name: 'Personal', sortOrder: 0 }],
    bankAccounts: [],
    budgetCategories: [],
    transactions: [],
    savingsGoals: [],
  };
}

function loadSnapshot(userId: string | undefined): BudgetPalSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BudgetPalSnapshot;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.profiles)) return null;
    if (parsed.profiles.length === 0) return null;
    return {
      ...defaultSnapshot(),
      ...parsed,
    };
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string | undefined, data: BudgetPalSnapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // quota
  }
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthBounds(year: number, monthIndex0: number): { start: string; end: string } {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 0);
  const f = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start: f(start), end: f(end) };
}

function inMonth(iso: string, year: number, monthIndex0: number): boolean {
  const { start, end } = monthBounds(year, monthIndex0);
  return iso >= start && iso <= end;
}

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

type TabId = 'overview' | 'flow' | 'accounts' | 'savings' | 'profiles';

export function BudgetPalApp() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [data, setData] = useState<BudgetPalSnapshot>(() => defaultSnapshot());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const [modal, setModal] = useState<
    | null
    | { type: 'profile' }
    | { type: 'account' }
    | { type: 'category' }
    | { type: 'goal' }
    | { type: 'transaction' }
  >(null);

  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  const [editCategory, setEditCategory] = useState<BudgetCategory | null>(null);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);

  const persist = useCallback(
    (next: BudgetPalSnapshot | ((prev: BudgetPalSnapshot) => BudgetPalSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  useEffect(() => {
    document.title = 'Budget Pal · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    if (stored) {
      if (!stored.profiles.some((p) => p.id === stored.activeProfileId)) {
        const first = stored.profiles[0];
        if (first) stored.activeProfileId = first.id;
      }
      setData(stored);
    } else setData(defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  const active = data.profiles.find((p) => p.id === data.activeProfileId) ?? data.profiles[0];

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleString('en-CA', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth]);

  const accountsForProfile = useMemo(
    () => data.bankAccounts.filter((a) => a.profileId === data.activeProfileId).sort((a, b) => a.name.localeCompare(b.name)),
    [data.bankAccounts, data.activeProfileId],
  );

  const categoriesForProfile = useMemo(
    () =>
      data.budgetCategories
        .filter((c) => c.profileId === data.activeProfileId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [data.budgetCategories, data.activeProfileId],
  );

  const goalsForProfile = useMemo(
    () =>
      data.savingsGoals
        .filter((g) => g.profileId === data.activeProfileId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [data.savingsGoals, data.activeProfileId],
  );

  const txForProfileMonth = useMemo(() => {
    return data.transactions.filter(
      (t) => t.profileId === data.activeProfileId && inMonth(t.date, viewYear, viewMonth),
    );
  }, [data.transactions, data.activeProfileId, viewYear, viewMonth]);

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoriesForProfile) map.set(c.id, 0);
    for (const t of txForProfileMonth) {
      if (t.kind === 'expense' && t.categoryId && map.has(t.categoryId)) {
        map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
      }
    }
    return map;
  }, [txForProfileMonth, categoriesForProfile]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txForProfileMonth) {
      if (t.kind === 'income') income += t.amount;
      else expense += t.amount;
    }
    const budgetCap = categoriesForProfile.reduce((s, c) => s + c.monthlyLimit, 0);
    return { income, expense, net: income - expense, budgetCap };
  }, [txForProfileMonth, categoriesForProfile]);

  const shiftMonth = (dir: -1 | 1) => {
    setViewMonth((m) => {
      const next = m + dir;
      if (next < 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  };

  const selectProfile = (id: string) => {
    persist((d) => ({ ...d, activeProfileId: id }));
  };

  const addProfile = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = newId();
    persist((d) => ({
      ...d,
      profiles: [...d.profiles, { id, name: trimmed, sortOrder: d.profiles.length }].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
      activeProfileId: id,
    }));
    setModal(null);
  };

  const updateProfile = (p: Profile, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((d) => ({
      ...d,
      profiles: d.profiles.map((x) => (x.id === p.id ? { ...x, name: trimmed } : x)),
    }));
    setEditProfile(null);
  };

  const removeProfileCascade = (profileId: string) => {
    persist((d) => {
      const rest = d.profiles.filter((p) => p.id !== profileId);
      if (rest.length === 0) return d;
      const nextActive = d.activeProfileId === profileId ? rest[0]!.id : d.activeProfileId;
      return {
        ...d,
        profiles: rest,
        activeProfileId: nextActive,
        bankAccounts: d.bankAccounts.filter((a) => a.profileId !== profileId),
        budgetCategories: d.budgetCategories.filter((c) => c.profileId !== profileId),
        transactions: d.transactions.filter((t) => t.profileId !== profileId),
        savingsGoals: d.savingsGoals.filter((g) => g.profileId !== profileId),
      };
    });
    setDeleteProfileId(null);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sabres-surface">
        <p className="text-sabres-blue text-sm font-medium">Sign in to use Budget Pal.</p>
      </div>
    );
  }

  if (!hydrated || !active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sabres-surface">
        <p className="text-sabres-blue-mid text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-sabres-surface text-sabres-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-sabres-gold/40 bg-gradient-to-r from-sabres-blue via-sabres-blue-mid to-sabres-blue-bright text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0 rounded-lg bg-sabres-gold/20 p-1.5 ring-2 ring-sabres-gold/50">
              <PiggyBank className="h-5 w-5 text-sabres-gold-light" strokeWidth={2.25} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">Budget Pal</h1>
              <p className="text-[10px] sm:text-xs text-white/90 truncate hidden sm:block">
                Budgets, accounts & savings
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-white/95 hover:text-white border border-sabres-gold/50 rounded-lg px-2 sm:px-3 py-1.5 bg-black/10 hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sabres-gold"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            <span className="hidden sm:inline">Apps</span>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 flex-1 flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-sabres-blue/20 bg-white p-3 sm:p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wider text-sabres-blue/70">
            Profile
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.profiles
              .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProfile(p.id)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                    p.id === data.activeProfileId
                      ? 'bg-sabres-blue text-white shadow ring-2 ring-sabres-gold/50'
                      : 'bg-sabres-surface text-sabres-ink hover:bg-sabres-cream border border-sabres-blue/15'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            <button
              type="button"
              onClick={() => {
                setModal({ type: 'profile' });
                setEditProfile(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-sabres-gold/60 px-3 py-1.5 text-sm font-semibold text-sabres-blue-mid hover:bg-sabres-gold/10"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Add
            </button>
            <button
              type="button"
              onClick={() => setTab('profiles')}
              className="text-sm font-medium text-sabres-blue-mid underline decoration-sabres-gold/60 underline-offset-2"
            >
              Manage profiles
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Budget Pal sections"
          className="flex flex-wrap gap-1 rounded-xl border border-sabres-blue/20 bg-sabres-cream p-1"
        >
          {(
            [
              ['overview', 'Overview', PiggyBank],
              ['flow', 'Cash flow', ArrowLeftRight],
              ['accounts', 'Accounts', Landmark],
              ['savings', 'Savings', Target],
              ['profiles', 'Profiles', Building2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 min-w-[5rem] rounded-lg py-2 px-2 text-xs sm:text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1 ${
                tab === id
                  ? 'bg-sabres-blue text-white shadow'
                  : 'text-sabres-ink/70 hover:bg-white/90'
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-90" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewPanel
            monthLabel={monthLabel}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(1)}
            categories={categoriesForProfile}
            spendByCategory={spendByCategory}
            totals={totals}
            onAddCategory={() => setModal({ type: 'category' })}
            onAddTransaction={() => setModal({ type: 'transaction' })}
            onEditCategory={(c) => {
              setEditCategory(c);
              setModal({ type: 'category' });
            }}
          />
        )}

        {tab === 'flow' && (
          <FlowPanel
            monthLabel={monthLabel}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(1)}
            transactions={txForProfileMonth}
            accounts={accountsForProfile}
            categories={categoriesForProfile}
            onAdd={() => setModal({ type: 'transaction' })}
            onDelete={(id) => persist((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))}
          />
        )}

        {tab === 'accounts' && (
          <AccountsPanel
            accounts={accountsForProfile}
            onAdd={() => {
              setEditAccount(null);
              setModal({ type: 'account' });
            }}
            onEdit={(a) => {
              setEditAccount(a);
              setModal({ type: 'account' });
            }}
            onDelete={(id) => persist((d) => ({ ...d, bankAccounts: d.bankAccounts.filter((a) => a.id !== id) }))}
          />
        )}

        {tab === 'savings' && (
          <SavingsPanel
            goals={goalsForProfile}
            onAdd={() => {
              setEditGoal(null);
              setModal({ type: 'goal' });
            }}
            onEdit={(g) => {
              setEditGoal(g);
              setModal({ type: 'goal' });
            }}
            onDelete={(id) => persist((d) => ({ ...d, savingsGoals: d.savingsGoals.filter((g) => g.id !== id) }))}
            onAdjustCurrent={(g, next) =>
              persist((d) => ({
                ...d,
                savingsGoals: d.savingsGoals.map((x) => (x.id === g.id ? { ...x, current: next } : x)),
              }))
            }
          />
        )}

        {tab === 'profiles' && (
          <ProfilesPanel
            profiles={data.profiles}
            activeId={data.activeProfileId}
            onSelect={selectProfile}
            onAdd={() => {
              setEditProfile(null);
              setModal({ type: 'profile' });
            }}
            onEdit={(p) => {
              setEditProfile(p);
              setModal({ type: 'profile' });
            }}
            onRequestDelete={(id) => setDeleteProfileId(id)}
          />
        )}
      </div>

      {modal?.type === 'profile' && (
        <ProfileModal
          initial={editProfile}
          onClose={() => {
            setModal(null);
            setEditProfile(null);
          }}
          onSave={(name) => (editProfile ? updateProfile(editProfile, name) : addProfile(name))}
        />
      )}

      {modal?.type === 'account' && (
        <AccountModal
          initial={editAccount}
          onClose={() => {
            setModal(null);
            setEditAccount(null);
          }}
          onSave={(fields) => {
            if (editAccount) {
              persist((d) => ({
                ...d,
                bankAccounts: d.bankAccounts.map((a) =>
                  a.id === editAccount.id
                    ? { ...a, name: fields.name, balance: fields.balance, notes: fields.notes }
                    : a,
                ),
              }));
            } else {
              const id = newId();
              persist((d) => ({
                ...d,
                bankAccounts: [
                  ...d.bankAccounts,
                  {
                    id,
                    profileId: data.activeProfileId,
                    name: fields.name,
                    balance: fields.balance,
                    notes: fields.notes,
                  },
                ],
              }));
            }
            setModal(null);
            setEditAccount(null);
          }}
        />
      )}

      {modal?.type === 'category' && (
        <CategoryModal
          initial={editCategory}
          onClose={() => {
            setModal(null);
            setEditCategory(null);
          }}
          onSave={(name, limit) => {
            if (editCategory) {
              persist((d) => ({
                ...d,
                budgetCategories: d.budgetCategories.map((c) =>
                  c.id === editCategory.id ? { ...c, name, monthlyLimit: limit } : c,
                ),
              }));
            } else {
              const id = newId();
              persist((d) => ({
                ...d,
                budgetCategories: [
                  ...d.budgetCategories,
                  {
                    id,
                    profileId: data.activeProfileId,
                    name,
                    monthlyLimit: limit,
                    sortOrder: d.budgetCategories.filter((x) => x.profileId === data.activeProfileId).length,
                  },
                ],
              }));
            }
            setModal(null);
            setEditCategory(null);
          }}
        />
      )}

      {modal?.type === 'goal' && (
        <GoalModal
          initial={editGoal}
          onClose={() => {
            setModal(null);
            setEditGoal(null);
          }}
          onSave={(name, target, current) => {
            if (editGoal) {
              persist((d) => ({
                ...d,
                savingsGoals: d.savingsGoals.map((g) =>
                  g.id === editGoal.id ? { ...g, name, target, current } : g,
                ),
              }));
            } else {
              const id = newId();
              persist((d) => ({
                ...d,
                savingsGoals: [
                  ...d.savingsGoals,
                  {
                    id,
                    profileId: data.activeProfileId,
                    name,
                    target,
                    current,
                    sortOrder: d.savingsGoals.filter((x) => x.profileId === data.activeProfileId).length,
                  },
                ],
              }));
            }
            setModal(null);
            setEditGoal(null);
          }}
        />
      )}

      {modal?.type === 'transaction' && (
        <TransactionModal
          profileId={data.activeProfileId}
          accounts={accountsForProfile}
          categories={categoriesForProfile}
          onClose={() => setModal(null)}
          onSave={(t) => {
            persist((d) => ({
              ...d,
              transactions: [...d.transactions, { ...t, id: newId() }],
            }));
            setModal(null);
          }}
        />
      )}

      {deleteProfileId && (
        <ConfirmModal
          title="Delete profile?"
          body="This removes all bank accounts, budgets, transactions, and savings for this profile. This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleteProfileId(null)}
          onConfirm={() => removeProfileCascade(deleteProfileId)}
        />
      )}
    </div>
  );
}

function OverviewPanel(props: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  categories: BudgetCategory[];
  spendByCategory: Map<string, number>;
  totals: { income: number; expense: number; net: number; budgetCap: number };
  onAddCategory: () => void;
  onAddTransaction: () => void;
  onEditCategory: (c: BudgetCategory) => void;
}) {
  const { categories, spendByCategory, totals } = props;
  const overBudget =
    props.totals.budgetCap > 0 && props.totals.expense > props.totals.budgetCap;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-xl border border-sabres-blue/20 bg-white px-1 py-1">
          <button
            type="button"
            onClick={props.onPrevMonth}
            className="p-1.5 rounded-lg hover:bg-sabres-surface text-sabres-blue"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-2 text-sm font-bold text-sabres-ink min-w-[10rem] text-center flex items-center justify-center gap-1">
            <CalendarRange className="h-4 w-4 text-sabres-blue-mid" aria-hidden />
            {props.monthLabel}
          </span>
          <button
            type="button"
            onClick={props.onNextMonth}
            className="p-1.5 rounded-lg hover:bg-sabres-surface text-sabres-blue"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={props.onAddTransaction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sabres-gold text-sabres-ink px-3 py-2 text-sm font-bold shadow hover:bg-sabres-gold-light"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </button>
          <button
            type="button"
            onClick={props.onAddCategory}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-sabres-blue/30 bg-white px-3 py-2 text-sm font-semibold text-sabres-blue hover:bg-sabres-cream"
          >
            <Plus className="h-4 w-4" />
            Budget line
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sabres-blue/15 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-sabres-blue/80 uppercase">Income</p>
          <p className="text-xl font-bold text-sabres-blue mt-1">{money.format(totals.income)}</p>
        </div>
        <div className="rounded-2xl border border-sabres-blue/15 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-sabres-blue/80 uppercase">Spent</p>
          <p className="text-xl font-bold text-sabres-ink mt-1">{money.format(totals.expense)}</p>
        </div>
        <div className="rounded-2xl border border-sabres-gold/40 bg-gradient-to-br from-white to-sabres-gold/10 p-4 shadow-sm">
          <p className="text-xs font-semibold text-sabres-blue/80 uppercase">Net</p>
          <p
            className={`text-xl font-bold mt-1 ${totals.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {money.format(totals.net)}
          </p>
        </div>
      </div>

      <div
        className={`rounded-2xl border-2 p-4 ${
          overBudget ? 'border-red-300 bg-red-50/80' : 'border-sabres-gold/40 bg-sabres-cream/80'
        }`}
      >
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-sm font-bold text-sabres-ink">Budget vs actual (categories)</p>
            <p className="text-xs text-sabres-ink/70 mt-0.5">
              Total planned: {money.format(totals.budgetCap)} · Spent in categories:{' '}
              {money.format(
                categories.reduce((s, c) => s + (spendByCategory.get(c.id) ?? 0), 0),
              )}
            </p>
          </div>
          {overBudget && (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg">
              Over plan
            </span>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-sabres-ink/70 mt-3">
            Add budget lines (e.g. Groceries, Gas) to track how you are doing each month.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {categories.map((c) => {
              const spent = spendByCategory.get(c.id) ?? 0;
              const cap = c.monthlyLimit;
              const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
              const bad = cap > 0 && spent > cap;
              return (
                <li key={c.id} className="rounded-xl bg-white/90 border border-sabres-blue/10 p-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-sabres-ink">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => props.onEditCategory(c)}
                      className="p-1 rounded-lg text-sabres-blue-mid hover:bg-sabres-surface"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-sabres-ink/80 mt-1">
                    <span>
                      {money.format(spent)} / {money.format(cap)}
                    </span>
                    <span className={bad ? 'text-red-700 font-bold' : 'text-emerald-800'}>
                      {cap > 0
                        ? `${pct.toFixed(0)}% used`
                        : 'Set a limit'}
                    </span>
                  </div>
                  {cap > 0 && (
                    <div className="mt-2 h-2 rounded-full bg-sabres-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          bad ? 'bg-red-500' : 'bg-sabres-blue'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FlowPanel(props: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  transactions: Transaction[];
  accounts: BankAccount[];
  categories: BudgetCategory[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const { transactions, accounts, categories } = props;
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
  const accName = (id: string | null) =>
    id ? (accounts.find((a) => a.id === id)?.name ?? 'Account') : '—';
  const catName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? 'Category') : '—';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-xl border border-sabres-blue/20 bg-white px-1 py-1">
          <button type="button" onClick={props.onPrevMonth} className="p-1.5 rounded-lg hover:bg-sabres-surface">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-2 text-sm font-bold">{props.monthLabel}</span>
          <button type="button" onClick={props.onNextMonth} className="p-1.5 rounded-lg hover:bg-sabres-surface">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sabres-gold text-sabres-ink px-3 py-2 text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-sabres-ink/70 py-8 text-center border-2 border-dashed border-sabres-blue/20 rounded-2xl">
          No entries this month. Log income and expenses to see them here.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-sabres-blue/10 bg-white p-3"
            >
              <div className="min-w-0">
                <p className="text-xs text-sabres-ink/60">{t.date}</p>
                <p className="font-medium text-sabres-ink truncate">
                  {t.note || (t.kind === 'income' ? 'Income' : 'Expense')}
                </p>
                <p className="text-xs text-sabres-ink/70">
                  {accName(t.accountId)} · {t.kind === 'expense' ? catName(t.categoryId) : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-bold tabular-nums ${
                    t.kind === 'income' ? 'text-emerald-700' : 'text-sabres-ink'
                  }`}
                >
                  {t.kind === 'income' ? '+' : '−'}
                  {money.format(t.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => props.onDelete(t.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountsPanel(props: {
  accounts: BankAccount[];
  onAdd: () => void;
  onEdit: (a: BankAccount) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sabres-gold text-sabres-ink px-3 py-2 text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </div>
      {props.accounts.length === 0 ? (
        <p className="text-sm text-sabres-ink/70 py-8 text-center border-2 border-dashed rounded-2xl border-sabres-blue/20">
          No accounts yet. Add chequing, savings, or business accounts for this profile.
        </p>
      ) : (
        <ul className="space-y-2">
          {props.accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-2xl border border-sabres-blue/15 bg-white p-4"
            >
              <div className="flex gap-3 min-w-0">
                <div className="shrink-0 rounded-xl bg-sabres-blue/10 p-2.5 text-sabres-blue">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sabres-ink">{a.name}</p>
                  {a.notes && <p className="text-sm text-sabres-ink/70 line-clamp-2">{a.notes}</p>}
                  <p className="text-lg font-bold text-sabres-blue mt-1 tabular-nums">
                    {money.format(a.balance)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => props.onEdit(a)}
                  className="p-2 text-sabres-blue-mid hover:bg-sabres-surface rounded-lg"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => props.onDelete(a.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SavingsPanel(props: {
  goals: SavingsGoal[];
  onAdd: () => void;
  onEdit: (g: SavingsGoal) => void;
  onDelete: (id: string) => void;
  onAdjustCurrent: (g: SavingsGoal, next: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sabres-gold text-sabres-ink px-3 py-2 text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          Add goal
        </button>
      </div>
      {props.goals.length === 0 ? (
        <p className="text-sm text-sabres-ink/70 py-8 text-center border-2 border-dashed rounded-2xl border-sabres-blue/20">
          Set a savings target and track your progress toward it.
        </p>
      ) : (
        <ul className="space-y-3">
          {props.goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
            return (
              <li
                key={g.id}
                className="rounded-2xl border-2 border-sabres-gold/35 bg-gradient-to-b from-white to-sabres-gold/5 p-4"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-sabres-ink">{g.name}</p>
                    <p className="text-sm text-sabres-ink/80">
                      {money.format(g.current)} of {money.format(g.target)} ({pct.toFixed(0)}%)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => props.onEdit(g)}
                      className="p-2 text-sabres-blue-mid hover:bg-white/80 rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onDelete(g.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-2.5 mt-3 rounded-full bg-sabres-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sabres-blue"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const n = window.prompt('Adjust saved amount (number)', String(g.current));
                      if (n === null) return;
                      const v = parseFloat(n);
                      if (!Number.isFinite(v) || v < 0) return;
                      props.onAdjustCurrent(g, v);
                    }}
                    className="text-xs font-semibold text-sabres-blue-mid underline"
                  >
                    Set balance
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProfilesPanel(props: {
  profiles: Profile[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (p: Profile) => void;
  onRequestDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-sabres-ink/80">
        Use different profiles for personal and business money so budgets stay separate.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={props.onAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sabres-gold text-sabres-ink px-3 py-2 text-sm font-bold"
        >
          <Plus className="h-4 w-4" />
          New profile
        </button>
      </div>
      <ul className="space-y-2">
        {props.profiles
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
          .map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-2 rounded-xl border-2 p-3 ${
                p.id === props.activeId ? 'border-sabres-gold bg-sabres-cream' : 'border-sabres-blue/15 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => props.onSelect(p.id)}
                className="text-left font-semibold text-sabres-ink flex-1 min-w-0"
              >
                {p.name}
                {p.id === props.activeId && (
                  <span className="ml-2 text-xs font-bold text-sabres-blue">(active)</span>
                )}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => props.onEdit(p)}
                  className="p-2 rounded-lg hover:bg-sabres-surface"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => props.onRequestDelete(p.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                  disabled={props.profiles.length <= 1}
                  title={props.profiles.length <= 1 ? 'Keep at least one profile' : 'Delete profile'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

function ProfileModal(props: {
  initial: Profile | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? '');
  return (
    <ModalShell title={props.initial ? 'Rename profile' : 'New profile'} onClose={props.onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          props.onSave(name);
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-sm font-medium text-sabres-ink">Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business 1"
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="px-3 py-2 text-sm font-medium text-sabres-ink/80"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-sabres-blue text-white px-4 py-2 text-sm font-bold"
          >
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AccountModal(props: {
  initial: BankAccount | null;
  onClose: () => void;
  onSave: (fields: { name: string; balance: number; notes: string }) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? '');
  const [balance, setBalance] = useState(String(props.initial?.balance ?? 0));
  const [notes, setNotes] = useState(props.initial?.notes ?? '');

  return (
    <ModalShell title={props.initial ? 'Edit account' : 'Add bank account'} onClose={props.onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const b = parseFloat(balance);
          if (!Number.isFinite(b)) return;
          props.onSave({ name, balance: b, notes });
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-sm font-medium">Account name</label>
          <input
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. RBC Business Chequing"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Balance (CAD)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="px-3 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-sabres-blue text-white px-4 py-2 text-sm font-bold">
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CategoryModal(props: {
  initial: BudgetCategory | null;
  onClose: () => void;
  onSave: (name: string, limit: number) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? '');
  const [limit, setLimit] = useState(String(props.initial?.monthlyLimit ?? 0));

  return (
    <ModalShell
      title={props.initial ? 'Edit budget line' : 'Add budget line'}
      onClose={props.onClose}
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const l = parseFloat(limit);
          if (!Number.isFinite(l) || l < 0) return;
          props.onSave(name, l);
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-sm font-medium">Category</label>
          <input
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Groceries"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Monthly limit (CAD)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="px-3 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-sabres-blue text-white px-4 py-2 text-sm font-bold">
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GoalModal(props: {
  initial: SavingsGoal | null;
  onClose: () => void;
  onSave: (name: string, target: number, current: number) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? '');
  const [target, setTarget] = useState(String(props.initial?.target ?? 0));
  const [current, setCurrent] = useState(String(props.initial?.current ?? 0));

  return (
    <ModalShell title={props.initial ? 'Edit goal' : 'New savings goal'} onClose={props.onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const t = parseFloat(target);
          const c = parseFloat(current);
          if (!Number.isFinite(t) || t < 0 || !Number.isFinite(c) || c < 0) return;
          props.onSave(name, t, c);
        }}
        className="space-y-3"
      >
        <div>
          <label className="text-sm font-medium">Goal name</label>
          <input
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Emergency fund"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Target (CAD)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Saved so far (CAD)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="px-3 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-sabres-blue text-white px-4 py-2 text-sm font-bold">
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function TransactionModal(props: {
  profileId: string;
  accounts: BankAccount[];
  categories: BudgetCategory[];
  onClose: () => void;
  onSave: (t: Omit<Transaction, 'id'>) => void;
}) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  return (
    <ModalShell title="Add transaction" onClose={props.onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const a = parseFloat(amount);
          if (!Number.isFinite(a) || a <= 0) return;
          props.onSave({
            profileId: props.profileId,
            accountId: accountId || null,
            categoryId: kind === 'expense' ? categoryId || null : null,
            amount: a,
            date,
            note: note.trim(),
            kind,
          });
        }}
        className="space-y-3"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind('expense')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              kind === 'expense' ? 'bg-sabres-blue text-white' : 'bg-sabres-surface'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setKind('income')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              kind === 'income' ? 'bg-sabres-blue text-white' : 'bg-sabres-surface'
            }`}
          >
            Income
          </button>
        </div>
        <div>
          <label className="text-sm font-medium">Amount (CAD)</label>
          <input
            type="number"
            step="0.01"
            min={0.01}
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Account (optional)</label>
          <select
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">—</option>
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {kind === 'expense' && (
          <div>
            <label className="text-sm font-medium">Budget category (optional)</label>
            <select
              className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Note (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-sabres-blue/20 px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Grocery run"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="px-3 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-sabres-gold text-sabres-ink px-4 py-2 text-sm font-bold">
            Add
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal(props: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-sabres-ink/50">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border-2 border-sabres-blue/20"
        role="dialog"
        aria-modal
      >
        <h2 className="text-lg font-bold text-sabres-ink">{props.title}</h2>
        <p className="text-sm text-sabres-ink/80 mt-2">{props.body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={props.onCancel} className="px-3 py-2 text-sm font-medium">
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-bold"
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalShell(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-sabres-ink/50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl border-2 border-sabres-gold/40">
        <div className="flex justify-between items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-sabres-ink">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-sm font-medium text-sabres-ink/70 hover:text-sabres-ink"
          >
            Close
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
