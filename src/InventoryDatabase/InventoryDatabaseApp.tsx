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
  Boxes,
  ExternalLink,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings as SettingsIcon,
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
  InventoryContext,
  type InventoryContextValue,
  type NewProductInput,
} from './InventoryContext';
import type {
  InventoryCompany,
  InventoryPhoto,
  InventoryProduct,
  InventorySerial,
  InventorySettings,
  InventorySnapshot,
} from './types';
import { InventoryList } from './InventoryList';
import { InventoryProductPage } from './InventoryProductPage';
import { InventorySettingsPage } from './InventorySettings';

function InventoryShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<InventorySnapshot>(() => defaultSnapshot());

  useEffect(() => {
    document.title = 'Inventory Database · Cody James Fairburn';
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
    (next: InventorySnapshot | ((prev: InventorySnapshot) => InventorySnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const createProduct = useCallback(
    (input?: NewProductInput): string => {
      const id = newId('prod');
      const now = new Date().toISOString();
      persist((prev) => {
        const product: InventoryProduct = {
          id,
          name: input?.name ?? '',
          category: input?.category ?? '',
          manufacturer: input?.manufacturer ?? '',
          modelNumber: input?.modelNumber ?? '',
          company: input?.company ?? prev.settings.defaultCompany ?? 'Personal',
          location: input?.location ?? prev.settings.defaultLocation ?? '',
          description: input?.description ?? '',
          notes: input?.notes ?? '',
          purchaseDate: input?.purchaseDate ?? '',
          purchasePrice: input?.purchasePrice ?? '',
          serials: input?.serials ?? [],
          photos: input?.photos ?? [],
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, products: [product, ...prev.products] };
      });
      return id;
    },
    [persist],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<InventoryProduct>) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
        ),
      }));
    },
    [persist],
  );

  const removeProduct = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
    },
    [persist],
  );

  const attachPhoto = useCallback(
    (productId: string, photo: InventoryPhoto) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? { ...p, photos: [...p.photos, photo], updatedAt: new Date().toISOString() }
            : p,
        ),
      }));
    },
    [persist],
  );

  const detachPhoto = useCallback(
    (productId: string, photoId: string) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                photos: p.photos.filter((m) => m.id !== photoId),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const addSerial = useCallback(
    (productId: string, serial: InventorySerial) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? { ...p, serials: [...p.serials, serial], updatedAt: new Date().toISOString() }
            : p,
        ),
      }));
    },
    [persist],
  );

  const updateSerial = useCallback(
    (productId: string, serialId: string, patch: Partial<InventorySerial>) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                serials: p.serials.map((s) => (s.id === serialId ? { ...s, ...patch } : s)),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const removeSerial = useCallback(
    (productId: string, serialId: string) => {
      persist((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                serials: p.serials.filter((s) => s.id !== serialId),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const setDefaultCompany = useCallback(
    (company: InventoryCompany | null) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, defaultCompany: company } }));
    },
    [persist],
  );

  const setDefaultLocation = useCallback(
    (location: string) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, defaultLocation: location } }));
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<InventorySettings>) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    persist((prev) => ({ ...prev, products: [] }));
  }, [persist]);

  const contextValue = useMemo<InventoryContextValue>(
    () => ({
      data,
      hydrated,
      createProduct,
      updateProduct,
      removeProduct,
      attachPhoto,
      detachPhoto,
      addSerial,
      updateSerial,
      removeSerial,
      setDefaultCompany,
      setDefaultLocation,
      updateSettings,
      clearAll,
    }),
    [
      data,
      hydrated,
      createProduct,
      updateProduct,
      removeProduct,
      attachPhoto,
      detachPhoto,
      addSerial,
      updateSerial,
      removeSerial,
      setDefaultCompany,
      setDefaultLocation,
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
    const total = data.products.length;
    const byCompany: Record<string, number> = {};
    for (const p of data.products) {
      byCompany[p.company] = (byCompany[p.company] ?? 0) + 1;
    }
    return { total, byCompany };
  }, [data.products]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-700 text-sm font-medium">Sign in to use Inventory Database.</p>
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
    <InventoryContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
            <Link to="/inventory" className="min-w-0 flex items-center gap-3">
              <span className="shrink-0 rounded-lg bg-slate-900 p-2 ring-1 ring-slate-900/15 shadow-sm">
                <Boxes className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  Inventory Database
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  Records for theft, disaster &amp; estate planning
                </p>
              </span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/inventory/new"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                New product
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label="Open Inventory menu"
              >
                <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!menuOpen}
          aria-label="Inventory menu"
          className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900 tracking-tight">Inventory menu</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <nav className="space-y-1.5" aria-label="Inventory pages">
              <NavLink
                to="/inventory"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Package className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                All products
              </NavLink>
              <NavLink
                to="/inventory/new"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                New product
              </NavLink>
              <NavLink
                to="/inventory/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Settings
              </NavLink>
            </nav>

            <section aria-labelledby="inventory-menu-stats" className="space-y-2">
              <div className="flex items-center justify-between">
                <h2
                  id="inventory-menu-stats"
                  className="text-[11px] font-bold tracking-widest uppercase text-slate-500"
                >
                  At a glance
                </h2>
                <span className="text-[11px] text-slate-400">{stats.total}</span>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-700">Total products</span>
                  <span className="text-sm font-semibold text-slate-900">{stats.total}</span>
                </li>
                {(['Spartan', 'Podium', 'Cal-Fire', 'Personal'] as const).map((c) => (
                  <li
                    key={c}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{c}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {stats.byCompany[c] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Back to app suite
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              codycodes.ca
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
    </InventoryContext.Provider>
  );
}

export function InventoryDatabaseApp() {
  return (
    <Routes>
      <Route element={<InventoryShell />}>
        <Route index element={<InventoryList />} />
        <Route path="new" element={<InventoryProductPage mode="new" />} />
        <Route path="settings" element={<InventorySettingsPage />} />
        <Route path=":id" element={<InventoryProductPage mode="edit" />} />
      </Route>
    </Routes>
  );
}
