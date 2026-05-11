import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  Settings as SettingsIcon,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  defaultSnapshot,
  loadSnapshot,
  newId,
  saveSnapshot,
} from './storage';
import {
  VehicleHistoryContext,
  type NewVehicleInput,
  type VehicleHistoryContextValue,
} from './VehicleContext';
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  Vehicle,
  VehicleHistorySettings,
  VehicleHistorySnapshot,
  VehiclePhoto,
} from './types';
import { evaluateVehicleSchedules } from './schedule';
import { VehicleList } from './VehicleList';
import { VehiclePage } from './VehiclePage';
import { VehicleSettingsPage } from './VehicleSettings';

function VehicleHistoryShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<VehicleHistorySnapshot>(() => defaultSnapshot());

  useEffect(() => {
    document.title = 'Vehicle History · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    setData(stored ?? defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const persist = useCallback(
    (next: VehicleHistorySnapshot | ((prev: VehicleHistorySnapshot) => VehicleHistorySnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const createVehicle = useCallback(
    (input?: NewVehicleInput): string => {
      const id = newId('veh');
      const now = new Date().toISOString();
      persist((prev) => {
        const vehicle: Vehicle = {
          id,
          nickname: input?.nickname ?? '',
          year: input?.year ?? '',
          make: input?.make ?? '',
          model: input?.model ?? '',
          trim: input?.trim ?? '',
          bodyStyle: input?.bodyStyle ?? '',
          color: input?.color ?? '',
          vin: input?.vin ?? '',
          licensePlate: input?.licensePlate ?? '',
          fuelType: input?.fuelType ?? prev.settings.defaultFuelType,
          transmission: input?.transmission ?? '',
          odometer: input?.odometer ?? '',
          odometerUnit: input?.odometerUnit ?? prev.settings.defaultOdometerUnit,
          purchaseDate: input?.purchaseDate ?? '',
          purchasePrice: input?.purchasePrice ?? '',
          insurer: input?.insurer ?? '',
          policyNumber: input?.policyNumber ?? '',
          registrationExpires: input?.registrationExpires ?? '',
          notes: input?.notes ?? '',
          photos: input?.photos ?? [],
          records: input?.records ?? [],
          schedules: input?.schedules ?? [],
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, vehicles: [vehicle, ...prev.vehicles] };
      });
      return id;
    },
    [persist],
  );

  const updateVehicle = useCallback(
    (id: string, patch: Partial<Vehicle>) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v,
        ),
      }));
    },
    [persist],
  );

  const removeVehicle = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.id !== id) }));
    },
    [persist],
  );

  const attachPhoto = useCallback(
    (vehicleId: string, photo: VehiclePhoto) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, photos: [...v.photos, photo], updatedAt: new Date().toISOString() }
            : v,
        ),
      }));
    },
    [persist],
  );

  const detachPhoto = useCallback(
    (vehicleId: string, photoId: string) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                photos: v.photos.filter((p) => p.id !== photoId),
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      }));
    },
    [persist],
  );

  const addRecord = useCallback(
    (vehicleId: string, record: MaintenanceRecord) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, records: [...v.records, record], updatedAt: new Date().toISOString() }
            : v,
        ),
      }));
    },
    [persist],
  );

  const updateRecord = useCallback(
    (vehicleId: string, recordId: string, patch: Partial<MaintenanceRecord>) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                records: v.records.map((r) => (r.id === recordId ? { ...r, ...patch } : r)),
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      }));
    },
    [persist],
  );

  const removeRecord = useCallback(
    (vehicleId: string, recordId: string) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                records: v.records.filter((r) => r.id !== recordId),
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      }));
    },
    [persist],
  );

  const addSchedule = useCallback(
    (vehicleId: string, schedule: MaintenanceSchedule) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? { ...v, schedules: [...v.schedules, schedule], updatedAt: new Date().toISOString() }
            : v,
        ),
      }));
    },
    [persist],
  );

  const updateSchedule = useCallback(
    (vehicleId: string, scheduleId: string, patch: Partial<MaintenanceSchedule>) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                schedules: v.schedules.map((s) =>
                  s.id === scheduleId ? { ...s, ...patch } : s,
                ),
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      }));
    },
    [persist],
  );

  const removeSchedule = useCallback(
    (vehicleId: string, scheduleId: string) => {
      persist((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                schedules: v.schedules.filter((s) => s.id !== scheduleId),
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      }));
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<VehicleHistorySettings>) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    persist((prev) => ({ ...prev, vehicles: [] }));
  }, [persist]);

  const contextValue = useMemo<VehicleHistoryContextValue>(
    () => ({
      data,
      hydrated,
      createVehicle,
      updateVehicle,
      removeVehicle,
      attachPhoto,
      detachPhoto,
      addRecord,
      updateRecord,
      removeRecord,
      addSchedule,
      updateSchedule,
      removeSchedule,
      updateSettings,
      clearAll,
    }),
    [
      data,
      hydrated,
      createVehicle,
      updateVehicle,
      removeVehicle,
      attachPhoto,
      detachPhoto,
      addRecord,
      updateRecord,
      removeRecord,
      addSchedule,
      updateSchedule,
      removeSchedule,
      updateSettings,
      clearAll,
    ],
  );

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const stats = useMemo(() => {
    const total = data.vehicles.length;
    let overdue = 0;
    let dueSoon = 0;
    for (const v of data.vehicles) {
      const infos = evaluateVehicleSchedules(v, data.settings);
      for (const i of infos) {
        if (i.status === 'overdue') overdue += 1;
        else if (i.status === 'due-soon') dueSoon += 1;
      }
    }
    return { total, overdue, dueSoon };
  }, [data.vehicles, data.settings]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-700 text-sm font-medium">Sign in to use Vehicle History.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <VehicleHistoryContext.Provider value={contextValue}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
            <Link to="/vehicle-history" className="min-w-0 flex items-center gap-3">
              <span className="shrink-0 rounded-lg bg-zinc-900 p-2 ring-1 ring-amber-500/40 shadow-sm">
                <Car className="h-5 w-5 text-amber-400" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base text-zinc-900 tracking-tight">
                  Vehicle History
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                  Vehicle info &amp; maintenance schedules
                </p>
              </span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/vehicle-history/new"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                New vehicle
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label="Open Vehicle History menu"
              >
                <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-zinc-900/45 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!menuOpen}
          aria-label="Vehicle History menu"
          className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-white border-l border-zinc-200 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-100">
            <p className="text-sm font-bold text-zinc-900 tracking-tight">Vehicle menu</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <nav className="space-y-1.5" aria-label="Vehicle pages">
              <NavLink
                to="/vehicle-history"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`
                }
              >
                <Car className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                All vehicles
              </NavLink>
              <NavLink
                to="/vehicle-history/new"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`
                }
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                New vehicle
              </NavLink>
              <NavLink
                to="/vehicle-history/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Settings
              </NavLink>
            </nav>

            <section aria-labelledby="vehicle-menu-stats" className="space-y-2">
              <div className="flex items-center justify-between">
                <h2
                  id="vehicle-menu-stats"
                  className="text-[11px] font-bold tracking-widest uppercase text-zinc-500"
                >
                  At a glance
                </h2>
                <span className="text-[11px] text-zinc-400">{stats.total}</span>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="text-sm text-zinc-700">Vehicles</span>
                  <span className="text-sm font-semibold text-zinc-900">{stats.total}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-800 inline-flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    Overdue
                  </span>
                  <span className="text-sm font-semibold text-red-900">{stats.overdue}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <span className="text-sm text-amber-900 inline-flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    Due soon
                  </span>
                  <span className="text-sm font-semibold text-amber-900">{stats.dueSoon}</span>
                </li>
              </ul>
            </section>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-2 bg-zinc-50">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Back to app suite
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              codycodes.ca
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    </VehicleHistoryContext.Provider>
  );
}

export function VehicleHistoryApp() {
  return (
    <Routes>
      <Route element={<VehicleHistoryShell />}>
        <Route index element={<VehicleList />} />
        <Route path="new" element={<VehiclePage mode="new" />} />
        <Route path="settings" element={<VehicleSettingsPage />} />
        <Route path=":id" element={<VehiclePage mode="edit" />} />
      </Route>
    </Routes>
  );
}
