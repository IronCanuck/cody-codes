const STORAGE_KEY = 'consalty:bankAccountSplits:v1';
const SPLITS_EVENT = 'consalty:bankAccountSplits';

export type BankAccountSplitMode = 'percent' | 'amount';

export type BankAccountSplit = {
  id: string;
  name: string;
  mode: BankAccountSplitMode;
  value: number;
};

function isMode(x: unknown): x is BankAccountSplitMode {
  return x === 'percent' || x === 'amount';
}

function isSplit(x: unknown): x is BankAccountSplit {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    isMode(o.mode) &&
    typeof o.value === 'number' &&
    Number.isFinite(o.value)
  );
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function notifyChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(SPLITS_EVENT));
  } catch {
    /* ignore */
  }
}

export function getBankAccountSplits(): BankAccountSplit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSplit).map((s) => ({
      ...s,
      value: Math.max(0, s.value),
    }));
  } catch {
    return [];
  }
}

export function setBankAccountSplits(next: BankAccountSplit[]): BankAccountSplit[] {
  const cleaned = next
    .filter(isSplit)
    .map((s) => ({ ...s, name: s.name.trim(), value: Math.max(0, s.value) }))
    .filter((s) => s.name.length > 0);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    /* storage full or disabled */
  }
  notifyChanged();
  return cleaned;
}

export function addBankAccountSplit(
  partial: Omit<BankAccountSplit, 'id'>,
): BankAccountSplit[] {
  const cur = getBankAccountSplits();
  const newSplit: BankAccountSplit = {
    id: generateId(),
    name: partial.name.trim(),
    mode: partial.mode,
    value: Math.max(0, partial.value),
  };
  if (!newSplit.name) return cur;
  return setBankAccountSplits([...cur, newSplit]);
}

export function updateBankAccountSplit(
  id: string,
  patch: Partial<Omit<BankAccountSplit, 'id'>>,
): BankAccountSplit[] {
  const cur = getBankAccountSplits();
  return setBankAccountSplits(
    cur.map((s) =>
      s.id === id
        ? {
            ...s,
            ...patch,
            name: patch.name !== undefined ? patch.name : s.name,
            value: patch.value !== undefined ? Math.max(0, patch.value) : s.value,
          }
        : s,
    ),
  );
}

export function removeBankAccountSplit(id: string): BankAccountSplit[] {
  const cur = getBankAccountSplits();
  return setBankAccountSplits(cur.filter((s) => s.id !== id));
}

export function subscribeBankAccountSplits(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(SPLITS_EVENT, handler);
  return () => window.removeEventListener(SPLITS_EVENT, handler);
}

export type BankAccountSplitAllocation = {
  split: BankAccountSplit;
  amount: number;
};

export type BankAccountSplitSummary = {
  allocations: BankAccountSplitAllocation[];
  totalFixed: number;
  totalPercent: number;
  totalAllocated: number;
  remainder: number;
  overAllocated: boolean;
};

/**
 * Allocates a net amount across configured splits.
 *
 * Fixed amounts come out first; percentage rows are applied to the original
 * `net` (not the post-amount remainder) so user intent is preserved (e.g.
 * "70% to TD" of a $2,000 paycheque is always $1,400). The caller is expected
 * to surface `overAllocated` when the user has configured more than 100% of
 * net into the splits.
 */
export function allocateNetAcrossSplits(
  net: number,
  splits: BankAccountSplit[],
): BankAccountSplitSummary {
  const safeNet = Number.isFinite(net) && net > 0 ? net : 0;
  let totalFixed = 0;
  let totalPercent = 0;
  const allocations: BankAccountSplitAllocation[] = splits.map((s) => {
    if (s.mode === 'amount') {
      const amt = Math.min(s.value, Number.POSITIVE_INFINITY);
      totalFixed += amt;
      return { split: s, amount: amt };
    }
    const pct = Math.max(0, s.value) / 100;
    totalPercent += s.value;
    return { split: s, amount: safeNet * pct };
  });
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainder = safeNet - totalAllocated;
  return {
    allocations,
    totalFixed,
    totalPercent,
    totalAllocated,
    remainder,
    overAllocated: totalAllocated > safeNet + 0.005,
  };
}
