import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import { businessProfile, defaultSettings } from '../data/settings';
import * as customersApi from '../api/customers';
import * as transactionsApi from '../api/transactions';
import * as invoicesApi from '../api/invoices';
import * as notificationsApi from '../api/notifications';
import * as authApi from '../api/auth';
import * as coreApi from '../api/core';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettingsState] = useState(defaultSettings);
  const [profile, setProfileState] = useState(businessProfile);
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

  const clearLocal = useCallback(() => {
    setCustomers([]);
    setTransactions([]);
    setNotifications([]);
    setInvoices([]);
    setSettingsState(defaultSettings);
    setProfileState(businessProfile);
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
        customersApi.listCustomers(),
        transactionsApi.listTransactions(),
        invoicesApi.listInvoices(),
        notificationsApi.listNotifications(),
        notificationsApi.listActivity(),
        authApi.getProfile(),
        authApi.getSettings(),
        coreApi.getDashboard().catch(() => null),
        coreApi.getAnalytics(6).catch(() => null),
        coreApi.getReports().catch(() => null),
      ]);

      setCustomers(custs);
      setTransactions(txns);
      setInvoices(invs);
      setNotifications(notifs);
      setActivityLog(activity);
      setProfileState({ ...businessProfile, ...prof });
      setSettingsState({ ...defaultSettings, ...sett });
      setDashboardExtra(dash);
      setAnalyticsData(analytics);
      setReportsData(reports);
      setDataReady(true);
    } catch (err) {
      console.error(err);
      setDataError(err.message || 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clearLocal();
      return;
    }
    refreshAll().catch(() => {});
  }, [isAuthenticated, authLoading, refreshAll, clearLocal]);

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

  const logActivity = useCallback((message, type = 'info') => {
    setActivityLog((prev) => [
      { id: `local_${Date.now()}`, type, message, at: new Date().toISOString() },
      ...prev,
    ].slice(0, 100));
  }, []);

  const addCustomer = useCallback(async (data) => {
    const created = await customersApi.createCustomer(data);
    setCustomers((prev) => [created, ...prev]);
    logActivity(`Customer added: ${created.name}`, 'customer');
    return created;
  }, [logActivity]);

  const updateCustomer = useCallback(async (id, data) => {
    const updated = await customersApi.updateCustomer(id, data);
    setCustomers((prev) => prev.map((c) => (c.id === id || c.pk === updated.pk ? updated : c)));
    logActivity('Customer updated', 'customer');
    return updated;
  }, [logActivity]);

  const deleteCustomer = useCallback(async (id) => {
    const c = customers.find((x) => x.id === id);
    await customersApi.deleteCustomer(id);
    setCustomers((prev) => prev.filter((x) => x.id !== id));
    if (c) logActivity(`Customer deleted: ${c.name}`, 'customer');
  }, [customers, logActivity]);

  const getCustomer = useCallback(
    (id) => customers.find((c) => c.id === id || String(c.pk) === String(id)),
    [customers]
  );

  const addTransaction = useCallback(async (data) => {
    const created = await transactionsApi.createTransaction(data);
    setTransactions((prev) => [created, ...prev]);
    await refreshCustomers();
    logActivity(`Transaction: ${data.type} ₹${data.amount}`, 'transaction');
    return created;
  }, [refreshCustomers, logActivity]);

  const getCustomerTransactions = useCallback(
    (customerId) => transactions.filter((t) => t.customerId === customerId),
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
    await Promise.all([refreshCustomers(), invoicesApi.listInvoices().then(setInvoices)]);
    logActivity(`Payment recorded: ₹${amt}`, 'payment');
    return tx;
  }, [refreshCustomers, logActivity]);

  const addInvoice = useCallback(async (data) => {
    const created = await invoicesApi.createInvoice(data);
    setInvoices((prev) => [created, ...prev]);
    await Promise.all([refreshCustomers(), refreshTransactions()]);
    logActivity(`Invoice created: ${created.invoiceNumber}`, 'invoice');
    return created;
  }, [refreshCustomers, refreshTransactions, logActivity]);

  const updateInvoice = useCallback(async (id, data) => {
    const updated = await invoicesApi.updateInvoice(id, data);
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    return updated;
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    await invoicesApi.deleteInvoice(id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    await refreshCustomers();
    logActivity('Invoice deleted', 'invoice');
  }, [refreshCustomers, logActivity]);

  const duplicateInvoice = useCallback(async (id) => {
    const created = await invoicesApi.duplicateInvoice(id);
    setInvoices((prev) => [created, ...prev]);
    logActivity(`Invoice duplicated: ${created.invoiceNumber}`, 'invoice');
    return created;
  }, [logActivity]);

  const getInvoice = useCallback(
    (id) => invoices.find((i) => i.id === id || String(i.pk) === String(id)),
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
        mobile: invoiceData.customerMobile || '9000000000',
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
    setProfileState(value);
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
      setProfileState((prev) => ({ ...prev, ...saved }));
      return saved;
    } catch (err) {
      setProfileState(profile);
      throw err;
    }
  }, [profile]);

  const uploadLogo = useCallback(async (file) => {
    const saved = await authApi.updateProfileLogo(file);
    setProfileState((prev) => ({ ...prev, ...saved }));
    return saved;
  }, []);

  const restoreBackup = useCallback(() => {
    throw new Error('Backup restore is local-only. Use API seed or re-enter data.');
  }, []);

  const resetDemoData = useCallback(async () => {
    await refreshAll();
    logActivity('Data refreshed from server', 'system');
  }, [refreshAll, logActivity]);

  const markNotificationRead = useCallback(async (id) => {
    const updated = await notificationsApi.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
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
    getCustomerTransactions,
    recordPayment,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    getInvoice,
    importInvoiceAsTransaction,
    restoreBackup,
    resetDemoData,
    refreshAll,
    logActivity,
    markNotificationRead,
    markAllNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
