import { createContext, useContext } from 'react';
import type {
  InventoryCompany,
  InventoryPhoto,
  InventoryProduct,
  InventorySerial,
  InventorySettings,
  InventorySnapshot,
} from './types';

export type NewProductInput = Partial<Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'serials' | 'photos'>> & {
  serials?: InventorySerial[];
  photos?: InventoryPhoto[];
};

export type InventoryContextValue = {
  data: InventorySnapshot;
  hydrated: boolean;
  createProduct: (input?: NewProductInput) => string;
  updateProduct: (id: string, patch: Partial<InventoryProduct>) => void;
  removeProduct: (id: string) => void;
  attachPhoto: (productId: string, photo: InventoryPhoto) => void;
  detachPhoto: (productId: string, photoId: string) => void;
  addSerial: (productId: string, serial: InventorySerial) => void;
  updateSerial: (productId: string, serialId: string, patch: Partial<InventorySerial>) => void;
  removeSerial: (productId: string, serialId: string) => void;
  setDefaultCompany: (company: InventoryCompany | null) => void;
  setDefaultLocation: (location: string) => void;
  updateSettings: (patch: Partial<InventorySettings>) => void;
  clearAll: () => void;
};

export const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used inside <InventoryDatabaseApp>');
  return ctx;
}
