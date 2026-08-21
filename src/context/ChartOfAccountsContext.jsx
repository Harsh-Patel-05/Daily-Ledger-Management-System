import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addAccountSubgroup,
  deleteAccountGroup,
  listAccountGroups,
  seedChartOfAccounts,
  updateAccountGroup,
} from '../api/books';
import { useCompanies } from './CompaniesContext';

const ChartOfAccountsContext = createContext(null);

function normalizeGroup(row) {
  return {
    id: row.id,
    name: row.name,
    nature: row.nature,
    parentId: row.parentId ?? row.parent ?? null,
    isPrimary: row.isPrimary ?? row.is_primary ?? false,
    isSystem: row.isSystem ?? row.is_system ?? false,
    ledgers: (row.ledgers || []).map((l) => ({
      id: l.id,
      name: l.name,
      opening: Number(l.opening) || 0,
      side: l.side || 'Dr',
      status: l.status || 'Active',
      shortName: l.shortName || l.short_name || '',
    })),
  };
}

export function ChartOfAccountsProvider({ children }) {
  const { activeCompanyId } = useCompanies();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!activeCompanyId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let rows = await listAccountGroups();
      if (!rows.length) {
        rows = await seedChartOfAccounts();
      }
      setGroups((rows || []).map(normalizeGroup));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const getById = useCallback(
    (id) => groups.find((row) => String(row.id) === String(id)) || null,
    [groups]
  );

  const addSubgroup = useCallback(
    async (parent, name) => {
      const trimmed = String(name || '').trim();
      if (!trimmed || !parent) return null;
      const row = await addAccountSubgroup(parent.id, trimmed);
      const mapped = normalizeGroup({ ...row, ledgers: [] });
      setGroups((prev) => [...prev, mapped]);
      return mapped;
    },
    []
  );

  const updateGroup = useCallback(async (id, patch) => {
    const row = await updateAccountGroup(id, patch);
    const mapped = normalizeGroup(row);
    setGroups((prev) => prev.map((g) => (String(g.id) === String(id) ? { ...g, ...mapped } : g)));
  }, []);

  const removeGroup = useCallback(async (id) => {
    await deleteAccountGroup(id);
    setGroups((prev) => prev.filter((g) => String(g.id) !== String(id)));
  }, []);

  const value = useMemo(
    () => ({
      groups,
      loading,
      reload,
      addSubgroup,
      updateGroup,
      removeGroup,
      getById,
    }),
    [groups, loading, reload, addSubgroup, updateGroup, removeGroup, getById]
  );

  return (
    <ChartOfAccountsContext.Provider value={value}>{children}</ChartOfAccountsContext.Provider>
  );
}

export function useChartOfAccounts() {
  const ctx = useContext(ChartOfAccountsContext);
  if (!ctx) throw new Error('useChartOfAccounts must be used within ChartOfAccountsProvider');
  return ctx;
}
