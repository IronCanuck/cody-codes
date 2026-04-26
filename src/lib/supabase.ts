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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Job = {
  id: string;
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

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updated_at'> = {
  full_name: '',
  hourly_rate: 25,
  overtime_multiplier: 1.5,
  overtime_threshold_hours: 40,
  pay_period_length_days: 14,
  pay_period_anchor_date: '2026-04-26',
  currency_symbol: '$',
  extra_tax_per_pay_period: 150,
};

export type SavedDailyReport = {
  id: string;
  report_date: string;
  day_start_time: string;
  day_end_time: string;
  day_hours: number;
  job_count: number;
  pdf_storage_path: string | null;
  png_storage_path: string | null;
  created_at: string;
};
