import { useOutletContext } from 'react-router-dom';
import type { Job, Settings as SettingsType } from './supabase';

export type JobTrackerOutletContext = {
  jobs: Job[];
  settings: SettingsType | null;
  loading: boolean;
  editing: Job | null;
  setEditing: (j: Job | null) => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onEdit: (j: Job) => void;
  onDelete: (id: string) => void;
  onSettingsSave: (next: SettingsType) => Promise<void>;
  onReportSuccess: (m: string) => void;
  onEarningsSuccess: (m: string) => void;
};

export function useJobTrackerOutlet() {
  return useOutletContext<JobTrackerOutletContext>();
}
