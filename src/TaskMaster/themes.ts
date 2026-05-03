export type ColumnThemeId =
  | 'tiffany'
  | 'slate'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'rose'
  | 'amber'
  | 'green'
  | 'teal';

export type ColumnTheme = {
  id: ColumnThemeId;
  label: string;
  /** Base hex color used for swatches & text */
  base: string;
  /** Darker shade used for header text & strong accents */
  dark: string;
  /** Soft tint for column body backgrounds */
  soft: string;
  /** Stronger tint for header background */
  headerBg: string;
  /** Border color */
  border: string;
  /** Card background tint */
  cardBg: string;
  /** Card border */
  cardBorder: string;
};

export const COLUMN_THEMES: Record<ColumnThemeId, ColumnTheme> = {
  tiffany: {
    id: 'tiffany',
    label: 'Tiffany',
    base: '#5fc4b8',
    dark: '#0e7a6f',
    soft: '#f1fbf9',
    headerBg: '#dff5f1',
    border: '#bfe7e1',
    cardBg: '#e9f7f4',
    cardBorder: '#cdebe5',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    base: '#64748b',
    dark: '#334155',
    soft: '#f5f7fa',
    headerBg: '#e7ebf0',
    border: '#cbd2dc',
    cardBg: '#eef1f5',
    cardBorder: '#d6dce4',
  },
  blue: {
    id: 'blue',
    label: 'Blue',
    base: '#3b82f6',
    dark: '#1d4ed8',
    soft: '#f0f6ff',
    headerBg: '#dbeafe',
    border: '#bfd7fe',
    cardBg: '#e6efff',
    cardBorder: '#c8dcfd',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    base: '#6366f1',
    dark: '#4338ca',
    soft: '#f2f2ff',
    headerBg: '#e0e1fb',
    border: '#c7c8f6',
    cardBg: '#eaeafd',
    cardBorder: '#d3d4f8',
  },
  violet: {
    id: 'violet',
    label: 'Violet',
    base: '#8b5cf6',
    dark: '#6d28d9',
    soft: '#f6f1ff',
    headerBg: '#ebdfff',
    border: '#d6c2fc',
    cardBg: '#f0e6ff',
    cardBorder: '#dec9fb',
  },
  pink: {
    id: 'pink',
    label: 'Pink',
    base: '#ec4899',
    dark: '#be185d',
    soft: '#fff0f7',
    headerBg: '#fbdaeb',
    border: '#f7bcd8',
    cardBg: '#fde2ef',
    cardBorder: '#f7c8de',
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    base: '#f43f5e',
    dark: '#be123c',
    soft: '#fff1f3',
    headerBg: '#fbdbe1',
    border: '#f7bdc6',
    cardBg: '#fde2e6',
    cardBorder: '#f8c8d0',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    base: '#f59e0b',
    dark: '#b45309',
    soft: '#fff8eb',
    headerBg: '#fdebc4',
    border: '#f7d488',
    cardBg: '#fdedca',
    cardBorder: '#f5d590',
  },
  green: {
    id: 'green',
    label: 'Green',
    base: '#22c55e',
    dark: '#15803d',
    soft: '#eefbf2',
    headerBg: '#d3f3de',
    border: '#a7e6bc',
    cardBg: '#dcf5e5',
    cardBorder: '#b1e7c4',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    base: '#14b8a6',
    dark: '#0f766e',
    soft: '#ebfbf8',
    headerBg: '#c8f1ea',
    border: '#9ce2d6',
    cardBg: '#d3f3ec',
    cardBorder: '#a4e3d6',
  },
};

export const COLUMN_THEME_LIST: ColumnTheme[] = [
  COLUMN_THEMES.tiffany,
  COLUMN_THEMES.slate,
  COLUMN_THEMES.blue,
  COLUMN_THEMES.indigo,
  COLUMN_THEMES.violet,
  COLUMN_THEMES.teal,
  COLUMN_THEMES.green,
  COLUMN_THEMES.amber,
  COLUMN_THEMES.pink,
  COLUMN_THEMES.rose,
];

export const DEFAULT_COLUMN_THEME_ID: ColumnThemeId = 'tiffany';

/** Default theme assignment for the four standard columns. */
export const DEFAULT_COLUMN_THEME_SEQUENCE: ColumnThemeId[] = [
  'slate',
  'blue',
  'violet',
  'green',
];

/** Default theme rotation for newly created projects. */
export const DEFAULT_PROJECT_THEME_SEQUENCE: ColumnThemeId[] = [
  'tiffany',
  'blue',
  'violet',
  'amber',
  'rose',
  'green',
  'indigo',
  'teal',
  'pink',
  'slate',
];

export function getColumnTheme(id: ColumnThemeId | undefined | null): ColumnTheme {
  if (id && id in COLUMN_THEMES) return COLUMN_THEMES[id];
  return COLUMN_THEMES[DEFAULT_COLUMN_THEME_ID];
}

export function isColumnThemeId(value: unknown): value is ColumnThemeId {
  return typeof value === 'string' && value in COLUMN_THEMES;
}
