import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Heart,
  ImagePlus,
  Save,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';
import { compressPortrait } from './media';
import {
  GENDER_OPTIONS,
  GENDER_TOKENS,
  type FamilyGender,
  type FamilyMember,
  type FamilyPortrait,
} from './types';

type Props = { mode: 'new' | 'edit' };

const INPUT_CLASS =
  'block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink placeholder:text-evergreen-dark/45 shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark';

type FormState = {
  fullName: string;
  nickname: string;
  birthDate: string;
  deathDate: string;
  birthplace: string;
  gender: FamilyGender;
  bio: string;
  notes: string;
  parentIds: string[];
  partnerIds: string[];
};

const EMPTY_FORM = (): FormState => ({
  fullName: '',
  nickname: '',
  birthDate: '',
  deathDate: '',
  birthplace: '',
  gender: 'female',
  bio: '',
  notes: '',
  parentIds: [],
  partnerIds: [],
});

function fromMember(m: FamilyMember): FormState {
  return {
    fullName: m.fullName,
    nickname: m.nickname,
    birthDate: m.birthDate,
    deathDate: m.deathDate,
    birthplace: m.birthplace,
    gender: m.gender,
    bio: m.bio,
    notes: m.notes,
    parentIds: m.parentIds.slice(),
    partnerIds: m.partnerIds.slice(),
  };
}

