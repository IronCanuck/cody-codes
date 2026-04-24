import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  hourly_rate: number;
  overtime_multiplier: number;
  overtime_threshold_hours: number;
  pay_period_length_days: number;
  pay_period_anchor_date: string;
  currency_symbol: string;
  updated_at: string;
};

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'updated_at'> = {
  hourly_rate: 25,
  overtime_multiplier: 1.5,
  overtime_threshold_hours: 40,
  pay_period_length_days: 14,
  pay_period_anchor_date: '2026-04-26',
  currency_symbol: '$',
};
