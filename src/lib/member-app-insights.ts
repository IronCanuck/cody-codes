import { getChoriosGlanceFromLocalStorage, type ChoriosGlance } from './chorios-due-peek';
import { supabase, type Job } from './supabase';
import { loadSnapshot as loadTaskmasterSnapshot } from './taskmaster-storage';
import type { PersistedSnapshot as TaskmasterSnapshot } from './taskmaster-types';
import {
  fireWatchStorageKeyForUser,
  todayTomorrowDayAfter,
  type Firefighter,
  type FireWatchSnapshot,
  type Platoon,
} from '../FireWatch';

const PLATOON_LABELS: Record<Platoon, string> = {
  A: 'Alpha',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
};

const BUDGET_VERSION = 1 as const;
const FURRIES_VERSION = 1 as const;

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
  if (parsed?.version !== 1) {
    return { lines: [{ label: 'Sticky', value: '—' }], reminder: 'Open Sticky' };
  }
  const noteCount = Array.isArray(parsed.notes) ? parsed.notes.length : 0;
  const catCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;
  const withMedia = Array.isArray(parsed.notes)
    ? parsed.notes.filter((n) => Array.isArray(n.media) && n.media.length > 0).length
    : 0;
  if (noteCount === 0) {
    return {
      lines: [
        { label: 'Categories', value: String(catCount) },
        { label: 'Notes', value: '0' },
      ],
      reminder: 'Drop a sticky onto the neon board',
    };
  }
  return {
    lines: [
      { label: 'Notes', value: String(noteCount) },
      { label: 'Categories', value: String(catCount) },
    ],
    reminder: withMedia > 0 ? `${withMedia} note${withMedia === 1 ? '' : 's'} with images` : null,
  };
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

function platoonCrewLabel(firefighters: Firefighter[], platoon: Platoon): string {
  const crew = firefighters.filter((f) => f.platoon === platoon);
  if (crew.length === 0) return PLATOON_LABELS[platoon];
  const names = crew
    .map((f) => f.name.trim().split(/\s+/)[0])
    .filter(Boolean)
    .slice(0, 2);
  if (names.length === 0) return PLATOON_LABELS[platoon];
  const tail = crew.length > names.length ? ` +${crew.length - names.length}` : '';
  return `${names.join(', ')}${tail}`;
}

function fireWatchInsight(userId: string | undefined): AppInsight {
  const { today, tomorrow, dayAfter } = todayTomorrowDayAfter();
  const snap = userId ? loadFireWatchSnapshot(userId) : null;
  const firefighters = snap?.firefighters ?? [];

  const todayLabel = `${today.platoon} · ${platoonCrewLabel(firefighters, today.platoon)}`;
  const tmrLabel = `${tomorrow.platoon} · ${platoonCrewLabel(firefighters, tomorrow.platoon)}`;
  const nextLabel = `${dayAfter.platoon} · ${platoonCrewLabel(firefighters, dayAfter.platoon)}`;

  const lines = [
    { label: 'Today', value: todayLabel },
    { label: 'Tomorrow', value: tmrLabel },
    { label: dayAfter.weekdayShort, value: nextLabel },
  ];

  let reminder: string | null = null;
  if (firefighters.length === 0) {
    reminder = 'Add crew names by platoon in Fire Watch';
  } else {
    const todayCount = firefighters.filter((f) => f.platoon === today.platoon).length;
    if (todayCount === 0) {
      reminder = `No ${PLATOON_LABELS[today.platoon]} crew saved yet`;
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
  };
}
