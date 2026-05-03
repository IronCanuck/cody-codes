import type { ColumnThemeId } from './themes';

export const STORAGE_VERSION = 1 as const;
export const DEFAULT_COLUMN_TITLES = ['Backlog', 'In progress', 'Review', 'Done'] as const;

export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  priority?: TaskPriority;
  dueDate?: string;
  createdAt: string;
};

export type BoardColumn = {
  id: string;
  title: string;
  order: number;
  color?: ColumnThemeId;
};

export type Project = {
  id: string;
  name: string;
  columns: BoardColumn[];
  tasks: Task[];
};

export type PersistedSnapshot = {
  version: typeof STORAGE_VERSION;
  activeProjectId: string;
  projects: Project[];
};
