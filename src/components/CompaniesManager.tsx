import { FormEvent, useState } from 'react';
import {
  Building2,
  Check,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCompanies } from '../contexts/CompanyContext';
import type { Company } from '../lib/supabase';

export function CompaniesManager() {
  const {
    companies,
    activeCompanyId,
    loading,
    error,
    createCompany,
    renameCompany,
    deleteCompany,
    setActiveCompanyId,
  } = useCompanies();

  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; tone: 'success' | 'error' } | null>(
    null,
  );

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setFeedback({ msg: 'Give the company a name first.', tone: 'error' });
      return;
    }
    setSubmitting(true);
    const created = await createCompany(name);
    setSubmitting(false);
    if (created) {
      setNewName('');
      setFeedback({
        msg: `Added "${created.name}" and switched to it. Each company has its own jobs, settings, and reports.`,
        tone: 'success',
      });
    } else {
      setFeedback({
        msg: 'Could not add the company — check the error banner above and try again.',
        tone: 'error',
      });
    }
  };

  const beginRename = (company: Company) => {
    setEditingId(company.id);
    setEditingName(company.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async (company: Company) => {
    const next = editingName.trim();
    if (!next || next === company.name) {
      cancelRename();
      return;
    }
    await renameCompany(company.id, next);
    setFeedback({ msg: `Renamed to "${next}".`, tone: 'success' });
    cancelRename();
  };

  const handleDelete = async (company: Company) => {
    const ok = confirm(
      `Delete "${company.name}"? This permanently removes its jobs, settings, daily reports, and FLHAs. This cannot be undone.`,
    );
    if (!ok) return;
    await deleteCompany(company.id);
    setFeedback({
      msg: `Deleted "${company.name}" and all its data.`,
      tone: 'success',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-jd-green-600 to-jd-green-700 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Building2 size={20} />
            Companies
          </h2>
          <p className="text-jd-green-100 text-sm mt-0.5">
            Add a company for each business or client you track. Every company has its own
            dashboard, jobs, daily reports, and pay settings.
          </p>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
        </div>
      ) : null}

      {feedback ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-jd-green-300 bg-jd-green-50 text-jd-green-900'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          {feedback.msg}
        </div>
      ) : null}

      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4"
      >
        <div>
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Plus size={18} className="text-jd-green-600" />
            Add a company
          </h3>
          <p className="text-sm text-gray-500">
            Use a short, recognizable name (e.g. "Acme Landscaping" or "Personal jobs").
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Company name"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none"
            maxLength={80}
          />
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-jd-green-600 hover:bg-jd-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-sm"
          >
            <Plus size={18} />
            {submitting ? 'Adding…' : 'Add company'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Building2 size={18} className="text-jd-green-600" />
          Your companies
          <span className="text-xs font-medium text-gray-500">({companies.length})</span>
        </h3>

        {loading && companies.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Loading companies…</p>
        ) : companies.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No companies yet. Add one above to start tracking work.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {companies.map((company) => {
              const isActive = company.id === activeCompanyId;
              const isEditing = editingId === company.id;
              return (
                <li key={company.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void saveRename(company);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelRename();
                            }
                          }}
                          autoFocus
                          maxLength={80}
                          className="flex-1 min-w-0 px-3 py-2 border border-jd-green-300 rounded-lg focus:ring-2 focus:ring-jd-green-500 focus:border-jd-green-500 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => void saveRename(company)}
                          className="p-2 rounded-md text-jd-green-700 hover:bg-jd-green-50"
                          aria-label="Save name"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                          aria-label="Cancel rename"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-900 truncate">
                          {company.name}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-jd-green-700 bg-jd-green-50 border border-jd-green-200 rounded-full px-2 py-0.5">
                            <Star size={12} aria-hidden /> Active
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => setActiveCompanyId(company.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-jd-green-800 border border-jd-green-300 hover:bg-jd-green-50 rounded-md"
                        >
                          Switch to
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => beginRename(company)}
                        className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                        aria-label={`Rename ${company.name}`}
                        title="Rename"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(company)}
                        className="p-2 rounded-md text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${company.name}`}
                        title="Delete company and all its data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
