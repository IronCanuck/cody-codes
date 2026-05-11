import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderPlus,
  Inbox,
  LogOut,
  Menu,
  Notebook,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  defaultSnapshot,
  fetchNotepadCloud,
  hasMeaningfulNotepadData,
  loadSnapshot,
  newId,
  parseSnapshotIsoMs,
  saveSnapshot,
  upsertNotepadCloud,
} from './storage';
import type {
  NotepadFolder,
  NotepadNote,
  NotepadSettings,
  NotepadSnapshot,
} from './types';
import { NoteEditor } from './NoteEditor';

const FONT_OPTIONS: { value: NotepadSettings['fontFamily']; label: string }[] = [
  { value: 'serif', label: 'Serif (legal pad)' },
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
  { value: 'handwriting', label: 'Handwriting' },
];

function bodyPreview(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

export function NotepadApp() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const menuId = useId();

  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<NotepadSnapshot>(() => defaultSnapshot());
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const dataRef = useRef(data);
  dataRef.current = data;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCloudSave = useCallback(
    (uid: string | undefined, snapshot: NotepadSnapshot) => {
      if (!uid) return;
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = setTimeout(() => {
        cloudSaveTimerRef.current = null;
        void upsertNotepadCloud(uid, snapshot);
      }, 500);
    },
    [],
  );

  useEffect(() => {
    document.title = 'Notepad · Cody James Fairburn';
  }, []);

  useEffect(() => {
    return () => {
      const hadPending = cloudSaveTimerRef.current != null;
      if (cloudSaveTimerRef.current) {
        clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = null;
      }
      const uid = userIdRef.current;
      if (uid && hadPending) {
        void upsertNotepadCloud(uid, dataRef.current);
      }
    };
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
        await fetchNotepadCloud(userId);
      if (cancelled) return;
      if (errorMessage) {
        setData(stored ?? defaultSnapshot());
        setHydrated(true);
        return;
      }
      const remoteMs = parseSnapshotIsoMs(remoteUpdatedAt);
      const localMs = parseSnapshotIsoMs(stored?.savedAt);
      if (remoteSnap && remoteUpdatedAt && (!stored || remoteMs >= localMs)) {
        const stamped: NotepadSnapshot = { ...remoteSnap, savedAt: remoteUpdatedAt };
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
        hasMeaningfulNotepadData(initial) && (!remoteSnap || localMs > remoteMs);
      if (shouldUpsert) {
        void upsertNotepadCloud(userId, initial);
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

  const persist = useCallback(
    (next: NotepadSnapshot | ((prev: NotepadSnapshot) => NotepadSnapshot)) => {
      setData((prev) => {
        const resolvedRaw = typeof next === 'function' ? next(prev) : next;
        const resolved: NotepadSnapshot = {
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

  const addFolder = useCallback(
    (name: string, parentId: string | null = null) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const id = newId('folder');
      const now = new Date().toISOString();
      const folder: NotepadFolder = {
        id,
        name: trimmed,
        parentId,
        createdAt: now,
        updatedAt: now,
      };
      persist((prev) => ({
        ...prev,
        folders: [...prev.folders, folder],
        activeFolderId: id,
      }));
      return id;
    },
    [persist],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist((prev) => ({
        ...prev,
        folders: prev.folders.map((f) =>
          f.id === id ? { ...f, name: trimmed, updatedAt: new Date().toISOString() } : f,
        ),
      }));
    },
    [persist],
  );

  const removeFolder = useCallback(
    (id: string) => {
      persist((prev) => {
        const removed = new Set<string>();
        const stack: string[] = [id];
        while (stack.length > 0) {
          const current = stack.pop() as string;
          if (removed.has(current)) continue;
          removed.add(current);
          for (const child of prev.folders) {
            if (child.parentId === current) stack.push(child.id);
          }
        }
        return {
          ...prev,
          folders: prev.folders.filter((f) => !removed.has(f.id)),
          notes: prev.notes.map((n) =>
            n.folderId && removed.has(n.folderId) ? { ...n, folderId: null } : n,
          ),
          activeFolderId:
            prev.activeFolderId && removed.has(prev.activeFolderId)
              ? null
              : prev.activeFolderId,
        };
      });
    },
    [persist],
  );

  const addNote = useCallback(
    (folderId: string | null) => {
      const id = newId('note');
      const now = new Date().toISOString();
      const note: NotepadNote = {
        id,
        folderId,
        title: '',
        bodyHtml: '',
        createdAt: now,
        updatedAt: now,
      };
      persist((prev) => ({
        ...prev,
        notes: [note, ...prev.notes],
        activeNoteId: id,
        activeFolderId: folderId ?? prev.activeFolderId,
      }));
      return id;
    },
    [persist],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<NotepadNote>) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
        ),
      }));
    },
    [persist],
  );

  const removeNote = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== id),
        activeNoteId: prev.activeNoteId === id ? null : prev.activeNoteId,
      }));
    },
    [persist],
  );

  const setActiveNote = useCallback(
    (id: string | null) => {
      persist((prev) => (prev.activeNoteId === id ? prev : { ...prev, activeNoteId: id }));
    },
    [persist],
  );

  const setActiveFolder = useCallback(
    (id: string | null) => {
      persist((prev) =>
        prev.activeFolderId === id ? prev : { ...prev, activeFolderId: id },
      );
    },
    [persist],
  );

  const moveNoteToFolder = useCallback(
    (noteId: string, folderId: string | null) => {
      persist((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === noteId
            ? { ...n, folderId, updatedAt: new Date().toISOString() }
            : n,
        ),
      }));
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<NotepadSettings>) => {
      persist((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    [persist],
  );

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { __all: data.notes.length, __unfiled: 0 };
    for (const note of data.notes) {
      if (!note.folderId) counts.__unfiled = (counts.__unfiled ?? 0) + 1;
      else counts[note.folderId] = (counts[note.folderId] ?? 0) + 1;
    }
    return counts;
  }, [data.notes]);

  const sortedFolders = useMemo(
    () => [...data.folders].sort((a, b) => a.name.localeCompare(b.name)),
    [data.folders],
  );

  const folderTree = useMemo(() => {
    const childrenByParent: Record<string, NotepadFolder[]> = {};
    for (const f of sortedFolders) {
      const key = f.parentId ?? '__root';
      (childrenByParent[key] ??= []).push(f);
    }
    return childrenByParent;
  }, [sortedFolders]);

  const filteredNotes = useMemo(() => {
    const lower = search.trim().toLowerCase();
    let pool = data.notes;
    if (data.activeFolderId) {
      pool = pool.filter((n) => n.folderId === data.activeFolderId);
    }
    if (lower) {
      pool = pool.filter((n) => {
        const haystack = `${n.title} ${bodyPreview(n.bodyHtml)}`.toLowerCase();
        return haystack.includes(lower);
      });
    }
    return [...pool].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [data.notes, data.activeFolderId, search]);

  const activeNote = useMemo(
    () => data.notes.find((n) => n.id === data.activeNoteId) ?? null,
    [data.notes, data.activeNoteId],
  );

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const handleAddRootFolder = () => {
    const name = window.prompt('Folder name');
    if (name) addFolder(name, null);
  };

  const handleAddSubfolder = (parentId: string) => {
    const name = window.prompt('Subfolder name');
    if (name) addFolder(name, parentId);
  };

  const beginRename = (folder: NotepadFolder) => {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const commitRename = () => {
    if (renamingFolderId) {
      renameFolder(renamingFolderId, renameValue);
    }
    setRenamingFolderId(null);
    setRenameValue('');
  };

  const handleRemoveFolder = (folder: NotepadFolder) => {
    if (
      window.confirm(
        `Delete folder "${folder.name}"? Notes inside will be moved to All notes.`,
      )
    ) {
      removeFolder(folder.id);
    }
  };

  const toggleFolderCollapsed = (id: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-legalpad-page">
        <p className="text-legalpad-ink-soft text-sm font-medium">
          Sign in to use Notepad.
        </p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-legalpad-page">
        <p className="text-legalpad-ink-soft text-sm">Loading…</p>
      </div>
    );
  }

  const renderFolderRow = (folder: NotepadFolder, depth: number) => {
    const children = folderTree[folder.id] ?? [];
    const collapsed = collapsedFolders.has(folder.id);
    const isActive = data.activeFolderId === folder.id;
    const count = folderCounts[folder.id] ?? 0;
    return (
      <li key={folder.id}>
        <div
          className={`group flex items-center gap-1 rounded-lg pl-1 pr-1.5 py-1.5 transition-colors ${
            isActive
              ? 'bg-legalpad-folder/85 text-legalpad-ink shadow-sm border border-legalpad-folder-deep/50'
              : 'border border-transparent hover:bg-legalpad-folder/55 text-legalpad-ink-soft'
          }`}
          style={{ marginLeft: depth * 12 }}
        >
          {children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleFolderCollapsed(folder.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-legalpad-ink-soft hover:text-legalpad-ink"
              aria-label={collapsed ? 'Expand folder' : 'Collapse folder'}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              )}
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <Folder className="h-4 w-4 shrink-0 text-legalpad-accent-dark" strokeWidth={2.25} aria-hidden />
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setRenamingFolderId(null);
                  setRenameValue('');
                }
              }}
              className="min-w-0 flex-1 rounded border border-legalpad-accent/50 bg-legalpad-page px-1.5 py-0.5 text-sm text-legalpad-ink focus:outline-none focus:ring-1 focus:ring-legalpad-accent"
            />
          ) : (
            <button
              type="button"
              onClick={() => setActiveFolder(folder.id)}
              className="min-w-0 flex-1 truncate text-left text-sm font-medium"
            >
              {folder.name}
            </button>
          )}
          <span className="shrink-0 text-[11px] text-legalpad-mute">{count}</span>
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <IconBtn label="Add subfolder" onClick={() => handleAddSubfolder(folder.id)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </IconBtn>
            <IconBtn label="Rename folder" onClick={() => beginRename(folder)}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </IconBtn>
            <IconBtn label="Delete folder" onClick={() => handleRemoveFolder(folder)} danger>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </IconBtn>
          </div>
        </div>
        {!collapsed && children.length > 0 && (
          <ul className="space-y-0.5">
            {children.map((c) => renderFolderRow(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const ruleClass = data.settings.showRules
    ? data.settings.showMarginLine
      ? 'notepad-page'
      : 'notepad-page-no-margin'
    : 'notepad-page-no-rules';

  return (
    <div className="min-h-screen flex flex-col bg-legalpad-page text-legalpad-ink">
      <header className="sticky top-0 z-30 border-b border-legalpad-folder-deep/60 bg-legalpad-folder/80 backdrop-blur shadow-sm">
        <div className="max-w-[120rem] mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <Link to="/notepad" className="min-w-0 flex items-center gap-3">
            <span className="shrink-0 rounded-lg bg-gradient-to-br from-legalpad-accent-soft to-legalpad-accent p-2 ring-1 ring-legalpad-accent-dark/35 shadow-sm">
              <Notebook className="h-5 w-5 text-legalpad-ink" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-base text-legalpad-ink tracking-tight">
                Notepad
              </h1>
              <p className="text-[11px] sm:text-xs text-legalpad-ink-soft truncate">
                Legal-pad notes, with folders
              </p>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-legalpad-folder-deep/55 bg-legalpad-page-soft text-legalpad-ink-soft hover:bg-legalpad-folder/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-legalpad-accent"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Open Notepad menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-legalpad-ink/35 backdrop-blur-sm"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="Notepad menu"
        className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2rem,22rem)] bg-legalpad-surface border-l border-legalpad-folder-deep/55 shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-legalpad-folder-deep/50">
          <p className="text-sm font-extrabold tracking-wider uppercase text-legalpad-ink">
            Notepad menu
          </p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-legalpad-ink-soft hover:bg-legalpad-folder/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-legalpad-accent"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-legalpad-ink-soft">
                Display
              </h2>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-legalpad-ink">
              Show rule lines
              <input
                type="checkbox"
                checked={data.settings.showRules}
                onChange={(event) => updateSettings({ showRules: event.target.checked })}
                className="h-4 w-4 accent-legalpad-accent-dark"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-legalpad-ink">
              Show red margin
              <input
                type="checkbox"
                checked={data.settings.showMarginLine}
                onChange={(event) =>
                  updateSettings({ showMarginLine: event.target.checked })
                }
                className="h-4 w-4 accent-legalpad-accent-dark"
              />
            </label>
            <label className="block text-sm font-medium text-legalpad-ink">
              Body font
              <select
                value={data.settings.fontFamily}
                onChange={(event) =>
                  updateSettings({
                    fontFamily: event.target.value as NotepadSettings['fontFamily'],
                  })
                }
                className="mt-1 w-full rounded-lg border border-legalpad-folder-deep/50 bg-legalpad-page-soft px-2.5 py-1.5 text-sm text-legalpad-ink focus:outline-none focus:ring-2 focus:ring-legalpad-accent"
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <div className="p-3 border-t border-legalpad-folder-deep/45 space-y-2 bg-legalpad-page-soft/85">
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-legalpad-accent/55 bg-legalpad-accent/15 px-3 py-2.5 text-sm font-semibold text-legalpad-ink hover:bg-legalpad-accent/25"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            All apps
          </Link>
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-legalpad-folder-deep/55 px-3 py-2.5 text-sm font-semibold text-legalpad-ink-soft hover:bg-legalpad-folder/55"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Back to codycodes.ca
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-legalpad-folder-deep/45 px-3 py-2.5 text-sm font-semibold text-legalpad-ink-soft hover:bg-legalpad-folder/55"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-h-0 flex">
        <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col border-r border-legalpad-folder-deep/45 bg-legalpad-page-soft/80">
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-legalpad-ink-soft">
                Folders
              </h2>
              <button
                type="button"
                onClick={handleAddRootFolder}
                className="inline-flex items-center gap-1 rounded-md border border-legalpad-folder-deep/45 bg-legalpad-page px-2 py-1 text-xs font-semibold text-legalpad-ink hover:bg-legalpad-folder/55"
              >
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                New
              </button>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            <button
              type="button"
              onClick={() => setActiveFolder(null)}
              className={`flex w-full items-center gap-2 rounded-lg pl-1 pr-2 py-1.5 text-sm font-semibold transition-colors ${
                data.activeFolderId === null
                  ? 'bg-legalpad-folder/85 text-legalpad-ink shadow-sm border border-legalpad-folder-deep/50'
                  : 'border border-transparent hover:bg-legalpad-folder/55 text-legalpad-ink-soft'
              }`}
            >
              <span className="h-5 w-5 shrink-0" aria-hidden />
              <Inbox className="h-4 w-4 shrink-0 text-legalpad-accent-dark" strokeWidth={2.25} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-left">All notes</span>
              <span className="text-[11px] text-legalpad-mute">{folderCounts.__all ?? 0}</span>
            </button>
            <ul className="space-y-0.5">
              {(folderTree.__root ?? []).map((f) => renderFolderRow(f, 0))}
            </ul>
            {sortedFolders.length === 0 && (
              <p className="px-2 mt-3 text-[11px] text-legalpad-mute italic">
                No folders yet — make one with “New”.
              </p>
            )}
          </nav>
        </aside>

        <aside className="hidden lg:flex w-80 shrink-0 flex-col border-r border-legalpad-folder-deep/45 bg-legalpad-page-soft/55">
          <div className="px-3 pt-3 pb-2 border-b border-legalpad-folder-deep/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-legalpad-ink-soft">
                {data.activeFolderId
                  ? sortedFolders.find((f) => f.id === data.activeFolderId)?.name ??
                    'Notes'
                  : 'All notes'}
              </h2>
              <button
                type="button"
                onClick={() => addNote(data.activeFolderId)}
                className="inline-flex items-center gap-1 rounded-md bg-legalpad-accent px-2 py-1 text-xs font-bold text-legalpad-ink hover:bg-legalpad-accent-soft shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                New note
              </button>
            </div>
            <label className="block">
              <span className="sr-only">Search notes</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-legalpad-mute" strokeWidth={2.25} aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-lg border border-legalpad-folder-deep/45 bg-legalpad-page py-1.5 pl-7 pr-2 text-sm text-legalpad-ink placeholder:text-legalpad-mute focus:outline-none focus:ring-2 focus:ring-legalpad-accent"
                />
              </span>
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredNotes.map((note) => {
              const isActive = note.id === data.activeNoteId;
              const preview = bodyPreview(note.bodyHtml);
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => setActiveNote(note.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      isActive
                        ? 'border-legalpad-accent/65 bg-legalpad-page shadow-sm'
                        : 'border-transparent bg-transparent hover:bg-legalpad-page/85'
                    }`}
                  >
                    <p className="text-sm font-bold text-legalpad-ink truncate">
                      {note.title.trim() || 'Untitled note'}
                    </p>
                    <p className="text-[11px] text-legalpad-mute mt-0.5">
                      {formatStamp(note.updatedAt)}
                      {preview ? ' · ' : ''}
                      <span className="text-legalpad-ink-soft">
                        {preview.slice(0, 60)}
                      </span>
                    </p>
                  </button>
                </li>
              );
            })}
            {filteredNotes.length === 0 && (
              <li className="text-center text-xs text-legalpad-mute italic px-2 py-6">
                {search.trim()
                  ? 'No notes match your search.'
                  : 'No notes here yet — tap “New note”.'}
              </li>
            )}
          </ul>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="lg:hidden border-b border-legalpad-folder-deep/45 bg-legalpad-page-soft/85 px-3 py-2 space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveFolder(null)}
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  data.activeFolderId === null
                    ? 'border-legalpad-accent/65 bg-legalpad-accent/15 text-legalpad-ink'
                    : 'border-legalpad-folder-deep/45 bg-legalpad-page text-legalpad-ink-soft'
                }`}
              >
                All
              </button>
              {sortedFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    data.activeFolderId === f.id
                      ? 'border-legalpad-accent/65 bg-legalpad-accent/15 text-legalpad-ink'
                      : 'border-legalpad-folder-deep/45 bg-legalpad-page text-legalpad-ink-soft'
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <button
                type="button"
                onClick={handleAddRootFolder}
                className="shrink-0 rounded-lg border border-legalpad-folder-deep/45 bg-legalpad-page px-2 py-1 text-xs font-semibold text-legalpad-ink-soft hover:bg-legalpad-folder/55"
              >
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 relative">
                <span className="sr-only">Search notes</span>
                <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-legalpad-mute" strokeWidth={2.25} aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-lg border border-legalpad-folder-deep/45 bg-legalpad-page py-1.5 pl-7 pr-2 text-sm text-legalpad-ink placeholder:text-legalpad-mute focus:outline-none focus:ring-2 focus:ring-legalpad-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => addNote(data.activeFolderId)}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-legalpad-accent px-2.5 py-1.5 text-xs font-bold text-legalpad-ink hover:bg-legalpad-accent-soft shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                Note
              </button>
            </div>
            {filteredNotes.length > 0 && (
              <select
                value={data.activeNoteId ?? ''}
                onChange={(event) => setActiveNote(event.target.value || null)}
                className="w-full rounded-lg border border-legalpad-folder-deep/45 bg-legalpad-page py-1.5 px-2 text-sm text-legalpad-ink focus:outline-none focus:ring-2 focus:ring-legalpad-accent"
              >
                <option value="">Choose a note…</option>
                {filteredNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title.trim() || 'Untitled note'} · {formatStamp(n.updatedAt)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeNote ? (
            <div className={`flex-1 min-h-0 ${ruleClass}`}>
              <div className="flex h-full flex-col">
                <NoteEditor
                  note={activeNote}
                  settings={data.settings}
                  onChangeTitle={(title) => updateNote(activeNote.id, { title })}
                  onChangeBody={(html) => updateNote(activeNote.id, { bodyHtml: html })}
                />
                <div className="border-t border-legalpad-folder-deep/45 bg-legalpad-page-soft/85 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-legalpad-ink-soft">
                    Folder
                    <select
                      value={activeNote.folderId ?? ''}
                      onChange={(event) =>
                        moveNoteToFolder(
                          activeNote.id,
                          event.target.value === '' ? null : event.target.value,
                        )
                      }
                      className="rounded-md border border-legalpad-folder-deep/45 bg-legalpad-page px-2 py-1 text-xs text-legalpad-ink focus:outline-none focus:ring-2 focus:ring-legalpad-accent"
                    >
                      <option value="">Unfiled</option>
                      {sortedFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-[11px] text-legalpad-mute">
                    Updated {formatStamp(activeNote.updatedAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this note?')) {
                        removeNote(activeNote.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-legalpad-margin/55 bg-legalpad-margin/10 px-2 py-1 text-xs font-semibold text-legalpad-margin hover:bg-legalpad-margin/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 min-h-0 ${ruleClass} flex items-center justify-center`}>
              <div className="text-center max-w-sm px-6">
                <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-legalpad-folder/70 p-4 ring-1 ring-legalpad-folder-deep/45">
                  <Notebook className="h-8 w-8 text-legalpad-ink" strokeWidth={2} aria-hidden />
                </div>
                <h2 className="text-xl font-extrabold text-legalpad-ink">
                  Pick a note or start a new one
                </h2>
                <p className="mt-2 text-sm text-legalpad-ink-soft">
                  Organize your thoughts with folders, headings, and the toolbar above.
                </p>
                <button
                  type="button"
                  onClick={() => addNote(data.activeFolderId)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-legalpad-accent px-4 py-2.5 text-sm font-bold text-legalpad-ink shadow-sm hover:bg-legalpad-accent-soft"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  New note
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
        danger
          ? 'text-legalpad-margin hover:bg-legalpad-margin/15'
          : 'text-legalpad-ink-soft hover:bg-legalpad-folder/65 hover:text-legalpad-ink'
      }`}
    >
      {children}
    </button>
  );
}
