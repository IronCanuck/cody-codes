export const FIREWATCH_STORAGE_VERSION = 1 as const;

export const SHIFT_CODES = ['A', 'B', 'C', 'D'] as const;
export type ShiftCode = (typeof SHIFT_CODES)[number];

export type Firefighter = {
  id: string;
  name: string;
  role?: string;
  shift: ShiftCode;
};

export type FireWatchSnapshot = {
  version: typeof FIREWATCH_STORAGE_VERSION;
  firefighters: Firefighter[];
};
