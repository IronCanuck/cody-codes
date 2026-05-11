import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Fuel,
  Gauge,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useVehicleHistory } from './VehicleContext';
import { compressImageFile } from './media';
import { newId, parseOdometer, formatDate, formatDateTime } from './storage';
import { evaluateVehicleSchedules } from './schedule';
import {
  FUEL_TYPES,
  ODOMETER_UNITS,
  STATUS_TOKENS,
  type FuelType,
  type MaintenanceRecord,
  type MaintenanceSchedule,
  type OdometerUnit,
  type Vehicle,
  type VehiclePhoto,
} from './types';

type Props = {
  mode: 'new' | 'edit';
};

const INPUT_CLASS =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900';

type FormState = {
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
  odometer: string;
  odometerUnit: OdometerUnit;
  purchaseDate: string;
  purchasePrice: string;
  insurer: string;
  policyNumber: string;
  registrationExpires: string;
  notes: string;
};

const EMPTY_FORM = (defaults: { unit: OdometerUnit; fuel: FuelType }): FormState => ({
  nickname: '',
  year: '',
  make: '',
  model: '',
  trim: '',
  bodyStyle: '',
  color: '',
  vin: '',
  licensePlate: '',
  fuelType: defaults.fuel,
  transmission: '',
  odometer: '',
  odometerUnit: defaults.unit,
  purchaseDate: '',
  purchasePrice: '',
  insurer: '',
  policyNumber: '',
  registrationExpires: '',
  notes: '',
});

function fromVehicle(v: Vehicle): FormState {
  return {
    nickname: v.nickname,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    bodyStyle: v.bodyStyle,
    color: v.color,
    vin: v.vin,
    licensePlate: v.licensePlate,
    fuelType: v.fuelType,
    transmission: v.transmission,
    odometer: v.odometer,
    odometerUnit: v.odometerUnit,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    insurer: v.insurer,
    policyNumber: v.policyNumber,
    registrationExpires: v.registrationExpires,
    notes: v.notes,
  };
}

