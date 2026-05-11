import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Network, Plus, User as UserIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { useFamilyTree } from './FamilyTreeContext';
import { GENDER_TOKENS, type FamilyMember } from './types';

type GenerationRow = {
  level: number;
  members: FamilyMember[];
};

/**
 * Assigns a generation level to each member.
 * - Members with no parents in the dataset are roots (level 0).
 * - Each child takes max(parent.level) + 1.
 * - Partners are nudged onto the higher of the two so they sit side-by-side
 *   when at all possible.
 */
function computeGenerations(members: FamilyMember[]): Map<string, number> {
  const byId = new Map<string, FamilyMember>();
  for (const m of members) byId.set(m.id, m);
  const level = new Map<string, number>();

  // Iterate to a fixed point (handles cycles & out-of-order data).
  let changed = true;
  let safety = members.length * 4 + 8;
  while (changed && safety-- > 0) {
    changed = false;
    for (const m of members) {
      let lvl = 0;
      for (const pid of m.parentIds) {
        if (byId.has(pid)) {
          const pl = level.get(pid);
          if (pl !== undefined) lvl = Math.max(lvl, pl + 1);
        }
      }
      const cur = level.get(m.id);
      if (cur === undefined || lvl > cur) {
        level.set(m.id, lvl);
        changed = true;
      }
    }
    // Partners align to the deeper of the pair.
    for (const m of members) {
      for (const pid of m.partnerIds) {
        const a = level.get(m.id) ?? 0;
        const b = level.get(pid) ?? 0;
        const target = Math.max(a, b);
        if (a !== target) {
          level.set(m.id, target);
          changed = true;
        }
        if (b !== target) {
          level.set(pid, target);
          changed = true;
        }
      }
    }
  }

  for (const m of members) if (!level.has(m.id)) level.set(m.id, 0);
  return level;
}

/**
 * Within a generation, order so partners sit next to each other and children
 * loosely follow under one of their parents. Pure heuristic but produces a
 * readable tree without a heavyweight graph layout.
 */
function orderGeneration(
  members: FamilyMember[],
  level: Map<string, number>,
  prevOrder: string[],
): FamilyMember[] {
  const orderHint = new Map<string, number>();
  prevOrder.forEach((id, i) => orderHint.set(id, i));

  const remaining = new Set(members.map((m) => m.id));
  const result: FamilyMember[] = [];

  // Group by partnerships first.
  const visited = new Set<string>();
  for (const m of members) {
    if (visited.has(m.id)) continue;
    const cluster: FamilyMember[] = [m];
    visited.add(m.id);
    for (const pid of m.partnerIds) {
      if (level.get(pid) === level.get(m.id) && remaining.has(pid) && !visited.has(pid)) {
        const partner = members.find((x) => x.id === pid);
        if (partner) {
          cluster.push(partner);
          visited.add(pid);
        }
      }
    }
    // Sort cluster's anchor by parent hint, then name.
    const hint = Math.min(
      ...cluster.flatMap((c) => c.parentIds.map((p) => orderHint.get(p) ?? Number.POSITIVE_INFINITY)),
      Number.POSITIVE_INFINITY,
    );
    (cluster as unknown as { __hint?: number; __name?: string })['__hint'] = hint;
    (cluster as unknown as { __name?: string })['__name'] =
      (cluster[0].fullName || '').toLowerCase();
    result.push(...cluster);
  }
  // Stable sort by (parent hint, then name).
  return result
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const ha =
        a.m.parentIds.length > 0
          ? Math.min(...a.m.parentIds.map((p) => orderHint.get(p) ?? Number.POSITIVE_INFINITY))
          : Number.POSITIVE_INFINITY;
      const hb =
        b.m.parentIds.length > 0
          ? Math.min(...b.m.parentIds.map((p) => orderHint.get(p) ?? Number.POSITIVE_INFINITY))
          : Number.POSITIVE_INFINITY;
      if (ha !== hb) return ha - hb;
      const na = (a.m.fullName || '').toLowerCase();
      const nb = (b.m.fullName || '').toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      return a.i - b.i;
    })
    .map((entry) => entry.m);
}

