import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as purchaseApi from '../api/purchase';
import * as expensesApi from '../api/expenses';
import * as openingBalancesApi from '../api/openingBalances';
import * as salesReturnsApi from '../api/salesReturns';
import * as usersApi from '../api/users';

const LocalModulesContext = createContext(null);

/**
 * API-backed collection: { items, setItems, add, update, remove, refresh }
 * add/update/remove are async; safe to call without await.
 */
function useApiCollection({ listFn, createFn, updateFn, removeFn, afterMutate }) {
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const data = await listFn();
      const next = Array.isArray(data) ? data : [];
      setItems(next);
      return next;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [listFn]);

  const add = useCallback(
    async (payload) => {
      const row = await createFn(payload);
      await refresh();
      if (afterMutate) await afterMutate('add', row, payload);
      return row;
    },
    [createFn, refresh, afterMutate]
  );

  const update = useCallback(
    async (id, patch) => {
      const existing = items.find((r) => String(r.id) === String(id));
      const payload = { ...(existing || {}), ...patch };
      const row = await updateFn(id, payload);
      await refresh();
      if (afterMutate) await afterMutate('update', row, payload);
      return row;
    },
    [items, updateFn, refresh, afterMutate]
  );

  const remove = useCallback(
    async (id) => {
      const row = await removeFn(id);
      await refresh();
      if (afterMutate) await afterMutate('remove', null, { id });
      return row;
    },
    [removeFn, refresh, afterMutate]
  );

  return { items, setItems, add, update, remove, refresh };
}

