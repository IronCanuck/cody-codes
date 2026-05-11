import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, GalleryVerticalEnd, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';
import type { FamilyAlbumKind } from './types';

export function FamilyAlbumsList() {
  const { data, createAlbum, removeAlbum } = useFamilyTree();
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<FamilyAlbumKind>('mixed');

  const albums = useMemo(() => {
    return data.albums.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.albums]);

  const mediaByAlbum = useMemo(() => {
    const map = new Map<string, { photos: number; videos: number; cover: string | null }>();
    for (const a of data.albums) map.set(a.id, { photos: 0, videos: 0, cover: a.coverMediaId });
    for (const m of data.media) {
      const cur = map.get(m.albumId) ?? { photos: 0, videos: 0, cover: null };
      if (m.kind === 'photo') cur.photos += 1;
      else cur.videos += 1;
      map.set(m.albumId, cur);
    }
    return map;
  }, [data.albums, data.media]);

  const coverSrcById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of data.media) {
      if (m.kind === 'photo') {
        if (!map.has(m.albumId)) map.set(m.albumId, m.src);
      }
    }
    return map;
  }, [data.media]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createAlbum(name, newKind);
    setNewName('');
    setNewKind('mixed');
  };

  const handleDelete = (id: string, name: string) => {
    const ok = window.confirm(`Delete album "${name}"? All photos and videos inside will be removed.`);
    if (!ok) return;
    removeAlbum(id);
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-evergreen-ink tracking-tight">
            Photo &amp; video albums
          </h2>
          <p className="mt-1 text-sm text-evergreen-dark/85">
            Curate memories by event, era, or branch of the family. Tag who&apos;s in each photo or
            video to keep stories searchable.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-5 rounded-2xl border border-evergreen/20 bg-white shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1 block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
            New album name
          </span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Christmas 2024, Grandma's stories, Wedding day…"
            className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink placeholder:text-evergreen-dark/45 shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-evergreen-dark mb-1">
            Kind
          </span>
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as FamilyAlbumKind)}
            className="block w-full sm:w-auto rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
          >
            <option value="mixed">Photos &amp; videos</option>
            <option value="photos">Photos only</option>
            <option value="videos">Videos only</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={!newName.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-evergreen-dark px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Create album
        </button>
      </form>

      {albums.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-evergreen/20 bg-white shadow-sm px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-evergreen-light/60 text-evergreen-dark">
            <GalleryVerticalEnd className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h3 className="mt-3 text-base font-semibold text-evergreen-ink">No albums yet</h3>
          <p className="mt-1 text-sm text-evergreen-dark/85 max-w-md mx-auto">
            Create your first album above. You can upload photos directly, paste image / video
            URLs, or tag who appears in each memory.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const counts = mediaByAlbum.get(album.id) ?? { photos: 0, videos: 0, cover: null };
            const coverSrc = album.coverMediaId
              ? data.media.find((m) => m.id === album.coverMediaId && m.kind === 'photo')?.src ?? null
              : coverSrcById.get(album.id) ?? null;
            return (
              <li key={album.id}>
                <div className="group relative overflow-hidden rounded-2xl border-2 border-evergreen/20 bg-white shadow-sm transition-all hover:border-evergreen/50 hover:shadow-md">
                  <Link to={`/family-tree/albums/${album.id}`} className="block">
                    <div className="aspect-[5/3] w-full overflow-hidden bg-evergreen-light/40">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-evergreen-dark/65">
                          <GalleryVerticalEnd className="h-10 w-10" strokeWidth={1.75} aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-bold text-evergreen-ink line-clamp-1">
                        {album.name}
                      </h3>
                      {album.description && (
                        <p className="mt-1 text-xs text-evergreen-dark/80 line-clamp-2">
                          {album.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-evergreen-dark">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          {counts.photos}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Film className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                          {counts.videos}
                        </span>
                        <span className="ml-auto text-[11px] text-evergreen-dark/60">
                          {album.kind === 'photos'
                            ? 'Photos'
                            : album.kind === 'videos'
                            ? 'Videos'
                            : 'Mixed'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(album.id, album.name);
                    }}
                    className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-evergreen-dark/65 hover:bg-red-50 hover:text-red-600 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label={`Delete album ${album.name}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