export function FamilyTreeView() {
  const { data } = useFamilyTree();
  const [zoom, setZoom] = useState(1);

  const generations: GenerationRow[] = useMemo(() => {
    const level = computeGenerations(data.members);
    const byLevel = new Map<number, FamilyMember[]>();
    for (const m of data.members) {
      const lvl = level.get(m.id) ?? 0;
      const list = byLevel.get(lvl) ?? [];
      list.push(m);
      byLevel.set(lvl, list);
    }
    const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    let prevOrder: string[] = [];
    const rows: GenerationRow[] = [];
    for (const lvl of levels) {
      const ordered = orderGeneration(byLevel.get(lvl) ?? [], level, prevOrder);
      prevOrder = ordered.map((m) => m.id);
      rows.push({ level: lvl, members: ordered });
    }
    return rows;
  }, [data.members]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLAnchorElement | null>());
  const [edges, setEdges] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; kind: 'parent' | 'partner' }>>(
    [],
  );

  const recomputeEdges = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next: typeof edges = [];
    for (const m of data.members) {
      // parent → child lines
      for (const pid of m.parentIds) {
        const parentEl = cardRefs.current.get(pid);
        const childEl = cardRefs.current.get(m.id);
        if (!parentEl || !childEl) continue;
        const pr = parentEl.getBoundingClientRect();
        const cr = childEl.getBoundingClientRect();
        next.push({
          x1: pr.left + pr.width / 2 - cRect.left,
          y1: pr.bottom - cRect.top,
          x2: cr.left + cr.width / 2 - cRect.left,
          y2: cr.top - cRect.top,
          kind: 'parent',
        });
      }
      // partner lines (draw once per pair)
      for (const pid of m.partnerIds) {
        if (pid <= m.id) continue;
        const a = cardRefs.current.get(m.id);
        const b = cardRefs.current.get(pid);
        if (!a || !b) continue;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const ay = ar.top + ar.height / 2 - cRect.top;
        const by = br.top + br.height / 2 - cRect.top;
        next.push({
          x1: ar.right - cRect.left,
          y1: ay,
          x2: br.left - cRect.left,
          y2: by,
          kind: 'partner',
        });
      }
    }
    setEdges(next);
  };

  useLayoutEffect(() => {
    recomputeEdges();
    // Re-run on window resize.
    const onResize = () => recomputeEdges();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.members, zoom]);

  // Also recompute after images load to fix initial layout jitter.
  useEffect(() => {
    const timer = setTimeout(() => recomputeEdges(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.members]);

  const containerWidth = containerRef.current?.scrollWidth ?? 0;
  const containerHeight = containerRef.current?.scrollHeight ?? 0;

  if (data.members.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-3 sm:px-6 py-12">
        <div className="rounded-2xl border border-evergreen/20 bg-white shadow-sm p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-evergreen-light/60 text-evergreen-dark">
            <Network className="h-7 w-7" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-bold text-evergreen-ink tracking-tight">
            Start your family tree
          </h2>
          <p className="mt-2 text-sm text-evergreen-dark/85 max-w-md mx-auto">
            Add the first family member — yourself, a parent, or an ancestor — and we&apos;ll start
            drawing the tree. Link parents and partners as you add more relatives.
          </p>
          <Link
            to="/family-tree/members/new"
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-evergreen-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-evergreen-ink"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Add the first member
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-3 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-evergreen-ink tracking-tight">
            {data.settings.treeTitle || 'Family tree'}
          </h2>
          <p className="mt-0.5 text-xs text-evergreen-dark/85">
            Generations flow top-to-bottom · partners connect with a rose line · click any card
            to edit.
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-evergreen/25 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-evergreen-dark hover:bg-evergreen-light/50"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
          <span className="inline-flex w-12 items-center justify-center text-xs font-semibold text-evergreen-dark">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-evergreen-dark hover:bg-evergreen-light/50"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-evergreen/20 bg-gradient-to-b from-white via-evergreen-surface to-evergreen-light/40 shadow-inner">
        <div
          ref={containerRef}
          className="relative min-w-full inline-block px-6 py-8"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* SVG layer for connectors */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={Math.max(containerWidth, 1)}
            height={Math.max(containerHeight, 1)}
            aria-hidden
          >
            {edges.map((e, i) => {
              if (e.kind === 'parent') {
                const midY = (e.y1 + e.y2) / 2;
                const path = `M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`;
                return (
                  <path
                    key={i}
                    d={path}
                    stroke="#367C2B"
                    strokeOpacity={0.65}
                    strokeWidth={1.75}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              }
              return (
                <line
                  key={i}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke="#E11D48"
                  strokeOpacity={0.6}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              );
            })}
          </svg>

          <div className="relative flex flex-col gap-12">
            {generations.map((row) => (
              <div key={row.level} className="flex flex-col items-start gap-2">
                <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-evergreen-dark/65">
                  Generation {row.level + 1}
                </span>
                <div className="flex flex-wrap gap-4 items-start">
                  {row.members.map((m) => (
                    <TreeCard
                      key={m.id}
                      member={m}
                      assignRef={(el) => {
                        if (el) cardRefs.current.set(m.id, el);
                        else cardRefs.current.delete(m.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TreeCard({
  member,
  assignRef,
}: {
  member: FamilyMember;
  assignRef: (el: HTMLAnchorElement | null) => void;
}) {
  const tokens = GENDER_TOKENS[member.gender];
  const partner = member.partnerIds.length > 0;
  return (
    <Link
      ref={assignRef}
      to={`/family-tree/members/${member.id}`}
      className={`relative z-10 flex w-44 sm:w-48 flex-col items-center gap-2 rounded-2xl border-2 bg-white px-3 py-3 shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen ${tokens.card}`}
    >
      {member.portrait ? (
        <img
          src={member.portrait.src}
          alt=""
          className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow"
          loading="lazy"
        />
      ) : (
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ring-2 ring-white shadow ${tokens.surface}`}
        >
          <UserIcon className={`h-7 w-7 ${tokens.accent}`} aria-hidden />
        </span>
      )}
      <div className="w-full text-center">
        <p className="text-sm font-bold text-evergreen-ink leading-tight line-clamp-2">
          {member.fullName || 'Unnamed'}
        </p>
        {member.nickname && (
          <p className="text-[11px] text-evergreen-dark/70 truncate">“{member.nickname}”</p>
        )}
        <p className="text-[11px] text-evergreen-dark/85">
          {member.birthDate ? new Date(member.birthDate).getFullYear() : '?'}
          {member.deathDate ? ` – ${new Date(member.deathDate).getFullYear()}` : ''}
        </p>
        {partner && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-rose-600">
            <Heart className="h-3 w-3" aria-hidden /> {member.partnerIds.length}
          </span>
        )}
      </div>
    </Link>
  );
}
