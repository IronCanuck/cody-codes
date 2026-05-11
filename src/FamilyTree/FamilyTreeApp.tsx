import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  ExternalLink,
  GalleryVerticalEnd,
  LogOut,
  Menu,
  Network,
  Plus,
  Settings as SettingsIcon,
  TreePine,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  defaultSnapshot,
  fetchFamilyTreeCloud,
  hasMeaningfulFamilyTreeData,
  loadSnapshot,
  newId,
  parseSnapshotIsoMs,
  saveSnapshot,
  upsertFamilyTreeCloud,
} from './storage';
import {
  FamilyTreeContext,
  type FamilyTreeContextValue,
  type NewMemberInput,
} from './FamilyTreeContext';
import type {
  FamilyAlbum,
  FamilyAlbumKind,
  FamilyMediaItem,
  FamilyMember,
  FamilyPortrait,
  FamilyTreeSettings,
  FamilyTreeSnapshot,
} from './types';
import { FamilyAlbumPage } from './FamilyAlbumPage';
import { FamilyAlbumsList } from './FamilyAlbumsList';
import { FamilyMemberPage } from './FamilyMemberPage';
import { FamilyMembersList } from './FamilyMembersList';
import { FamilyTreeSettingsPage } from './FamilyTreeSettings';
import { FamilyTreeView } from './FamilyTreeView';

function FamilyTreeShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<FamilyTreeSnapshot>(() => defaultSnapshot());

  const dataRef = useRef(data);
  dataRef.current = data;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCloudSave = useCallback(
    (uid: string | undefined, snapshot: FamilyTreeSnapshot) => {
      if (!uid) return;
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = setTimeout(() => {
        cloudSaveTimerRef.current = null;
        void upsertFamilyTreeCloud(uid, snapshot);
      }, 600);
    },
    [],
  );

  useEffect(() => {
    return () => {
      const hadPending = cloudSaveTimerRef.current != null;
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = null;
      }
      const uid = userIdRef.current;
      if (uid && hadPending) {
        void upsertFamilyTreeCloud(uid, dataRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.title = 'Family Tree · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let stored = loadSnapshot(userId);
      if (stored && !stored.savedAt) {
        stored = { ...stored, savedAt: new Date().toISOString() };
        saveSnapshot(userId, stored);
      }
      const { snapshot: remoteSnap, updatedAt: remoteUpdatedAt, errorMessage } =
        await fetchFamilyTreeCloud(userId);
      if (cancelled) return;
      if (errorMessage) {
        setData(stored ?? defaultSnapshot());
        setHydrated(true);
        return;
      }
      const remoteMs = parseSnapshotIsoMs(remoteUpdatedAt);
      const localMs = parseSnapshotIsoMs(stored?.savedAt);
      if (remoteSnap && remoteUpdatedAt && (!stored || remoteMs >= localMs)) {
        const stamped: FamilyTreeSnapshot = { ...remoteSnap, savedAt: remoteUpdatedAt };
        setData(stamped);
        saveSnapshot(userId, stamped);
        setHydrated(true);
        return;
      }
      const initial = stored ?? defaultSnapshot();
      setData(initial);
      saveSnapshot(userId, initial);
      setHydrated(true);
      const shouldUpsert =
        hasMeaningfulFamilyTreeData(initial) && (!remoteSnap || localMs > remoteMs);
      if (shouldUpsert) {
        void upsertFamilyTreeCloud(userId, initial);
      }
    })();
    return () => {
      cancelled = true;
    };
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
    (next: FamilyTreeSnapshot | ((prev: FamilyTreeSnapshot) => FamilyTreeSnapshot)) => {
      setData((prev) => {
        const resolvedRaw = typeof next === 'function' ? next(prev) : next;
        const resolved: FamilyTreeSnapshot = {
          ...resolvedRaw,
          savedAt: new Date().toISOString(),
        };
        saveSnapshot(userId, resolved);
        scheduleCloudSave(userId, resolved);
        return resolved;
      });
    },
    [userId, scheduleCloudSave],
  );

  const createMember = useCallback(
    (input?: NewMemberInput): string => {
      const id = newId('mem');
      const now = new Date().toISOString();
      persist((prev) => {
        const member: FamilyMember = {
          id,
          fullName: input?.fullName ?? '',
          nickname: input?.nickname ?? '',
          birthDate: input?.birthDate ?? '',
          deathDate: input?.deathDate ?? '',
          birthplace: input?.birthplace ?? '',
          gender: input?.gender ?? 'unspecified',
          bio: input?.bio ?? '',
          notes: input?.notes ?? '',
          parentIds: (input?.parentIds ?? []).slice(0, 2),
          partnerIds: input?.partnerIds ?? [],
          portrait: input?.portrait ?? null,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, members: [member, ...prev.members] };
      });
      return id;
    },
    [persist],
  );

  const updateMember = useCallback(
    (id: string, patch: Partial<FamilyMember>) => {
      persist((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === id
            ? {
                ...m,
                ...patch,
                parentIds: (patch.parentIds ?? m.parentIds).filter((v) => v !== id).slice(0, 2),
                partnerIds: (patch.partnerIds ?? m.partnerIds).filter((v) => v !== id),
                updatedAt: new Date().toISOString(),
              }
            : m,
        ),
      }));
    },
    [persist],
  );

  const removeMember = useCallback(
    (id: string) => {
      persist((prev) => {
        const members = prev.members
          .filter((m) => m.id !== id)
          .map((m) => ({
            ...m,
            parentIds: m.parentIds.filter((v) => v !== id),
            partnerIds: m.partnerIds.filter((v) => v !== id),
          }));
        const media = prev.media.map((mi) => ({
          ...mi,
          taggedMemberIds: mi.taggedMemberIds.filter((v) => v !== id),
        }));
        const settings: FamilyTreeSettings =
          prev.settings.primaryMemberId === id
            ? { ...prev.settings, primaryMemberId: null }
            : prev.settings;
        return { ...prev, members, media, settings };
      });
    },
    [persist],
  );

  const setPortrait = useCallback(
    (id: string, portrait: FamilyPortrait | null) => {
      persist((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === id ? { ...m, portrait, updatedAt: new Date().toISOString() } : m,
        ),
      }));
    },
    [persist],
  );

  const createAlbum = useCallback(
    (name: string, kind: FamilyAlbumKind = 'mixed', description = ''): string => {
      const id = newId('album');
      const now = new Date().toISOString();
      persist((prev) => {
        const album: FamilyAlbum = {
          id,
          name: name.trim() || 'New album',
          description,
          kind,
          coverMediaId: null,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, albums: [album, ...prev.albums] };
      });
      return id;
    },
    [persist],
  );

  const updateAlbum = useCallback(
    (id: string, patch: Partial<FamilyAlbum>) => {
      persist((prev) => ({
        ...prev,
        albums: prev.albums.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
        ),
      }));
    },
    [persist],
  );

  const removeAlbum = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        albums: prev.albums.filter((a) => a.id !== id),
        media: prev.media.filter((m) => m.albumId !== id),
      }));
    },
    [persist],
  );

  const addMediaItem = useCallback(
    (item: FamilyMediaItem) => {
      persist((prev) => ({
        ...prev,
        media: [item, ...prev.media],
        albums: prev.albums.map((a) =>
          a.id === item.albumId
            ? {
                ...a,
                coverMediaId: a.coverMediaId ?? item.id,
                updatedAt: new Date().toISOString(),
              }
            : a,
        ),
      }));
    },
    [persist],
  );

  const updateMediaItem = useCallback(
    (id: string, patch: Partial<FamilyMediaItem>) => {
      persist((prev) => ({
        ...prev,
        media: prev.media.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },
    [persist],
  );

  const removeMediaItem = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        media: prev.media.filter((m) => m.id !== id),
        albums: prev.albums.map((a) =>
          a.coverMediaId === id ? { ...a, coverMediaId: null } : a,
        ),
      }));
    },
    [persist],
  );

  const toggleMediaTag = useCallback(
    (mediaId: string, memberId: string) => {
      persist((prev) => ({
        ...prev,
        media: prev.media.map((m) => {
          if (m.id !== mediaId) return m;
          const has = m.taggedMemberIds.includes(memberId);
          return {
            ...m,
            taggedMemberIds: has
              ? m.taggedMemberIds.filter((id) => id !== memberId)
              : [...m.taggedMemberIds, memberId],
          };
        }),
      }));
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<FamilyTreeSettings>) => {
      persist((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    persist(() => defaultSnapshot());
  }, [persist]);

  const contextValue = useMemo<FamilyTreeContextValue>(
    () => ({
      data,
      hydrated,
      createMember,
      updateMember,
      removeMember,
      setPortrait,
      createAlbum,
      updateAlbum,
      removeAlbum,
      addMediaItem,
      updateMediaItem,
      removeMediaItem,
      toggleMediaTag,
      updateSettings,
      clearAll,
    }),
    [
      data,
      hydrated,
      createMember,
      updateMember,
      removeMember,
      setPortrait,
      createAlbum,
      updateAlbum,
      removeAlbum,
      addMediaItem,
      updateMediaItem,
      removeMediaItem,
      toggleMediaTag,
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
    const photos = data.media.filter((m) => m.kind === 'photo').length;
    const videos = data.media.filter((m) => m.kind === 'video').length;
    return {
      members: data.members.length,
      albums: data.albums.length,
      photos,
      videos,
    };
  }, [data]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-evergreen-surface">
        <p className="text-evergreen-dark text-sm font-medium">Sign in to use Family Tree.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-evergreen-surface">
        <p className="text-evergreen-dark text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <FamilyTreeContext.Provider value={contextValue}>
      <div className="min-h-screen bg-evergreen-surface text-evergreen-ink flex flex-col">
        <header className="sticky top-0 z-30 border-b border-evergreen/25 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
            <Link to="/family-tree" className="min-w-0 flex items-center gap-3">
              <span className="shrink-0 rounded-lg bg-gradient-to-br from-evergreen-dark via-evergreen to-cody-gold p-2 ring-1 ring-evergreen/20 shadow-sm">
                <TreePine className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0">
                <h1 className="font-bold text-sm sm:text-base text-evergreen-ink tracking-tight">
                  Family Tree
                </h1>
                <p className="text-[11px] sm:text-xs text-evergreen-dark/80 truncate">
                  Heritage, photos &amp; stories
                </p>
              </span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/family-tree/members/new"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-evergreen-dark px-3 py-2 text-xs font-semibold text-white hover:bg-evergreen-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-dark focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                New family member
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-evergreen/25 bg-white text-evergreen-dark hover:bg-evergreen-light/40 hover:border-evergreen/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen focus-visible:ring-offset-2"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label="Open Family Tree menu"
              >
                <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-evergreen-ink/45 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
        )}

        <aside
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!menuOpen}
          aria-label="Family Tree menu"
          className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-white border-l border-evergreen/20 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-evergreen/15">
            <p className="text-sm font-bold text-evergreen-ink tracking-tight">Family menu</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-evergreen-dark hover:bg-evergreen-light/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <nav className="space-y-1.5" aria-label="Family Tree pages">
              <NavLink
                to="/family-tree"
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-evergreen-dark text-white'
                      : 'text-evergreen-ink hover:bg-evergreen-light/60'
                  }`
                }
              >
                <Network className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Family tree
              </NavLink>
              <NavLink
                to="/family-tree/members"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-evergreen-dark text-white'
                      : 'text-evergreen-ink hover:bg-evergreen-light/60'
                  }`
                }
              >
                <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Members
              </NavLink>
              <NavLink
                to="/family-tree/members/new"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-evergreen-dark text-white'
                      : 'text-evergreen-ink hover:bg-evergreen-light/60'
                  }`
                }
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Add a member
              </NavLink>
              <NavLink
                to="/family-tree/albums"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-evergreen-dark text-white'
                      : 'text-evergreen-ink hover:bg-evergreen-light/60'
                  }`
                }
              >
                <GalleryVerticalEnd className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Albums
              </NavLink>
              <NavLink
                to="/family-tree/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-evergreen-dark text-white'
                      : 'text-evergreen-ink hover:bg-evergreen-light/60'
                  }`
                }
              >
                <SettingsIcon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Settings
              </NavLink>
            </nav>

            <section aria-labelledby="family-menu-stats" className="space-y-2">
              <div className="flex items-center justify-between">
                <h2
                  id="family-menu-stats"
                  className="text-[11px] font-bold tracking-widest uppercase text-evergreen-dark"
                >
                  At a glance
                </h2>
                <span className="text-[11px] text-evergreen-dark/70">{data.settings.treeTitle}</span>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between rounded-lg border border-evergreen/15 bg-evergreen-light/40 px-3 py-2">
                  <span className="text-sm text-evergreen-ink">Family members</span>
                  <span className="text-sm font-semibold text-evergreen-dark">{stats.members}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-evergreen/15 bg-white px-3 py-2">
                  <span className="text-sm text-evergreen-ink">Albums</span>
                  <span className="text-sm font-semibold text-evergreen-dark">{stats.albums}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-evergreen/15 bg-white px-3 py-2">
                  <span className="text-sm text-evergreen-ink">Photos</span>
                  <span className="text-sm font-semibold text-evergreen-dark">{stats.photos}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-evergreen/15 bg-white px-3 py-2">
                  <span className="text-sm text-evergreen-ink">Videos</span>
                  <span className="text-sm font-semibold text-evergreen-dark">{stats.videos}</span>
                </li>
              </ul>
            </section>
          </div>

          <div className="p-3 border-t border-evergreen/15 space-y-2 bg-evergreen-surface">
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-evergreen/30 bg-white px-3 py-2.5 text-sm font-semibold text-evergreen-ink hover:bg-evergreen-light/40"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Back to app suite
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cody-gold/45 bg-cody-gold/10 px-3 py-2.5 text-sm font-semibold text-cody-finnish hover:bg-cody-gold/25"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              codycodes.ca
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-evergreen/25 bg-white px-3 py-2.5 text-sm font-semibold text-evergreen-ink hover:bg-evergreen-light/40"
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
    </FamilyTreeContext.Provider>
  );
}

export function FamilyTreeApp() {
  return (
    <Routes>
      <Route element={<FamilyTreeShell />}>
        <Route index element={<FamilyTreeView />} />
        <Route path="members" element={<FamilyMembersList />} />
        <Route path="members/new" element={<FamilyMemberPage mode="new" />} />
        <Route path="members/:id" element={<FamilyMemberPage mode="edit" />} />
        <Route path="albums" element={<FamilyAlbumsList />} />
        <Route path="albums/:id" element={<FamilyAlbumPage />} />
        <Route path="settings" element={<FamilyTreeSettingsPage />} />
      </Route>
    </Routes>
  );
}
