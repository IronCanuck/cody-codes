export const STICKY_STORAGE_VERSION = 1 as const;

export type StickyCategoryColor =
  | 'pink'
  | 'cyan'
  | 'purple'
  | 'sunset'
  | 'yellow'
  | 'blue';

export type StickyCategory = {
  id: string;
  name: string;
  color: StickyCategoryColor;
};

export type StickyMedia = {
  id: string;
  dataUrl: string;
  mime: string;
  name: string;
  width: number;
  height: number;
};

export type StickyNote = {
  id: string;
  text: string;
  categoryId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation: number;
  media: StickyMedia[];
  createdAt: string;
  updatedAt: string;
};

export type StickyTheme = 'light' | 'dark';

export type StickySettings = {
  showGrid: boolean;
  defaultCategoryId: string | null;
  glow: boolean;
  theme: StickyTheme;
};

export type StickySnapshot = {
  version: typeof STICKY_STORAGE_VERSION;
  categories: StickyCategory[];
  notes: StickyNote[];
  nextZ: number;
  settings: StickySettings;
};

export type CategoryColorTokens = {
  /** background gradient classes for the note body */
  body: string;
  /** header strip classes */
  header: string;
  /** ring color for focus + selection */
  ring: string;
  /** label chip classes */
  chip: string;
  /** dot color for legend */
  dot: string;
};

/** Tailwind tokens for each preset color, all rooted in the Miami palette. */
export const CATEGORY_COLOR_TOKENS: Record<StickyCategoryColor, CategoryColorTokens> = {
  pink: {
    body: 'from-miami-pink to-miami-pink-bright',
    header: 'bg-miami-pink-bright/95 text-white',
    ring: 'ring-miami-pink',
    chip: 'bg-miami-pink/20 text-miami-pink-light border-miami-pink/40',
    dot: 'bg-miami-pink',
  },
  cyan: {
    body: 'from-miami-cyan to-miami-blue',
    header: 'bg-miami-cyan-bright/95 text-slate-900',
    ring: 'ring-miami-cyan',
    chip: 'bg-miami-cyan/20 text-miami-cyan border-miami-cyan/40',
    dot: 'bg-miami-cyan',
  },
  purple: {
    body: 'from-miami-purple to-miami-pink',
    header: 'bg-miami-purple/95 text-white',
    ring: 'ring-miami-purple',
    chip: 'bg-miami-purple/20 text-miami-pink-light border-miami-purple/40',
    dot: 'bg-miami-purple',
  },
  sunset: {
    body: 'from-miami-sunset to-miami-pink-light',
    header: 'bg-miami-sunset/95 text-slate-900',
    ring: 'ring-miami-sunset',
    chip: 'bg-miami-sunset/20 text-miami-sunset border-miami-sunset/40',
    dot: 'bg-miami-sunset',
  },
  yellow: {
    body: 'from-miami-yellow to-miami-sunset',
    header: 'bg-miami-yellow/95 text-slate-900',
    ring: 'ring-miami-yellow',
    chip: 'bg-miami-yellow/20 text-miami-yellow border-miami-yellow/40',
    dot: 'bg-miami-yellow',
  },
  blue: {
    body: 'from-miami-blue to-miami-blue-deep',
    header: 'bg-miami-blue/95 text-white',
    ring: 'ring-miami-blue',
    chip: 'bg-miami-blue/20 text-miami-cyan border-miami-blue/40',
    dot: 'bg-miami-blue',
  },
};

export const CATEGORY_COLOR_OPTIONS: { value: StickyCategoryColor; label: string }[] = [
  { value: 'pink', label: 'Hot Pink' },
  { value: 'cyan', label: 'Neon Cyan' },
  { value: 'purple', label: 'Vice Purple' },
  { value: 'sunset', label: 'Sunset Coral' },
  { value: 'yellow', label: 'Boulevard Yellow' },
  { value: 'blue', label: 'Ocean Blue' },
];
