import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Gift,
  Heart,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  defaultSnapshot,
  loadSnapshot,
  newId,
  saveSnapshot,
} from './storage';
import type { BirthdayEntry, CandlesSnapshot } from './types';

type BirthdayForm = {
  name: string;
  birthDate: string;
  relationship: string;
  favoriteCake: string;
  notes: string;
};

type ParsedBirthDate = {
  year: number;
  monthIndex: number;
  day: number;
};

type UpcomingBirthday = BirthdayEntry & {
  daysUntil: number;
  nextDate: Date;
  turningAge: number;
};

const EMPTY_FORM: BirthdayForm = {
  name: '',
  birthDate: '',
  relationship: '',
  favoriteCake: '',
  notes: '',
};

const MS_PER_DAY = 86_400_000;

const sprinkleStyle: CSSProperties = {
  backgroundImage: `
    radial-gradient(circle at 12px 18px, #f973a8 0 2px, transparent 2.5px),
    radial-gradient(circle at 42px 10px, #f6c35f 0 2px, transparent 2.5px),
    radial-gradient(circle at 64px 36px, #8fd8ff 0 2px, transparent 2.5px),
    radial-gradient(circle at 28px 52px, #9b5de5 0 2px, transparent 2.5px),
    linear-gradient(32deg, transparent 0 34px, #ffb3cf 34px 38px, transparent 38px),
    linear-gradient(112deg, transparent 0 48px, #7ed7c1 48px 52px, transparent 52px)
  `,
  backgroundSize: '84px 84px',
};

function parseBirthDate(value: string): ParsedBirthDate | null {
  const parts = value.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, monthIndex: month - 1, day };
}

