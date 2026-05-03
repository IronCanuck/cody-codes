import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Hash,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useInventory } from './InventoryContext';
import { compressImageFile } from './media';
import { newId } from './storage';
import {
  COMPANY_TOKENS,
  INVENTORY_COMPANIES,
  type InventoryCompany,
  type InventoryPhoto,
  type InventoryProduct,
  type InventorySerial,
} from './types';

type Props = {
  mode: 'new' | 'edit';
};

const INPUT_CLASS =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900';

type FormState = {
  name: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  company: InventoryCompany;
  location: string;
  description: string;
  notes: string;
  purchaseDate: string;
  purchasePrice: string;
};

const EMPTY_FORM = (defaults: { company: InventoryCompany; location: string }): FormState => ({
  name: '',
  category: '',
  manufacturer: '',
  modelNumber: '',
  company: defaults.company,
  location: defaults.location,
  description: '',
  notes: '',
  purchaseDate: '',
  purchasePrice: '',
});

function fromProduct(product: InventoryProduct): FormState {
  return {
    name: product.name,
    category: product.category,
    manufacturer: product.manufacturer,
    modelNumber: product.modelNumber,
    company: product.company,
    location: product.location,
    description: product.description,
    notes: product.notes,
    purchaseDate: product.purchaseDate,
    purchasePrice: product.purchasePrice,
  };
}

