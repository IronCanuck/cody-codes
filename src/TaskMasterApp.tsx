import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Kanban,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const STORAGE_VERSION = 1 as const;
const DEFAULT_COLUMN_TITLES = ['Backlog', 'In progress', 'Review', 'Done'] as const;

type TaskPriority = 'low' | 'medium' | 'high';

type Task = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  priority?: TaskPriority;
  dueDate?: string;
  createdAt: string;
};

type BoardColumn = {
  id: string;
  title: string;
  order: number;
};

type Project = {
  id: string;
  name: string;
  columns: BoardColumn[];
  tasks: Task[];
};

type PersistedSnapshot = {
  version: typeof STORAGE_VERSION;
  activeProjectId: string;
  projects: Project[];
};

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function makeDefaultColumns(): BoardColumn[] {
  return DEFAULT_COLUMN_TITLES.map((title, i) => ({
    id: newId(),
    title,
    order: i,
  }));
}

function defaultSnapshot(): PersistedSnapshot {
  const pId = newId();
  return {
    version: STORAGE_VERSION,
    activeProjectId: pId,
    projects: [
      {
        id: pId,
        name: 'My first project',
        columns: makeDefaultColumns(),
        tasks: [],
      },
    ],
  };
}

function storageKeyForUser(userId: string) {
  return `taskmaster:${userId}`;
}

