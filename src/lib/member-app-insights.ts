import { getChoriosGlanceFromLocalStorage, type ChoriosGlance } from './chorios-due-peek';
import { supabase, type Job } from './supabase';
import { loadTaskMasterSnapshot as loadTaskmasterSnapshot, type TaskMasterSnapshot as TaskmasterSnapshot } from '../TaskMaster';
import {
  fireWatchStorageKeyForUser,
  todayTomorrowDayAfter,
  type Firefighter,
  type FireWatchSnapshot,
  type ShiftCode,
} from '../FireWatch';

const BUDGET_VERSION = 1 as const;
const FURRIES_VERSION = 1 as const;
const INVENTORY_VERSION = 1 as const;
const VEHICLE_HISTORY_VERSION = 1 as const;
const FAMILY_TREE_VERSION = 1 as const;

export type AppInsight = {
  lines: { label: string; value: string }[];
  reminder: string | null;
};

function taskStats(snapshot: TaskmasterSnapshot): { total: number; open: number; highOpen: number; projects: number } {
  let total = 0;
  let open = 0;
  let highOpen = 0;
  for (const p of snapshot.projects) {
    const doneColIds = new Set(
      p.columns.filter((c) => c.title.trim().toLowerCase() === 'done').map((c) => c.id),
    );
    const hasDone = doneColIds.size > 0;
    for (const t of p.tasks) {
      total += 1;
      const inDone = hasDone && doneColIds.has(t.columnId);
      if (!inDone) {
        open += 1;
        if (t.priority === 'high') highOpen += 1;
      }
    }
  }
  return { total, open, highOpen, projects: snapshot.projects.length };
}

async function consaltyInsight(): Promise<AppInsight> {
  const { data, error } = await supabase.from('jobs').select('job_date, hours_worked');
  if (error) {
    return { lines: [{ label: 'Status', value: "Couldn't load shifts" }], reminder: 'Open Consalty to reconnect' };
  }
  const jobs = (data || []) as Job[];
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutStr = cutoff.toISOString().slice(0, 10);
  const recent = jobs.filter((j) => j.job_date >= cutStr);
  const hours = recent.reduce((s, j) => s + (Number((j as Job).hours_worked) || 0), 0);
  if (jobs.length === 0) {
    return {
      lines: [
        { label: 'This week', value: 'No shifts yet' },
        { label: 'Total logged', value: '0' },
      ],
      reminder: 'Log your first shift in Consalty',
    };
  }
  return {
    lines: [
      { label: 'Last 7 days', value: `${recent.length} shift${recent.length === 1 ? '' : 's'} · ${hours.toFixed(1)} h` },
      { label: 'All time', value: `${jobs.length} shift${jobs.length === 1 ? '' : 's'}` },
    ],
    reminder: recent.length === 0 ? 'No shifts this week — log or review history' : null,
  };
}

function taskmasterInsight(userId: string | undefined): AppInsight {
  if (!userId) {
    return { lines: [{ label: '', value: 'Sign in to load boards' }], reminder: null };
  }
  const snap = loadTaskmasterSnapshot(userId);
  if (!snap) {
    return {
      lines: [
        { label: 'Boards', value: 'Not set up yet' },
        { label: 'Tasks', value: '—' },
      ],
      reminder: 'Open Task Master to create your first project',
    };
  }
  const { total, open, highOpen: high } = taskStats(snap);
  if (total === 0) {
    return {
      lines: [
        { label: 'Projects', value: String(snap.projects.length) },
        { label: 'Tasks', value: '0' },
      ],
      reminder: 'Add a task to your board',
    };
  }
  return {
    lines: [
      { label: 'Projects', value: String(snap.projects.length) },
      { label: 'Open tasks', value: `${open} of ${total}` },
    ],
    reminder: high > 0 ? `${high} high-priority task${high === 1 ? '' : 's'} in the queue` : null,
  };
}

function linesFromChorios(g: ChoriosGlance): { lines: { label: string; value: string }[]; reminder: string | null } {
  if (g.total === 0) {
    return { lines: [{ label: 'Chores', value: '0 tracked' }], reminder: g.reminder };
  }
  return {
    lines: [
      { label: 'Chores', value: String(g.total) },
      { label: 'Due now', value: g.dueNow > 0 ? String(g.dueNow) : 'None' },
    ],
    reminder: g.reminder,
  };
}

function choriosInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: '—' }], reminder: null };
  const g = getChoriosGlanceFromLocalStorage(userId);
  if (!g) {
    return {
      lines: [{ label: 'Chores', value: 'Not set up' }],
      reminder: 'Open Chorios to add your schedule',
    };
  }
  return linesFromChorios(g);
}

type FurriesSnap = { version: number; pets: { id: string }[]; reminders: { id: string }[] };

function furriesInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load pets' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`furries:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return { lines: [{ label: 'Pets', value: '—' }], reminder: 'Open Furries to add a pet profile' };
  }
  let parsed: FurriesSnap;
  try {
    parsed = JSON.parse(raw) as FurriesSnap;
  } catch {
    return { lines: [{ label: 'Pets', value: '—' }], reminder: null };
  }
  if (parsed?.version !== FURRIES_VERSION || !Array.isArray(parsed.pets)) {
    return { lines: [{ label: 'Pets', value: '—' }], reminder: 'Open Furries' };
  }
  const nPet = parsed.pets.length;
  const nRem = Array.isArray(parsed.reminders) ? parsed.reminders.length : 0;
  return {
    lines: [
      { label: 'Pets', value: nPet ? String(nPet) : '0' },
      { label: 'Reminders', value: nRem ? String(nRem) : '0' },
    ],
    reminder: nRem > 0 ? `${nRem} active reminder${nRem === 1 ? '' : 's'}` : nPet > 0 ? 'Review pet care in Furries' : null,
  };
}

type BudgetSnap = {
  version: number;
  transactions: { date: string; kind: 'income' | 'expense' }[];
  bankAccounts: { id: string }[];
  savingsGoals: { current: number; target: number }[];
};

function budgetPalInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load budget' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`budgetpal:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return { lines: [{ label: 'Accounts', value: '—' }], reminder: 'Open Budget Pal to set up profiles' };
  }
  let parsed: BudgetSnap;
  try {
    parsed = JSON.parse(raw) as BudgetSnap;
  } catch {
    return { lines: [], reminder: null };
  }
  if (parsed?.version !== BUDGET_VERSION) {
    return { lines: [{ label: 'Budget', value: '—' }], reminder: 'Open Budget Pal' };
  }
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = ym(new Date());
  const tx = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const monthCount = tx.filter((t) => t.date && t.date.slice(0, 7) === thisMonth).length;
  const acct = Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts.length : 0;
  const goals = Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [];
  const inProgress = goals.filter((g) => g.current < g.target).length;
  return {
    lines: [
      { label: 'This month', value: `${monthCount} transaction${monthCount === 1 ? '' : 's'}` },
      { label: 'Accounts', value: String(acct) },
    ],
    reminder: inProgress > 0 ? `${inProgress} savings goal${inProgress === 1 ? '' : 's'} in progress` : null,
  };
}

type PlantBasedMenuSnap = {
  version: number;
  ingredients: { id: string }[];
  recipes: { id: string; baseServings: number; ingredients: { id: string }[] }[];
};

function plantBasedMenuInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load recipes' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`plantbasedmenu:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return {
      lines: [{ label: 'Recipes', value: 'Not set up' }],
      reminder: 'Open Plant-Based Menu to add your first recipe',
    };
  }
  let parsed: PlantBasedMenuSnap;
  try {
    parsed = JSON.parse(raw) as PlantBasedMenuSnap;
  } catch {
    return { lines: [{ label: 'Recipes', value: '—' }], reminder: null };
  }
  if (parsed?.version !== 1) {
    return { lines: [{ label: 'Menu', value: '—' }], reminder: 'Open Plant-Based Menu' };
  }

  const recipeCount = Array.isArray(parsed.recipes) ? parsed.recipes.length : 0;
  const ingredientCount = Array.isArray(parsed.ingredients) ? parsed.ingredients.length : 0;
  const avgServings =
    recipeCount > 0
      ? Math.round(
          (parsed.recipes.reduce((sum, recipe) => sum + (Number(recipe.baseServings) || 0), 0) / recipeCount) *
            10,
        ) / 10
      : 0;
  return {
    lines: [
      { label: 'Recipes', value: String(recipeCount) },
      { label: 'Ingredients', value: String(ingredientCount) },
    ],
    reminder:
      recipeCount > 0
        ? `Average base servings: ${avgServings}`
        : 'Build your first recipe and scale for any group size',
  };
}

