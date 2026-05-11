import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Car,
  Gauge,
  ImageIcon,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';
import { useVehicleHistory } from './VehicleContext';
import { evaluateVehicleSchedules, worstStatus } from './schedule';
import { formatDate, parseOdometer } from './storage';
import { STATUS_TOKENS, type ScheduleDueInfo, type Vehicle } from './types';

export function VehicleList() {
  const { data } = useVehicleHistory();
  const [search, setSearch] = useState('');

  const decorated = useMemo(() => {
    return data.vehicles.map((v) => {
      const infos = evaluateVehicleSchedules(v, data.settings);
      return {
        vehicle: v,
        infos,
        worst: worstStatus(infos),
      };
    });
  }, [data.vehicles, data.settings]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return decorated;
    return decorated.filter(({ vehicle: v }) => {
      const haystack = [
        v.nickname,
        v.year,
        v.make,
        v.model,
        v.trim,
        v.bodyStyle,
        v.color,
        v.vin,
        v.licensePlate,
        v.notes,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [decorated, search]);

  const summary = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    for (const { infos } of decorated) {
      for (const i of infos) {
        if (i.status === 'overdue') overdue += 1;
        else if (i.status === 'due-soon') dueSoon += 1;
      }
    }
    return { overdue, dueSoon };
  }, [decorated]);

  const totalCount = data.vehicles.length;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Your garage
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {totalCount === 0
              ? 'No vehicles yet. Add your first vehicle to start tracking maintenance.'
              : `${filtered.length} of ${totalCount} ${totalCount === 1 ? 'vehicle' : 'vehicles'} shown.`}
          </p>
        </div>
        <Link
          to="/vehicle-history/new"
          className="inline-flex sm:hidden items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          New vehicle
        </Link>
      </div>

      {totalCount > 0 && (summary.overdue > 0 || summary.dueSoon > 0) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {summary.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={2.25} aria-hidden />
              <span className="font-semibold">{summary.overdue}</span> overdue service
              {summary.overdue === 1 ? '' : 's'} across your fleet
            </div>
          )}
          {summary.dueSoon > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <Wrench className="h-4 w-4 text-amber-600" strokeWidth={2.25} aria-hidden />
              <span className="font-semibold">{summary.dueSoon}</span> service
              {summary.dueSoon === 1 ? '' : 's'} due soon
            </div>
          )}
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-5">
          <label className="block">
            <span className="sr-only">Search vehicles</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                strokeWidth={2.25}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nickname, make, model, VIN, plate…"
                className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </span>
          </label>
        </div>
      )}

      <div className="mt-6">
        {totalCount === 0 ? (
          <EmptyGarage />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">No matching vehicles</h3>
            <p className="mt-1 text-sm text-zinc-600">Try adjusting your search.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ vehicle, infos, worst }) => (
              <li key={vehicle.id}>
                <VehicleCard vehicle={vehicle} infos={infos} worst={worst} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function VehicleCard({
  vehicle,
  infos,
  worst,
}: {
  vehicle: Vehicle;
  infos: ScheduleDueInfo[];
  worst: ReturnType<typeof worstStatus>;
}) {
  const cover = vehicle.photos[0];
  const title = vehicleHeadline(vehicle);
  const subtitle = vehicleSubline(vehicle);
  const odo = parseOdometer(vehicle.odometer);
  const status = worst && worst !== 'ok' ? STATUS_TOKENS[worst] : null;

  const nextDue = infos
    .filter((i) => i.status === 'overdue' || i.status === 'due-soon')
    .sort((a, b) => {
      const score = (i: ScheduleDueInfo) =>
        i.status === 'overdue' ? 0 : i.status === 'due-soon' ? 1 : 2;
      return score(a) - score(b);
    })[0];

  return (
    <Link
      to={`/vehicle-history/${vehicle.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden border-b border-zinc-100 bg-zinc-100">
        {cover ? (
          <img
            src={cover.dataUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
            <Car className="h-12 w-12 text-zinc-400" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        {status && (
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ${status.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
            {status.label}
          </span>
        )}
        {vehicle.photos.length > 1 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            <ImageIcon className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            {vehicle.photos.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-zinc-900 text-base leading-snug">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{subtitle}</p>}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <div>
            <dt className="font-semibold uppercase tracking-wider text-zinc-400">Odometer</dt>
            <dd className="text-zinc-800 font-medium flex items-center gap-1">
              <Gauge className="h-3 w-3 text-zinc-400" strokeWidth={2.25} aria-hidden />
              {odo !== null ? `${odo.toLocaleString()} ${vehicle.odometerUnit}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wider text-zinc-400">Plate</dt>
            <dd className="text-zinc-800 font-medium font-mono truncate">
              {vehicle.licensePlate || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wider text-zinc-400">Records</dt>
            <dd className="text-zinc-800 font-medium">{vehicle.records.length}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wider text-zinc-400">Schedules</dt>
            <dd className="text-zinc-800 font-medium">{vehicle.schedules.length}</dd>
          </div>
        </dl>

        {nextDue && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Next service
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">
              {nextDue.schedule.serviceType || 'Untitled service'}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {describeDue(nextDue, vehicle.odometerUnit)}
            </p>
          </div>
        )}

        <p className="mt-auto pt-3 text-xs text-zinc-400">
          Last updated {formatDate(vehicle.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function describeDue(info: ScheduleDueInfo, unit: string): string {
  const parts: string[] = [];
  if (info.daysUntilDue !== null && info.nextDueDate) {
    if (info.daysUntilDue < 0) {
      parts.push(`${Math.abs(info.daysUntilDue)} day${Math.abs(info.daysUntilDue) === 1 ? '' : 's'} overdue`);
    } else {
      parts.push(`in ${info.daysUntilDue} day${info.daysUntilDue === 1 ? '' : 's'} (${formatDate(info.nextDueDate)})`);
    }
  }
  if (info.distanceUntilDue !== null) {
    if (info.distanceUntilDue < 0) {
      parts.push(`${Math.abs(info.distanceUntilDue).toLocaleString()} ${unit} over`);
    } else {
      parts.push(`${info.distanceUntilDue.toLocaleString()} ${unit} to go`);
    }
  }
  if (parts.length === 0) return 'No interval set';
  return parts.join(' · ');
}

function vehicleHeadline(v: Vehicle): string {
  if (v.nickname.trim()) return v.nickname.trim();
  const yymm = [v.year, v.make, v.model].filter((s) => s.trim()).join(' ').trim();
  return yymm || 'Untitled vehicle';
}

function vehicleSubline(v: Vehicle): string {
  if (v.nickname.trim()) {
    return [v.year, v.make, v.model, v.trim].filter((s) => s.trim()).join(' ').trim();
  }
  return [v.trim, v.color, v.bodyStyle].filter((s) => s.trim()).join(' · ');
}

function EmptyGarage() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 py-16 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
        <Car className="h-7 w-7" strokeWidth={2} aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-bold text-zinc-900">Add your first vehicle</h3>
      <p className="mt-1 text-sm text-zinc-600 max-w-md mx-auto">
        Save the basics (year, make, model, VIN), log every service that gets done, and set custom
        maintenance schedules so you never miss an oil change again.
      </p>
      <Link
        to="/vehicle-history/new"
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Add a vehicle
      </Link>
    </div>
  );
}
