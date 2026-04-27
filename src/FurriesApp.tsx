import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  Check,
  Clock,
  Download,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Menu,
  PawPrint,
  Pencil,
  Pin,
  Plus,
  Settings2,
  Stethoscope,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { downloadFurriesCarePdf, downloadFurriesCarePng, type FurriesCareExportInput } from './lib/furries-care-export';

const STORAGE_VERSION = 1 as const;
const MAX_GALLERY = 28;
const MAX_IMAGE_DIM = 960;
const JPEG_QUALITY = 0.82;

type Recurrence =
  | { kind: 'once' }
  | { kind: 'daily'; time: string }
  | { kind: 'weekly'; weekday: number; time: string }
  | { kind: 'monthly'; dayOfMonth: number; time: string };

type MedicalRecord = {
  id: string;
  date: string;
  title: string;
  notes: string;
  provider: string;
};

type FoodEntry = {
  id: string;
  dateTime: string;
  label: string;
  amount: string;
  notes: string;
};

type SitterCare = {
  emergencyName: string;
  emergencyPhone: string;
  vetName: string;
  vetPhone: string;
  feedingSchedule: string;
  medications: string;
  walkNotes: string;
  quirks: string;
  otherNotes: string;
};

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  birthdate: string;
  microchip: string;
  profilePhoto: string | null;
  gallery: string[];
  medicalRecords: MedicalRecord[];
  foodLog: FoodEntry[];
  sitter: SitterCare;
};

type Reminder = {
  id: string;
  petId: string | null;
  title: string;
  notes: string;
  pinned: boolean;
  dueAt: string;
  recurrence: Recurrence;
  snoozeUntil: string | null;
  silencedForDueAt: string | null;
};

type FurriesSettings = {
  reminderPollIntervalSec: number;
  systemNotificationsEnabled: boolean;
  defaultReminderTime: string;
};

type PersistedSnapshot = {
  version: typeof STORAGE_VERSION;
  pets: Pet[];
  reminders: Reminder[];
  settings: FurriesSettings;
};

const DEFAULT_SITTER: SitterCare = {
  emergencyName: '',
  emergencyPhone: '',
  vetName: '',
  vetPhone: '',
  feedingSchedule: '',
  medications: '',
  walkNotes: '',
  quirks: '',
  otherNotes: '',
};