export function VehiclePage({ mode }: Props) {
  const {
    data,
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
  } = useVehicleHistory();

  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isNew = mode === 'new';

  const existing = useMemo(
    () => (isNew ? null : data.vehicles.find((v) => v.id === params.id) ?? null),
    [isNew, data.vehicles, params.id],
  );

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? fromVehicle(existing)
      : EMPTY_FORM({
          unit: data.settings.defaultOdometerUnit,
          fuel: data.settings.defaultFuelType,
        }),
  );

  const [savedFlash, setSavedFlash] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photosDraft, setPhotosDraft] = useState<VehiclePhoto[]>(() => existing?.photos ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew && existing) {
      setForm(fromVehicle(existing));
      setPhotosDraft(existing.photos);
    }
  }, [isNew, existing]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const trimmedNickname = form.nickname.trim();
    const payload: Partial<Vehicle> = {
      nickname: trimmedNickname,
      year: form.year.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      trim: form.trim.trim(),
      bodyStyle: form.bodyStyle.trim(),
      color: form.color.trim(),
      vin: form.vin.trim(),
      licensePlate: form.licensePlate.trim(),
      fuelType: form.fuelType,
      transmission: form.transmission.trim(),
      odometer: form.odometer.trim(),
      odometerUnit: form.odometerUnit,
      purchaseDate: form.purchaseDate.trim(),
      purchasePrice: form.purchasePrice.trim(),
      insurer: form.insurer.trim(),
      policyNumber: form.policyNumber.trim(),
      registrationExpires: form.registrationExpires.trim(),
      notes: form.notes.trim(),
    };

    if (isNew) {
      const id = createVehicle({ ...payload, photos: photosDraft });
      navigate(`/vehicle-history/${id}`, { replace: true });
    } else if (existing) {
      updateVehicle(existing.id, payload);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    const label = existing.nickname || [existing.year, existing.make, existing.model].filter(Boolean).join(' ') || 'this vehicle';
    const ok = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (!ok) return;
    removeVehicle(existing.id);
    navigate('/vehicle-history', { replace: true });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const next: VehiclePhoto[] = [];
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
          setPhotosDraft((prev) => [...prev, ...next]);
        } else if (existing) {
          for (const photo of next) attachPhoto(existing.id, photo);
          setPhotosDraft((prev) => [...prev, ...next]);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    if (!isNew && existing) detachPhoto(existing.id, photoId);
    setPhotosDraft((prev) => prev.filter((p) => p.id !== photoId));
  };

  const photos = isNew ? photosDraft : existing?.photos ?? [];
  const records = existing?.records ?? [];
  const schedules = existing?.schedules ?? [];

  const dueInfos = useMemo(() => {
    if (!existing) return [];
    return evaluateVehicleSchedules(existing, data.settings);
  }, [existing, data.settings]);

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
    return <Navigate to="/vehicle-history" replace />;
  }

  const heading = form.nickname.trim() ||
    [form.year, form.make, form.model].filter((s) => s.trim()).join(' ').trim() ||
    (isNew ? 'New vehicle' : 'Untitled vehicle');

  return (
    <section className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/vehicle-history"
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All vehicles
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{heading}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {isNew
              ? 'Save the basics — you can add maintenance records and schedules after creating the vehicle.'
              : 'Edit details, then track service records and intervals below.'}
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <Save className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            {isNew ? 'Create vehicle' : savedFlash ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      <form
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="space-y-6">
          <Card title="Vehicle details" icon={Car}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nickname">
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setField('nickname', e.target.value)}
                  placeholder="Daily driver, Work truck…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Year">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  placeholder="2018"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Make">
                <input
                  type="text"
                  value={form.make}
                  onChange={(e) => setField('make', e.target.value)}
                  placeholder="Toyota, Ford…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Model">
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setField('model', e.target.value)}
                  placeholder="Tacoma, F-150…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Trim / package">
                <input
                  type="text"
                  value={form.trim}
                  onChange={(e) => setField('trim', e.target.value)}
                  placeholder="TRD Off-Road, XLT…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Body style">
                <input
                  type="text"
                  value={form.bodyStyle}
                  onChange={(e) => setField('bodyStyle', e.target.value)}
                  placeholder="Sedan, SUV, Pickup…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Color">
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setField('color', e.target.value)}
                  placeholder="Midnight Black…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Transmission">
                <input
                  type="text"
                  value={form.transmission}
                  onChange={(e) => setField('transmission', e.target.value)}
                  placeholder="Automatic, 6-speed manual…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="VIN" full>
                <input
                  type="text"
                  value={form.vin}
                  onChange={(e) => setField('vin', e.target.value.toUpperCase())}
                  placeholder="17-character VIN"
                  className={`${INPUT_CLASS} font-mono tracking-wider`}
                />
              </Field>
              <Field label="License plate">
                <input
                  type="text"
                  value={form.licensePlate}
                  onChange={(e) => setField('licensePlate', e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </Field>
              <Field label="Notes" full>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Anything else worth remembering."
                  rows={3}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </Card>

          {!isNew && existing && (
            <Card
              title={`Maintenance records (${records.length})`}
              icon={Wrench}
              action={
                <AddRecordButton
                  onAdd={(record) => addRecord(existing.id, record)}
                  vehicleOdometer={form.odometer}
                />
              }
            >
              <RecordList
                records={records}
                unit={form.odometerUnit}
                onUpdate={(id, patch) => updateRecord(existing.id, id, patch)}
                onRemove={(id) => removeRecord(existing.id, id)}
              />
            </Card>
          )}

          {!isNew && existing && (
            <Card
              title={`Maintenance schedules (${schedules.length})`}
              icon={Calendar}
              action={
                <AddScheduleButton onAdd={(schedule) => addSchedule(existing.id, schedule)} />
              }
            >
              <ScheduleList
                schedules={schedules}
                infos={dueInfos}
                unit={form.odometerUnit}
                onUpdate={(id, patch) => updateSchedule(existing.id, id, patch)}
                onRemove={(id) => removeSchedule(existing.id, id)}
              />
            </Card>
          )}

          <Card
            title={`Photos (${photos.length})`}
            icon={ImagePlus}
            action={
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
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
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100"
              >
                <Camera className="h-6 w-6" strokeWidth={2} aria-hidden />
                <span className="text-sm font-medium">Add photos of the vehicle</span>
                <span className="text-xs">Compressed locally for fast saves.</span>
              </button>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <li
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg ring-1 ring-zinc-200"
                  >
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
          <Card title="Odometer & fuel" icon={Gauge}>
            <div className="grid gap-3">
              <Field label="Current odometer">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.odometer}
                    onChange={(e) => setField('odometer', e.target.value)}
                    placeholder="120,500"
                    className={`${INPUT_CLASS} flex-1`}
                  />
                  <select
                    value={form.odometerUnit}
                    onChange={(e) => setField('odometerUnit', e.target.value as OdometerUnit)}
                    className={`${INPUT_CLASS} w-20`}
                    aria-label="Odometer unit"
                  >
                    {ODOMETER_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Fuel type">
                <select
                  value={form.fuelType}
                  onChange={(e) => setField('fuelType', e.target.value as FuelType)}
                  className={INPUT_CLASS}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 border border-zinc-200">
                <Fuel className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.25} aria-hidden />
                {form.fuelType} · {form.odometerUnit === 'mi' ? 'Miles' : 'Kilometers'}
              </div>
            </div>
          </Card>

          <Card title="Purchase & registration" icon={Calendar}>
            <div className="grid gap-3">
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
                  placeholder="$28,500.00"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Insurer">
                <input
                  type="text"
                  value={form.insurer}
                  onChange={(e) => setField('insurer', e.target.value)}
                  placeholder="State Farm, ICBC…"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Policy #">
                <input
                  type="text"
                  value={form.policyNumber}
                  onChange={(e) => setField('policyNumber', e.target.value)}
                  className={`${INPUT_CLASS} font-mono`}
                />
              </Field>
              <Field label="Registration expires">
                <input
                  type="date"
                  value={form.registrationExpires}
                  onChange={(e) => setField('registrationExpires', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </Card>

          {!isNew && existing && (
            <Card title="Record info" icon={Clock}>
              <dl className="text-xs text-zinc-600 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt>Created</dt>
                  <dd className="text-zinc-800 font-medium">{formatDateTime(existing.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Last updated</dt>
                  <dd className="text-zinc-800 font-medium">{formatDateTime(existing.updatedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>ID</dt>
                  <dd className="text-zinc-500 font-mono truncate max-w-[10rem]" title={existing.id}>
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
          className="fixed inset-0 z-[60] bg-zinc-900/85 backdrop-blur flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-zinc-700 hover:bg-white"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-zinc-700 hover:bg-white"
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
                className="absolute right-16 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-zinc-700 hover:bg-white"
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

function AddRecordButton({
  onAdd,
  vehicleOdometer,
}: {
  onAdd: (record: MaintenanceRecord) => void;
  vehicleOdometer: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <button
      type="button"
      onClick={() =>
        onAdd({
          id: newId('rec'),
          date: today,
          odometer: vehicleOdometer.trim(),
          serviceType: '',
          vendor: '',
          cost: '',
          notes: '',
        })
      }
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      Log service
    </button>
  );
}

function RecordList({
  records,
  unit,
  onUpdate,
  onRemove,
}: {
  records: MaintenanceRecord[];
  unit: OdometerUnit;
  onUpdate: (id: string, patch: Partial<MaintenanceRecord>) => void;
  onRemove: (id: string) => void;
}) {
  const sorted = useMemo(() => {
    return records.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [records]);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Log every service that gets done — oil changes, tires, brakes, repairs.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((r) => (
        <RecordRow key={r.id} record={r} unit={unit} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </ul>
  );
}

function RecordRow({
  record,
  unit,
  onUpdate,
  onRemove,
}: {
  record: MaintenanceRecord;
  unit: OdometerUnit;
  onUpdate: (id: string, patch: Partial<MaintenanceRecord>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(() => record.serviceType.trim() === '');
  const [draft, setDraft] = useState(record);

  useEffect(() => {
    setDraft(record);
  }, [record]);

  if (!editing) {
    const odo = parseOdometer(record.odometer);
    return (
      <li className="rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-zinc-900 truncate">
              {record.serviceType || 'Service'}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {formatDate(record.date)}
              {odo !== null && ` · ${odo.toLocaleString()} ${unit}`}
              {record.vendor && ` · ${record.vendor}`}
              {record.cost && ` · ${record.cost}`}
            </p>
            {record.notes && (
              <p className="text-xs text-zinc-600 mt-1 whitespace-pre-wrap">{record.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-8 px-2 items-center justify-center rounded-md text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this service record?')) onRemove(record.id);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete record"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-300 bg-white p-3">
      <RecordEditor
        value={draft}
        unit={unit}
        onChange={setDraft}
        onCancel={() => {
          if (!record.serviceType.trim()) {
            onRemove(record.id);
            return;
          }
          setEditing(false);
          setDraft(record);
        }}
        onSave={() => {
          if (!draft.serviceType.trim()) return;
          onUpdate(record.id, {
            ...draft,
            serviceType: draft.serviceType.trim(),
            vendor: draft.vendor.trim(),
            cost: draft.cost.trim(),
            odometer: draft.odometer.trim(),
            notes: draft.notes.trim(),
          });
          setEditing(false);
        }}
      />
    </li>
  );
}

function RecordEditor({
  value,
  unit,
  onChange,
  onSave,
  onCancel,
}: {
  value: MaintenanceRecord;
  unit: OdometerUnit;
  onChange: (v: MaintenanceRecord) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Service type" full>
        <input
          type="text"
          value={value.serviceType}
          onChange={(e) => onChange({ ...value, serviceType: e.target.value })}
          placeholder="Oil change, brake pads, tire rotation…"
          className={INPUT_CLASS}
          autoFocus
        />
      </Field>
      <Field label="Date">
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label={`Odometer (${unit})`}>
        <input
          type="text"
          inputMode="numeric"
          value={value.odometer}
          onChange={(e) => onChange({ ...value, odometer: e.target.value })}
          placeholder="120,500"
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Vendor / shop">
        <input
          type="text"
          value={value.vendor}
          onChange={(e) => onChange({ ...value, vendor: e.target.value })}
          placeholder="Jiffy Lube, dealer…"
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Cost">
        <input
          type="text"
          inputMode="decimal"
          value={value.cost}
          onChange={(e) => onChange({ ...value, cost: e.target.value })}
          placeholder="$89.95"
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Notes" full>
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
          className={INPUT_CLASS}
        />
      </Field>
      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function AddScheduleButton({ onAdd }: { onAdd: (schedule: MaintenanceSchedule) => void }) {
  return (
    <button
      type="button"
      onClick={() =>
        onAdd({
          id: newId('sch'),
          serviceType: '',
          everyDistance: null,
          everyMonths: null,
          notes: '',
        })
      }
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      Add interval
    </button>
  );
}

function ScheduleList({
  schedules,
  infos,
  unit,
  onUpdate,
  onRemove,
}: {
  schedules: MaintenanceSchedule[];
  infos: ReturnType<typeof evaluateVehicleSchedules>;
  unit: OdometerUnit;
  onUpdate: (id: string, patch: Partial<MaintenanceSchedule>) => void;
  onRemove: (id: string) => void;
}) {
  if (schedules.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Add service intervals (e.g. <em>Oil change every 5,000 mi or 6 months</em>) and we&apos;ll
        flag what&apos;s due next based on your logged records.
      </p>
    );
  }

  const infoById = new Map(infos.map((i) => [i.schedule.id, i] as const));

  return (
    <ul className="space-y-2">
      {schedules.map((s) => {
        const info = infoById.get(s.id);
        const status = info?.status ?? 'no-history';
        const tokens = STATUS_TOKENS[status];
        const StatusIcon =
          status === 'overdue' ? AlertTriangle : status === 'due-soon' ? Wrench : CheckCircle2;
        return (
          <li key={s.id} className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tokens.chip}`}
              >
                <StatusIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                {tokens.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this schedule?')) onRemove(s.id);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete schedule"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <input
                type="text"
                value={s.serviceType}
                onChange={(e) => onUpdate(s.id, { serviceType: e.target.value })}
                placeholder="Service (matches record types)"
                className={INPUT_CLASS}
              />
              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                  Every {unit}
                </span>
                <input
                  type="number"
                  min={0}
                  value={s.everyDistance ?? ''}
                  onChange={(e) =>
                    onUpdate(s.id, {
                      everyDistance: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="5000"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                  Every months
                </span>
                <input
                  type="number"
                  min={0}
                  value={s.everyMonths ?? ''}
                  onChange={(e) =>
                    onUpdate(s.id, {
                      everyMonths: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="6"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <input
              type="text"
              value={s.notes}
              onChange={(e) => onUpdate(s.id, { notes: e.target.value })}
              placeholder="Optional notes (synthetic only, dealer only, etc.)"
              className={`${INPUT_CLASS} mt-2`}
            />

            {info && (
              <div className="mt-2 text-xs text-zinc-600 space-y-0.5">
                {info.lastRecord ? (
                  <p>
                    Last:{' '}
                    <span className="font-medium text-zinc-800">
                      {formatDate(info.lastRecord.date)}
                    </span>
                    {info.lastRecord.odometer && (
                      <>
                        {' '}at{' '}
                        <span className="font-medium text-zinc-800">
                          {parseOdometer(info.lastRecord.odometer)?.toLocaleString() ??
                            info.lastRecord.odometer}{' '}
                          {unit}
                        </span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-zinc-500">No matching service logged yet.</p>
                )}
                {(info.nextDueDate || info.nextDueDistance !== null) && (
                  <p>
                    Next due:{' '}
                    <span className="font-medium text-zinc-800">
                      {info.nextDueDate ? formatDate(info.nextDueDate) : '—'}
                    </span>
                    {info.nextDueDistance !== null && (
                      <>
                        {' '}/{' '}
                        <span className="font-medium text-zinc-800">
                          {info.nextDueDistance.toLocaleString()} {unit}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: typeof Car;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 tracking-tight">
          {Icon && <Icon className="h-4 w-4 text-zinc-500" strokeWidth={2.25} aria-hidden />}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
