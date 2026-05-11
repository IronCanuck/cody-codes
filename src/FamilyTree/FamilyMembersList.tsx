import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Plus, Search, Trash2, User as UserIcon, Users, X } from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';
import { GENDER_TOKENS, type FamilyMember } from './types';

export function FamilyMembersList() {
  const { data, removeMember } = useFamilyTree();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const out = data.members.slice().sort((a, b) => {
      const an = (a.fullName || '').toLowerCase();
      const bn = (b.fullName || '').toLowerCase();
      return an.localeCompare(bn);
    });
    if (!term) return out;
    return out.filter((m) => {
      const haystack = `${m.fullName} ${m.nickname} ${m.bio} ${m.notes} ${m.birthplace}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [data.members, search]);

  const memberById = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    for (const m of data.members) map.set(m.id, m);
    return map;
  }, [data.members]);

  const handleDelete = (member: FamilyMember) => {
    const ok = window.confirm(
      `Remove ${member.fullName || 'this member'} from your family tree? Relationships pointing to them will be detached.`,
    );
    if (!ok) return;
    removeMember(member.id);
  };

  const total = data.members.length;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-evergreen-ink tracking-tight">
            Family members
          </h2>
          <p className="mt-1 text-sm text-evergreen-dark/85">
            {total === 0
              ? 'No members yet. Add the first family member to start your tree.'
              : `${filtered.length} of ${total} ${total === 1 ? 'member' : 'members'} shown.`}
          </p>
        </div>
        <Link
          to="/family-tree/members/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-evergreen-dark px-3.5 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-dark focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          New family member
        </Link>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Search family members</span>
        <span className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-evergreen-dark/55"
            strokeWidth={2.25}
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, birthplace, or biography…"
            className="w-full rounded-lg border border-evergreen/25 bg-white pl-9 pr-3 py-2.5 text-sm text-evergreen-ink placeholder:text-evergreen-dark/45 shadow-sm focus:outline-none focus:ring-2 focus:ring-evergreen-dark focus:border-evergreen-dark"
          />
        </span>
      </label>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-evergreen/20 bg-white shadow-sm px-6 py-16 text-center">
          {total === 0 ? (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-evergreen-light/60 text-evergreen-dark">
                <Users className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-3 text-base font-semibold text-evergreen-ink">
                No family members yet
              </h3>
              <p className="mt-1 text-sm text-evergreen-dark/85 max-w-md mx-auto">
                Start with yourself, a parent, or an ancestor. You can add portraits, dates, and relationships later.
              </p>
              <Link
                to="/family-tree/members/new"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-evergreen-dark px-4 py-2 text-sm font-semibold text-white hover:bg-evergreen-ink"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Add the first family member
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-evergreen-ink">No matching members</h3>
              <p className="mt-1 text-sm text-evergreen-dark/85">Try a different search term.</p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-evergreen/30 bg-white px-3 py-2 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/40"
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Clear search
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => {
            const tokens = GENDER_TOKENS[member.gender];
            const parents = member.parentIds
              .map((id) => memberById.get(id))
              .filter((m): m is FamilyMember => m !== undefined);
            const partners = member.partnerIds
              .map((id) => memberById.get(id))
              .filter((m): m is FamilyMember => m !== undefined);
            return (
              <li key={member.id}>
                <div
                  className={`relative rounded-2xl border-2 bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-evergreen ${tokens.card}`}
                >
                  <Link
                    to={`/family-tree/members/${member.id}`}
                    className="block p-4"
                  >
                    <div className="flex items-start gap-3">
                      {member.portrait ? (
                        <img
                          src={member.portrait.src}
                          alt=""
                          className="h-16 w-16 rounded-xl object-cover ring-1 ring-evergreen/15 shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <span className={`flex h-16 w-16 items-center justify-center rounded-xl ring-1 ring-evergreen/15 shrink-0 ${tokens.surface}`}>
                          <UserIcon className={`h-7 w-7 ${tokens.accent}`} aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-evergreen-ink truncate">
                          {member.fullName || 'Unnamed member'}
                        </h3>
                        {member.nickname && (
                          <p className="text-xs text-evergreen-dark/75 truncate">
                            “{member.nickname}”
                          </p>
                        )}
                        <p className="mt-1 text-xs text-evergreen-dark/85">
                          {formatLifespan(member)}
                        </p>
                        {member.birthplace && (
                          <p className="text-xs text-evergreen-dark/70 truncate">
                            {member.birthplace}
                          </p>
                        )}
                      </div>
                    </div>
                    {(parents.length > 0 || partners.length > 0) && (
                      <div className="mt-3 space-y-1 text-xs text-evergreen-dark/85">
                        {parents.length > 0 && (
                          <p className="truncate">
                            <span className="font-semibold">Parents:</span>{' '}
                            {parents.map((p) => p.fullName || 'Unnamed').join(' & ')}
                          </p>
                        )}
                        {partners.length > 0 && (
                          <p className="truncate inline-flex items-center gap-1">
                            <Heart className="h-3 w-3 text-rose-500" aria-hidden />
                            {partners.map((p) => p.fullName || 'Unnamed').join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(member);
                    }}
                    className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-evergreen-dark/55 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label={`Remove ${member.fullName || 'member'}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => navigate('/family-tree/members/new')}
        className="fixed bottom-6 right-6 sm:hidden inline-flex h-14 w-14 items-center justify-center rounded-full bg-evergreen-dark text-white shadow-lg hover:bg-evergreen-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen-dark focus-visible:ring-offset-2"
        aria-label="Add a family member"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
      </button>
    </section>
  );
}

function formatLifespan(m: FamilyMember): string {
  const birth = m.birthDate ? formatDate(m.birthDate) : '';
  const death = m.deathDate ? formatDate(m.deathDate) : '';
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `Born ${birth}`;
  if (death) return `Passed ${death}`;
  return 'Dates unknown';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
