import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  ImagePlus,
  Link2,
  Pencil,
  Save,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';
import {
  buildMediaFromUrl,
  buildUploadedPhoto,
  buildUploadedVideo,
  classifyVideoSource,
} from './media';
import type { FamilyMediaItem, FamilyMember } from './types';

export function FamilyAlbumPage() {
  const { data, updateAlbum, removeAlbum, addMediaItem, updateMediaItem, removeMediaItem, toggleMediaTag } =
    useFamilyTree();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  const album = useMemo(
    () => data.albums.find((a) => a.id === params.id) ?? null,
    [data.albums, params.id],
  );

  const media = useMemo(() => {
    if (!album) return [];
    return data.media
      .filter((m) => m.albumId === album.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [album, data.media]);

  const memberById = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    for (const m of data.members) map.set(m.id, m);
    return map;
  }, [data.members]);

  const [editingMeta, setEditingMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState(album?.name ?? '');
  const [descDraft, setDescDraft] = useState(album?.description ?? '');
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlKind, setUrlKind] = useState<'photo' | 'video'>('photo');

  const photoFileInput = useRef<HTMLInputElement>(null);
  const videoFileInput = useRef<HTMLInputElement>(null);

  if (!album) {
    return <Navigate to="/family-tree/albums" replace />;
  }

  const allowPhotos = album.kind !== 'videos';
  const allowVideos = album.kind !== 'photos';

  const handleSaveMeta = () => {
    const name = titleDraft.trim() || 'Untitled album';
    updateAlbum(album.id, { name, description: descDraft.trim() });
    setEditingMeta(false);
  };

  const handleDeleteAlbum = () => {
    const ok = window.confirm(`Delete album "${album.name}"? All media inside will be removed.`);
    if (!ok) return;
    removeAlbum(album.id);
    navigate('/family-tree/albums');
  };

  const handlePhotoFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setUploadError(null);
    try {
      for (const file of Array.from(fileList)) {
        try {
          const item = await buildUploadedPhoto(file, album.id);
          addMediaItem(item);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not import a photo');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVideoFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setUploadError(null);
    try {
      for (const file of Array.from(fileList)) {
        try {
          const item = await buildUploadedVideo(file, album.id);
          addMediaItem(item);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Could not import a video');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const item = buildMediaFromUrl(url, urlKind, album.id);
    addMediaItem(item);
    setUrlInput('');
  };

  const handleSetCover = (mediaId: string) => {
    updateAlbum(album.id, { coverMediaId: mediaId });
  };

  const handleRemoveMedia = (mediaId: string) => {
    const ok = window.confirm('Remove this memory from the album?');
    if (!ok) return;
    removeMediaItem(mediaId);
    if (activeMediaId === mediaId) setActiveMediaId(null);
  };

  const lightboxIndex = activeMediaId
    ? media.findIndex((m) => m.id === activeMediaId)
    : -1;
  const activeMedia = lightboxIndex >= 0 ? media[lightboxIndex] : null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/family-tree/albums"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen-dark hover:text-evergreen-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          All albums
        </Link>
        <button
          type="button"
          onClick={handleDeleteAlbum}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Delete album
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-evergreen/20 bg-white shadow-sm p-5">
        {editingMeta ? (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                Album name
              </span>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                Description
              </span>
              <textarea
                rows={3}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(album.name);
                  setDescDraft(album.description);
                  setEditingMeta(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-1.5 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-dark px-3 py-1.5 text-sm font-semibold text-white hover:bg-evergreen-ink"
              >
                <Save className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-evergreen-ink tracking-tight">
                {album.name}
              </h2>
              {album.description && (
                <p className="mt-1 text-sm text-evergreen-dark/85">{album.description}</p>
              )}
              <p className="mt-2 text-xs text-evergreen-dark/70">
                {media.length} {media.length === 1 ? 'item' : 'items'} ·{' '}
                {album.kind === 'photos' ? 'Photos only' : album.kind === 'videos' ? 'Videos only' : 'Photos & videos'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTitleDraft(album.name);
                setDescDraft(album.description);
                setEditingMeta(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-1.5 text-xs font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Edit details
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-evergreen/20 bg-white shadow-sm p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-evergreen-dark">
          Add memories
        </h3>
        <div className="flex flex-wrap gap-2">
          {allowPhotos && (
            <button
              type="button"
              onClick={() => photoFileInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-dark px-3 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Upload photos
            </button>
          )}
          {allowVideos && (
            <button
              type="button"
              onClick={() => videoFileInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-2 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Video className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Upload videos
            </button>
          )}
        </div>
        <p className="text-[11px] text-evergreen-dark/70">
          Photos are auto-compressed for storage. Videos are best added as URLs (YouTube, Vimeo,
          or any direct video link) — uploads over ~6 MB are rejected to keep your data
          syncable.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <label className="flex-1 block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
              Paste a URL
            </span>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://… (photo, YouTube, Vimeo, or direct .mp4)"
              className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
              Type
            </span>
            <select
              value={urlKind}
              onChange={(e) => setUrlKind(e.target.value as 'photo' | 'video')}
              className="block w-full sm:w-auto rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
            >
              {allowPhotos && <option value="photo">Photo</option>}
              {allowVideos && <option value="video">Video</option>}
            </select>
          </label>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-2 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Add URL
          </button>
        </div>

        {uploadError && (
          <p role="alert" className="text-xs text-red-700">
            {uploadError}
          </p>
        )}

        <input
          ref={photoFileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handlePhotoFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={videoFileInput}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleVideoFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {media.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-evergreen/20 bg-white shadow-sm px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-evergreen-light/60 text-evergreen-dark">
            <ImagePlus className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h3 className="mt-3 text-base font-semibold text-evergreen-ink">No memories yet</h3>
          <p className="mt-1 text-sm text-evergreen-dark/85 max-w-md mx-auto">
            Upload photos or paste a video URL to start curating this album.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => {
            const tagged = m.taggedMemberIds
              .map((id) => memberById.get(id))
              .filter((x): x is FamilyMember => x !== undefined);
            const isCover = album.coverMediaId === m.id;
            return (
              <li key={m.id}>
                <div className="group relative overflow-hidden rounded-xl border-2 border-evergreen/15 bg-white shadow-sm hover:border-evergreen/45 hover:shadow-md transition-all">
                  <button
                    type="button"
                    onClick={() => setActiveMediaId(m.id)}
                    className="block w-full aspect-square bg-evergreen-light/40"
                  >
                    {m.kind === 'photo' ? (
                      <img
                        src={m.src}
                        alt={m.caption || m.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <VideoThumb media={m} />
                    )}
                  </button>
                  <div className="p-2.5">
                    {m.caption && (
                      <p className="text-xs text-evergreen-ink line-clamp-2 mb-1">{m.caption}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1">
                      {tagged.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 rounded-full bg-evergreen-light/60 px-2 py-0.5 text-[10px] font-semibold text-evergreen-dark"
                        >
                          {t.fullName || 'Unnamed'}
                        </span>
                      ))}
                      {tagged.length > 3 && (
                        <span className="text-[10px] text-evergreen-dark/65">
                          +{tagged.length - 3}
                        </span>
                      )}
                      {tagged.length === 0 && (
                        <span className="text-[10px] italic text-evergreen-dark/60">
                          No tags yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {m.kind === 'photo' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCover(m.id);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md shadow-sm transition-colors ${
                          isCover
                            ? 'bg-cody-gold text-cody-finnish-dark'
                            : 'bg-white/90 text-evergreen-dark hover:bg-cody-gold/30'
                        }`}
                        aria-label={isCover ? 'Album cover' : 'Set as album cover'}
                        title={isCover ? 'Album cover' : 'Set as album cover'}
                      >
                        <Star className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMedia(m.id);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-evergreen-dark/65 hover:bg-red-50 hover:text-red-600 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Remove memory"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                  {m.kind === 'video' && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-evergreen-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Film className="h-3 w-3" aria-hidden />
                      Video
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeMedia && (
        <MediaLightbox
          media={activeMedia}
          onClose={() => setActiveMediaId(null)}
          onPrev={() => {
            const i = lightboxIndex - 1;
            if (i >= 0) setActiveMediaId(media[i].id);
          }}
          onNext={() => {
            const i = lightboxIndex + 1;
            if (i < media.length) setActiveMediaId(media[i].id);
          }}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < media.length - 1}
          allMembers={data.members}
          onToggleTag={(memberId) => toggleMediaTag(activeMedia.id, memberId)}
          onCaption={(caption) => updateMediaItem(activeMedia.id, { caption })}
          onTakenAt={(takenAt) => updateMediaItem(activeMedia.id, { takenAt })}
        />
      )}
    </section>
  );
}

function VideoThumb({ media }: { media: FamilyMediaItem }) {
  if (media.source === 'url') {
    const cls = classifyVideoSource(media.src);
    if (cls.kind === 'youtube') {
      return (
        <div className="relative h-full w-full">
          <img
            src={`https://i.ytimg.com/vi/${cls.id}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
            <Video className="h-8 w-8" strokeWidth={2.25} aria-hidden />
          </span>
        </div>
      );
    }
  }
  return (
    <div className="relative h-full w-full bg-evergreen-ink">
      <span className="absolute inset-0 flex items-center justify-center text-white">
        <Video className="h-8 w-8" strokeWidth={2.25} aria-hidden />
      </span>
    </div>
  );
}

function MediaLightbox({
  media,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  allMembers,
  onToggleTag,
  onCaption,
  onTakenAt,
}: {
  media: FamilyMediaItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  allMembers: FamilyMember[];
  onToggleTag: (memberId: string) => void;
  onCaption: (caption: string) => void;
  onTakenAt: (takenAt: string) => void;
}) {
  const [captionDraft, setCaptionDraft] = useState(media.caption);
  const [takenAtDraft, setTakenAtDraft] = useState(media.takenAt);

  useEffect(() => {
    setCaptionDraft(media.caption);
    setTakenAtDraft(media.takenAt);
  }, [media.id, media.caption, media.takenAt]);

  return (
    <div
      className="fixed inset-0 z-50 bg-evergreen-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative md:flex-1 bg-evergreen-ink flex items-center justify-center min-h-[40vh]">
          {media.kind === 'photo' ? (
            <img
              src={media.src}
              alt={media.caption || media.name}
              className="max-h-[60vh] md:max-h-[92vh] max-w-full object-contain"
            />
          ) : (
            <VideoPlayer media={media} />
          )}
          {hasPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-evergreen-ink hover:bg-white"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-evergreen-ink hover:bg-white"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-evergreen-ink hover:bg-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <aside className="w-full md:w-80 shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-evergreen/15 bg-white">
          <div className="p-4 space-y-3 overflow-y-auto">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                Caption
              </span>
              <textarea
                rows={2}
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onBlur={() => onCaption(captionDraft)}
                placeholder="Add a caption…"
                className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
                When was this?
              </span>
              <input
                type="text"
                value={takenAtDraft}
                onChange={(e) => setTakenAtDraft(e.target.value)}
                onBlur={() => onTakenAt(takenAtDraft)}
                placeholder="Summer 1994, 1948-06-14, etc."
                className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
              />
            </label>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-evergreen-dark inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  Tag family members
                </span>
                <span className="text-[11px] text-evergreen-dark/65">
                  {media.taggedMemberIds.length} tagged
                </span>
              </div>
              {allMembers.length === 0 ? (
                <p className="mt-2 text-xs italic text-evergreen-dark/65">
                  No family members yet — add some to start tagging.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {allMembers.map((m) => {
                    const active = media.taggedMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onToggleTag(m.id)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
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
              {allMembers.length === 0 && (
                <Link
                  to="/family-tree/members/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-1.5 text-xs font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
                >
                  <Users className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  Add a family member
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function VideoPlayer({ media }: { media: FamilyMediaItem }) {
  if (media.source === 'url') {
    const cls = classifyVideoSource(media.src);
    if (cls.kind === 'youtube' || cls.kind === 'vimeo') {
      return (
        <div className="w-full max-w-4xl aspect-video">
          <iframe
            src={cls.embedUrl}
            title={media.caption || media.name}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
  }
  return (
    <video
      src={media.src}
      controls
      className="max-h-[80vh] max-w-full"
      preload="metadata"
    >
      Your browser does not support inline video playback.
    </video>
  );
}

