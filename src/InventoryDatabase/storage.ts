import {
  INVENTORY_COMPANIES,
  INVENTORY_STORAGE_VERSION,
  type InventoryCompany,
  type InventoryProduct,
  type InventorySnapshot,
} from './types';

export function newId(prefix = 'inv'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function storageKeyForUser(userId: string): string {
  return `inventorydb:${userId}`;
}

export function defaultSnapshot(): InventorySnapshot {
  return {
    version: INVENTORY_STORAGE_VERSION,
    products: [],
    settings: {
      defaultCompany: null,
      defaultLocation: '',
    },
  };
}

function isCompany(value: unknown): value is InventoryCompany {
  return typeof value === 'string' && (INVENTORY_COMPANIES as readonly string[]).includes(value);
}

function sanitizeProduct(raw: unknown): InventoryProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<InventoryProduct> & Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  const company: InventoryCompany = isCompany(r.company) ? r.company : 'Personal';
  const now = new Date().toISOString();
  return {
    id: r.id,
    name: r.name,
    category: typeof r.category === 'string' ? r.category : '',
    manufacturer: typeof r.manufacturer === 'string' ? r.manufacturer : '',
    modelNumber: typeof r.modelNumber === 'string' ? r.modelNumber : '',
    company,
    location: typeof r.location === 'string' ? r.location : '',
    description: typeof r.description === 'string' ? r.description : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    purchaseDate: typeof r.purchaseDate === 'string' ? r.purchaseDate : '',
    purchasePrice: typeof r.purchasePrice === 'string' ? r.purchasePrice : '',
    serials: Array.isArray(r.serials)
      ? (r.serials as unknown[])
          .map((s): InventoryProduct['serials'][number] | null => {
            if (!s || typeof s !== 'object') return null;
            const obj = s as Record<string, unknown>;
            if (typeof obj.id !== 'string') return null;
            return {
              id: obj.id,
              label: typeof obj.label === 'string' ? obj.label : '',
              value: typeof obj.value === 'string' ? obj.value : '',
            };
          })
          .filter((s): s is InventoryProduct['serials'][number] => s !== null)
      : [],
    photos: Array.isArray(r.photos)
      ? (r.photos as unknown[])
          .map((p): InventoryProduct['photos'][number] | null => {
            if (!p || typeof p !== 'object') return null;
            const obj = p as Record<string, unknown>;
            if (typeof obj.id !== 'string' || typeof obj.dataUrl !== 'string') return null;
            return {
              id: obj.id,
              dataUrl: obj.dataUrl,
              mime: typeof obj.mime === 'string' ? obj.mime : 'image/jpeg',
              name: typeof obj.name === 'string' ? obj.name : 'photo',
              width: typeof obj.width === 'number' ? obj.width : 0,
              height: typeof obj.height === 'number' ? obj.height : 0,
            };
          })
          .filter((p): p is InventoryProduct['photos'][number] => p !== null)
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

export function loadSnapshot(userId: string | undefined): InventorySnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InventorySnapshot>;
    if (parsed?.version !== INVENTORY_STORAGE_VERSION || !Array.isArray(parsed.products)) {
      return null;
    }
    const fallback = defaultSnapshot();
    const settings = {
      ...fallback.settings,
      ...(parsed.settings ?? {}),
    };
    if (settings.defaultCompany !== null && !isCompany(settings.defaultCompany)) {
      settings.defaultCompany = null;
    }
    if (typeof settings.defaultLocation !== 'string') {
      settings.defaultLocation = '';
    }
    const products = parsed.products
      .map(sanitizeProduct)
      .filter((p): p is InventoryProduct => p !== null);
    return {
      version: INVENTORY_STORAGE_VERSION,
      products,
      settings,
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string | undefined, data: InventorySnapshot): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}