function startOfToday(today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function nextBirthdayDate(birthDate: string, today = new Date()): Date | null {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return null;
  const base = startOfToday(today);
  let next = new Date(base.getFullYear(), parsed.monthIndex, parsed.day);
  if (next.getTime() < base.getTime()) {
    next = new Date(base.getFullYear() + 1, parsed.monthIndex, parsed.day);
  }
  return next;
}

function daysUntilBirthday(birthDate: string, today = new Date()): number | null {
  const next = nextBirthdayDate(birthDate, today);
  if (!next) return null;
  return Math.round((next.getTime() - startOfToday(today).getTime()) / MS_PER_DAY);
}

function turningAge(birthDate: string, nextDate: Date): number {
  const parsed = parseBirthDate(birthDate);
  return parsed ? nextDate.getFullYear() - parsed.year : 0;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatBirthDate(birthDate: string): string {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return 'Birthday date';
  return new Date(parsed.year, parsed.monthIndex, parsed.day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function relativeBirthdayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

function birthdaySortValue(entry: BirthdayEntry): number {
  return daysUntilBirthday(entry.birthDate) ?? Number.MAX_SAFE_INTEGER;
}

function CakeIllustration() {
  return (
    <div className="relative mx-auto h-40 w-48" aria-hidden>
      <div className="absolute left-1/2 top-2 h-12 w-2 -translate-x-1/2 rounded-full bg-candles-wick shadow-sm">
        <div className="absolute -top-5 left-1/2 h-6 w-5 -translate-x-1/2 rounded-full bg-gradient-to-b from-candles-flame to-candles-flame-deep shadow-lg shadow-candles-flame/30" />
      </div>
      <div className="absolute left-1/2 top-16 h-8 w-40 -translate-x-1/2 rounded-t-[2rem] bg-candles-vanilla shadow-inner">
        <span className="absolute left-6 top-2 h-1.5 w-7 rotate-12 rounded-full bg-candles-pink" />
        <span className="absolute left-20 top-3 h-1.5 w-6 -rotate-12 rounded-full bg-candles-sky" />
        <span className="absolute right-7 top-2 h-1.5 w-5 rotate-45 rounded-full bg-candles-mint" />
      </div>
      <div className="absolute left-1/2 top-24 h-16 w-44 -translate-x-1/2 rounded-3xl bg-gradient-to-b from-candles-pink-light to-candles-pink shadow-xl ring-4 ring-white/70">
        <span className="absolute left-4 top-4 h-1.5 w-8 -rotate-12 rounded-full bg-candles-vanilla" />
        <span className="absolute left-20 top-8 h-1.5 w-7 rotate-12 rounded-full bg-candles-sky" />
        <span className="absolute right-5 top-5 h-1.5 w-7 -rotate-45 rounded-full bg-candles-mint" />
      </div>
      <div className="absolute bottom-0 left-1/2 h-9 w-52 -translate-x-1/2 rounded-full bg-candles-plate shadow-md" />
    </div>
  );
}

export function CandlesApp() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();

  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<CandlesSnapshot>(() => defaultSnapshot());
  const [form, setForm] = useState<BirthdayForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Candles · Cody James Fairburn';
  }, []);

  useEffect(() => {
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

  const persist = useCallback(
    (next: CandlesSnapshot | ((prev: CandlesSnapshot) => CandlesSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const upcoming = useMemo<UpcomingBirthday[]>(() => {
    return data.birthdays
      .map((birthday) => {
        const nextDate = nextBirthdayDate(birthday.birthDate);
        const daysUntil = daysUntilBirthday(birthday.birthDate);
        if (!nextDate || daysUntil === null) return null;
        return {
          ...birthday,
          nextDate,
          daysUntil,
          turningAge: turningAge(birthday.birthDate, nextDate),
        };
      })
      .filter((birthday): birthday is UpcomingBirthday => birthday !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  }, [data.birthdays]);

  const filteredUpcoming = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return upcoming;
    return upcoming.filter((birthday) => {
      return [birthday.name, birthday.relationship, birthday.favoriteCake, birthday.notes]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [search, upcoming]);

  const birthdaysThisMonth = useMemo(() => {
    const month = new Date().getMonth();
    return data.birthdays.filter((entry) => parseBirthDate(entry.birthDate)?.monthIndex === month).length;
  }, [data.birthdays]);

  const nextBirthday = upcoming[0] ?? null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || !parseBirthDate(form.birthDate)) return;
    const now = new Date().toISOString();
    persist((prev) => {
      if (editingId) {
        return {
          ...prev,
          birthdays: prev.birthdays.map((entry) =>
            entry.id === editingId
              ? {
                  ...entry,
                  name,
                  birthDate: form.birthDate,
                  relationship: form.relationship.trim(),
                  favoriteCake: form.favoriteCake.trim(),
                  notes: form.notes.trim(),
                  updatedAt: now,
                }
              : entry,
          ),
        };
      }
      return {
        ...prev,
        birthdays: [
          ...prev.birthdays,
          {
            id: newId(),
            name,
            birthDate: form.birthDate,
            relationship: form.relationship.trim(),
            favoriteCake: form.favoriteCake.trim(),
            notes: form.notes.trim(),
            createdAt: now,
            updatedAt: now,
          },
        ].sort((a, b) => birthdaySortValue(a) - birthdaySortValue(b)),
      };
    });
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const editBirthday = (entry: BirthdayEntry) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      birthDate: entry.birthDate,
      relationship: entry.relationship,
      favoriteCake: entry.favoriteCake,
      notes: entry.notes,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBirthday = (id: string) => {
    const entry = data.birthdays.find((birthday) => birthday.id === id);
    if (!entry || !window.confirm(`Delete ${entry.name}'s birthday?`)) return;
    persist((prev) => ({
      ...prev,
      birthdays: prev.birthdays.filter((birthday) => birthday.id !== id),
    }));
    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
  };

  const handleSignOut = useCallback(async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  }, [navigate, signOut]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-candles-vanilla-soft text-candles-ink">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={sprinkleStyle} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-candles-pink-light/70 via-candles-vanilla/80 to-transparent" />

      <header className="sticky top-0 z-30 border-b border-candles-pink/20 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-candles-pink/30 bg-candles-vanilla text-candles-berry transition-colors hover:bg-candles-pink-light/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-candles-berry">Candles</h1>
              <p className="truncate text-xs text-candles-cocoa">Birthdays, wishes, and cake notes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-candles-pink/30 bg-white text-candles-berry transition-colors hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-candles-cocoa/35 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="Candles menu"
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-candles-pink/25 bg-white shadow-2xl transition-transform duration-200 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-candles-pink/15 px-4">
          <p className="text-sm font-bold text-candles-berry">Candles</p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-candles-cocoa transition-colors hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <nav className="flex-1 space-y-2 p-3" aria-label="Candles navigation">
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl border border-candles-pink/20 bg-candles-vanilla px-3 py-3 text-sm font-semibold text-candles-berry transition-colors hover:bg-candles-pink-light/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Back to apps
          </Link>
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-semibold text-candles-cocoa transition-colors hover:border-candles-pink/20 hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            codycodes.ca
          </Link>
        </nav>
        <div className="border-t border-candles-pink/15 p-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-candles-pink/25 px-3 py-2.5 text-sm font-semibold text-candles-cocoa transition-colors hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Sign out
          </button>
        </div>
      </div>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 shadow-xl shadow-candles-pink/10 backdrop-blur">
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-0 opacity-50" style={sprinkleStyle} aria-hidden />
              <div className="relative">
                <p className="inline-flex items-center gap-2 rounded-full border border-candles-pink/25 bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-wider text-candles-berry">
                  <Gift className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  Pink and vanilla sprinkle cake
                </p>
                <CakeIllustration />
                <h2 className="mt-2 text-3xl font-black tracking-tight text-candles-berry sm:text-4xl">
                  Never miss a wish.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-candles-cocoa sm:text-base">
                  Track birthdays, favorite cake flavors, and notes for the people you celebrate.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-candles-cocoa/70">Tracked</p>
              <p className="mt-1 text-2xl font-black text-candles-berry">{data.birthdays.length}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-candles-cocoa/70">This month</p>
              <p className="mt-1 text-2xl font-black text-candles-berry">{birthdaysThisMonth}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-candles-cocoa/70">Next up</p>
              <p className="mt-1 truncate text-lg font-black text-candles-berry">
                {nextBirthday ? nextBirthday.name : 'No one yet'}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-candles-pink/20 bg-white/90 p-5 shadow-xl shadow-candles-pink/10 backdrop-blur sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-candles-berry">
                  {editingId ? 'Edit birthday' : 'Add a birthday'}
                </h2>
                <p className="mt-1 text-sm text-candles-cocoa">Names, dates, cake wishes, and gift hints.</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-candles-pink-light text-candles-berry">
                <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-bold text-candles-cocoa">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-candles-pink/25 bg-white px-3 py-2.5 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                  placeholder="Aunt Lily"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-candles-cocoa">Birthday</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-candles-pink/25 bg-white px-3 py-2.5 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-candles-cocoa">Relationship</span>
                  <input
                    value={form.relationship}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, relationship: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-candles-pink/25 bg-white px-3 py-2.5 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                    placeholder="Family, friend, teammate"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-candles-cocoa">Favorite cake or treat</span>
                <input
                  value={form.favoriteCake}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, favoriteCake: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-candles-pink/25 bg-white px-3 py-2.5 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                  placeholder="Vanilla sprinkle cake"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-candles-cocoa">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="mt-1 min-h-24 w-full rounded-xl border border-candles-pink/25 bg-white px-3 py-2.5 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                  placeholder="Gift ideas, party plans, reminders..."
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-candles-berry px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-candles-berry-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry focus-visible:ring-offset-2"
              >
                <Heart className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                {editingId ? 'Save changes' : 'Add birthday'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="rounded-xl border border-candles-pink/25 px-4 py-2.5 text-sm font-bold text-candles-cocoa transition-colors hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-candles-pink/20 bg-white/90 p-5 shadow-xl shadow-candles-pink/10 backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-candles-berry">Birthday calendar</h2>
              <p className="mt-1 text-sm text-candles-cocoa">Upcoming celebrations sorted by next candle day.</p>
            </div>
            <label className="relative block sm:w-64">
              <span className="sr-only">Search birthdays</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-candles-cocoa/60" strokeWidth={2.25} aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-candles-pink/25 bg-white py-2.5 pl-9 pr-3 text-sm text-candles-ink shadow-sm outline-none transition focus:border-candles-berry focus:ring-2 focus:ring-candles-pink-light"
                placeholder="Search"
              />
            </label>
          </div>

          {!hydrated ? (
            <p className="mt-8 rounded-2xl border border-candles-pink/15 bg-candles-vanilla/70 p-6 text-sm font-semibold text-candles-cocoa">
              Loading birthdays...
            </p>
          ) : filteredUpcoming.length === 0 ? (
            <div className="mt-8 rounded-3xl border-2 border-dashed border-candles-pink/35 bg-candles-vanilla/70 p-8 text-center">
              <Gift className="mx-auto h-10 w-10 text-candles-berry" strokeWidth={2.25} aria-hidden />
              <h3 className="mt-3 text-lg font-black text-candles-berry">
                {data.birthdays.length === 0 ? 'No birthdays yet' : 'No matches'}
              </h3>
              <p className="mt-2 text-sm text-candles-cocoa">
                {data.birthdays.length === 0
                  ? 'Add your first person to start building a sweet birthday list.'
                  : 'Try a different name, relationship, cake, or note.'}
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {filteredUpcoming.map((birthday) => (
                <li
                  key={birthday.id}
                  className="rounded-3xl border border-candles-pink/20 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-candles-berry">{birthday.name}</h3>
                        <span className="rounded-full bg-candles-pink-light/65 px-2.5 py-1 text-xs font-black text-candles-berry">
                          {relativeBirthdayLabel(birthday.daysUntil)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-candles-cocoa sm:grid-cols-2">
                        <p className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-candles-berry" strokeWidth={2.25} aria-hidden />
                          {formatDate(birthday.nextDate)}
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <Gift className="h-4 w-4 text-candles-berry" strokeWidth={2.25} aria-hidden />
                          Turning {birthday.turningAge}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-candles-cocoa/65">
                        Born {formatBirthDate(birthday.birthDate)}
                      </p>
                      {(birthday.relationship || birthday.favoriteCake || birthday.notes) && (
                        <div className="mt-3 space-y-1.5 text-sm text-candles-cocoa">
                          {birthday.relationship && <p>Relationship: {birthday.relationship}</p>}
                          {birthday.favoriteCake && <p>Cake: {birthday.favoriteCake}</p>}
                          {birthday.notes && <p className="leading-6">Notes: {birthday.notes}</p>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editBirthday(birthday)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-candles-pink/25 text-candles-berry transition-colors hover:bg-candles-vanilla focus:outline-none focus-visible:ring-2 focus-visible:ring-candles-berry"
                        aria-label={`Edit ${birthday.name}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBirthday(birthday.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        aria-label={`Delete ${birthday.name}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
