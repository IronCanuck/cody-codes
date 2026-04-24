import { PayPeriod } from './earnings';
import { Settings } from './supabase';

/** Label shown in report headers and filenames when the user has not set a name. */
export function reportEmployeeLabel(settings: Settings): string {
  const t = (settings.full_name ?? '').replace(/\s+/g, ' ').trim();
  return t || 'Employee';
}

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function sanitizeSegment(s: string): string {
  return s.replace(INVALID_FILE_CHARS, '').replace(/\s+/g, ' ').trim();
}

function payPeriodDateLabel(period: PayPeriod): string {
  return period.start.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Default download name: "[Full name] [date] Hours Tracker" (no app branding).
 * If full name is empty, uses "[date] Hours Tracker" only.
 */
export function payPeriodHoursTrackerFilename(
  settings: Settings,
  period: PayPeriod,
  ext: 'pdf' | 'png',
): string {
  const datePart = payPeriodDateLabel(period);
  const name = sanitizeSegment(settings.full_name ?? '');
  const base = name ? `${name} ${datePart} Hours Tracker` : `${datePart} Hours Tracker`;
  return `${base}.${ext}`;
}