export function InventoryProductPage({ mode }: Props) {
  const { data, createProduct, updateProduct, removeProduct, attachPhoto, detachPhoto } =
    useInventory();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isNew = mode === 'new';

  const existing = useMemo(
    () => (isNew ? null : data.products.find((p) => p.id === params.id) ?? null),
    [isNew, data.products, params.id],
  );

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? fromProduct(existing)
      : EMPTY_FORM({
          company: data.settings.defaultCompany ?? 'Personal',
          location: data.settings.defaultLocation ?? '',
        }),
  );
  const [serials, setSerials] = useState<InventorySerial[]>(() => existing?.serials ?? []);
  const [photos, setPhotos] = useState<InventoryPhoto[]>(() => existing?.photos ?? []);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew && existing) {
      setForm(fromProduct(existing));
      setSerials(existing.serials);
      setPhotos(existing.photos);
    }
  }, [isNew, existing]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    const payload = {
      ...form,
      name: trimmedName || 'Untitled product',
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      modelNumber: form.modelNumber.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      purchaseDate: form.purchaseDate.trim(),
      purchasePrice: form.purchasePrice.trim(),
      serials: serials.map((s) => ({
        ...s,
        label: s.label.trim(),
        value: s.value.trim(),
      })),
    };

    if (isNew) {
      const id = createProduct({ ...payload, photos });
      navigate(`/inventory/${id}`, { replace: true });
    } else if (existing) {
      updateProduct(existing.id, payload);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    const ok = window.confirm(`Delete "${existing.name || 'this product'}"? This cannot be undone.`);
    if (!ok) return;
    removeProduct(existing.id);
    navigate('/inventory', { replace: true });
  };

  const addSerial = () => {
    const next: InventorySerial = { id: newId('sn'), label: '', value: '' };
    setSerials((prev) => [...prev, next]);
  };

  const updateSerialField = (id: string, patch: Partial<InventorySerial>) => {
    setSerials((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSerialRow = (id: string) => {
    setSerials((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const next: InventoryPhoto[] = [];
      for (const file of files) {
        try {
          const photo = await compressImageFile(file);
          next.push(photo);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not import photo');
        }
      }
      if (next.length > 0) {
        if (isNew) {
          setPhotos((prev) => [...prev, ...next]);
        } else if (existing) {
          for (const photo of next) attachPhoto(existing.id, photo);
          setPhotos((prev) => [...prev, ...next]);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!isNew && existing) {
      detachPhoto(existing.id, photoId);
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const tokens = COMPANY_TOKENS[form.company];

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextLightbox = () =>
    setLightboxIndex((idx) => (idx === null ? null : (idx + 1) % Math.max(1, photos.length)));
  const prevLightbox = () =>
    setLightboxIndex((idx) =>
      idx === null ? null : (idx - 1 + Math.max(1, photos.length)) % Math.max(1, photos.length),
    );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowRight') nextLightbox();
      if (event.key === 'ArrowLeft') prevLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, photos.length]);

  if (mode === 'edit' && !existing) {
    return <Navigate to="/inventory" replace />;
  }

  return (
    <section className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All products
        </Link>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tokens.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tokens.dot}`} />
          {form.company}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isNew ? 'New product' : form.name || 'Untitled product'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isNew
              ? 'Add details, photos, and serial numbers. Save when you’re done.'
              : 'Update details. Photos and serial numbers save with the product.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Save className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            {isNew ? 'Create product' : savedFlash ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      <form
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="space-y-6">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Helmet, laptop, chainsaw…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Category">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  placeholder="PPE, Electronics, Tools…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Manufacturer">
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => setField('manufacturer', e.target.value)}
                  placeholder="Apple, MSA, Stihl…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Model number">
                <input
                  type="text"
                  value={form.modelNumber}
                  onChange={(e) => setField('modelNumber', e.target.value)}
                  placeholder="A2338, MS261…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Purchase date">
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setField('purchaseDate', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Purchase price">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.purchasePrice}
                  onChange={(e) => setField('purchasePrice', e.target.value)}
                  placeholder="$1,299.00"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Description" full>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Color, size, condition…"
                  rows={3}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Notes" full>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Insurance reference, warranty, repairs…"
                  rows={3}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Serial numbers"
            action={
              <button
                type="button"
                onClick={addSerial}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Add serial
              </button>
            }
          >
            {serials.length === 0 ? (
              <p className="text-sm text-slate-500">
                Add one or more serial numbers (e.g. main unit, charger, battery).
              </p>
            ) : (
              <ul className="space-y-2">
                {serials.map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)_auto] gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={s.label}
                      onChange={(e) => updateSerialField(s.id, { label: e.target.value })}
                      placeholder="Label (Body, Charger…)"
                      className={INPUT_CLASS}
                    />
                    <span className="relative">
                      <Hash
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <input
                        type="text"
                        value={s.value}
                        onChange={(e) => updateSerialField(s.id, { value: e.target.value })}
                        placeholder="Serial number"
                        className={`${INPUT_CLASS} pl-7 font-mono`}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSerialRow(s.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove serial"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={`Photos (${photos.length})`}
            action={
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                {uploading ? 'Adding…' : 'Add photos'}
              </button>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && (
              <p className="mb-2 text-xs text-red-600" role="alert">
                {uploadError}
              </p>
            )}
            {photos.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 hover:border-slate-400 hover:bg-slate-100"
              >
                <Camera className="h-6 w-6" strokeWidth={2} aria-hidden />
                <span className="text-sm font-medium">Add photos of the product</span>
                <span className="text-xs">Compressed locally for fast saves.</span>
              </button>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => openLightbox(index)}
                      className="block w-full"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        loading="lazy"
                        className="h-32 w-full object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-red-600 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-50"
                      aria-label={`Remove ${photo.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Ownership">
            <Field label="Company">
              <div className="grid grid-cols-2 gap-2">
                {INVENTORY_COMPANIES.map((c) => {
                  const t = COMPANY_TOKENS[c];
                  const active = form.company === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setField('company', c)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                        active ? t.pillActive : t.pill
                      }`}
                      aria-pressed={active}
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
            </Field>
            <Field label="Storage location">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="Garage shelf B, locker #4…"
                className={INPUT_CLASS}
              />
            </Field>
          </Card>

          {!isNew && existing && (
            <Card title="Record info">
              <dl className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt>Created</dt>
                  <dd className="text-slate-800 font-medium">{formatDateTime(existing.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Last updated</dt>
                  <dd className="text-slate-800 font-medium">{formatDateTime(existing.updatedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>ID</dt>
                  <dd className="text-slate-500 font-mono truncate max-w-[10rem]" title={existing.id}>
                    {existing.id.slice(0, 8)}…
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </aside>
      </form>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 hover:bg-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightbox();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 hover:bg-white"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightbox();
                }}
                className="absolute right-16 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 hover:bg-white"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </>
          )}
          <img
            src={photos[lightboxIndex].dataUrl}
            alt={photos[lightboxIndex].name}
            className="max-h-[85vh] max-w-[92vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`block text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function formatDateTime(iso: string): string {
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