function loadSnapshot(userId: string | undefined): PersistedSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.projects) || !parsed.activeProjectId) {
      return null;
    }
    if (parsed.projects.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string | undefined, data: PersistedSnapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function sortColumns(cols: BoardColumn[]) {
  return [...cols].sort((a, b) => a.order - b.order);
}

function tasksInColumn(tasks: Task[], columnId: string) {
  return tasks
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function TaskMasterApp() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [data, setData] = useState<PersistedSnapshot>(() => defaultSnapshot());
  const [hydrated, setHydrated] = useState(false);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Task Master · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    if (stored) {
      setData(stored);
    } else {
      setData(defaultSnapshot());
    }
    setHydrated(true);
  }, [userId]);

  const persist = useCallback(
    (next: PersistedSnapshot | ((prev: PersistedSnapshot) => PersistedSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  const activeProject = useMemo(
    () => data.projects.find((p) => p.id === data.activeProjectId) ?? data.projects[0] ?? null,
    [data],
  );

  const sortedColumns = useMemo(
    () => (activeProject ? sortColumns(activeProject.columns) : []),
    [activeProject],
  );

  const setActiveProjectId = (id: string) => {
    persist((d) => ({ ...d, activeProjectId: id }));
  };

  const addProject = () => {
    const name = newProjectName.trim() || 'New project';
    const id = newId();
    persist((d) => ({
      ...d,
      activeProjectId: id,
      projects: [
        ...d.projects,
        { id, name, columns: makeDefaultColumns(), tasks: [] },
      ],
    }));
    setNewProjectName('');
    setShowNewProject(false);
  };

  const deleteProject = () => {
    if (!activeProject) return;
    persist((d) => {
      const rest = d.projects.filter((p) => p.id !== activeProject.id);
      if (rest.length === 0) {
        return defaultSnapshot();
      }
      const nextActive = d.activeProjectId === activeProject.id ? rest[0]!.id : d.activeProjectId;
      return { ...d, activeProjectId: nextActive, projects: rest };
    });
    setDeleteProjectConfirm(false);
  };

  const updateProject = (updater: (p: Project) => Project) => {
    if (!activeProject) return;
    persist((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === activeProject.id ? updater(p) : p)),
    }));
  };

  const addTask = (columnId: string) => {
    if (!activeProject) return;
    const title = (newTaskInputs[columnId] ?? '').trim();
    if (!title) return;
    const colTasks = activeProject.tasks.filter((t) => t.columnId === columnId);
    const nextOrder = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.order)) + 1 : 0;
    const task: Task = {
      id: newId(),
      title,
      description: '',
      columnId,
      order: nextOrder,
      createdAt: new Date().toISOString(),
    };
    updateProject((p) => ({ ...p, tasks: [...p.tasks, task] }));
    setNewTaskInputs((m) => ({ ...m, [columnId]: '' }));
  };

  const saveEditedTask = (t: Task) => {
    updateProject((p) => ({
      ...p,
      tasks: p.tasks.map((x) => (x.id === t.id ? t : x)),
    }));
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    updateProject((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== id) }));
    setDeleteTaskId(null);
  };

  const moveTaskToColumn = (task: Task, targetColumnId: string) => {
    if (targetColumnId === task.columnId) return;
    updateProject((p) => {
      const others = p.tasks.filter((x) => x.id !== task.id);
      const inTarget = p.tasks.filter((x) => x.columnId === targetColumnId);
      const nextOrder = inTarget.length > 0 ? Math.max(...inTarget.map((x) => x.order)) + 1 : 0;
      return {
        ...p,
        tasks: [
          ...others,
          { ...task, columnId: targetColumnId, order: nextOrder },
        ],
      };
    });
  };

  const renameColumn = (columnId: string, title: string) => {
    updateProject((p) => ({
      ...p,
      columns: p.columns.map((c) => (c.id === columnId ? { ...c, title: title.trim() || c.title } : c)),
    }));
  };

  const addColumn = () => {
    updateProject((p) => {
      const maxOrder = p.columns.length > 0 ? Math.max(...p.columns.map((c) => c.order)) : -1;
      return {
        ...p,
        columns: [...p.columns, { id: newId(), title: 'New stage', order: maxOrder + 1 }],
      };
    });
  };

  const removeColumn = (columnId: string) => {
    if (!activeProject) return;
    const cols = sortColumns(activeProject.columns);
    if (cols.length <= 1) return;
    const idx = cols.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const fallbackId = idx > 0 ? cols[idx - 1]!.id : cols[1]!.id;
    updateProject((p) => {
      const nextCols = p.columns
        .filter((c) => c.id !== columnId)
        .map((c, i) => ({ ...c, order: i }));
      const staying = p.tasks.filter((t) => t.columnId !== columnId);
      const moving = p.tasks.filter((t) => t.columnId === columnId);
      const inTarget = staying.filter((t) => t.columnId === fallbackId);
      let o = inTarget.length > 0 ? Math.max(...inTarget.map((t) => t.order)) + 1 : 0;
      const rehomed = moving.map((t) => ({ ...t, columnId: fallbackId, order: o++ }));
      return {
        ...p,
        columns: nextCols,
        tasks: [...staying, ...rehomed],
      };
    });
  }

  const moveColumn = (columnId: string, dir: -1 | 1) => {
    updateProject((p) => {
      const ordered = sortColumns(p.columns);
      const i = ordered.findIndex((c) => c.id === columnId);
      if (i < 0) return p;
      const j = i + dir;
      if (j < 0 || j >= ordered.length) return p;
      const a = ordered[i]!;
      const b = ordered[j]!;
      return {
        ...p,
        columns: p.columns.map((c) => {
          if (c.id === a.id) return { ...c, order: b.order };
          if (c.id === b.id) return { ...c, order: a.order };
          return c;
        }),
      };
    });
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">Sign in to use Task Master.</p>
      </div>
    );
  }

  if (!hydrated || !activeProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-100 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-cody-finnish/10 bg-cody-finnish text-white shadow-md">
        <div className="max-w-full mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="shrink-0 rounded-lg bg-white/10 p-1.5">
              <Kanban className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">Task Master</h1>
              <p className="text-xs text-white/80 truncate hidden sm:block">Project pipeline</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            aria-label="Back to hub"
            className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm font-medium text-white/95 hover:text-white border border-white/30 rounded-lg px-2 sm:px-3 py-1.5 hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-gold shrink-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            <span className="hidden sm:inline">Back to hub</span>
          </Link>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 flex flex-col gap-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 sm:max-w-md">
            <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Project
            </label>
            <select
              id="project-select"
              value={data.activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-cody-finnish focus:outline-none focus-visible:ring-2 focus-visible:ring-cody-finnish/40"
            >
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setShowNewProject((v) => !v);
                setNewProjectName('');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-cody-finnish/20 bg-cody-finnish/5 px-2.5 py-1.5 text-sm font-medium text-cody-finnish hover:bg-cody-finnish/10"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New
            </button>
            <button
              type="button"
              onClick={() => setColumnModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              <span className="whitespace-nowrap">Board settings</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteProjectConfirm(true)}
              className="text-xs text-rose-600 hover:underline sm:ml-1"
            >
              Delete project
            </button>
          </div>
        </div>
        {showNewProject && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProject()}
              placeholder="Project name"
              className="flex-1 min-w-0 basis-[10rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={addProject}
              className="rounded-lg bg-cody-finnish text-white px-3 py-1.5 text-sm font-medium hover:bg-cody-finnish-dark"
            >
              Create
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex-1 w-full min-w-0 min-h-0 p-3 sm:p-4 md:p-6 md:overflow-x-auto md:overflow-y-hidden md:overscroll-x-contain [scrollbar-gutter:stable]">
          <div className="flex flex-col gap-4 w-full min-w-0 md:flex-row md:items-stretch md:w-max md:max-w-none md:min-h-[min(720px,calc(100dvh-9rem))] md:pb-1 md:gap-4">
            {sortedColumns.map((col) => {
              const colTasks = tasksInColumn(activeProject.tasks, col.id);
              return (
                <section
                  key={col.id}
                  className="w-full min-w-0 min-h-0 flex flex-col md:w-[min(18rem,80vw)] md:shrink-0 md:max-h-full bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                    <h2 className="font-semibold text-cody-finnish text-sm truncate">{col.title}</h2>
                    <span className="text-xs text-slate-400 tabular-nums">{colTasks.length}</span>
                  </div>
                  <ul className="min-h-[3rem] max-h-60 sm:max-h-72 overflow-y-auto overscroll-y-contain p-2 space-y-2 [scrollbar-gutter:stable] md:max-h-none md:flex-1 md:min-h-0">
                    {colTasks.map((t) => (
                      <li key={t.id}>
                        <article className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 shadow-sm hover:border-cody-finnish/30 transition-colors">
                          <div className="flex justify-between gap-1 items-start">
                            <button
                              type="button"
                              onClick={() => setEditingTask(t)}
                              className="text-left text-sm font-medium text-slate-900 leading-snug flex-1 hover:text-cody-finnish"
                            >
                              {t.title}
                            </button>
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingTask(t)}
                                className="p-1 rounded text-slate-500 hover:text-cody-finnish hover:bg-white"
                                aria-label="Edit task"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTaskId(t.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-white"
                                aria-label="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                            {t.priority && (
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${PRIORITY_CLASS[t.priority]}`}
                              >
                                {PRIORITY_LABEL[t.priority]}
                              </span>
                            )}
                            {t.dueDate && (
                              <span className="text-[10px] text-slate-500">Due {t.dueDate}</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <label className="sr-only" htmlFor={`move-${t.id}`}>
                              Move to stage
                            </label>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <span className="shrink-0">Move</span>
                              <select
                                id={`move-${t.id}`}
                                value={t.columnId}
                                onChange={(e) => moveTaskToColumn(t, e.target.value)}
                                className="flex-1 min-w-0 text-xs rounded border border-slate-200 bg-white py-0.5 pl-1 pr-6"
                              >
                                {sortedColumns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2 border-t border-slate-100 shrink-0">
                    <div className="flex gap-1 min-w-0">
                      <input
                        type="text"
                        value={newTaskInputs[col.id] ?? ''}
                        onChange={(e) =>
                          setNewTaskInputs((m) => ({ ...m, [col.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && addTask(col.id)}
                        placeholder="New task…"
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addTask(col.id)}
                        className="shrink-0 rounded-lg bg-cody-finnish/10 text-cody-finnish p-1.5 hover:bg-cody-finnish/20"
                        aria-label="Add task"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      {editingTask && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-task-title"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 id="edit-task-title" className="text-lg font-bold text-cody-finnish">
                Task
              </h2>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-500" htmlFor="et-title">
                  Title
                </label>
                <input
                  id="et-title"
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500" htmlFor="et-desc">
                  Description
                </label>
                <textarea
                  id="et-desc"
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500" htmlFor="et-priority">
                    Priority
                  </label>
                  <select
                    id="et-priority"
                    value={editingTask.priority ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingTask({
                        ...editingTask,
                        priority: v === '' ? undefined : (v as TaskPriority),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500" htmlFor="et-due">
                    Due date
                  </label>
                  <input
                    id="et-due"
                    type="date"
                    value={editingTask.dueDate ?? ''}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        dueDate: e.target.value || undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 p-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveEditedTask(editingTask)}
                className="rounded-lg bg-cody-finnish text-white px-3 py-1.5 text-sm font-medium hover:bg-cody-finnish-dark"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {columnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="col-settings-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 id="col-settings-title" className="text-lg font-bold text-cody-finnish">
                Pipeline columns
              </h2>
              <button
                type="button"
                onClick={() => setColumnModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {sortColumns(activeProject.columns).map((c, idx, arr) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 bg-slate-50/50"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveColumn(c.id, -1)}
                      className="p-0.5 disabled:opacity-30 text-slate-600"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === arr.length - 1}
                      onClick={() => moveColumn(c.id, 1)}
                      className="p-0.5 disabled:opacity-30 text-slate-600"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={c.title}
                    onChange={(e) => renameColumn(c.id, e.target.value)}
                    className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(c.id)}
                    disabled={arr.length <= 1}
                    className="p-1.5 text-rose-600 disabled:opacity-30"
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-cody-finnish/30 bg-cody-finnish/5 text-cody-finnish px-3 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add column
              </button>
              <button
                type="button"
                onClick={() => setColumnModalOpen(false)}
                className="rounded-lg bg-cody-finnish text-white px-4 py-2 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProjectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" role="alertdialog" aria-modal="true" aria-labelledby="del-proj-title">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 id="del-proj-title" className="text-lg font-bold text-cody-finnish">
              Delete project?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes &ldquo;{activeProject.name}&rdquo; and all its tasks. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteProjectConfirm(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteProject}
                className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" role="alertdialog" aria-modal="true" aria-labelledby="del-task-title">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 id="del-task-title" className="text-lg font-bold text-cody-finnish">
              Delete task?
            </h2>
            <p className="mt-2 text-sm text-slate-600">This task will be removed from the board.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTaskId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTask(deleteTaskId)}
                className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
