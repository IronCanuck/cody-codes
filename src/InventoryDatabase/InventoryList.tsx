import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
  Inbox,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useInventory } from './InventoryContext';
import {
  COMPANY_TOKENS,
  INVENTORY_COMPANIES,
  type InventoryCompany,
  type InventoryProduct,
} from './types';

type SortKey = 'name' | 'company' | 'location' | 'category' | 'updatedAt';
type SortDir = 'asc' | 'desc';

export function InventoryList() {
  const { data, removeProduct } = useInventory();
  const navigate = useNavigate();
  const [activeCompanies, setActiveCompanies] = useState<Set<InventoryCompany>>(new Set());
  const [activeLocation, setActiveLocation] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    for (const p of data.products) {
      const loc = p.location.trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = data.products.filter((p) => {
      if (activeCompanies.size > 0 && !activeCompanies.has(p.company)) return false;
      if (activeLocation && p.location.trim() !== activeLocation) return false;
      if (!term) return true;
      const haystack = [
        p.name,
        p.category,
        p.manufacturer,
        p.modelNumber,
        p.location,
        p.notes,
        p.description,
        ...p.serials.map((s) => `${s.label} ${s.value}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });

    out = out.slice().sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return out;
  }, [data.products, activeCompanies, activeLocation, search, sortKey, sortDir]);

  const toggleCompany = (c: InventoryCompany) => {
    setActiveCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveCompanies(new Set());
    setActiveLocation('');
    setSearch('');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'updatedAt' ? 'desc' : 'asc');
    }
  };

  const handleDelete = (product: InventoryProduct) => {
    const ok = window.confirm(`Delete "${product.name || 'Untitled product'}"? This cannot be undone.`);
    if (!ok) return;
    removeProduct(product.id);
  };

  const filtersActive =
    activeCompanies.size > 0 || activeLocation !== '' || search.trim() !== '';

  const totalCount = data.products.length;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            All products
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {totalCount === 0
              ? 'No products yet. Add your first item to start the database.'
              : `${filtered.length} of ${totalCount} ${totalCount === 1 ? 'product' : 'products'} shown.`}
          </p>
        </div>
        <Link
          to="/inventory/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:hidden"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          New product
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Search products</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                strokeWidth={2.25}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, model, serial, location…"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              Company
            </span>
            {INVENTORY_COMPANIES.map((c) => {
              const tokens = COMPANY_TOKENS[c];
              const active = activeCompanies.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCompany(c)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                    active ? tokens.pillActive : tokens.pill
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active ? 'bg-white/90' : tokens.dot
                    }`}
                    aria-hidden
                  />
                  {c}
                </button>
              );
            })}
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Clear
              </button>
            )}
          </div>
        </div>

        {allLocations.length > 0 && (
          <label className="block lg:min-w-[14rem]">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Location
            </span>
            <select
              value={activeLocation}
              onChange={(e) => setActiveLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value="">All locations</option>
              {allLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState hasProducts={totalCount > 0} onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Th onClick={() => handleSort('name')} active={sortKey === 'name'} dir={sortDir}>
                    Product
                  </Th>
                  <Th
                    onClick={() => handleSort('company')}
                    active={sortKey === 'company'}
                    dir={sortDir}
                  >
                    Company
                  </Th>
                  <Th
                    onClick={() => handleSort('location')}
                    active={sortKey === 'location'}
                    dir={sortDir}
                  >
                    Location
                  </Th>
                  <Th
                    onClick={() => handleSort('category')}
                    active={sortKey === 'category'}
                    dir={sortDir}
                  >
                    Category
                  </Th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider"
                  >
                    Serial #
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider"
                  >
                    Photos
                  </th>
                  <Th
                    onClick={() => handleSort('updatedAt')}
                    active={sortKey === 'updatedAt'}
                    dir={sortDir}
                  >
                    Updated
                  </Th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((product) => {
                  const tokens = COMPANY_TOKENS[product.company];
                  const cover = product.photos[0];
                  return (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/inventory/${product.id}`)}
                      className="cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          {cover ? (
                            <img
                              src={cover.dataUrl}
                              alt=""
                              className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200 shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400 ring-1 ring-slate-200 shrink-0">
                              <ImageIcon className="h-4 w-4" aria-hidden />
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/inventory/${product.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block font-semibold text-slate-900 truncate hover:underline"
                            >
                              {product.name || 'Untitled product'}
                            </Link>
                            {(product.manufacturer || product.modelNumber) && (
                              <p className="text-xs text-slate-500 truncate">
                                {[product.manufacturer, product.modelNumber]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tokens.chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${tokens.dot}`} />
                          {product.company}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700">
                        {product.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin
                              className="h-3.5 w-3.5 text-slate-400"
                              strokeWidth={2.25}
                              aria-hidden
                            />
                            {product.location}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700">
                        {product.category || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700">
                        {product.serials.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5 max-w-[18rem]">
                            {product.serials.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                className="font-mono text-xs text-slate-700 truncate"
                                title={s.label ? `${s.label}: ${s.value}` : s.value}
                              >
                                {s.label && (
                                  <span className="text-slate-500 mr-1">{s.label}:</span>
                                )}
                                {s.value || <span className="text-slate-400">(empty)</span>}
                              </span>
                            ))}
                            {product.serials.length > 2 && (
                              <span className="text-[11px] text-slate-500">
                                +{product.serials.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <ImageIcon
                            className="h-3.5 w-3.5 text-slate-400"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {product.photos.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Delete ${product.name || 'product'}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider"
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${
          active ? 'text-slate-900' : 'text-slate-500'
        }`}
      >
        {children}
        <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
    </th>
  );
}

function EmptyState({ hasProducts, onClear }: { hasProducts: boolean; onClear: () => void }) {
  if (!hasProducts) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="mt-3 text-base font-semibold text-slate-900">No products yet</h3>
        <p className="mt-1 text-sm text-slate-600">
          Add equipment, electronics, or anything you want recorded for theft, disaster, or estate
          planning.
        </p>
        <Link
          to="/inventory/new"
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Add your first product
        </Link>
      </div>
    );
  }
  return (
    <div className="px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">No matching products</h3>
      <p className="mt-1 text-sm text-slate-600">Try clearing the filters or adjusting your search.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Clear filters
      </button>
    </div>
  );
}

function sortValue(p: InventoryProduct, key: SortKey): string {
  switch (key) {
    case 'name':
      return (p.name || '').toLowerCase();
    case 'company':
      return p.company.toLowerCase();
    case 'location':
      return (p.location || '').toLowerCase();
    case 'category':
      return (p.category || '').toLowerCase();
    case 'updatedAt':
      return p.updatedAt;
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
