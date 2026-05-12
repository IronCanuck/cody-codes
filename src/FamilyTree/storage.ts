import { supabase } from '../lib/supabase';
import {
  FAMILY_TREE_STORAGE_VERSION,
  type FamilyAlbum,
  type FamilyMediaItem,
  type FamilyMember,
  type FamilyTreeSettings,
  type FamilyTreeSnapshot,
} from './types';

export function newId(prefix = 'ft'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `familytree:${userId}`;
}

export function defaultSettings(): FamilyTreeSettings {
  return {
    treeTitle: 'Our family',
    primaryMemberId: null,
    showDeceased: true,
  };
}

export function defaultSnapshot(): FamilyTreeSnapshot {
  return {
    version: FAMILY_TREE_STORAGE_VERSION,
    members: [],
    albums: [],
    media: [],
    settings: defaultSettings(),
  };
}

function sanitizeMember(raw: unknown): FamilyMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FamilyMember> & Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.fullName !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: r.id,
    fullName: r.fullName,
    nickname: typeof r.nickname === 'string' ? r.nickname : '',
    birthDate: typeof r.birthDate === 'string' ? r.birthDate : '',
    deathDate: typeof r.deathDate === 'string' ? r.deathDate : '',
    birthplace: typeof r.birthplace === 'string' ? r.birthplace : '',
    gender: r.gender === 'male' ? 'male' : 'female',
    bio: typeof r.bio === 'string' ? r.bio : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    parentIds: Array.isArray(r.parentIds)
      ? (r.parentIds as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 2)
      : [],
    partnerIds: Array.isArray(r.partnerIds)
      ? (r.partnerIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    portrait:
      r.portrait && typeof r.portrait === 'object'
        ? (() => {
            const p = r.portrait as Record<string, unknown>;
            if (typeof p.id !== 'string' || typeof p.src !== 'string') return null;
            return {
              id: p.id,
              source: p.source === 'url' ? 'url' : 'uploaded',
              src: p.src,
              mime: typeof p.mime === 'string' ? p.mime : 'image/jpeg',
              name: typeof p.name === 'string' ? p.name : 'portrait',
              width: typeof p.width === 'number' ? p.width : 0,
              height: typeof p.height === 'number' ? p.height : 0,
            };
          })()
        : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

function sanitizeAlbum(raw: unknown): FamilyAlbum | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FamilyAlbum> & Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === 'string' ? r.description : '',
    kind:
      r.kind === 'photos' || r.kind === 'videos' || r.kind === 'mixed' ? r.kind : 'mixed',
    coverMediaId: typeof r.coverMediaId === 'string' ? r.coverMediaId : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

function sanitizeMedia(raw: unknown): FamilyMediaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FamilyMediaItem> & Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    typeof r.albumId !== 'string' ||
    typeof r.src !== 'string'
  ) {
    return null;
  }
  const now = new Date().toISOString();
  return {
    id: r.id,
    albumId: r.albumId,
    kind: r.kind === 'video' ? 'video' : 'photo',
    source: r.source === 'url' ? 'url' : 'uploaded',
    src: r.src,
    posterSrc: typeof r.posterSrc === 'string' ? r.posterSrc : '',
    mime: typeof r.mime === 'string' ? r.mime : 'image/jpeg',
    name: typeof r.name === 'string' ? r.name : '',
    width: typeof r.width === 'number' ? r.width : 0,
    height: typeof r.height === 'number' ? r.height : 0,
    caption: typeof r.caption === 'string' ? r.caption : '',
    takenAt: typeof r.takenAt === 'string' ? r.takenAt : '',
    taggedMemberIds: Array.isArray(r.taggedMemberIds)
      ? (r.taggedMemberIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
  };
}

function coerceSnapshot(parsed: unknown): FamilyTreeSnapshot | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Partial<FamilyTreeSnapshot> & Record<string, unknown>;
  if (p.version !== FAMILY_TREE_STORAGE_VERSION) return null;
  const fallback = defaultSnapshot();
  const settings: FamilyTreeSettings = {
    ...fallback.settings,
    ...((p.settings as Partial<FamilyTreeSettings>) ?? {}),
  };
  const members = Array.isArray(p.members)
    ? p.members.map(sanitizeMember).filter((m): m is FamilyMember => m !== null)
    : [];
  const memberIds = new Set(members.map((m) => m.id));
  // Drop relationships that point at missing members so the tree never explodes.
  for (const m of members) {
    m.parentIds = m.parentIds.filter((id) => id !== m.id && memberIds.has(id));
    m.partnerIds = m.partnerIds.filter((id) => id !== m.id && memberIds.has(id));
  }
  const albums = Array.isArray(p.albums)
    ? p.albums.map(sanitizeAlbum).filter((a): a is FamilyAlbum => a !== null)
    : [];
  const albumIds = new Set(albums.map((a) => a.id));
  const media = Array.isArray(p.media)
    ? p.media
        .map(sanitizeMedia)
        .filter((m): m is FamilyMediaItem => m !== null && albumIds.has(m.albumId))
        .map((m) => ({
          ...m,
          taggedMemberIds: m.taggedMemberIds.filter((id) => memberIds.has(id)),
        }))
    : [];
  if (settings.primaryMemberId && !memberIds.has(settings.primaryMemberId)) {
    settings.primaryMemberId = null;
  }
  const savedAt = typeof p.savedAt === 'string' ? p.savedAt : undefined;
  return {
    version: FAMILY_TREE_STORAGE_VERSION,
    members,
    albums,
    media,
    settings,
    savedAt,
  };
}

export function loadSnapshot(userId: string | undefined): FamilyTreeSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    return coerceSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: FamilyTreeSnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // Ignore quota — large videos can blow the budget; user can clear from settings.
  }
}

export function parseSnapshotIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

export function hasMeaningfulFamilyTreeData(data: FamilyTreeSnapshot): boolean {
  return data.members.length > 0 || data.albums.length > 0 || data.media.length > 0;
}

export async function upsertFamilyTreeCloud(
  userId: string,
  snapshot: FamilyTreeSnapshot,
): Promise<{ errorMessage: string | null }> {
  const updatedAt = snapshot.savedAt ?? new Date().toISOString();
  const { error } = await supabase.from('family_tree_snapshots').upsert(
    {
      user_id: userId,
      snapshot: { ...snapshot, savedAt: updatedAt },
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.warn('Family Tree cloud sync failed', error);
    return { errorMessage: error.message || 'Account sync failed' };
  }
  return { errorMessage: null };
}

export async function fetchFamilyTreeCloud(userId: string): Promise<{
  snapshot: FamilyTreeSnapshot | null;
  updatedAt: string | null;
  errorMessage: string | null;
}> {
  const { data: row, error } = await supabase
    .from('family_tree_snapshots')
    .select('snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Family Tree cloud load failed', error);
    return { snapshot: null, updatedAt: null, errorMessage: error.message || 'Account load failed' };
  }
  const snap = row?.snapshot != null ? coerceSnapshot(row.snapshot) : null;
  return { snapshot: snap, updatedAt: row?.updated_at ?? null, errorMessage: null };
}
