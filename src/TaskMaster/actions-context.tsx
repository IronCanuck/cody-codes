import { createContext, useContext, type ReactNode } from 'react';
import type { PersistedSnapshot } from './types';

export type TaskMasterActions = {
  exportSnapshot: () => void;
  importSnapshot: (file: File) => Promise<void>;
  clearAllData: () => void;
  /** Raw snapshot for display / diagnostics */
  getSnapshot: () => PersistedSnapshot;
};

const TaskMasterActionsContext = createContext<TaskMasterActions | null>(null);

export function TaskMasterActionsProvider({ value, children }: { value: TaskMasterActions; children: ReactNode }) {
  return <TaskMasterActionsContext.Provider value={value}>{children}</TaskMasterActionsContext.Provider>;
}

export function useTaskMasterActions() {
  const v = useContext(TaskMasterActionsContext);
  if (!v) {
    throw new Error('useTaskMasterActions must be used within TaskMasterApp');
  }
  return v;
}