export function FamilyMemberPage({ mode }: Props) {
  const { data, createMember, updateMember, removeMember, setPortrait } = useFamilyTree();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isNew = mode === 'new';

  const existing = useMemo(
    () => (isNew ? null : data.members.find((m) => m.id === params.id) ?? null),
    [isNew, data.members, params.id],
  );

  const [form, setForm] = useState<FormState>(() =>
    existing ? fromMember(existing) : EMPTY_FORM(),
  );
  const [portrait, setLocalPortrait] = useState<FamilyPortrait | null>(
    () => existing?.portrait ?? null,
  );
  const [portraitUrlInput, setPortraitUrlInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) {
      setForm(fromMember(existing));
      setLocalPortrait(existing.portrait);
    }
  }, [existing]);

  // In edit mode, if id doesn't exist, route home.
  if (!isNew && !existing && params.id) {
    return <Navigate to="/family-tree/members" replace />;
  }

  const memberId = existing?.id ?? null;

  const otherMembers = useMemo(
    () => data.members.filter((m) => m.id !== memberId),
    [data.members, memberId],
  );

  const handleFile = async (file: File) => {
    try {
      setUploadError(null);
      setUploading(true);
      const p = await compressPortrait(file);
      setLocalPortrait(p);
      if (existing) {
        setPortrait(existing.id, p);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not import portrait');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    const url = portraitUrlInput.trim();
    if (!url) return;
    const p: FamilyPortrait = {
      id: `portrait-url-${Date.now()}`,
      source: 'url',
      src: url,
      mime: 'image/*',
      name: url.split('/').pop() || 'portrait',
      width: 0,
      height: 0,
    };
    setLocalPortrait(p);
    setPortraitUrlInput('');
    if (existing) {
      setPortrait(existing.id, p);
    }
  };

  const handleClearPortrait = () => {
    setLocalPortrait(null);
    if (existing) setPortrait(existing.id, null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = {
      ...form,
      fullName: form.fullName.trim(),
      nickname: form.nickname.trim(),
      birthplace: form.birthplace.trim(),
      bio: form.bio.trim(),
      notes: form.notes.trim(),
    };
    if (!cleaned.fullName) {
      setUploadError('Please give this person a name.');
      return;
    }
    if (existing) {
      updateMember(existing.id, { ...cleaned, portrait });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } else {
      const id = createMember({ ...cleaned, portrait });
      navigate(`/family-tree/members/${id}`, { replace: true });
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    const ok = window.confirm(
      `Remove ${existing.fullName || 'this member'} from your family tree?`,
    );
    if (!ok) return;
    removeMember(existing.id);
    navigate('/family-tree/members');
  };

  const toggleParent = (id: string) => {
    setForm((prev) => {
      const has = prev.parentIds.includes(id);
      if (has) return { ...prev, parentIds: prev.parentIds.filter((v) => v !== id) };
      if (prev.parentIds.length >= 2) {
        return { ...prev, parentIds: [prev.parentIds[1], id] };
      }
      return { ...prev, parentIds: [...prev.parentIds, id] };
    });
  };

  const togglePartner = (id: string) => {
    setForm((prev) => ({
      ...prev,
      partnerIds: prev.partnerIds.includes(id)
        ? prev.partnerIds.filter((v) => v !== id)
        : [...prev.partnerIds, id],
    }));
  };

  const tokens = GENDER_TOKENS[form.gender];

  const taggedMedia = useMemo(() => {
    if (!existing) return [];
    return data.media.filter((m) => m.taggedMemberIds.includes(existing.id));
  }, [data.media, existing]);

  const children = useMemo(() => {
    if (!existing) return [];
    return data.members.filter((m) => m.parentIds.includes(existing.id));
  }, [data.members, existing]);

  return (
    <section className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/family-tree/members"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen-dark hover:text-evergreen-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All members
        </Link>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Remove member
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-6">
        <div className={`rounded-2xl border-2 bg-white shadow-sm p-5 ${tokens.card}`}>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex flex-col items-center gap-2">
              {portrait ? (
                <img
                  src={portrait.src}
                  alt=""
                  className="h-32 w-32 sm:h-36 sm:w-36 rounded-2xl object-cover ring-1 ring-evergreen/15"
                />
              ) : (
                <span
                  className={`flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-2xl ring-1 ring-evergreen/15 ${tokens.surface}`}
                >
                  <UserIcon className={`h-14 w-14 ${tokens.accent}`} aria-hidden />
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
                  disabled={uploading}
                >
                  <Camera className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  {uploading ? 'Uploading…' : portrait ? 'Replace' : 'Add portrait'}
                </button>
                {portrait && (
                  <button
                    type="button"
                    onClick={handleClearPortrait}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-evergreen-dark/55 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove portrait"
                  >
                    <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
              <details className="text-[11px] text-evergreen-dark/80 mt-1 max-w-[14rem]">
                <summary className="cursor-pointer select-none">Or use an image URL</summary>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <input
                    type="url"
                    placeholder="https://…"
                    value={portraitUrlInput}
                    onChange={(e) => setPortraitUrlInput(e.target.value)}
                    className="rounded border border-evergreen/25 px-2 py-1 text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="inline-flex items-center justify-center gap-1 rounded border border-evergreen/30 bg-white px-2 py-1 text-[11px] font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
                  >
                    <ImagePlus className="h-3 w-3" aria-hidden />
                    Use URL
                  </button>
                </div>
              </details>
              {uploadError && (
                <p role="alert" className="text-[11px] text-red-700 max-w-[14rem] text-center">
                  {uploadError}
                </p>
              )}
            </div>

            <div className="flex-1 w-full grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Full name
                </span>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                  placeholder="e.g. Mary Elizabeth Fairburn"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Nickname
                </span>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm((s) => ({ ...s, nickname: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Gender
                </span>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, gender: e.target.value as FamilyGender }))
                  }
                  className={INPUT_CLASS}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Birth date
                </span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((s) => ({ ...s, birthDate: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Date passed (optional)
                </span>
                <input
                  type="date"
                  value={form.deathDate}
                  onChange={(e) => setForm((s) => ({ ...s, deathDate: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="sm:col-span-2 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                  Birthplace
                </span>
                <input
                  type="text"
                  value={form.birthplace}
                  onChange={(e) => setForm((s) => ({ ...s, birthplace: e.target.value }))}
                  placeholder="City, Province / Country"
                  className={INPUT_CLASS}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-evergreen/20 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-evergreen-dark">
            Biography &amp; stories
          </h3>
          <label className="mt-3 block">
            <span className="block text-xs font-semibold text-evergreen-dark mb-1">
              Short biography
            </span>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
              placeholder="What should the family remember about this person?"
              className={INPUT_CLASS}
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-xs font-semibold text-evergreen-dark mb-1">
              Private notes
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Anything else you want to keep (not displayed in the tree)"
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-evergreen/20 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-evergreen-dark">
            Relationships
          </h3>
          <p className="mt-1 text-xs text-evergreen-dark/85">
            Pick up to two parents and any number of partners. Add more family members first if
            they aren&apos;t showing up.
          </p>

          <div className="mt-4">
            <h4 className="text-xs font-semibold text-evergreen-dark mb-2">
              Parents ({form.parentIds.length}/2)
            </h4>
            {otherMembers.length === 0 ? (
              <p className="text-xs italic text-evergreen-dark/65">
                No other members yet. Save this member first and then add another.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {otherMembers.map((m) => {
                  const active = form.parentIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleParent(m.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-evergreen-dark text-white border-evergreen-dark'
                          : 'bg-white text-evergreen-ink border-evergreen/30 hover:bg-evergreen-light/40'
                      }`}
                    >
                      {m.fullName || 'Unnamed'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5">
            <h4 className="text-xs font-semibold text-evergreen-dark mb-2 inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-500" aria-hidden /> Partners /
              Spouses
            </h4>
            {otherMembers.length === 0 ? (
              <p className="text-xs italic text-evergreen-dark/65">
                Add another member first to record a partnership.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {otherMembers.map((m) => {
                  const active = form.partnerIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => togglePartner(m.id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-evergreen-ink border-evergreen/30 hover:bg-rose-50'
                      }`}
                    >
                      {m.fullName || 'Unnamed'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {existing && (children.length > 0 || taggedMedia.length > 0) && (
          <div className="rounded-2xl border border-evergreen/20 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-evergreen-dark">
              Memory feed
            </h3>
            {children.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-evergreen-dark mb-2">Children</h4>
                <div className="flex flex-wrap gap-1.5">
                  {children.map((c) => (
                    <Link
                      key={c.id}
                      to={`/family-tree/members/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-evergreen/25 bg-evergreen-light/40 px-3 py-1 text-xs font-semibold text-evergreen-dark hover:bg-evergreen-light/70"
                    >
                      {c.fullName || 'Unnamed'}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {taggedMedia.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-evergreen-dark mb-2">
                  Tagged in {taggedMedia.length} {taggedMedia.length === 1 ? 'memory' : 'memories'}
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {taggedMedia.slice(0, 12).map((mi) => (
                    <Link
                      key={mi.id}
                      to={`/family-tree/albums/${mi.albumId}`}
                      className="block aspect-square overflow-hidden rounded-lg ring-1 ring-evergreen/15 bg-evergreen-light/40"
                    >
                      {mi.kind === 'photo' ? (
                        <img
                          src={mi.src}
                          alt={mi.caption || mi.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[11px] text-evergreen-dark font-semibold">
                          Video
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-evergreen-dark/70">
            {savedFlash && <span className="text-evergreen-dark font-semibold">Saved ✓</span>}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/family-tree/members"
              className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-2 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-dark px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-dark focus-visible:ring-offset-2"
            >
              <Save className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {existing ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