type StickySnap = {
  version: number;
  notes: { id: string; categoryId: string | null; updatedAt: string; media: unknown[] }[];
  categories: { id: string }[];
  boards?: { id: string; name: string }[];
};

function stickyInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load notes' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`sticky:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return {
      lines: [{ label: 'Notes', value: 'Not set up' }],
      reminder: 'Open Sticky to add your first reminder',
    };
  }
  let parsed: StickySnap;
  try {
    parsed = JSON.parse(raw) as StickySnap;
  } catch {
    return { lines: [{ label: 'Notes', value: '—' }], reminder: null };
  }
  if (parsed?.version !== 1 && parsed?.version !== 2) {
    return { lines: [{ label: 'Sticky', value: '—' }], reminder: 'Open Sticky' };
  }
  const noteCount = Array.isArray(parsed.notes) ? parsed.notes.length : 0;
  const boardCount = Array.isArray(parsed.boards) ? parsed.boards.length : 1;
  const withMedia = Array.isArray(parsed.notes)
    ? parsed.notes.filter((n) => Array.isArray(n.media) && n.media.length > 0).length
    : 0;
  if (noteCount === 0) {
    return {
      lines: [
        { label: 'Boards', value: String(boardCount) },
        { label: 'Notes', value: '0' },
      ],
      reminder: 'Drop a sticky onto the neon board',
    };
  }
  return {
    lines: [
      { label: 'Notes', value: String(noteCount) },
      { label: 'Boards', value: String(boardCount) },
    ],
    reminder: withMedia > 0 ? `${withMedia} note${withMedia === 1 ? '' : 's'} with images` : null,
  };
}

type InventorySnap = {
  version: number;
  products: { id: string; company: string; photos: unknown[]; serials: unknown[] }[];
};

function inventoryDatabaseInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load inventory' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`inventorydb:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return {
      lines: [{ label: 'Products', value: 'Not set up' }],
      reminder: 'Open Inventory Database to add your first item',
    };
  }
  let parsed: InventorySnap;
  try {
    parsed = JSON.parse(raw) as InventorySnap;
  } catch {
    return { lines: [{ label: 'Products', value: '—' }], reminder: null };
  }
  if (parsed?.version !== INVENTORY_VERSION || !Array.isArray(parsed.products)) {
    return { lines: [{ label: 'Inventory', value: '—' }], reminder: 'Open Inventory Database' };
  }
  const total = parsed.products.length;
  if (total === 0) {
    return {
      lines: [{ label: 'Products', value: '0' }],
      reminder: 'Add your first product',
    };
  }
  const byCompany: Record<string, number> = {};
  let withPhotos = 0;
  for (const p of parsed.products) {
    const key = typeof p.company === 'string' ? p.company : 'Personal';
    byCompany[key] = (byCompany[key] ?? 0) + 1;
    if (Array.isArray(p.photos) && p.photos.length > 0) withPhotos += 1;
  }
  const topCompany = Object.entries(byCompany).sort((a, b) => b[1] - a[1])[0];
  return {
    lines: [
      { label: 'Products', value: String(total) },
      {
        label: 'Top company',
        value: topCompany ? `${topCompany[0]} · ${topCompany[1]}` : '—',
      },
    ],
    reminder:
      withPhotos < total
        ? `${total - withPhotos} product${total - withPhotos === 1 ? '' : 's'} missing photos`
        : 'All products have photos',
  };
}

type FamilyTreeSnap = {
  version: number;
  members: { id: string; deathDate?: string }[];
  albums: { id: string }[];
  media: { id: string; kind: 'photo' | 'video'; taggedMemberIds?: string[] }[];
};

