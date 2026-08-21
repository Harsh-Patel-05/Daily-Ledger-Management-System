import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { emptyProfile, emptySettings } from '../data/defaults';
import {
  readStoredBranding,
  writeStoredBranding,
  clearStoredBranding,
  withNormalizedLogo,
} from '../utils/branding';
import * as customersApi from '../api/customers';
import * as transactionsApi from '../api/transactions';
import * as invoicesApi from '../api/invoices';
import * as notificationsApi from '../api/notifications';
import * as authApi from '../api/auth';
import * as coreApi from '../api/core';
import { sameId } from '../api/ids';
import { requestInventoryRefresh } from './InventoryContext';

const AppContext = createContext(null);

function initialProfile() {
  const cached = readStoredBranding();
  if (!cached) return emptyProfile;
  return { ...emptyProfile, ...cached };
}

export function AppProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { applyFromSettings } = useTheme();

  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettingsState] = useState(emptySettings);
  const [profile, setProfileState] = useState(initialProfile);
  const [activityLog, setActivityLog] = useState([]);
  const [dashboardExtra, setDashboardExtra] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [reportsData, setReportsData] = useState(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [dataReady, setDataReady] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const applyProfile = useCallback((prof) => {
    const next = withNormalizedLogo({ ...emptyProfile, ...prof });
    setProfileState(next);
    writeStoredBranding(next);
    return next;
  }, []);

  const clearLocal = useCallback(() => {
    setCustomers([]);
    setTransactions([]);
    setNotifications([]);
    setInvoices([]);
    setSettingsState(emptySettings);
    setProfileState(emptyProfile);
    clearStoredBranding();
    setActivityLog([]);
    setDashboardExtra(null);
    setAnalyticsData(null);
    setReportsData(null);
    setDataReady(false);
    setDataError(null);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    setDataError(null);
    const settled = (p, fallback) => p.then((v) => v).catch(() => fallback);
    try {
      const [
        custs,
        txns,
        invs,
        notifs,
        activity,
        prof,
        sett,
        dash,
        analytics,
        reports,
      ] = await Promise.all([
        settled(customersApi.listCustomers(), []),
        settled(transactionsApi.listTransactions(), []),
        settled(invoicesApi.listInvoices(), []),
        settled(notificationsApi.listNotifications(), []),
        settled(notificationsApi.listActivity(), []),
        settled(authApi.getProfile(), null),
        settled(authApi.getSettings(), {}),
        settled(coreApi.getDashboard(), null),
        settled(coreApi.getAnalytics(6), null),
        settled(coreApi.getReports(), null),
      ]);

      setCustomers(custs);
      setTransactions(txns);
      setInvoices(invs);
      setNotifications(notifs);
      setActivityLog(activity);
      if (prof) applyProfile(prof);
      const nextSettings = {
        ...emptySettings,
        ...sett,
        gstNumber: sett.gstNumber || prof?.gst || '',
        businessName: sett.businessName || prof?.shopName || '',
        invoicePrefix: sett.invoicePrefix || prof?.invoicePrefix || emptySettings.invoicePrefix,
        accentColor: sett.accentColor || emptySettings.accentColor,
        lowStockAlert: sett.lowStockAlert ?? emptySettings.lowStockAlert,
      };
      setSettingsState(nextSettings);
      applyFromSettings(nextSettings);
      setDashboardExtra(dash);
      setAnalyticsData(analytics);
      setReportsData(reports);
      setDataReady(true);
    } catch (err) {
      console.error(err);
      setDataReady(true);
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated, applyFromSettings, applyProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clearLocal();
      return;
    }
    refreshAll().catch(() => {});
  }, [isAuthenticated, authLoading, refreshAll, clearLocal]);

  useEffect(() => {
    const onCompanyChange = () => {
      if (isAuthenticated) refreshAll().catch(() => {});
    };
    window.addEventListener('dlms-company-changed', onCompanyChange);
    return () => window.removeEventListener('dlms-company-changed', onCompanyChange);
  }, [isAuthenticated, refreshAll]);

  const refreshCustomers = useCallback(async () => {
    const custs = await customersApi.listCustomers();
    setCustomers(custs);
    return custs;
  }, []);

  const refreshTransactions = useCallback(async () => {
    const txns = await transactionsApi.listTransactions();
    setTransactions(txns);
    return txns;
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const [dash, analytics, reports] = await Promise.all([
        coreApi.getDashboard().catch(() => null),
        coreApi.getAnalytics(6).catch(() => null),
        coreApi.getReports().catch(() => null),
      ]);
      if (dash) setDashboardExtra(dash);
      if (analytics) setAnalyticsData(analytics);
      if (reports) setReportsData(reports);
    } catch {
      // non-blocking
    }
  }, []);

  const logActivity = useCallback((message, type = 'info') => {
    const local = { id: `local_${Date.now()}`, type, message, at: new Date().toISOString() };
    setActivityLog((prev) => [local, ...prev].slice(0, 100));
    notificationsApi.createActivity({ message, type })
      .then((row) => {
        if (!row) return;
        setActivityLog((prev) => [row, ...prev.filter((x) => x.id !== local.id)].slice(0, 100));
      })
      .catch(() => { /* keep optimistic local entry */ });
  }, []);

  const persistActivity = useCallback(async (message, type = 'info') => {
    try {
      const row = await notificationsApi.createActivity({ message, type });
      setActivityLog((prev) => [row, ...prev].slice(0, 100));
      return row;
    } catch {
      logActivity(message, type);
      return null;
    }
  }, [logActivity]);

  const addCustomer = useCallback(async (data) => {
    const created = await customersApi.createCustomer(data);
    setCustomers((prev) => [created, ...prev]);
    logActivity(`Customer added: ${created.name}`, 'customer');
    return created;
  }, [logActivity]);

  const updateCustomer = useCallback(async (id, data) => {
    const updated = await customersApi.updateCustomer(id, data);
    setCustomers((prev) => prev.map((c) => (sameId(c.id, id) ? updated : c)));
    logActivity('Customer updated', 'customer');
    return updated;
  }, [logActivity]);

  const deleteCustomer = useCallback(async (id) => {
    const c = customers.find((x) => sameId(x.id, id));
    const res = await customersApi.deleteCustomer(id);
    setCustomers((prev) => prev.filter((x) => !sameId(x.id, id)));
    if (c) logActivity(`Customer deleted: ${c.name}`, 'customer');
    return res;
  }, [customers, logActivity]);

  const getCustomer = useCallback(
    (id) => customers.find((c) => sameId(c.id, id)),
    [customers]
  );

  const addTransaction = useCallback(async (data) => {
    const created = await transactionsApi.createTransaction(data);
    setTransactions((prev) => [created, ...prev]);
    await Promise.all([refreshCustomers(), refreshDashboard()]);
    logActivity(`Transaction: ${data.type} ₹${data.amount}`, 'transaction');
    return created;
  }, [refreshCustomers, refreshDashboard, logActivity]);

  const deleteTransaction = useCallback(async (id) => {
    const res = await transactionsApi.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => !sameId(t.id, id)));
    await Promise.all([refreshCustomers(), refreshDashboard()]);
    logActivity('Transaction deleted', 'transaction');
    return res;
  }, [refreshCustomers, refreshDashboard, logActivity]);

  const getCustomerTransactions = useCallback(
    (customerId) => transactions.filter((t) => sameId(t.customerId, customerId)),
    [transactions]
  );

  const recordPayment = useCallback(async ({ customerId, amount, method = 'Cash', date, notes, invoiceId }) => {
    const amt = Number(amount) || 0;
    if (!customerId || amt <= 0) return null;

    const tx = await transactionsApi.recordPayment({
      customerId,
      amount: amt,
      method,
      date: date || new Date().toISOString().split('T')[0],
      notes,
      invoiceId,
    });
    setTransactions((prev) => [tx, ...prev]);
    await Promise.all([
      refreshCustomers(),
      invoicesApi.listInvoices().then(setInvoices),
      refreshDashboard(),
    ]);
    logActivity(`Payment recorded: ₹${amt}`, 'payment');
    return tx;
  }, [refreshCustomers, refreshDashboard, logActivity]);

  const closeDay = useCallback(async (payload = {}) => {
    const result = await transactionsApi.dayClose(payload);
    if (result?.activity) {
      setActivityLog((prev) => [{
        id: result.activity.id,
        type: result.activity.type,
        message: result.activity.message,
        at: result.activity.createdAt,
      }, ...prev].slice(0, 100));
    }
    await refreshDashboard();
    return result;
  }, [refreshDashboard]);

  const addInvoice = useCallback(async (data) => {
    const created = await invoicesApi.createInvoice(data);
    setInvoices((prev) => [created, ...prev]);
    await Promise.all([refreshCustomers(), refreshTransactions(), refreshDashboard()]);
    logActivity(`Invoice created: ${created.invoiceNumber}`, 'invoice');
    return created;
  }, [refreshCustomers, refreshTransactions, refreshDashboard, logActivity]);

  const updateInvoice = useCallback(async (id, data) => {
    const updated = await invoicesApi.updateInvoice(id, data);
    setInvoices((prev) => prev.map((inv) => (sameId(inv.id, id) ? updated : inv)));
    return updated;
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    const res = await invoicesApi.deleteInvoice(id);
    setInvoices((prev) => prev.filter((i) => !sameId(i.id, id)));
    await Promise.all([refreshCustomers(), refreshTransactions(), refreshDashboard()]);
    logActivity('Invoice deleted', 'invoice');
    return res;
  }, [refreshCustomers, refreshTransactions, refreshDashboard, logActivity]);

  const duplicateInvoice = useCallback(async (id) => {
    const created = await invoicesApi.duplicateInvoice(id);
    setInvoices((prev) => [created, ...prev]);
    logActivity(`Invoice duplicated: ${created.invoiceNumber}`, 'invoice');
    return created;
  }, [logActivity]);

  const markInvoicePaid = useCallback(async (id, extra = {}) => {
    const updated = await invoicesApi.markInvoicePaid(id, extra);
    setInvoices((prev) => prev.map((inv) => (sameId(inv.id, id) ? updated : inv)));
    await Promise.all([refreshCustomers(), refreshTransactions(), refreshDashboard()]);
    logActivity(`Invoice marked paid: ${updated.invoiceNumber || id}`, 'payment');
    return updated;
  }, [refreshCustomers, refreshTransactions, refreshDashboard, logActivity]);

  const getInvoice = useCallback(
    (id) => invoices.find((i) => sameId(i.id, id)),
    [invoices]
  );

  const importInvoiceAsTransaction = useCallback(async (invoiceData) => {
    let customer = customers.find(
      (c) =>
        (invoiceData.customerMobile && c.mobile === invoiceData.customerMobile) ||
        (invoiceData.customerName && c.name.toLowerCase() === invoiceData.customerName.toLowerCase()) ||
        (invoiceData.customerGst && c.gst && c.gst === invoiceData.customerGst)
    );

    if (!customer && invoiceData.customerName) {
      customer = await addCustomer({
        name: invoiceData.customerName,
        mobile: invoiceData.customerMobile || '0000000000',
        businessName: invoiceData.businessName || invoiceData.customerBusiness || invoiceData.customerName,
        address: invoiceData.customerAddress || '',
        gst: invoiceData.customerGst || '',
        email: invoiceData.customerEmail || '',
        creditLimit: 50000,
        notes: 'Created from invoice upload',
      });
    }

    const items = invoiceData.items?.length
      ? invoiceData.items
      : [{ description: 'Invoice import', quantity: 1, rate: invoiceData.total, amount: invoiceData.total }];

    const invoice = await addInvoice({
      ...invoiceData,
      customerId: customer?.id,
      items: items.map((item) => ({
        description: item.description,
        hsn: item.hsn || '',
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      paymentMethod: invoiceData.paymentMethod || 'Credit',
      terms: invoiceData.terms || 'Payment due within 15 days.',
      dueDate: invoiceData.dueDate || null,
      paidAmount: invoiceData.paidAmount || 0,
    });

    logActivity('Invoice imported via OCR/upload', 'invoice');
    return { customer, transactions: [], invoice };
  }, [customers, addCustomer, addInvoice, logActivity]);

  const setSettings = useCallback(async (next) => {
    const value = typeof next === 'function' ? next(settings) : next;
    setSettingsState(value);
    try {
      const saved = await authApi.updateSettings(value);
      setSettingsState((prev) => ({ ...prev, ...saved }));
      return saved;
    } catch (err) {
      setSettingsState(settings);
      throw err;
    }
  }, [settings]);

  const setProfile = useCallback(async (next) => {
    const value = typeof next === 'function' ? next(profile) : next;
    applyProfile(value);
    try {
      const { logo, ...rest } = value;
      const payload = { ...rest };
      // Don't send data-URL logos as text fields
      if (typeof logo === 'string' && logo.startsWith('data:')) {
        delete payload.logo;
      } else if (logo === null || typeof logo === 'string') {
        // keep URL as-is; backend ignores unknown read-only
      }
      const saved = await authApi.updateProfile(payload);
      applyProfile({ ...value, ...saved });
      setSettingsState((prev) => ({
        ...prev,
        gstNumber: saved.gst ?? prev.gstNumber,
        businessName: saved.shopName || prev.businessName,
        invoicePrefix: saved.invoicePrefix || prev.invoicePrefix,
      }));
      return saved;
    } catch (err) {
      applyProfile(profile);
      throw err;
    }
  }, [profile, applyProfile]);

  const uploadLogo = useCallback(async (file) => {
    const saved = await authApi.updateProfileLogo(file);
    applyProfile({ ...profile, ...saved });
    return saved;
  }, [profile, applyProfile]);

  const restoreBackup = useCallback(() => {
    throw new Error('Backup restore is local-only. Use API seed or re-enter data.');
  }, []);

  const refreshFromServer = useCallback(async () => {
    await refreshAll();
    requestInventoryRefresh();
    logActivity('Data refreshed from server', 'system');
  }, [refreshAll, logActivity]);

  const refreshNotifications = useCallback(async () => {
    const [notifs, activity] = await Promise.all([
      notificationsApi.listNotifications(),
      notificationsApi.listActivity(),
    ]);
    setNotifications(notifs);
    setActivityLog(activity);
    return notifs;
  }, []);

  const syncAndRefreshNotifications = useCallback(async () => {
    try {
      await notificationsApi.syncNotifications();
    } catch {
      // sync may fail if backend old; still refresh list
    }
    return refreshNotifications();
  }, [refreshNotifications]);

  const markNotificationRead = useCallback(async (id) => {
    const updated = await notificationsApi.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (sameId(n.id, id) ? { ...updated, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await notificationsApi.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = transactions.filter((t) => t.date === today);

    const todaySales = todayTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
    const todayCollection = Number(dashboardExtra?.stats?.todayCollection)
      || todayTxs.filter((t) => t.type === 'payment').reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingAmount = Number(dashboardExtra?.stats?.totalReceivable)
      || customers.reduce((s, c) => s + Number(c.currentBalance || 0), 0);
    const overdueCustomers = Number(dashboardExtra?.stats?.overdueCustomers)
      || customers.filter((c) => c.status === 'overdue').length;
    const unpaidInvoicesList = invoices.filter((i) => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial');
    const invoiceDue = unpaidInvoicesList.reduce((s, i) => s + Number(i.balance || 0), 0);

    return {
      todaySales,
      todayCredit: todaySales,
      todayCollection,
      pendingAmount,
      totalCustomers: customers.length,
      totalTransactions: transactions.length,
      totalInvoices: invoices.length,
      unpaidInvoices: Number(dashboardExtra?.stats?.unpaidInvoices) || unpaidInvoicesList.length,
      overdueCustomers,
      invoiceDue,
      collectionRate: pendingAmount + todayCollection > 0
        ? Math.round((todayCollection / (pendingAmount + todayCollection || 1)) * 100)
        : 0,
    };
  }, [customers, transactions, invoices, dashboardExtra]);

  const value = {
    customers,
    transactions,
    notifications,
    invoices,
    settings,
    profile,
    activityLog,
    sidebarOpen,
    sidebarCollapsed,
    commandOpen,
    unreadCount,
    stats,
    dataLoading,
    dataError,
    dataReady,
    dashboardExtra,
    analyticsData,
    reportsData,
    setSidebarOpen,
    setSidebarCollapsed,
    setCommandOpen,
    setSettings,
    setProfile,
    uploadLogo,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    addTransaction,
    deleteTransaction,
    getCustomerTransactions,
    recordPayment,
    closeDay,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    markInvoicePaid,
    getInvoice,
    importInvoiceAsTransaction,
    restoreBackup,
    refreshFromServer,
    resetDemoData: refreshFromServer,
    refreshAll,
    refreshDashboard,
    logActivity,
    persistActivity,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications,
    syncAndRefreshNotifications,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
