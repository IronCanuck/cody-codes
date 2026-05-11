/* eslint-disable react-refresh/only-export-components -- helpers colocated with provider */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Company, supabase } from '../lib/supabase';

const ACTIVE_COMPANY_KEY = 'consalty:activeCompanyId';

type CompanyContextValue = {
  companies: Company[];
  activeCompanyId: string | null;
  activeCompany: Company | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveCompanyId: (id: string | null) => void;
  createCompany: (name: string, color?: string) => Promise<Company | null>;
  renameCompany: (id: string, name: string) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

function readStoredActiveCompanyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveCompanyId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_COMPANY_KEY, id);
    else localStorage.removeItem(ACTIVE_COMPANY_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    readStoredActiveCompanyId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveCompanyId = useCallback((id: string | null) => {
    setActiveCompanyIdState(id);
    writeStoredActiveCompanyId(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) {
      const msg = fetchError.message || 'Unknown error';
      setError(
        /42P01|relation|does not exist|schema cache|PGRST205/i.test(msg)
          ? 'Companies table is missing. Apply the latest Supabase migrations from `supabase/migrations` (or run them in the Supabase SQL editor).'
          : msg,
      );
      setCompanies([]);
      setLoading(false);
      return;
    }

    const list = (data as Company[]) || [];
    setCompanies(list);

    setActiveCompanyIdState((current) => {
      if (current && list.some((c) => c.id === current)) return current;
      const next = list[0]?.id ?? null;
      writeStoredActiveCompanyId(next);
      return next;
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCompany = useCallback(
    async (name: string, color = 'jd-green'): Promise<Company | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const nextSort = companies.length
        ? Math.max(...companies.map((c) => c.sort_order)) + 1
        : 0;
      const { data, error: insertError } = await supabase
        .from('companies')
        .insert({ name: trimmed, color, sort_order: nextSort })
        .select()
        .single();
      if (insertError) {
        setError(insertError.message);
        return null;
      }
      const created = data as Company;
      setCompanies((prev) => [...prev, created]);
      setActiveCompanyId(created.id);
      return created;
    },
    [companies, setActiveCompanyId],
  );

  const renameCompany = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error: updateError } = await supabase
      .from('companies')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
    );
  }, []);

  const deleteCompany = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setCompanies((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeCompanyId === id) {
          const fallback = next[0]?.id ?? null;
          setActiveCompanyId(fallback);
        }
        return next;
      });
    },
    [activeCompanyId, setActiveCompanyId],
  );

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      activeCompanyId,
      activeCompany,
      loading,
      error,
      refresh,
      setActiveCompanyId,
      createCompany,
      renameCompany,
      deleteCompany,
    }),
    [
      companies,
      activeCompanyId,
      activeCompany,
      loading,
      error,
      refresh,
      setActiveCompanyId,
      createCompany,
      renameCompany,
      deleteCompany,
    ],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanies(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompanies must be used within CompanyProvider');
  }
  return ctx;
}
