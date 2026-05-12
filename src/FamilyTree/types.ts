export const FAMILY_TREE_STORAGE_VERSION = 1 as const;

export type FamilyGender = 'female' | 'male';

/**
 * A portrait or thumbnail stored either as a compressed data URL (uploaded)
 * or a reference to an external URL the user pasted in.
 */
export type FamilyPortrait = {
  id: string;
  source: 'uploaded' | 'url';
  /** Data URL (uploaded) or external URL (when `source === 'url'`). */
  src: string;
  mime: string;
  name: string;
  width: number;
  height: number;
};

export type FamilyMember = {
  id: string;
  fullName: string;
  nickname: string;
  birthDate: string; // YYYY-MM-DD or ''
  deathDate: string; // YYYY-MM-DD or ''
  birthplace: string;
  gender: FamilyGender;
  bio: string;
  notes: string;
  /** Up to two parents (other family members). Use member ids. */
  parentIds: string[];
  /** Spouses / partners (other family members). Use member ids. */
  partnerIds: string[];
  portrait: FamilyPortrait | null;
  createdAt: string;
  updatedAt: string;
};

export type FamilyMediaKind = 'photo' | 'video';

export type FamilyMediaItem = {
  id: string;
  albumId: string;
  kind: FamilyMediaKind;
  source: 'uploaded' | 'url';
  /** Either a compressed data URL (uploaded) or an external URL. */
  src: string;
  /** Optional poster image (for video URLs). */
  posterSrc: string;
  mime: string;
  name: string;
  width: number;
  height: number;
  caption: string;
  /** Free-text date — e.g. "Summer 1992" or "1948-06-14". */
  takenAt: string;
  taggedMemberIds: string[];
  createdAt: string;
};

export type FamilyAlbumKind = 'photos' | 'videos' | 'mixed';

export type FamilyAlbum = {
  id: string;
  name: string;
  description: string;
  kind: FamilyAlbumKind;
  coverMediaId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FamilyTreeSettings = {
  treeTitle: string;
  /** Whose lineage are we framing? Used for greeting text. */
  primaryMemberId: string | null;
  showDeceased: boolean;
};

export type FamilyTreeSnapshot = {
  version: typeof FAMILY_TREE_STORAGE_VERSION;
  members: FamilyMember[];
  albums: FamilyAlbum[];
  media: FamilyMediaItem[];
  settings: FamilyTreeSettings;
  savedAt?: string;
};

export const GENDER_OPTIONS: { value: FamilyGender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export type FamilyTokens = {
  /** Card border / hover for member cards. */
  card: string;
  /** Soft accent surface. */
  surface: string;
  /** Accent text. */
  accent: string;
};

export const GENDER_TOKENS: Record<FamilyGender, FamilyTokens> = {
  female: {
    card: 'border-rose-300 hover:border-rose-500',
    surface: 'bg-rose-50',
    accent: 'text-rose-700',
  },
  male: {
    card: 'border-sky-300 hover:border-sky-500',
    surface: 'bg-sky-50',
    accent: 'text-sky-700',
  },
};
