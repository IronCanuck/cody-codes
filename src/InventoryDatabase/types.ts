export const INVENTORY_STORAGE_VERSION = 1 as const;

export const INVENTORY_COMPANIES = ['Spartan', 'Podium', 'Cal-Fire', 'Personal'] as const;
export type InventoryCompany = (typeof INVENTORY_COMPANIES)[number];

export type InventoryPhoto = {
  id: string;
  dataUrl: string;
  mime: string;
  name: string;
  width: number;
  height: number;
};

export type InventorySerial = {
  id: string;
  /** Optional sub-label, e.g. "Body", "Battery", "Charger". */
  label: string;
  value: string;
};

export type InventoryProduct = {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  company: InventoryCompany;
  location: string;
  description: string;
  notes: string;
  /** Optional ISO date string (YYYY-MM-DD). */
  purchaseDate: string;
  /** Free-text price (keeps currency formatting flexible). */
  purchasePrice: string;
  serials: InventorySerial[];
  photos: InventoryPhoto[];
  createdAt: string;
  updatedAt: string;
};

export type InventorySettings = {
  defaultCompany: InventoryCompany | null;
  defaultLocation: string;
};

export type InventorySnapshot = {
  version: typeof INVENTORY_STORAGE_VERSION;
  products: InventoryProduct[];
  settings: InventorySettings;
};

export type CompanyTokens = {
  /** Solid badge background. */
  chip: string;
  /** Soft pill background for filter chips. */
  pill: string;
  /** Pill active state. */
  pillActive: string;
  /** Subtle accent dot. */
  dot: string;
};

/** Color tokens per company so badges and filters stay scannable. */
export const COMPANY_TOKENS: Record<InventoryCompany, CompanyTokens> = {
  Spartan: {
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    pill: 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50',
    pillActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    dot: 'bg-emerald-500',
  },
  Podium: {
    chip: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    pill: 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50',
    pillActive: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
    dot: 'bg-indigo-500',
  },
  'Cal-Fire': {
    chip: 'bg-red-100 text-red-800 border-red-300',
    pill: 'bg-white text-red-800 border-red-300 hover:bg-red-50',
    pillActive: 'bg-red-600 text-white border-red-600 shadow-sm',
    dot: 'bg-red-500',
  },
  Personal: {
    chip: 'bg-amber-100 text-amber-900 border-amber-300',
    pill: 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50',
    pillActive: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    dot: 'bg-amber-500',
  },
};
