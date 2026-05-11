import { useOutletContext } from 'react-router-dom';
import type { Company, Job, Settings as SettingsType, SavedDailyReport, Flha } from './supabase';

export type JobTrackerOutletContext = {
  jobs: Job[];
  flhas: Flha[];
  onOpenFlha: (j: Job) => void;
  dailyReports: SavedDailyReport[];
  /** True until the first fetch of `saved_daily_reports` finishes (success or error). */
  dailyReportsLoading: boolean;
  /** Set when the archive query fails (e.g. missing table or RLS). Null if ok. */
  dailyReportsError: string | null;
  settings: SettingsType | null;
  loading: boolean;
  editing: Job | null;
  setEditing: (j: Job | null) => void;
  /** Active company (drives all data scoping); null until a company is created/selected. */
  activeCompanyId: string | null;
  activeCompany: Company | null;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onEdit: (j: Job) => void;
  onDelete: (id: string) => void;
  /** Remove every job entry for a calendar work day (earnings / daily summary). */
  onDeleteJobsForDate: (date: string) => Promise<void>;
  /** Copy all job entries from one calendar day to another (earnings duplicate modal). Resolves true if rows were inserted. */
  onDuplicateDay: (sourceDate: string, targetDate: string) => Promise<boolean>;
  onSettingsSave: (next: SettingsType) => Promise<void>;
  onReportSuccess: (m: string) => void;
  onEarningsSuccess: (m: string) => void;
};

export function useJobTrackerOutlet() {
  return useOutletContext<JobTrackerOutletContext>();
}
