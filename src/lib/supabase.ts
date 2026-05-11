import { createClient } from '@supabase/supabase-js';

/** Public project URL; matches production Supabase project (env still required on CI for overrides). */
const DEFAULT_SUPABASE_URL = 'https://nxaidsisoauzhpdkaixm.supabase.co';

const REMEMBER_PREF_KEY = 'sb-auth-remember-me';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Set it in .env locally and in Vercel → Settings → Environment Variables, then redeploy.',
  );
}

function persistAuthSessionAcrossRestarts(): boolean {
  const pref = localStorage.getItem(REMEMBER_PREF_KEY);
  if (pref === '0') return false;
  return true;
}

/**
 * Call immediately before `signInWithPassword` (and similar). When false, the
 * session is kept in sessionStorage only and ends when the browser session ends.
 */
export function setAuthPersistSession(persist: boolean): void {
  localStorage.setItem(REMEMBER_PREF_KEY, persist ? '1' : '0');
}

export function clearAuthPersistPreference(): void {
  localStorage.removeItem(REMEMBER_PREF_KEY);
}

const authSessionStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    if (persistAuthSessionAcrossRestarts()) return localStorage.getItem(key);
    return sessionStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    if (persistAuthSessionAcrossRestarts()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

/** Matches SupabaseClient default: `sb-<project-ref>-auth-token` */
function supabaseAuthStorageRootKey(): string {
  const host = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${host}-auth-token`;
}

/**
 * Wipes persisted auth keys from both localStorage and sessionStorage (via the
 * custom adapter). Use when `signOut()` fails before the client clears storage
 * (e.g. network error on the logout request).
 */
export function clearSupabaseAuthStorage(): void {
  const root = supabaseAuthStorageRootKey();
  authSessionStorage.removeItem(root);
  authSessionStorage.removeItem(`${root}-code-verifier`);
  authSessionStorage.removeItem(`${root}-user`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Company = {
  id: string;
  name: string;
  /** Currently informational; reserved for future per-company theming. */
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  company_id: string | null;
  job_date: string;
  start_time: string;
  end_time: string;
  hours_worked: number;
  activity: string;
  site: string;
  notes: string;
  created_at: string;
};

export type JobInput = Omit<Job, 'id' | 'created_at'>;

export type Settings = {
  id: string;
  company_id: string | null;
  full_name: string;
  hourly_rate: number;
  overtime_multiplier: number;
  overtime_threshold_hours: number;
  pay_period_length_days: number;
  pay_period_anchor_date: string;
  currency_symbol: string;
  extra_tax_per_pay_period: number;
  updated_at: string;
};

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'company_id' | 'updated_at'> = {
  full_name: '',
  hourly_rate: 25,
  overtime_multiplier: 1.5,
  overtime_threshold_hours: 40,
  pay_period_length_days: 14,
  pay_period_anchor_date: '2026-04-26',
  currency_symbol: '$',
  extra_tax_per_pay_period: 150,
};

export type FlhaRiskLevel = 'low' | 'medium' | 'high';

export type FlhaHazard = {
  /** Stable id used for React keys; not persisted to Supabase. */
  id?: string;
  description: string;
  risk_level: FlhaRiskLevel;
  controls: string;
};

/** Standard PPE items shown as checkboxes in the FLHA modal. */
export const FLHA_PPE_OPTIONS: readonly string[] = [
  'Hard hat',
  'Safety glasses',
  'Hi-vis vest',
  'Gloves',
  'Steel-toe boots',
  'Hearing protection',
  'Fall protection',
  'Respirator',
  'Face shield',
  'FR clothing',
];

export type Flha = {
  id: string;
  company_id: string | null;
  /** Null while the FLHA is attached only to a draft task block on the Log page. */
  job_id: string | null;
  /** Stable client-generated id of the JobForm task block this FLHA was drafted from. */
  client_task_key: string | null;
  assessment_date: string;
  location: string;
  task_description: string;
  hazards: FlhaHazard[];
  ppe_required: string[];
  additional_notes: string;
  worker_name: string;
  supervisor_name: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FlhaInput = Omit<Flha, 'id' | 'created_at' | 'updated_at'>;

/**
 * Target for the FLHA modal. Either a saved Job row (from History/Earnings) or a
 * draft task block on the Log page that hasn't been persisted as a job yet.
 */
export type FlhaTarget =
  | { kind: 'job'; job: Job }
  | {
      kind: 'task';
      clientTaskKey: string;
      workDate: string;
      activity: string;
      site: string;
    };

export type SavedDailyReport = {
  id: string;
  company_id: string | null;
  report_date: string;
  day_start_time: string;
  day_end_time: string;
  day_hours: number;
  job_count: number;
  pdf_storage_path: string | null;
  png_storage_path: string | null;
  created_at: string;
};
