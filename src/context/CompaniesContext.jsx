import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createCompany,
  createFiscalYear,
  deleteCompany,
  listCompanies,
  setDefaultCompany,
  updateCompany as apiUpdateCompany,
} from '../api/companies';
import { setActiveCompanyId as persistActiveCompanyId } from '../api/client';
import { isCompanyGstEnabled } from '../utils/companyGst';
import { useAuth } from './AuthContext';

const CompaniesContext = createContext(null);
const ACTIVE_YEAR_KEY = 'dlms_active_fy';

export function CompaniesProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState(() => {
    try {
      return localStorage.getItem('dlms_active_company_id') || null;
    } catch {
      return null;
    }
  });
  const [activeYear, setActiveYearState] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_YEAR_KEY);
      if (saved) return saved;
    } catch {
      /* ignore */
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    // Indian FY: Apr–Mar
    return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
  });

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listCompanies();
      setCompanies(rows);
      if (!rows.length) {
        setActiveCompanyIdState(null);
        persistActiveCompanyId(null);
        return;
      }
      setActiveCompanyIdState((prev) => {
        const exists = rows.some((c) => String(c.id) === String(prev));
        if (exists) {
          persistActiveCompanyId(prev);
          return prev;
        }
        const def = rows.find((c) => c.isDefault) || rows.find((c) => c.isPrimary) || rows[0];
        persistActiveCompanyId(def.id);
        return def.id;
      });
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    reload();
  }, [isAuthenticated, authLoading, reload]);

  const setActiveCompany = useCallback((id) => {
    setActiveCompanyIdState(id);
    persistActiveCompanyId(id);
  }, []);

  /**
   * Munim-style switch: persist active company, mark default on server,
   * and notify the whole app to reload company-scoped data.
   */
  const switchCompany = useCallback(
    async (id) => {
      if (id == null || id === '') return null;
      setActiveCompanyIdState(id);
      persistActiveCompanyId(id);
      setCompanies((prev) =>
        prev.map((c) => ({ ...c, isDefault: String(c.id) === String(id) }))
      );
      try {
        await setDefaultCompany(id);
      } catch {
        /* local active still applies via X-Company-Id */
      }
      return id;
    },
    []
  );

  const setActiveYear = useCallback(
    async (year) => {
      const label = String(year || '').trim();
      if (!label) return;
      setActiveYearState(label);
      try {
        localStorage.setItem(ACTIVE_YEAR_KEY, label);
      } catch {
        /* ignore */
      }
      const companyId = activeCompanyId;
      if (companyId) {
        try {
          await createFiscalYear(companyId, label);
          await reload();
        } catch (err) {
          console.error(err);
        }
      }
      try {
        window.dispatchEvent(new Event('dlms-fy-changed'));
      } catch {
        /* ignore */
      }
    },
    [activeCompanyId, reload]
  );

  const addCompany = useCallback(async (payload) => {
    const primary =
      companies.find((c) => c.isPrimary) || companies.find((c) => !c.parentId) || null;
    const parentId = payload.parentId ?? primary?.id;
    const row = await createCompany({ ...payload, parentId });
    setCompanies((prev) => [row, ...prev]);
    if (row.isDefault || !activeCompanyId) {
      await switchCompany(row.id);
    }
    return row;
  }, [activeCompanyId, companies, switchCompany]);

  const updateCompany = useCallback(async (id, patch) => {
    const row = await apiUpdateCompany(id, patch);
    setCompanies((prev) => prev.map((c) => (String(c.id) === String(id) ? row : c)));
    return row;
  }, []);

  const removeCompany = useCallback(async (id) => {
    await deleteCompany(id);
    setCompanies((prev) => {
      const next = prev.filter((c) => String(c.id) !== String(id));
      if (String(activeCompanyId) === String(id)) {
        const fallback = next.find((c) => c.isPrimary) || next[0];
        if (fallback) {
          persistActiveCompanyId(fallback.id);
          setActiveCompanyIdState(fallback.id);
        } else {
          persistActiveCompanyId(null);
          setActiveCompanyIdState(null);
        }
      }
      return next;
    });
  }, [activeCompanyId]);

  const getById = useCallback(
    (id) => companies.find((row) => String(row.id) === String(id)) || null,
    [companies]
  );

  const activeCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(activeCompanyId)) || companies[0] || null,
    [companies, activeCompanyId]
  );

  const isGstEnabled = useMemo(
    () => isCompanyGstEnabled(activeCompany),
    [activeCompany]
  );

  const primaryCompany = useMemo(
    () => companies.find((c) => c.isPrimary) || companies.find((c) => !c.parentId) || null,
    [companies]
  );

  const subCompanies = useMemo(
    () => companies.filter((c) => !c.isPrimary),
    [companies]
  );

  const fiscalYears = useMemo(() => {
    const fromCompany = (activeCompany?.fiscalYears || []).map((fy) => fy.label).filter(Boolean);
    if (fromCompany.length) return fromCompany;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const current = m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
    return [current];
  }, [activeCompany]);

  const addFiscalYear = useCallback(
    async (year) => {
      const trimmed = String(year || '').trim();
      if (!trimmed || !activeCompany?.id) return null;
      await createFiscalYear(activeCompany.id, trimmed);
      await reload();
      setActiveYear(trimmed);
      return trimmed;
    },
    [activeCompany, reload, setActiveYear]
  );

  const makeDefault = useCallback(
    async (id) => {
      await switchCompany(id);
      await reload();
    },
    [reload, switchCompany]
  );

  const value = useMemo(
    () => ({
      companies,
      primaryCompany,
      subCompanies,
      loading,
      reload,
      addCompany,
      updateCompany,
      removeCompany,
      getById,
      activeCompany,
      activeCompanyId: activeCompany?.id ?? activeCompanyId,
      isGstEnabled,
      setActiveCompany,
      switchCompany,
      fiscalYears,
      activeYear,
      setActiveYear,
      addFiscalYear,
      makeDefault,
    }),
    [
      companies,
      primaryCompany,
      subCompanies,
      loading,
      reload,
      addCompany,
      updateCompany,
      removeCompany,
      getById,
      activeCompany,
      activeCompanyId,
      isGstEnabled,
      setActiveCompany,
      switchCompany,
      fiscalYears,
      activeYear,
      setActiveYear,
      addFiscalYear,
      makeDefault,
    ]
  );

  return <CompaniesContext.Provider value={value}>{children}</CompaniesContext.Provider>;
}

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies must be used within CompaniesProvider');
  return ctx;
}
