export const NOTEPAD_STORAGE_VERSION = 1 as const;

export type NotepadFolder = {
  id: string;
  name: string;
  /** Optional parent folder id for nested folders. Top-level when null. */
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotepadNote = {
  id: string;
  folderId: string | null;
  title: string;
  /** HTML body rendered with contentEditable; sanitized on save. */
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
};

export type NotepadSettings = {
  fontFamily: 'serif' | 'sans' | 'mono' | 'handwriting';
  showRules: boolean;
  showMarginLine: boolean;
};

export type NotepadSnapshot = {
  version: typeof NOTEPAD_STORAGE_VERSION;
  folders: NotepadFolder[];
  notes: NotepadNote[];
  /** Currently selected note id (null when none). */
  activeNoteId: string | null;
  /** Currently selected folder id (null = "All notes"). */
  activeFolderId: string | null;
  settings: NotepadSettings;
  /** ISO timestamp set on every persist; used for last-write-wins sync. */
  savedAt?: string;
};