const DEFAULT_SETTINGS: FurriesSettings = {
  reminderPollIntervalSec: 45,
  systemNotificationsEnabled: false,
  defaultReminderTime: '09:00',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `fur-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function storageKeyForUser(userId: string) {
  return `furries:${userId}`;
}

function defaultSnapshot(): PersistedSnapshot {
  return {
    version: STORAGE_VERSION,
    pets: [],
    reminders: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadSnapshot(userId: string | undefined): PersistedSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.pets) || !Array.isArray(parsed.reminders)) {
      return null;
    }
    return {
      ...parsed,
      pets: parsed.pets.map((p) => ({
        ...p,
        gender: typeof (p as Pet).gender === 'string' ? (p as Pet).gender : '',
      })),
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
    /* quota or private mode */
  }
}

function parseTime(time: string): { h: number; m: number } {
  const [a, b] = time.split(':').map((x) => parseInt(x, 10));
  return { h: Number.isFinite(a) ? a! : 0, m: Number.isFinite(b) ? b! : 0 };
}

function setTimeOnDate(d: Date, time: string): Date {
  const { h, m } = parseTime(time);
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function computeNextOccurrence(r: Recurrence, after: Date): Date {
  if (r.kind === 'once') return after;
  if (r.kind === 'daily') {
    let d = new Date(after);
    let candidate = setTimeOnDate(d, r.time);
    if (candidate <= after) {
      d = new Date(after);
      d.setDate(d.getDate() + 1);
      candidate = setTimeOnDate(d, r.time);
    }
    return candidate;
  }
  if (r.kind === 'weekly') {
    let d = new Date(after);
    d = setTimeOnDate(d, r.time);
    let guard = 0;
    while (d <= after || d.getDay() !== r.weekday) {
      d.setDate(d.getDate() + 1);
      d = setTimeOnDate(d, r.time);
      guard++;
      if (guard > 400) break;
    }
    return d;
  }
  let y = after.getFullYear();
  let mo = after.getMonth();
  const clamp = (year: number, month: number, dom: number) =>
    Math.min(dom, daysInMonth(year, month));
  let d = new Date(y, mo, clamp(y, mo, r.dayOfMonth));
  d = setTimeOnDate(d, r.time);
  if (d <= after) {
    mo++;
    if (mo > 11) {
      mo = 0;
      y++;
    }
    d = new Date(y, mo, clamp(y, mo, r.dayOfMonth));
    d = setTimeOnDate(d, r.time);
  }
  return d;
}

function formatDueLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function relativeDue(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  if (t < now) return 'Overdue';
  const diff = t - now;
  if (diff < 60_000) return 'Due now';
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  }
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

async function resizeImageToDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const w = bmp.width;
  const h = bmp.height;
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h));
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(bmp, 0, 0, tw, th);
  bmp.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

type ReminderToast = {
  id: string;
  reminderId: string;
  message: string;
  dueIso: string;
};

type DetailTab = 'overview' | 'gallery' | 'medical' | 'food' | 'sitter';

export function FurriesApp() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const menuPanelId = useId();

  const [data, setData] = useState<PersistedSnapshot>(() => defaultSnapshot());
  const [hydrated, setHydrated] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creatingPet, setCreatingPet] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderModalPetId, setReminderModalPetId] = useState<string | null>(null);
  const [deletePetId, setDeletePetId] = useState<string | null>(null);
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
    document.title = 'Furries · Cody James Fairburn';
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [selectedPetId]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    if (stored) setData(stored);
    else setData(defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  const petById = useMemo(() => {
    const m = new Map<string, Pet>();
    for (const p of data.pets) m.set(p.id, p);
    return m;
  }, [data.pets]);

  const selectedPet = selectedPetId ? petById.get(selectedPetId) ?? null : null;

  const bulletinReminders = useMemo(() => {
    const now = Date.now();
    const horizon = now + 14 * 86_400_000;
    const list = data.reminders.filter((r) => {
      const t = new Date(r.dueAt).getTime();
      if (t > horizon) return false;
      return true;
    });
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aOver = new Date(a.dueAt).getTime() < now;
      const bOver = new Date(b.dueAt).getTime() < now;
      if (aOver !== bOver) return aOver ? -1 : 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    return list;
  }, [data.reminders]);

  const checkDue = useCallback(() => {
    if (!hydrated) return;
    const now = new Date();
    const sysOn = data.settings.systemNotificationsEnabled;
    const canNotify = typeof Notification !== 'undefined' && Notification.permission === 'granted';

    for (const r of data.reminders) {
      const due = new Date(r.dueAt);
      if (now < due) continue;
      if (r.snoozeUntil && now < new Date(r.snoozeUntil)) continue;
      if (r.silencedForDueAt === r.dueAt) continue;

      const key = `${r.id}:${r.dueAt}`;
      if (!firedKeysRef.current.has(key)) {
        firedKeysRef.current.add(key);
        const petName = r.petId ? petById.get(r.petId)?.name : null;
        const msg = petName ? `${r.title} · ${petName}` : r.title;
        setToasts((prev) => {
          if (prev.some((t) => t.reminderId === r.id && t.dueIso === r.dueAt)) return prev;
          return [...prev, { id: newId(), reminderId: r.id, message: msg, dueIso: r.dueAt }].slice(-5);
        });
        if (sysOn && canNotify) {
          try {
            new Notification('Furries reminder', { body: msg, tag: key });
          } catch {
            /* ignore */
          }
        }
      }
    }
  }, [data.reminders, data.settings.systemNotificationsEnabled, hydrated, petById]);

  useEffect(() => {
    checkDue();
    const ms = Math.max(15, data.settings.reminderPollIntervalSec) * 1000;
    const id = window.setInterval(checkDue, ms);
    return () => window.clearInterval(id);
  }, [checkDue, data.settings.reminderPollIntervalSec]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') checkDue();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [checkDue]);

  const removeToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const snoozeReminder = (reminderId: string, dueIso: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    persist((d) => ({
      ...d,
      reminders: d.reminders.map((r) =>
        r.id === reminderId ? { ...r, snoozeUntil: until, silencedForDueAt: null } : r,
      ),
    }));
    setToasts((t) => t.filter((x) => !(x.reminderId === reminderId && x.dueIso === dueIso)));
  };

  const dismissToastOnly = (reminderId: string, dueIso: string) => {
    persist((d) => ({
      ...d,
      reminders: d.reminders.map((r) =>
        r.id === reminderId ? { ...r, silencedForDueAt: dueIso } : r,
      ),
    }));
    setToasts((t) => t.filter((x) => !(x.reminderId === reminderId && x.dueIso === dueIso)));
  };

  const completeReminder = (reminderId: string, dueIso: string | null) => {
    persist((d) => {
      const r = d.reminders.find((x) => x.id === reminderId);
      if (!r) return d;
      if (r.recurrence.kind === 'once') {
        return { ...d, reminders: d.reminders.filter((x) => x.id !== reminderId) };
      }
      const after = new Date(Math.max(Date.now(), new Date(r.dueAt).getTime()));
      const nextDue = computeNextOccurrence(r.recurrence, after);
      return {
        ...d,
        reminders: d.reminders.map((x) =>
          x.id === reminderId
            ? { ...x, dueAt: nextDue.toISOString(), snoozeUntil: null, silencedForDueAt: null }
            : x,
        ),
      };
    });
    for (const k of [...firedKeysRef.current]) {
      if (k.startsWith(`${reminderId}:`)) firedKeysRef.current.delete(k);
    }
    if (dueIso) {
      setToasts((t) => t.filter((x) => !(x.reminderId === reminderId && x.dueIso === dueIso)));
    } else {
      setToasts((t) => t.filter((x) => x.reminderId !== reminderId));
    }
  };

  const togglePin = (reminderId: string) => {
    persist((d) => ({
      ...d,
      reminders: d.reminders.map((r) => (r.id === reminderId ? { ...r, pinned: !r.pinned } : r)),
    }));
  };

  const addPet = (input: {
    name: string;
    species: string;
    breed: string;
    gender: string;
    birthdate: string;
  }) => {
    const pet: Pet = {
      id: newId(),
      name: input.name.trim() || 'Unnamed',
      species: input.species.trim() || 'Pet',
      breed: input.breed.trim(),
      gender: input.gender.trim(),
      birthdate: input.birthdate.trim(),
      microchip: '',
      profilePhoto: null,
      gallery: [],
      medicalRecords: [],
      foodLog: [],
      sitter: { ...DEFAULT_SITTER },
    };
    persist((d) => ({ ...d, pets: [...d.pets, pet] }));
    setSelectedPetId(pet.id);
    setDetailTab('overview');
    setCreatingPet(false);
  };

  const updatePet = (petId: string, patch: Partial<Pet>) => {
    persist((d) => ({
      ...d,
      pets: d.pets.map((p) => (p.id === petId ? { ...p, ...patch } : p)),
    }));
  };

  const deletePet = (petId: string) => {
    persist((d) => ({
      ...d,
      pets: d.pets.filter((p) => p.id !== petId),
      reminders: d.reminders.filter((r) => r.petId !== petId),
    }));
    setDeletePetId(null);
    if (selectedPetId === petId) {
      setSelectedPetId(null);
    }
  };

  const onProfilePhoto = async (petId: string, file: File | null) => {
    if (!file) return;
    const url = await resizeImageToDataUrl(file);
    if (url) updatePet(petId, { profilePhoto: url });
  };

  const onGalleryAdd = async (petId: string, files: FileList | null) => {
    if (!files?.length) return;
    const pet = petById.get(petId);
    if (!pet) return;
    const room = MAX_GALLERY - pet.gallery.length;
    if (room <= 0) return;
    const next: string[] = [...pet.gallery];
    for (let i = 0; i < Math.min(files.length, room); i++) {
      const f = files[i]!;
      const url = await resizeImageToDataUrl(f);
      if (url) next.push(url);
    }
    updatePet(petId, { gallery: next });
  };

  const removeGalleryPhoto = (petId: string, index: number) => {
    const pet = petById.get(petId);
    if (!pet) return;
    updatePet(petId, { gallery: pet.gallery.filter((_, i) => i !== index) });
  };

  const buildExportInput = (pet: Pet): FurriesCareExportInput => {
    const med = [...pet.medicalRecords]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map((m) => ({
        date: m.date,
        title: m.title,
        notes: m.notes || m.provider,
      }));
    const food = [...pet.foodLog]
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      .slice(0, 12)
      .map((f) => ({
        dateTime: new Date(f.dateTime).toLocaleString(),
        label: f.label,
        amount: f.amount,
      }));
    return {
      petName: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      birthdate: pet.birthdate,
      microchip: pet.microchip,
      profilePhotoDataUrl: pet.profilePhoto,
      sitter: { ...pet.sitter },
      medicalHighlights: med,
      recentFood: food,
    };
  };

  const handleExportPdf = (pet: Pet) => {
    downloadFurriesCarePdf(buildExportInput(pet));
  };

  const handleExportPng = async (pet: Pet) => {
    await downloadFurriesCarePng(buildExportInput(pet));
  };

  return (
    <div className="min-h-screen bg-squirtle-surface text-squirtle-ink">
      <header className="sticky top-0 z-30 border-b-4 border-squirtle-shell bg-squirtle-blue-deep shadow-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {selectedPetId && (
              <button
                type="button"
                onClick={() => setSelectedPetId(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-cream sm:hidden"
                aria-label="All pets"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-squirtle-cream/25 text-white ring-2 ring-squirtle-cream/40">
                <PawPrint className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight truncate">Furries</h1>
                <p className="text-[11px] text-squirtle-cream/90 truncate">
                  {selectedPet ? selectedPet.name : 'Pet health tracker'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-cream"
            aria-expanded={menuOpen}
            aria-controls={menuPanelId}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Furries menu">
          <button
            type="button"
            className="absolute inset-0 bg-squirtle-ink/45 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id={menuPanelId}
            className="absolute right-0 top-0 flex h-full w-full max-w-[min(100%,20rem)] flex-col border-l-4 border-squirtle-shell bg-white shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-squirtle-blue/15 bg-squirtle-surface px-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-squirtle-blue/20 text-squirtle-blue-deep">
                  <PawPrint className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="font-bold text-squirtle-ink text-sm truncate">Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-squirtle-ink hover:bg-squirtle-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-blue-deep"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Furries navigation">
              {selectedPetId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPetId(null);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 py-3 text-left font-medium text-sm text-squirtle-ink transition-colors hover:bg-squirtle-blue/10 hover:border-squirtle-blue/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-blue-deep"
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0 text-squirtle-blue-deep" />
                  All pets & bulletin
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 py-3 text-left font-medium text-sm text-squirtle-ink transition-colors hover:bg-squirtle-blue/10 hover:border-squirtle-blue/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-blue-deep"
              >
                <Settings2 className="h-5 w-5 shrink-0 text-squirtle-shell" />
                Site settings
              </button>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-transparent px-3 py-3 text-left font-medium text-sm text-squirtle-ink transition-colors hover:bg-squirtle-blue/10 hover:border-squirtle-blue/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-blue-deep"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 text-squirtle-blue-deep" />
                Return to Cody Codes
              </Link>
            </nav>
            {session?.user?.email && (
              <div className="shrink-0 border-t border-squirtle-blue/15 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-squirtle-ink/45">
                  Signed in
                </p>
                <p className="text-xs text-squirtle-ink/70 truncate mt-0.5">{session.user.email}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {!selectedPet ? (
          <>
            <section className="rounded-2xl border-2 border-squirtle-blue/40 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-squirtle-blue-deep to-squirtle-blue px-4 py-3 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-white" />
                <h2 className="font-bold text-white text-sm">Bulletin board</h2>
              </div>
              <div className="p-4">
                {bulletinReminders.length === 0 ? (
                  <p className="text-sm text-squirtle-ink/60">
                    No reminders in the next two weeks. Add pets and reminders to see them here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {bulletinReminders.map((r) => {
                      const pet = r.petId ? petById.get(r.petId) : null;
                      const overdue = new Date(r.dueAt).getTime() < Date.now();
                      return (
                        <li
                          key={r.id}
                          className={`rounded-xl border-2 px-3 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                            overdue
                              ? 'border-red-300 bg-red-50/80'
                              : 'border-squirtle-blue/25 bg-squirtle-surface/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {r.pinned && (
                                <Pin className="h-3.5 w-3.5 text-squirtle-shell shrink-0" fill="currentColor" />
                              )}
                              <span className="font-semibold text-squirtle-ink">{r.title}</span>
                              {pet && (
                                <span className="text-xs font-medium text-squirtle-blue-deep bg-squirtle-blue/15 px-2 py-0.5 rounded-full">
                                  {pet.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-squirtle-ink/65 mt-1 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {formatDueLabel(r.dueAt)} · {relativeDue(r.dueAt)}
                              {r.snoozeUntil && new Date() < new Date(r.snoozeUntil) && (
                                <span className="text-amber-700">(snoozed)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => togglePin(r.id)}
                              className="text-xs font-medium px-2 py-1 rounded-lg border border-squirtle-shell/30 hover:bg-squirtle-cream/50"
                            >
                              {r.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => completeReminder(r.id, r.dueAt)}
                              className="text-xs font-medium px-2 py-1 rounded-lg bg-squirtle-blue-deep text-white hover:opacity-90"
                            >
                              Done
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReminderModalPetId(null);
                    setEditingReminder({
                      id: newId(),
                      petId: null,
                      title: '',
                      notes: '',
                      pinned: false,
                      dueAt: new Date().toISOString(),
                      recurrence: { kind: 'once' },
                      snoozeUntil: null,
                      silencedForDueAt: null,
                    });
                  }}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-squirtle-blue-deep hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add reminder
                </button>
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-squirtle-ink">Your pets</h2>
                <button
                  type="button"
                  onClick={() => setCreatingPet(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-squirtle-shell text-white px-4 py-2 text-sm font-semibold shadow hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-cream"
                >
                  <Plus className="h-4 w-4" />
                  Add pet
                </button>
              </div>
              {data.pets.length === 0 ? (
                <p className="text-sm text-squirtle-ink/60 rounded-xl border-2 border-dashed border-squirtle-blue/30 bg-white/80 p-8 text-center">
                  No pets yet. Add one to track health, food, and sitter info.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {data.pets.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPetId(p.id);
                          setDetailTab('overview');
                        }}
                        className="w-full text-left rounded-2xl border-2 border-squirtle-blue/25 bg-white p-4 shadow-sm hover:border-squirtle-blue-deep/40 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-squirtle-blue-deep"
                      >
                        <div className="flex gap-3">
                          <div className="h-16 w-16 rounded-xl overflow-hidden bg-squirtle-surface shrink-0 ring-2 ring-squirtle-cream-deep/50">
                            {p.profilePhoto ? (
                              <img
                                src={p.profilePhoto}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-squirtle-blue">
                                <PawPrint className="h-7 w-7 opacity-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-squirtle-ink truncate">{p.name}</p>
                            <p className="text-sm text-squirtle-ink/65 truncate">{p.species}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <PetDetailView
            pet={selectedPet}
            detailTab={detailTab}
            onTab={setDetailTab}
            onBack={() => setSelectedPetId(null)}
            onUpdate={(patch) => updatePet(selectedPet.id, patch)}
            onDelete={() => setDeletePetId(selectedPet.id)}
            onProfilePhoto={(f) => void onProfilePhoto(selectedPet.id, f)}
            onGalleryAdd={(files) => void onGalleryAdd(selectedPet.id, files)}
            onRemoveGallery={(i) => removeGalleryPhoto(selectedPet.id, i)}
            onExportPdf={() => handleExportPdf(selectedPet)}
            onExportPng={() => void handleExportPng(selectedPet)}
            onAddReminder={() => {
              setReminderModalPetId(selectedPet.id);
              setEditingReminder({
                id: newId(),
                petId: selectedPet.id,
                title: '',
                notes: '',
                pinned: false,
                dueAt: new Date().toISOString(),
                recurrence: { kind: 'once' },
                snoozeUntil: null,
                silencedForDueAt: null,
              });
            }}
            reminders={data.reminders.filter((r) => r.petId === selectedPet.id)}
            onEditReminder={(r) => {
              setEditingReminder(r);
              setReminderModalPetId(selectedPet.id);
            }}
            onDeleteReminder={(id) =>
              persist((d) => ({ ...d, reminders: d.reminders.filter((x) => x.id !== id) }))
            }
            onCompleteReminder={(id, due) => completeReminder(id, due)}
          />
        )}
      </main>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 max-w-md mx-auto sm:left-auto sm:right-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border-2 border-squirtle-shell bg-white shadow-xl p-3 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2">
                <Bell className="h-5 w-5 text-squirtle-blue-deep shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-squirtle-ink flex-1">{t.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg hover:bg-squirtle-surface text-squirtle-ink/60"
                  aria-label="Dismiss toast"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => completeReminder(t.reminderId, t.dueIso)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-squirtle-blue-deep text-white"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => snoozeReminder(t.reminderId, t.dueIso, 30)}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-squirtle-blue/40"
                >
                  Snooze 30m
                </button>
                <button
                  type="button"
                  onClick={() => dismissToastOnly(t.reminderId, t.dueIso)}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-squirtle-shell/40 text-squirtle-shell"
                >
                  Silence this due
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creatingPet && (
        <CreatePetModal
          onClose={() => setCreatingPet(false)}
          onCreate={(input) => addPet(input)}
        />
      )}

      {deletePetId && (
        <ConfirmModal
          title="Delete pet?"
          body="This removes the pet, gallery, logs, and their reminders. This cannot be undone."
          onCancel={() => setDeletePetId(null)}
          onConfirm={() => deletePet(deletePetId)}
        />
      )}

      {editingReminder && (
        <ReminderModal
          reminder={editingReminder}
          pets={data.pets}
          defaultPetId={reminderModalPetId}
          defaultTime={data.settings.defaultReminderTime}
          onClose={() => {
            setEditingReminder(null);
            setReminderModalPetId(null);
          }}
          onSave={(r) => {
            persist((d) => {
              const exists = d.reminders.some((x) => x.id === r.id);
              if (exists) {
                return { ...d, reminders: d.reminders.map((x) => (x.id === r.id ? r : x)) };
              }
              return { ...d, reminders: [...d.reminders, r] };
            });
            setEditingReminder(null);
            setReminderModalPetId(null);
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={data.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(s) => persist((d) => ({ ...d, settings: s }))}
        />
      )}
    </div>
  );
}

function CreatePetModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    species: string;
    breed: string;
    gender: string;
    birthdate: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 border-squirtle-blue/30 p-5 max-h-[min(90vh,640px)] overflow-y-auto">
        <h3 className="font-bold text-squirtle-ink text-lg">New pet</h3>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onCreate({ name, species, breed, gender, birthdate });
          }}
        >
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coco"
              autoFocus
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Species
              <input
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="e.g. Dog, Cat"
              />
            </label>
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Breed
              <input
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Golden retriever"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Gender
              <select
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Not specified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other / unknown</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Birthday
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-squirtle-blue-deep text-white text-sm font-semibold"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border-2 border-red-200 p-5">
        <h3 className="font-bold text-squirtle-ink">{title}</h3>
        <p className="text-sm text-squirtle-ink/70 mt-2">{body}</p>
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ReminderModal({
  reminder,
  pets,
  defaultPetId,
  defaultTime,
  onClose,
  onSave,
}: {
  reminder: Reminder;
  pets: Pet[];
  defaultPetId: string | null;
  defaultTime: string;
  onClose: () => void;
  onSave: (r: Reminder) => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [notes, setNotes] = useState(reminder.notes);
  const [pinned, setPinned] = useState(reminder.pinned);
  const [petId, setPetId] = useState<string | null>(reminder.petId ?? defaultPetId);
  const [recKind, setRecKind] = useState<Recurrence['kind']>(reminder.recurrence.kind);
  const [onceLocal, setOnceLocal] = useState(() => {
    const d = new Date(reminder.dueAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [dailyTime, setDailyTime] = useState(
    reminder.recurrence.kind === 'daily' ? reminder.recurrence.time : defaultTime,
  );
  const [weeklyDay, setWeeklyDay] = useState(
    reminder.recurrence.kind === 'weekly' ? reminder.recurrence.weekday : 1,
  );
  const [weeklyTime, setWeeklyTime] = useState(
    reminder.recurrence.kind === 'weekly' ? reminder.recurrence.time : defaultTime,
  );
  const [monthDay, setMonthDay] = useState(
    reminder.recurrence.kind === 'monthly' ? reminder.recurrence.dayOfMonth : 1,
  );
  const [monthTime, setMonthTime] = useState(
    reminder.recurrence.kind === 'monthly' ? reminder.recurrence.time : defaultTime,
  );

  const buildRecurrence = (): Recurrence => {
    if (recKind === 'once') return { kind: 'once' };
    if (recKind === 'daily') return { kind: 'daily', time: dailyTime };
    if (recKind === 'weekly') return { kind: 'weekly', weekday: weeklyDay, time: weeklyTime };
    return { kind: 'monthly', dayOfMonth: Math.min(28, Math.max(1, monthDay)), time: monthTime };
  };

  const submit = () => {
    const recurrence = buildRecurrence();
    let dueAt: string;
    if (recurrence.kind === 'once') {
      dueAt = new Date(onceLocal).toISOString();
    } else {
      dueAt = computeNextOccurrence(recurrence, new Date()).toISOString();
    }
    onSave({
      ...reminder,
      title: title.trim() || 'Reminder',
      notes: notes.trim(),
      pinned,
      petId,
      recurrence,
      dueAt,
      snoozeUntil: null,
      silencedForDueAt: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 border-squirtle-blue/30 p-5 my-8">
        <h3 className="font-bold text-squirtle-ink text-lg">Reminder</h3>
        <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Notes
            <textarea
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top of bulletin
          </label>
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Pet (optional)
            <select
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
              value={petId ?? ''}
              onChange={(e) => setPetId(e.target.value || null)}
            >
              <option value="">All pets / general</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Repeats
            <select
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
              value={recKind}
              onChange={(e) => setRecKind(e.target.value as Recurrence['kind'])}
            >
              <option value="once">One time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          {recKind === 'once' && (
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Due
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                value={onceLocal}
                onChange={(e) => setOnceLocal(e.target.value)}
              />
            </label>
          )}
          {recKind === 'daily' && (
            <label className="block text-xs font-semibold text-squirtle-ink/80">
              Time
              <input
                type="time"
                className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
              />
            </label>
          )}
          {recKind === 'weekly' && (
            <>
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Weekday
                <select
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(parseInt(e.target.value, 10))}
                >
                  {WEEKDAY_LABELS.map((lb, i) => (
                    <option key={lb} value={i}>
                      {lb}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Time
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                  value={weeklyTime}
                  onChange={(e) => setWeeklyTime(e.target.value)}
                />
              </label>
            </>
          )}
          {recKind === 'monthly' && (
            <>
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Day of month (1–28)
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                  value={monthDay}
                  onChange={(e) => setMonthDay(parseInt(e.target.value, 10) || 1)}
                />
              </label>
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Time
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
                  value={monthTime}
                  onChange={(e) => setMonthTime(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-squirtle-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-squirtle-blue-deep text-white text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: FurriesSettings;
  onClose: () => void;
  onSave: (s: FurriesSettings) => void;
}) {
  const [local, setLocal] = useState<FurriesSettings>(settings);
  const [permHint, setPermHint] = useState('');

  const requestPerm = async () => {
    if (typeof Notification === 'undefined') {
      setPermHint('Notifications not supported in this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      setPermHint('Already allowed.');
      return;
    }
    if (Notification.permission === 'denied') {
      setPermHint('Blocked in browser settings.');
      return;
    }
    const r = await Notification.requestPermission();
    if (r === 'granted') setPermHint('Notifications allowed.');
    else if (r === 'denied') setPermHint('Notifications blocked.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 border-squirtle-blue/30 p-5">
        <h3 className="font-bold text-squirtle-ink text-lg">Site settings</h3>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Reminder check interval (seconds)
            <input
              type="number"
              min={15}
              max={600}
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
              value={local.reminderPollIntervalSec}
              onChange={(e) =>
                setLocal((s) => ({ ...s, reminderPollIntervalSec: parseInt(e.target.value, 10) || 45 }))
              }
            />
          </label>
          <label className="block text-xs font-semibold text-squirtle-ink/80">
            Default time for new recurring reminders
            <input
              type="time"
              className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm"
              value={local.defaultReminderTime}
              onChange={(e) => setLocal((s) => ({ ...s, defaultReminderTime: e.target.value }))}
            />
          </label>
          <div className="rounded-xl border border-squirtle-blue/25 p-3 bg-squirtle-surface/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-squirtle-ink flex items-center gap-2">
                {local.systemNotificationsEnabled ? (
                  <Bell className="h-4 w-4 text-squirtle-blue-deep" />
                ) : (
                  <BellOff className="h-4 w-4 text-squirtle-ink/40" />
                )}
                Browser notifications
              </span>
              <button
                type="button"
                onClick={() => void requestPerm()}
                className="text-xs font-semibold text-squirtle-blue-deep underline"
              >
                Request permission
              </button>
            </div>
            {permHint && <p className="text-xs text-squirtle-ink/65 mt-2">{permHint}</p>}
            <label className="flex items-center gap-2 text-sm mt-2">
              <input
                type="checkbox"
                checked={local.systemNotificationsEnabled}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, systemNotificationsEnabled: e.target.checked }))
                }
              />
              Show system notifications when due (requires permission)
            </label>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(local);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-squirtle-blue-deep text-white text-sm font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function PetDetailView({
  pet,
  detailTab,
  onTab,
  onBack,
  onUpdate,
  onDelete,
  onProfilePhoto,
  onGalleryAdd,
  onRemoveGallery,
  onExportPdf,
  onExportPng,
  onAddReminder,
  reminders,
  onEditReminder,
  onDeleteReminder,
  onCompleteReminder,
}: {
  pet: Pet;
  detailTab: DetailTab;
  onTab: (t: DetailTab) => void;
  onBack: () => void;
  onUpdate: (patch: Partial<Pet>) => void;
  onDelete: () => void;
  onProfilePhoto: (f: File | null) => void;
  onGalleryAdd: (files: FileList | null) => void;
  onRemoveGallery: (index: number) => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onAddReminder: () => void;
  reminders: Reminder[];
  onEditReminder: (r: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onCompleteReminder: (id: string, due: string) => void;
}) {
  const tabs: { id: DetailTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'sitter', label: 'Sitter', icon: FileText },
  ];

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-squirtle-blue/30 bg-white text-squirtle-ink hover:bg-squirtle-surface"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-squirtle-ink truncate">{pet.name}</h2>
          <p className="text-sm text-squirtle-ink/65">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {pet.gender ? ` · ${pet.gender}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-600 p-2 rounded-lg hover:bg-red-50"
          aria-label="Delete pet"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = detailTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                active
                  ? 'border-squirtle-blue-deep bg-squirtle-blue-deep text-white'
                  : 'border-squirtle-blue/25 bg-white text-squirtle-ink hover:border-squirtle-blue/45'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {detailTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative shrink-0">
              <div className="h-32 w-32 rounded-2xl overflow-hidden ring-4 ring-squirtle-cream-deep/60 bg-squirtle-surface">
                {pet.profilePhoto ? (
                  <img src={pet.profilePhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-squirtle-blue/30">
                    <PawPrint className="h-14 w-14" />
                  </div>
                )}
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-squirtle-blue-deep cursor-pointer">
                <Camera className="h-4 w-4" />
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onProfilePhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex-1 space-y-3 w-full min-w-0">
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Name
                <input
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                  value={pet.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-squirtle-ink/80">
                  Species
                  <input
                    className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                    value={pet.species}
                    onChange={(e) => onUpdate({ species: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-semibold text-squirtle-ink/80">
                  Breed
                  <input
                    className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                    value={pet.breed}
                    onChange={(e) => onUpdate({ breed: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-squirtle-ink/80">
                  Gender
                  <select
                    className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                    value={pet.gender}
                    onChange={(e) => onUpdate({ gender: e.target.value })}
                  >
                    <option value="">Not specified</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / unknown</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-squirtle-ink/80">
                  Birthday
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                    value={pet.birthdate}
                    onChange={(e) => onUpdate({ birthdate: e.target.value })}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-squirtle-ink/80">
                Microchip
                <input
                  className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
                  value={pet.microchip}
                  onChange={(e) => onUpdate({ microchip: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-squirtle-shell/30 bg-squirtle-cream/40 p-4">
            <p className="text-sm font-bold text-squirtle-shell mb-2">Sitter handout</p>
            <p className="text-xs text-squirtle-ink/70 mb-3">
              Download a one-page summary for pet sitters (PDF or PNG).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportPdf}
                className="inline-flex items-center gap-2 rounded-xl bg-squirtle-shell text-white px-4 py-2 text-sm font-semibold hover:opacity-95"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={onExportPng}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-squirtle-shell text-squirtle-shell bg-white px-4 py-2 text-sm font-semibold hover:bg-squirtle-cream/50"
              >
                <Download className="h-4 w-4" />
                PNG
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-squirtle-ink text-sm">Reminders for {pet.name}</h3>
              <button
                type="button"
                onClick={onAddReminder}
                className="text-xs font-semibold text-squirtle-blue-deep inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {reminders.length === 0 ? (
              <p className="text-xs text-squirtle-ink/55">No reminders yet.</p>
            ) : (
              <ul className="space-y-2">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-squirtle-blue/25 bg-white px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-squirtle-ink/55">{formatDueLabel(r.dueAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => onCompleteReminder(r.id, r.dueAt)}
                        className="p-1.5 rounded-lg text-squirtle-blue-deep hover:bg-squirtle-surface"
                        aria-label="Done"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditReminder(r)}
                        className="p-1.5 rounded-lg text-squirtle-ink hover:bg-squirtle-surface"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(r.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
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
        </div>
      )}

      {detailTab === 'gallery' && (
        <div>
          <p className="text-sm text-squirtle-ink/65 mb-3">
            Up to {MAX_GALLERY} photos. Large images are resized automatically.
          </p>
          <label className="inline-flex items-center gap-2 rounded-xl bg-squirtle-blue-deep text-white px-4 py-2 text-sm font-semibold cursor-pointer mb-4">
            <Plus className="h-4 w-4" />
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onGalleryAdd(e.target.files)}
            />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pet.gallery.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group ring-2 ring-squirtle-blue/20">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveGallery(i)}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailTab === 'medical' && (
        <MedicalSection pet={pet} onUpdate={onUpdate} />
      )}

      {detailTab === 'food' && <FoodSection pet={pet} onUpdate={onUpdate} />}

      {detailTab === 'sitter' && (
        <div className="space-y-4">
          <SitterFields sitter={pet.sitter} onChange={(s) => onUpdate({ sitter: s })} />
          <div className="rounded-2xl border-2 border-squirtle-blue/25 bg-white p-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-squirtle-shell text-white px-4 py-2 text-sm font-semibold"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onExportPng}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-squirtle-shell text-squirtle-shell px-4 py-2 text-sm font-semibold bg-squirtle-cream/30"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SitterFields({
  sitter,
  onChange,
}: {
  sitter: SitterCare;
  onChange: (s: SitterCare) => void;
}) {
  const field = (key: keyof SitterCare, label: string, multiline?: boolean) => (
    <label className="block text-xs font-semibold text-squirtle-ink/80">
      {label}
      {multiline ? (
        <textarea
          className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm min-h-[80px] bg-white"
          value={sitter[key]}
          onChange={(e) => onChange({ ...sitter, [key]: e.target.value })}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-lg border border-squirtle-blue/30 px-3 py-2 text-sm bg-white"
          value={sitter[key]}
          onChange={(e) => onChange({ ...sitter, [key]: e.target.value })}
        />
      )}
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('emergencyName', 'Emergency contact name')}
        {field('emergencyPhone', 'Emergency phone')}
        {field('vetName', 'Veterinarian / clinic')}
        {field('vetPhone', 'Vet phone')}
      </div>
      {field('feedingSchedule', 'Feeding schedule', true)}
      {field('medications', 'Medications & supplements', true)}
      {field('walkNotes', 'Walks & exercise', true)}
      {field('quirks', 'Behavior & quirks', true)}
      {field('otherNotes', 'Other notes for sitter', true)}
    </div>
  );
}

function MedicalSection({
  pet,
  onUpdate,
}: {
  pet: Pet;
  onUpdate: (patch: Partial<Pet>) => void;
}) {
  const add = () => {
    const rec: MedicalRecord = {
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      title: '',
      notes: '',
      provider: '',
    };
    onUpdate({ medicalRecords: [...pet.medicalRecords, rec] });
  };

  return (
    <div>
      <button
        type="button"
        onClick={add}
        className="mb-4 inline-flex items-center gap-2 rounded-xl bg-squirtle-blue-deep text-white px-4 py-2 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        Add record
      </button>
      <ul className="space-y-3">
        {pet.medicalRecords.map((m) => (
          <li key={m.id} className="rounded-xl border border-squirtle-blue/25 bg-white p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm"
                value={m.date}
                onChange={(e) =>
                  onUpdate({
                    medicalRecords: pet.medicalRecords.map((x) =>
                      x.id === m.id ? { ...x, date: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                className="rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm"
                placeholder="Provider"
                value={m.provider}
                onChange={(e) =>
                  onUpdate({
                    medicalRecords: pet.medicalRecords.map((x) =>
                      x.id === m.id ? { ...x, provider: e.target.value } : x,
                    ),
                  })
                }
              />
            </div>
            <input
              className="w-full rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm font-medium"
              placeholder="Title"
              value={m.title}
              onChange={(e) =>
                onUpdate({
                  medicalRecords: pet.medicalRecords.map((x) =>
                    x.id === m.id ? { ...x, title: e.target.value } : x,
                  ),
                })
              }
            />
            <textarea
              className="w-full rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm min-h-[60px]"
              placeholder="Notes"
              value={m.notes}
              onChange={(e) =>
                onUpdate({
                  medicalRecords: pet.medicalRecords.map((x) =>
                    x.id === m.id ? { ...x, notes: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  medicalRecords: pet.medicalRecords.filter((x) => x.id !== m.id),
                })
              }
              className="text-xs text-red-600 font-medium"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FoodSection({ pet, onUpdate }: { pet: Pet; onUpdate: (patch: Partial<Pet>) => void }) {
  const add = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const entry: FoodEntry = {
      id: newId(),
      dateTime: local,
      label: '',
      amount: '',
      notes: '',
    };
    onUpdate({ foodLog: [...pet.foodLog, entry] });
  };

  return (
    <div>
      <button
        type="button"
        onClick={add}
        className="mb-4 inline-flex items-center gap-2 rounded-xl bg-squirtle-blue-deep text-white px-4 py-2 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        Log meal
      </button>
      <ul className="space-y-3">
        {[...pet.foodLog]
          .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
          .map((f) => (
            <li key={f.id} className="rounded-xl border border-squirtle-blue/25 bg-white p-3 space-y-2">
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm"
                value={f.dateTime}
                onChange={(e) =>
                  onUpdate({
                    foodLog: pet.foodLog.map((x) =>
                      x.id === f.id ? { ...x, dateTime: e.target.value } : x,
                    ),
                  })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm"
                  placeholder="What (e.g. kibble)"
                  value={f.label}
                  onChange={(e) =>
                    onUpdate({
                      foodLog: pet.foodLog.map((x) =>
                        x.id === f.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  className="rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm"
                  placeholder="Amount"
                  value={f.amount}
                  onChange={(e) =>
                    onUpdate({
                      foodLog: pet.foodLog.map((x) =>
                        x.id === f.id ? { ...x, amount: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-squirtle-blue/30 px-2 py-1.5 text-sm min-h-[48px]"
                placeholder="Notes"
                value={f.notes}
                onChange={(e) =>
                  onUpdate({
                    foodLog: pet.foodLog.map((x) =>
                      x.id === f.id ? { ...x, notes: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    foodLog: pet.foodLog.filter((x) => x.id !== f.id),
                  })
                }
                className="text-xs text-red-600 font-medium"
              >
                Remove
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
