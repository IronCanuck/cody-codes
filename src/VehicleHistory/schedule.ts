import { parseOdometer } from './storage';
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  ScheduleDueInfo,
  ScheduleStatus,
  Vehicle,
  VehicleHistorySettings,
} from './types';

const MS_PER_DAY = 86_400_000;

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(targetISO: string, todayISO: string): number {
  const a = new Date(targetISO);
  const b = new Date(todayISO);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickLastRecord(records: MaintenanceRecord[], serviceType: string): MaintenanceRecord | null {
  const wanted = serviceType.trim().toLowerCase();
  if (!wanted) return null;
  const matching = records
    .filter((r) => r.serviceType.trim().toLowerCase() === wanted)
    .filter((r) => Boolean(r.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return matching[0] ?? null;
}

export function evaluateSchedule(
  schedule: MaintenanceSchedule,
  records: MaintenanceRecord[],
  currentOdometer: number | null,
  settings: VehicleHistorySettings,
): ScheduleDueInfo {
  const last = pickLastRecord(records, schedule.serviceType);
  const today = todayISO();

  let nextDueDate: string | null = null;
  let daysUntilDue: number | null = null;
  if (schedule.everyMonths && last?.date) {
    nextDueDate = addMonthsISO(last.date, schedule.everyMonths);
    daysUntilDue = nextDueDate ? daysBetween(nextDueDate, today) : null;
  }

  let nextDueDistance: number | null = null;
  let distanceUntilDue: number | null = null;
  if (schedule.everyDistance) {
    const lastOdo = last ? parseOdometer(last.odometer) : null;
    if (lastOdo !== null) {
      nextDueDistance = lastOdo + schedule.everyDistance;
      if (currentOdometer !== null) {
        distanceUntilDue = nextDueDistance - currentOdometer;
      }
    }
  }

  let status: ScheduleStatus = 'ok';
  if (!last) {
    status = 'no-history';
  } else {
    const overdueByDays = daysUntilDue !== null && daysUntilDue < 0;
    const overdueByDistance = distanceUntilDue !== null && distanceUntilDue < 0;
    const dueSoonByDays =
      daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= settings.dueSoonDays;
    const dueSoonByDistance =
      distanceUntilDue !== null &&
      distanceUntilDue >= 0 &&
      distanceUntilDue <= settings.dueSoonDistance;
    if (overdueByDays || overdueByDistance) status = 'overdue';
    else if (dueSoonByDays || dueSoonByDistance) status = 'due-soon';
    else status = 'ok';
  }

  return {
    schedule,
    lastRecord: last,
    nextDueDate,
    nextDueDistance,
    status,
    daysUntilDue,
    distanceUntilDue,
  };
}

export function evaluateVehicleSchedules(
  vehicle: Vehicle,
  settings: VehicleHistorySettings,
): ScheduleDueInfo[] {
  const odo = parseOdometer(vehicle.odometer);
  return vehicle.schedules.map((s) => evaluateSchedule(s, vehicle.records, odo, settings));
}

/** Soonest non-ok status for a vehicle (overdue > due-soon > no-history > ok). */
export function worstStatus(infos: ScheduleDueInfo[]): ScheduleStatus | null {
  if (infos.length === 0) return null;
  const order: ScheduleStatus[] = ['overdue', 'due-soon', 'no-history', 'ok'];
  for (const candidate of order) {
    if (infos.some((i) => i.status === candidate)) return candidate;
  }
  return 'ok';
}