export function LocalModulesProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);

  const expenseCategories = useApiCollection({
    listFn: expensesApi.listCategories,
    createFn: expensesApi.createCategory,
    updateFn: expensesApi.updateCategory,
    removeFn: expensesApi.deleteCategory,
  });

  const expenses = useApiCollection({
    listFn: expensesApi.listExpenses,
    createFn: expensesApi.createExpense,
    updateFn: expensesApi.updateExpense,
    removeFn: expensesApi.deleteExpense,
  });

  const purchaseBills = useApiCollection({
    listFn: purchaseApi.listBills,
    createFn: purchaseApi.createBill,
    updateFn: purchaseApi.updateBill,
    removeFn: purchaseApi.deleteBill,
  });

  const purchasePayments = useApiCollection({
    listFn: purchaseApi.listPayments,
    createFn: purchaseApi.createPayment,
    updateFn: purchaseApi.updatePayment,
    removeFn: purchaseApi.deletePayment,
  });

  const reloadBills = purchaseBills.refresh;

  const purchaseReturnsAfter = useCallback(
    async () => {
      await reloadBills();
    },
    [reloadBills]
  );

  const purchaseReturns = useApiCollection({
    listFn: purchaseApi.listReturns,
    createFn: purchaseApi.createReturn,
    updateFn: purchaseApi.updateReturn,
    removeFn: purchaseApi.deleteReturn,
    afterMutate: purchaseReturnsAfter,
  });

  const salesReturns = useApiCollection({
    listFn: salesReturnsApi.listSalesReturns,
    createFn: salesReturnsApi.createSalesReturn,
    updateFn: salesReturnsApi.updateSalesReturn,
    removeFn: salesReturnsApi.deleteSalesReturn,
  });

  const openingBalances = useApiCollection({
    listFn: openingBalancesApi.listOpeningBalances,
    createFn: openingBalancesApi.createOpeningBalance,
    updateFn: openingBalancesApi.updateOpeningBalance,
    removeFn: openingBalancesApi.deleteOpeningBalance,
  });

  const users = useApiCollection({
    listFn: usersApi.listUsers,
    createFn: usersApi.createUser,
    updateFn: usersApi.updateUser,
    removeFn: usersApi.deleteUser,
  });

  const roles = useApiCollection({
    listFn: usersApi.listRoles,
    createFn: usersApi.createRole,
    updateFn: usersApi.updateRole,
    removeFn: usersApi.deleteRole,
  });

  const permissions = useApiCollection({
    listFn: usersApi.listPermissions,
    createFn: usersApi.createPermission,
    updateFn: usersApi.updatePermission,
    removeFn: usersApi.deletePermission,
  });

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    const results = await Promise.allSettled([
      expenseCategories.refresh(),
      expenses.refresh(),
      purchaseBills.refresh(),
      purchasePayments.refresh(),
      purchaseReturns.refresh(),
      salesReturns.refresh(),
      openingBalances.refresh(),
      users.refresh(),
      roles.refresh(),
      permissions.refresh(),
    ]);
    // Soft-fail: individual refreshes already log; ensure empty arrays on hard reject
    if (results.some((r) => r.status === 'rejected')) {
      console.warn('Some module lists failed to load', results.filter((r) => r.status === 'rejected'));
    }
    setReady(true);
  }, [
    isAuthenticated,
    expenseCategories.refresh,
    expenses.refresh,
    purchaseBills.refresh,
    purchasePayments.refresh,
    purchaseReturns.refresh,
    salesReturns.refresh,
    openingBalances.refresh,
    users.refresh,
    roles.refresh,
    permissions.refresh,
  ]);

  const clearLocal = useCallback(() => {
    expenseCategories.setItems([]);
    expenses.setItems([]);
    purchaseBills.setItems([]);
    purchasePayments.setItems([]);
    purchaseReturns.setItems([]);
    salesReturns.setItems([]);
    openingBalances.setItems([]);
    users.setItems([]);
    roles.setItems([]);
    permissions.setItems([]);
    setReady(false);
  }, [
    expenseCategories.setItems,
    expenses.setItems,
    purchaseBills.setItems,
    purchasePayments.setItems,
    purchaseReturns.setItems,
    salesReturns.setItems,
    openingBalances.setItems,
    users.setItems,
    roles.setItems,
    permissions.setItems,
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clearLocal();
      return;
    }
    refreshAll().catch(() => setReady(true));
  }, [isAuthenticated, authLoading, refreshAll, clearLocal]);

  useEffect(() => {
    const onRefresh = () => {
      if (isAuthenticated) refreshAll().catch(() => {});
    };
    window.addEventListener('dlms:refresh-modules', onRefresh);
    window.addEventListener('dlms-company-changed', onRefresh);
    return () => {
      window.removeEventListener('dlms:refresh-modules', onRefresh);
      window.removeEventListener('dlms-company-changed', onRefresh);
    };
  }, [isAuthenticated, refreshAll]);

  const addPurchaseBill = useCallback(
    async (payload) => {
      const bill = await purchaseApi.createBill(payload);
      await purchaseBills.refresh();
      const qty = Number(payload.stockQty) || 0;
      if (payload.productId && qty > 0) {
        window.dispatchEvent(new Event('dlms:refresh-inventory'));
      }
      return bill;
    },
    [purchaseBills.refresh]
  );

  const addPurchasePayment = useCallback(
    async (payload) => {
      const row = await purchaseApi.createPayment(payload);
      await Promise.all([purchasePayments.refresh(), purchaseBills.refresh()]);
      return row;
    },
    [purchasePayments.refresh, purchaseBills.refresh]
  );

  const addExpense = useCallback(
    async (payload) => {
      const row = await expensesApi.createExpense({
        date: payload.date || new Date().toISOString().slice(0, 10),
        categoryName: payload.categoryName || payload.category || '',
        categoryId: payload.categoryId || null,
        amount: Number(payload.amount) || 0,
        paymentMode: payload.paymentMode || payload.paymentMethod || 'Cash',
        notes: payload.notes || payload.description || '',
        gstType: payload.gstType || (payload.gstApplicable ? 'GST' : 'Non-GST'),
      });
      await expenses.refresh();
      return row;
    },
    [expenses.refresh]
  );

  const supplierPayables = useMemo(() => {
    const map = {};
    purchaseBills.items.forEach((b) => {
      const name = b.supplierName || 'Vendor';
      if (!map[name]) map[name] = { id: name, name, currentBalance: 0, type: 'supplier' };
      map[name].currentBalance += Number(b.balance) || 0;
    });
    return Object.values(map).filter((s) => s.currentBalance > 0);
  }, [purchaseBills.items]);

  const value = useMemo(
    () => ({
      expenseCategories,
      expenses,
      addExpense,
      purchaseBills,
      addPurchaseBill,
      purchasePayments,
      addPurchasePayment,
      purchaseReturns,
      salesReturns,
      openingBalances,
      users,
      roles,
      permissions,
      supplierPayables,
      ready,
      refreshAll,
    }),
    [
      expenseCategories,
      expenses,
      addExpense,
      purchaseBills,
      addPurchaseBill,
      purchasePayments,
      addPurchasePayment,
      purchaseReturns,
      salesReturns,
      openingBalances,
      users,
      roles,
      permissions,
      supplierPayables,
      ready,
      refreshAll,
    ]
  );

  return (
    <LocalModulesContext.Provider value={value}>
      {children}
    </LocalModulesContext.Provider>
  );
}

export function useLocalModules() {
  const ctx = useContext(LocalModulesContext);
  if (!ctx) throw new Error('useLocalModules must be used within LocalModulesProvider');
  return ctx;
}

/** Dispatch from outside provider to reload module lists. */
export function requestModulesRefresh() {
  window.dispatchEvent(new Event('dlms:refresh-modules'));
}
