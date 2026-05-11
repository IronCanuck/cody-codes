import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useVehicleHistory } from './VehicleContext';
import {
  FUEL_TYPES,
  ODOMETER_UNITS,
  type FuelType,
  type OdometerUnit,
} from './types';

export function VehicleSettingsPage() {
  const { data, updateSettings, clearAll } = useVehicleHistory();
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearAll();
    setConfirmingClear(false);
  };

  return (
    <section className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          to="/vehicle-history"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All vehicles
        </Link>
        <h2 className="mt-3 text-2xl font-bold text-zinc-900 tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Defaults for new vehicles and how soon to warn about upcoming service.
        </p>
      </div>

      <Card title="Defaults for new vehicles">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Default odometer unit
            </p>
            <div className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 shadow-sm">
              {ODOMETER_UNITS.map((u) => {
                const active = data.settings.defaultOdometerUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => updateSettings({ defaultOdometerUnit: u as OdometerUnit })}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                      active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                    aria-pressed={active}
                  >
                    {u === 'mi' ? 'Miles' : 'Kilometers'}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Default fuel type
            </span>
            <select
              value={data.settings.defaultFuelType}
              onChange={(e) => updateSettings({ defaultFuelType: e.target.value as FuelType })}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            >
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card title="Reminders">
        <p className="text-sm text-zinc-600">
          Services within this window are flagged as <strong>Due soon</strong>. Anything past the
          interval becomes <strong>Overdue</strong>.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Days before due
            </span>
            <input
              type="number"
              min={0}
              value={data.settings.dueSoonDays}
              onChange={(e) =>
                updateSettings({ dueSoonDays: Math.max(0, Number(e.target.value) || 0) })
              }
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Distance before due ({data.settings.defaultOdometerUnit})
            </span>
            <input
              type="number"
              min={0}
              value={data.settings.dueSoonDistance}
              onChange={(e) =>
                updateSettings({ dueSoonDistance: Math.max(0, Number(e.target.value) || 0) })
              }
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </label>
        </div>
      </Card>

      <Card title="Backup">
        <p className="text-sm text-zinc-600">
          Download a JSON backup of every vehicle, photo, maintenance record, and schedule.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          <Download className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Download backup ({data.vehicles.length}{' '}
          {data.vehicles.length === 1 ? 'vehicle' : 'vehicles'})
        </button>
      </Card>

      <Card title="Danger zone" tone="danger">
        <p className="text-sm text-zinc-700">
          Permanently delete every vehicle and all maintenance history. This cannot be undone.
        </p>
        {confirmingClear ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Yes, delete everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Clear all vehicles
          </button>
        )}
      </Card>
    </section>
  );
}

function Card({
  title,
  tone = 'default',
  children,
}: {
  title: string;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}) {
  const border = tone === 'danger' ? 'border-red-200' : 'border-zinc-200';
  return (
    <div className={`rounded-xl border ${border} bg-white shadow-sm`}>
      <div className={`border-b ${tone === 'danger' ? 'border-red-100' : 'border-zinc-100'} px-4 py-3`}>
        <h3
          className={`text-sm font-bold tracking-tight ${
            tone === 'danger' ? 'text-red-700' : 'text-zinc-900'
          }`}
        >
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
