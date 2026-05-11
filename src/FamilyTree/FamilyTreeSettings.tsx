import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';

export function FamilyTreeSettingsPage() {
  const { data, updateSettings, clearAll } = useFamilyTree();
  const [title, setTitle] = useState(data.settings.treeTitle);
  const [primaryMemberId, setPrimaryMemberId] = useState(data.settings.primaryMemberId ?? '');
  const [showDeceased, setShowDeceased] = useState(data.settings.showDeceased);
  const [savedFlash, setSavedFlash] = useState(false);

  const members = useMemo(() => {
    return data.members
      .slice()
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [data.members]);

  const handleSave = () => {
    updateSettings({
      treeTitle: title.trim() || 'Our family',
      primaryMemberId: primaryMemberId || null,
      showDeceased,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleClear = () => {
    const ok = window.confirm(
      'Erase the entire family tree — all members, albums, and media? This cannot be undone.',
    );
    if (!ok) return;
    const reallyOk = window.confirm('Are you absolutely sure? This permanently deletes everything.');
    if (!reallyOk) return;
    clearAll();
  };

  return (
    <section className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <Link
        to="/family-tree"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen-dark hover:text-evergreen-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Family tree
      </Link>

      <h2 className="mt-3 text-xl sm:text-2xl font-bold text-evergreen-ink tracking-tight">
        Settings
      </h2>

      <div className="mt-5 rounded-2xl border border-evergreen/20 bg-white shadow-sm p-5 space-y-4">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
            Tree title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Fairburn Family"
            className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wider text-evergreen-dark mb-1">
            Primary person (for the dashboard greeting)
          </span>
          <select
            value={primaryMemberId}
            onChange={(e) => setPrimaryMemberId(e.target.value)}
            className="block w-full rounded-lg border border-evergreen/25 bg-white px-3 py-2 text-sm text-evergreen-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
          >
            <option value="">— Not set —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName || 'Unnamed'}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeceased}
            onChange={(e) => setShowDeceased(e.target.checked)}
            className="h-4 w-4 rounded border-evergreen/45 text-evergreen-dark focus:ring-evergreen-dark"
          />
          <span className="text-sm text-evergreen-ink">
            Include members who have passed in the visual tree
          </span>
        </label>

        <div className="flex items-center justify-end gap-2">
          {savedFlash && (
            <span className="text-xs text-evergreen-dark font-semibold">Saved ✓</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-evergreen-dark px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink"
          >
            <Save className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Save settings
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-red-300 bg-red-50/60 shadow-sm p-5">
        <h3 className="text-sm font-bold text-red-800 inline-flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Danger zone
        </h3>
        <p className="mt-2 text-xs text-red-800/85">
          Removes every family member, album, photo, video, and tag. The action cannot be
          undone. Other apps in your account are not affected.
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-400 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Erase everything
        </button>
      </div>
    </section>
  );
}
