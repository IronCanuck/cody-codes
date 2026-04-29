import { createContext, useContext } from 'react';
import type {
  StickyCategory,
  StickyCategoryColor,
  StickyMedia,
  StickyNote,
  StickySnapshot,
} from './types';

export type StickyContextValue = {
  data: StickySnapshot;
  hydrated: boolean;
  addNote: (categoryId: string | null) => string;
  updateNote: (id: string, patch: Partial<StickyNote>) => void;
  removeNote: (id: string) => void;
  bringToFront: (id: string) => void;
  attachMedia: (id: string, media: StickyMedia) => void;
  detachMedia: (noteId: string, mediaId: string) => void;
  addCategory: (name: string, color: StickyCategoryColor) => string;
  updateCategory: (id: string, patch: Partial<StickyCategory>) => void;
  removeCategory: (id: string) => void;
  setDefaultCategory: (id: string | null) => void;
  toggleGrid: () => void;
  toggleGlow: () => void;
  clearAllNotes: () => void;
};

export const StickyContext = createContext<StickyContextValue | null>(null);

export function useSticky(): StickyContextValue {
  const ctx = useContext(StickyContext);
  if (!ctx) throw new Error('useSticky must be used inside <StickyApp>');
  return ctx;
}