function familyTreeInsight(userId: string | undefined): AppInsight {
  if (!userId) return { lines: [{ label: '', value: 'Sign in to load your tree' }], reminder: null };
  let raw: string | null;
  try {
    raw = localStorage.getItem(`familytree:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return {
      lines: [{ label: 'Family tree', value: 'Not set up' }],
      reminder: 'Open Family Tree to add your first member',
    };
  }
  let parsed: FamilyTreeSnap;
  try {
    parsed = JSON.parse(raw) as FamilyTreeSnap;
  } catch {
    return { lines: [{ label: 'Family tree', value: '—' }], reminder: null };
  }
  if (parsed?.version !== FAMILY_TREE_VERSION) {
    return { lines: [{ label: 'Family tree', value: '—' }], reminder: 'Open Family Tree' };
  }
  const memberCount = Array.isArray(parsed.members) ? parsed.members.length : 0;
  const albumCount = Array.isArray(parsed.albums) ? parsed.albums.length : 0;
  const photoCount = Array.isArray(parsed.media)
    ? parsed.media.filter((m) => m.kind === 'photo').length
    : 0;
  const videoCount = Array.isArray(parsed.media)
    ? parsed.media.filter((m) => m.kind === 'video').length
    : 0;
  if (memberCount === 0 && albumCount === 0) {
    return {
      lines: [{ label: 'Family tree', value: 'Empty' }],
      reminder: 'Open Family Tree to add your first member',
    };
  }
  const untaggedMedia = Array.isArray(parsed.media)
    ? parsed.media.filter((m) => !Array.isArray(m.taggedMemberIds) || m.taggedMemberIds.length === 0).length
    : 0;
  return {
    lines: [
      { label: 'Members', value: String(memberCount) },
      { label: 'Albums', value: `${albumCount} · ${photoCount + videoCount} memories` },
    ],
    reminder:
      memberCount > 0 && untaggedMedia > 0
        ? `${untaggedMedia} ${untaggedMedia === 1 ? 'memory' : 'memories'} still need tagging`
        : albumCount === 0
        ? 'Create an album to start curating memories'
        : null,
  };
}

type VehicleHistorySnap = {
  version: number;
  vehicles: {
    id: string;
    nickname?: string;
    year?: string;
    make?: string;
    model?: string;
    odometer?: string;
    odometerUnit?: string;
    records?: { id: string; date?: string; serviceType?: string; odometer?: string }[];
    schedules?: {
      id: string;
      serviceType?: string;
      everyDistance?: number | null;
      everyMonths?: number | null;
    }[];
  }[];
  settings?: { dueSoonDays?: number; dueSoonDistance?: number };
};

function parseOdoNum(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function vehicleHistoryInsight(userId: string | undefined): AppInsight {
  if (!userId) {
    return { lines: [{ label: '', value: 'Sign in to load vehicles' }], reminder: null };
  }
  let raw: string | null;
  try {
    raw = localStorage.getItem(`vehiclehistory:${userId}`);
  } catch {
    return { lines: [{ label: 'Status', value: "Couldn't read data" }], reminder: null };
  }
  if (!raw) {
    return {
      lines: [{ label: 'Vehicles', value: 'Not set up' }],
      reminder: 'Open Vehicle History to add your first vehicle',
    };
  }
  let parsed: VehicleHistorySnap;
  try {
    parsed = JSON.parse(raw) as VehicleHistorySnap;
  } catch {
    return { lines: [{ label: 'Vehicles', value: '—' }], reminder: null };
  }
  if (parsed?.version !== VEHICLE_HISTORY_VERSION || !Array.isArray(parsed.vehicles)) {
    return { lines: [{ label: 'Vehicles', value: '—' }], reminder: 'Open Vehicle History' };
  }
  const total = parsed.vehicles.length;
  if (total === 0) {
    return { lines: [{ label: 'Vehicles', value: '0' }], reminder: 'Add your first vehicle' };
  }

  const dueSoonDays = parsed.settings?.dueSoonDays ?? 30;
  const dueSoonDistance = parsed.settings?.dueSoonDistance ?? 500;
  const todayMs = Date.now();
  const MS_DAY = 86_400_000;

  let overdue = 0;
  let dueSoon = 0;
  let recordCount = 0;

  for (const v of parsed.vehicles) {
    const records = Array.isArray(v.records) ? v.records : [];
    const schedules = Array.isArray(v.schedules) ? v.schedules : [];
    recordCount += records.length;
    const currentOdo = parseOdoNum(v.odometer);

    for (const s of schedules) {
      const wanted = (s.serviceType || '').trim().toLowerCase();
      if (!wanted) continue;
      const matches = records
        .filter((r) => (r.serviceType || '').trim().toLowerCase() === wanted)
        .filter((r) => Boolean(r.date))
        .sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1));
      const last = matches[0];
      if (!last) continue;

      let isOverdue = false;
      let isDueSoon = false;

      if (s.everyMonths && last.date) {
        const d = new Date(last.date);
        if (!Number.isNaN(d.getTime())) {
          d.setMonth(d.getMonth() + s.everyMonths);
          const daysUntil = Math.round((d.getTime() - todayMs) / MS_DAY);
          if (daysUntil < 0) isOverdue = true;
          else if (daysUntil <= dueSoonDays) isDueSoon = true;
        }
      }
      if (s.everyDistance) {
        const lastOdo = parseOdoNum(last.odometer);
        if (lastOdo !== null && currentOdo !== null) {
          const distRemaining = lastOdo + s.everyDistance - currentOdo;
          if (distRemaining < 0) isOverdue = true;
          else if (distRemaining <= dueSoonDistance) isDueSoon = true;
        }
      }

      if (isOverdue) overdue += 1;
      else if (isDueSoon) dueSoon += 1;
    }
  }

  const lines: { label: string; value: string }[] = [
    { label: 'Vehicles', value: String(total) },
  ];
  if (overdue > 0) {
    lines.push({ label: 'Overdue', value: String(overdue) });
  } else if (dueSoon > 0) {
    lines.push({ label: 'Due soon', value: String(dueSoon) });
  } else {
    lines.push({ label: 'Records', value: String(recordCount) });
  }

  let reminder: string | null = null;
  if (overdue > 0) {
    reminder = `${overdue} overdue service${overdue === 1 ? '' : 's'} — schedule them soon`;
  } else if (dueSoon > 0) {
    reminder = `${dueSoon} service${dueSoon === 1 ? '' : 's'} coming up`;
  } else if (recordCount === 0) {
    reminder = 'Log your first service record';
  }

  return { lines, reminder };
}

function loadFireWatchSnapshot(userId: string): FireWatchSnapshot | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(fireWatchStorageKeyForUser(userId));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FireWatchSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.firefighters)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function shiftCrewLabel(firefighters: Firefighter[], shift: ShiftCode): string {
  const crew = firefighters.filter((f) => f.shift === shift);
  if (crew.length === 0) return 'No crew yet';
  const names = crew
    .map((f) => f.name.trim().split(/\s+/)[0])
    .filter(Boolean)
    .slice(0, 2);
  if (names.length === 0) return 'No crew yet';
  const tail = crew.length > names.length ? ` +${crew.length - names.length}` : '';
  return `${names.join(', ')}${tail}`;
}

function fireWatchInsight(userId: string | undefined): AppInsight {
  const { today, tomorrow, dayAfter } = todayTomorrowDayAfter();
  const snap = userId ? loadFireWatchSnapshot(userId) : null;
  const firefighters = snap?.firefighters ?? [];

  const lines = [
    {
      label: `Today · ${today.monthDay} · ${today.shift}`,
      value: shiftCrewLabel(firefighters, today.shift),
    },
    {
      label: `Tomorrow · ${tomorrow.monthDay} · ${tomorrow.shift}`,
      value: shiftCrewLabel(firefighters, tomorrow.shift),
    },
    {
      label: `${dayAfter.weekdayShort} · ${dayAfter.monthDay} · ${dayAfter.shift}`,
      value: shiftCrewLabel(firefighters, dayAfter.shift),
    },
  ];

  let reminder: string | null = null;
  if (firefighters.length === 0) {
    reminder = 'Add crew names by shift in Fire Watch';
  } else {
    const todayCount = firefighters.filter((f) => f.shift === today.shift).length;
    if (todayCount === 0) {
      reminder = `No crew saved for ${today.shift} Shift yet`;
    }
  }
  return { lines, reminder };
}

export type AllMemberAppInsights = Record<string, AppInsight>;

export async function loadMemberAppInsights(userId: string | undefined): Promise<AllMemberAppInsights> {
  const consalty = await consaltyInsight();
  return {
    consalty,
    taskmaster: taskmasterInsight(userId),
    chorios: choriosInsight(userId),
    furries: furriesInsight(userId),
    'plant-based-menu': plantBasedMenuInsight(userId),
    'budget-pal': budgetPalInsight(userId),
    'fire-watch': fireWatchInsight(userId),
    sticky: stickyInsight(userId),
    'inventory-database': inventoryDatabaseInsight(userId),
    'family-tree': familyTreeInsight(userId),
    'vehicle-history': vehicleHistoryInsight(userId),
  };
}
