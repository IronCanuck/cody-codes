import {
  FUEL_TYPES,
  ODOMETER_UNITS,
  VEHICLE_HISTORY_STORAGE_VERSION,
  type FuelType,
  type MaintenanceRecord,
  type MaintenanceSchedule,
  type OdometerUnit,
  type Vehicle,
  type VehicleHistorySettings,
  type VehicleHistorySnapshot,
  type VehiclePhoto,
} from './types';

export function newId(prefix = 'veh'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `vehiclehistory:${userId}`;
}

export function defaultSettings(): VehicleHistorySettings {
  return {
    defaultOdometerUnit: 'mi',
    defaultFuelType: 'Gasoline',
    dueSoonDays: 30,
    dueSoonDistance: 500,
  };
}

export function defaultSnapshot(): VehicleHistorySnapshot {
  return {
    version: VEHICLE_HISTORY_STORAGE_VERSION,
    vehicles: [],
    settings: defaultSettings(),
  };
}

function isUnit(v: unknown): v is OdometerUnit {
  return typeof v === 'string' && (ODOMETER_UNITS as readonly string[]).includes(v);
}

function isFuel(v: unknown): v is FuelType {
  return typeof v === 'string' && (FUEL_TYPES as readonly string[]).includes(v);
}

function s(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function sanitizePhoto(raw: unknown): VehiclePhoto | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.dataUrl !== 'string') return null;
  return {
    id: r.id,
    dataUrl: r.dataUrl,
    mime: typeof r.mime === 'string' ? r.mime : 'image/jpeg',
    name: typeof r.name === 'string' ? r.name : 'photo',
    width: typeof r.width === 'number' ? r.width : 0,
    height: typeof r.height === 'number' ? r.height : 0,
  };
}

function sanitizeRecord(raw: unknown): MaintenanceRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  return {
    id: r.id,
    date: s(r.date),
    odometer: s(r.odometer),
    serviceType: s(r.serviceType),
    vendor: s(r.vendor),
    cost: s(r.cost),
    notes: s(r.notes),
  };
}

function sanitizeSchedule(raw: unknown): MaintenanceSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  return {
    id: r.id,
    serviceType: s(r.serviceType),
    everyDistance: num(r.everyDistance),
    everyMonths: num(r.everyMonths),
    notes: s(r.notes),
  };
}

function sanitizeVehicle(raw: unknown): Vehicle | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Vehicle> & Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: r.id,
    nickname: s(r.nickname),
    year: s(r.year),
    make: s(r.make),
    model: s(r.model),
    trim: s(r.trim),
    bodyStyle: s(r.bodyStyle),
    color: s(r.color),
    vin: s(r.vin),
    licensePlate: s(r.licensePlate),
    fuelType: isFuel(r.fuelType) ? r.fuelType : 'Gasoline',
    transmission: s(r.transmission),
    odometer: s(r.odometer),
    odometerUnit: isUnit(r.odometerUnit) ? r.odometerUnit : 'mi',
    purchaseDate: s(r.purchaseDate),
    purchasePrice: s(r.purchasePrice),
    insurer: s(r.insurer),
    policyNumber: s(r.policyNumber),
    registrationExpires: s(r.registrationExpires),
    notes: s(r.notes),
    photos: Array.isArray(r.photos)
      ? (r.photos as unknown[])
          .map(sanitizePhoto)
          .filter((p): p is VehiclePhoto => p !== null)
      : [],
    records: Array.isArray(r.records)
      ? (r.records as unknown[])
          .map(sanitizeRecord)
          .filter((p): p is MaintenanceRecord => p !== null)
      : [],
    schedules: Array.isArray(r.schedules)
      ? (r.schedules as unknown[])
          .map(sanitizeSchedule)
          .filter((p): p is MaintenanceSchedule => p !== null)
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

export function loadSnapshot(userId: string | undefined): VehicleHistorySnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VehicleHistorySnapshot>;
    if (parsed?.version !== VEHICLE_HISTORY_STORAGE_VERSION || !Array.isArray(parsed.vehicles)) {
      return null;
    }
    const fallback = defaultSettings();
    const rawSettings = (parsed.settings ?? {}) as Partial<VehicleHistorySettings>;
    const settings: VehicleHistorySettings = {
      defaultOdometerUnit: isUnit(rawSettings.defaultOdometerUnit)
        ? rawSettings.defaultOdometerUnit
        : fallback.defaultOdometerUnit,
      defaultFuelType: isFuel(rawSettings.defaultFuelType)
        ? rawSettings.defaultFuelType
        : fallback.defaultFuelType,
      dueSoonDays:
        typeof rawSettings.dueSoonDays === 'number' && rawSettings.dueSoonDays >= 0
          ? rawSettings.dueSoonDays
          : fallback.dueSoonDays,
      dueSoonDistance:
        typeof rawSettings.dueSoonDistance === 'number' && rawSettings.dueSoonDistance >= 0
          ? rawSettings.dueSoonDistance
          : fallback.dueSoonDistance,
    };
    const vehicles = parsed.vehicles
      .map(sanitizeVehicle)
      .filter((v): v is Vehicle => v !== null);
    return {
      version: VEHICLE_HISTORY_STORAGE_VERSION,
      vehicles,
      settings,
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: VehicleHistorySnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

/** Parse a free-form odometer string ("120,500 km", "98000") into a number, or null. */
export function parseOdometer(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatDistance(value: number, unit: OdometerUnit): string {
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
