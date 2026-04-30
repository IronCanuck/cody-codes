import { createContext, useContext } from 'react';
import type { Firefighter, FireWatchSnapshot } from './types';

export type FireWatchContextValue = {
  data: FireWatchSnapshot;
  hydrated: boolean;
  addFirefighter: (input: Omit<Firefighter, 'id'>) => string;
  updateFirefighter: (id: string, patch: Partial<Omit<Firefighter, 'id'>>) => void;
  removeFirefighter: (id: string) => void;
};

export const FireWatchContext = createContext<FireWatchContextValue | null>(null);

export function useFireWatch(): FireWatchContextValue {
  const ctx = useContext(FireWatchContext);
  if (!ctx) {
    throw new Error('useFireWatch must be used within FireWatchContext.Provider');
  }
  return ctx;
}
