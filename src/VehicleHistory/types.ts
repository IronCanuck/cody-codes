export const VEHICLE_HISTORY_STORAGE_VERSION = 1 as const;

export const ODOMETER_UNITS = ['mi', 'km'] as const;
export type OdometerUnit = (typeof ODOMETER_UNITS)[number];

export const FUEL_TYPES = [
  'Gasoline',
  'Diesel',
  'Hybrid',
  'Plug-in hybrid',
  'Electric',
  'LPG',
  'Other',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export type VehiclePhoto = {
  id: string;
  dataUrl: string;
  mime: string;
  name: string;
  width: number;
  height: number;
};

export type MaintenanceRecord = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Free-form odometer reading at time of service. */
  odometer: string;
  serviceType: string;
  vendor: string;
  cost: string;
  notes: string;
};

export type MaintenanceSchedule = {
  id: string;
  serviceType: string;
  /** Interval in distance units (vehicle.odometerUnit). 0 / empty = not used. */
  everyDistance: number | null;
  /** Interval in months. 0 / empty = not used. */
  everyMonths: number | null;
  notes: string;
};

export type Vehicle = {
  id: string;
  nickname: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string;
  color: string;
  vin: string;
  licensePlate: string;
  fuelType: FuelType;
  transmission: string;
  /** Free-form current reading kept in step with `odometerUnit`. */
  odometer: string;
  odometerUnit: OdometerUnit;
  purchaseDate: string;
  purchasePrice: string;
  insurer: string;
  policyNumber: string;
  registrationExpires: string;
  notes: string;
  photos: VehiclePhoto[];
  records: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  createdAt: string;
  updatedAt: string;
};

export type VehicleHistorySettings = {
  defaultOdometerUnit: OdometerUnit;
  defaultFuelType: FuelType;
  /** Soft-warn days before a date-based service is due. */
  dueSoonDays: number;
  /** Soft-warn distance before a distance-based service is due (in same unit). */
  dueSoonDistance: number;
};

export type VehicleHistorySnapshot = {
  version: typeof VEHICLE_HISTORY_STORAGE_VERSION;
  vehicles: Vehicle[];
  settings: VehicleHistorySettings;
};

export type ScheduleStatus = 'overdue' | 'due-soon' | 'ok' | 'no-history';

export type ScheduleDueInfo = {
  schedule: MaintenanceSchedule;
  lastRecord: MaintenanceRecord | null;
  /** Next due date (ISO YYYY-MM-DD) or null if not applicable. */
  nextDueDate: string | null;
  /** Next due odometer reading or null if not applicable. */
  nextDueDistance: number | null;
  status: ScheduleStatus;
  /** Days until due (negative = overdue). null if no date schedule. */
  daysUntilDue: number | null;
  /** Distance until due (negative = overdue). null if not applicable. */
  distanceUntilDue: number | null;
};

export const STATUS_TOKENS: Record<ScheduleStatus, { chip: string; dot: string; label: string }> = {
  overdue: {
    chip: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-500',
    label: 'Overdue',
  },
  'due-soon': {
    chip: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
    label: 'Due soon',
  },
  ok: {
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    label: 'On schedule',
  },
  'no-history': {
    chip: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
    label: 'No service yet',
  },
};
