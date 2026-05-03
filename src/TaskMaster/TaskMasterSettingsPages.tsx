import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, Database, FileDown, FileUp, Info } from 'lucide-react';
import { useTaskMasterActions } from './actions-context';
import { STORAGE_VERSION } from './types';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-tiffany/15 text-tiffany-darker border border-tiffany/30'
      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
  }`;

export function TaskMasterSettingsLayout() {
  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-4xl w-full mx-auto">
      <div className="shrink-0 border-b border-tiffany/20 bg-white/95 px-3 sm:px-6 py-2.5">
        <Link
          to="/taskmaster"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tiffany-darker hover:text-tiffany hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to board
        </Link>
      </div>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-3 sm:p-4 md:p-6">
      <nav
        className="shrink-0 flex lg:flex-col gap-1 p-1 rounded-xl border border-tiffany/20 bg-white/80 shadow-sm w-full lg:w-44"
        aria-label="Settings sections"
      >
        <NavLink to="." end className={navClass}>
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          General
        </NavLink>
        <NavLink to="data" className={navClass}>
          <Database className="h-4 w-4 shrink-0" aria-hidden />
          Data
        </NavLink>
      </nav>
      <div className="flex-1 min-w-0 rounded-xl border border-tiffany/20 bg-white/95 p-4 sm:p-5 shadow-sm">
        <Outlet />
      </div>
      </div>
    </div>
  );
}

export function TaskMasterSettingsGeneralPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-tiffany-darker">General</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Task Master keeps your projects, columns, and tasks in this browser, tied to your account. Data is
        stored locally in your device; use the <strong>Data</strong> page to export a backup or move boards
        to another browser.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        Use <span className="font-medium text-slate-800">Board settings</span> on the main board to rename
        or reorder pipeline columns.
      </p>
    </div>
  );
}

export function TaskMasterSettingsDataPage() {
  const { exportSnapshot, importSnapshot, clearAllData, getSnapshot } = useTaskMasterActions();
  const [message, setMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const fileInputId = useId();

  const onExport = () => {
    setImportError(null);
    setMessage(null);
    exportSnapshot();
    setMessage('Download started. Check your browser’s downloads folder.');
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setMessage(null);
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await importSnapshot(f);
      setMessage('Your Task Master data was imported successfully.');
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'The file could not be imported. It may be invalid or damaged.',
      );
    }
  };

  const onClearSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    clearAllData();
    setClearOpen(false);
    setMessage('All Task Master data was removed. A new default project was created.');
  };

  const snap = getSnapshot();
  const projectCount = snap.projects.length;
  const taskCount = snap.projects.reduce((n, p) => n + p.tasks.length, 0);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-tiffany-darker">Data &amp; storage</h2>
      <p className="text-sm text-slate-600">
        Export a JSON file for your records or to use on another device. Importing replaces the current
        board data in this browser. Format version: {STORAGE_VERSION}.
      </p>
      <div className="text-xs text-slate-500 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <span className="font-medium text-slate-600">Current session:</span> {projectCount} project
        {projectCount !== 1 ? 's' : ''}, {taskCount} task{taskCount !== 1 ? 's' : ''}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-tiffany/40 bg-tiffany/10 text-tiffany-darker px-3 py-2 text-sm font-medium hover:bg-tiffany/15"
        >
          <FileDown className="h-4 w-4" aria-hidden />
          Export to JSON
        </button>
        <label
          htmlFor={fileInputId}
          className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Import from file
        </label>
        <input id={fileInputId} type="file" accept="application/json,.json" className="sr-only" onChange={onPickFile} />
      </div>
      {message && <p className="text-sm text-tiffany-darker/90">{message}</p>}
      {importError && <p className="text-sm text-rose-600">{importError}</p>}

      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-800">Reset</h3>
        <p className="mt-1 text-sm text-slate-600">Remove all Task Master data for this account in this browser.</p>
        {!clearOpen ? (
          <button
            type="button"
            onClick={() => {
              setClearOpen(true);
              setMessage(null);
              setImportError(null);
            }}
            className="mt-2 text-sm font-medium text-rose-600 hover:underline"
          >
            Clear all data…
          </button>
        ) : (
          <form onSubmit={onClearSubmit} className="mt-2 space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
            <p className="text-sm text-rose-900">This cannot be undone. You will get a new empty project.</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium">
                Yes, clear everything
              </button>
              <button
                type="button"
                onClick={() => setClearOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
