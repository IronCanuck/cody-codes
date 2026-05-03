import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useInventory } from './InventoryContext';
import {
  COMPANY_TOKENS,
  INVENTORY_COMPANIES,
  type InventoryCompany,
} from './types';

export function InventorySettingsPage() {
  const { data, setDefaultCompany, setDefaultLocation, clearAll } = useInventory();
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-database-${new Date().toISOString().slice(0, 10)}.json`;
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
          to="/inventory"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All products
        </Link>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Defaults for new products, plus a backup &amp; reset zone.
        </p>
      </div>

      <Card title="Defaults for new products">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Default company
            </p>
            <div className="flex flex-wrap gap-2">
              {INVENTORY_COMPANIES.map((c) => {
                const t = COMPANY_TOKENS[c];
                const active = data.settings.defaultCompany === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDefaultCompany(active ? null : (c as InventoryCompany))}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? t.pillActive : t.pill
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${active ? 'bg-white/90' : t.dot}`}
                      aria-hidden
                    />
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {data.settings.defaultCompany ? 'Tap again to clear.' : 'Pick one to use it for new entries.'}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Default storage location
            </span>
            <input
              type="text"
              value={data.settings.defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g. Garage, Apparatus bay, Office locker…"
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </label>
        </div>
      </Card>

      <Card title="Backup">
        <p className="text-sm text-slate-600">
          Download a JSON backup of every product, photo, and serial number. Keep this somewhere safe
          (cloud storage, USB drive, email).
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Download backup ({data.products.length} {data.products.length === 1 ? 'product' : 'products'})
        </button>
      </Card>

      <Card title="Danger zone" tone="danger">
        <p className="text-sm text-slate-700">
          Permanently delete every product in your inventory. This cannot be undone.
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
            Clear all products
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
  const border = tone === 'danger' ? 'border-red-200' : 'border-slate-200';
  return (
    <div className={`rounded-xl border ${border} bg-white shadow-sm`}>
      <div className={`border-b ${tone === 'danger' ? 'border-red-100' : 'border-slate-100'} px-4 py-3`}>
        <h3
          className={`text-sm font-bold tracking-tight ${
            tone === 'danger' ? 'text-red-700' : 'text-slate-900'
          }`}
        >
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
