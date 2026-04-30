export const FIREWATCH_STORAGE_VERSION = 1 as const;

export const PLATOONS = ['A', 'B', 'C', 'D'] as const;
export type Platoon = (typeof PLATOONS)[number];

export type Firefighter = {
  id: string;
  name: string;
  role?: string;
  platoon: Platoon;
};

export type FireWatchSnapshot = {
  version: typeof FIREWATCH_STORAGE_VERSION;
  firefighters: Firefighter[];
};
