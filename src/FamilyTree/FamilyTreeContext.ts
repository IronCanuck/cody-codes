import { createContext, useContext } from 'react';
import type {
  FamilyAlbum,
  FamilyAlbumKind,
  FamilyMediaItem,
  FamilyMember,
  FamilyPortrait,
  FamilyTreeSettings,
  FamilyTreeSnapshot,
} from './types';

export type NewMemberInput = Partial<Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>>;

export type FamilyTreeContextValue = {
  data: FamilyTreeSnapshot;
  hydrated: boolean;
  /** Members CRUD */
  createMember: (input?: NewMemberInput) => string;
  updateMember: (id: string, patch: Partial<FamilyMember>) => void;
  removeMember: (id: string) => void;
  setPortrait: (id: string, portrait: FamilyPortrait | null) => void;
  /** Albums CRUD */
  createAlbum: (name: string, kind?: FamilyAlbumKind, description?: string) => string;
  updateAlbum: (id: string, patch: Partial<FamilyAlbum>) => void;
  removeAlbum: (id: string) => void;
  /** Media CRUD */
  addMediaItem: (item: FamilyMediaItem) => void;
  updateMediaItem: (id: string, patch: Partial<FamilyMediaItem>) => void;
  removeMediaItem: (id: string) => void;
  toggleMediaTag: (mediaId: string, memberId: string) => void;
  /** Settings */
  updateSettings: (patch: Partial<FamilyTreeSettings>) => void;
  /** Destructive */
  clearAll: () => void;
};

export const FamilyTreeContext = createContext<FamilyTreeContextValue | null>(null);

export function useFamilyTree(): FamilyTreeContextValue {
  const ctx = useContext(FamilyTreeContext);
  if (!ctx) throw new Error('useFamilyTree must be used inside <FamilyTreeApp>');
  return ctx;
}
