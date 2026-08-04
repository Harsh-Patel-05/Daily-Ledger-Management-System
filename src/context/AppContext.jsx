import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { customers as initialCustomers } from '../data/customers';
import { transactions as initialTransactions } from '../data/transactions';
import { notifications as initialNotifications } from '../data/notifications';
import { invoices as initialInvoices } from '../data/invoices';
import { businessProfile, defaultSettings } from '../data/settings';
import { generateId } from '../utils/helpers';
import { nextInvoiceNumber, calcInvoiceTotals } from '../utils/invoiceUtils';
import { loadPersistedData, savePersistedData } from '../utils/storage';

const AppContext = createContext(null);

function getInitialState() {
  const saved = loadPersistedData();
  return {
    customers: saved?.customers || initialCustomers,
    transactions: saved?.transactions || initialTransactions,
    notifications: saved?.notifications || initialNotifications,
    invoices: saved?.invoices || initialInvoices,
    settings: saved?.settings ? { ...defaultSettings, ...saved.settings } : defaultSettings,
    profile: saved?.profile ? { ...businessProfile, ...saved.profile } : businessProfile,
    activityLog: saved?.activityLog || [
      { id: 'act_1', type: 'system', message: 'Welcome to Daily Ledger Management System', at: new Date().toISOString() },
    ],
  };
}

export function AppProvider({ children }) {
  const initial = useMemo(() => getInitialState(), []);
  const [customers, setCustomers] = useState(initial.customers);
  const [transactions, setTransactions] = useState(initial.transactions);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [invoices, setInvoices] = useState(initial.invoices);
  const [settings, setSettings] = useState(initial.settings);
  const [profile, setProfile] = useState(initial.profile);
  const [activityLog, setActivityLog] = useState(initial.activityLog);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const logActivity = useCallback((message, type = 'info') => {
    setActivityLog((prev) => [
      { id: generateId('act'), type, message, at: new Date().toISOString() },
      ...prev,
    ].slice(0, 100));
  }, []);

  // Persist to localStorage
  useEffect(() => {
    savePersistedData({
      customers,
      transactions,
      notifications,
      invoices,
      settings,
      profile,
      activityLog: activityLog.slice(0, 50),
    });
  }, [customers, transactions, notifications, invoices, settings, profile, activityLog]);

  const addCustomer = useCallback((data) => {
    const newCustomer = {
      ...data,
      id: generateId('cust'),
      currentBalance: data.currentBalance ?? 0,
      status: data.status || 'active',
      photo: null,
      lastTransaction: null,
      createdAt: new Date().toISOString().split('T')[0],
      tags: data.tags || [],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    logActivity(`Customer added: ${newCustomer.name}`, 'customer');
    return newCustomer;
  }, [logActivity]);

  const updateCustomer = useCallback((id, data) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    logActivity('Customer updated', 'customer');
  }, [logActivity]);

  const deleteCustomer = useCallback((id) => {
    setCustomers((prev) => {
      const c = prev.find((x) => x.id === id);
      if (c) logActivity(`Customer deleted: ${c.name}`, 'customer');
      return prev.filter((x) => x.id !== id);
    });
  }, [logActivity]);

  const getCustomer = useCallback(
    (id) => customers.find((c) => c.id === id),
    [customers]
  );

  const addTransaction = useCallback((data) => {
    const customer = customers.find((c) => c.id === data.customerId);
    const newTx = {
      ...data,
      id: generateId('txn'),
      customerName: customer?.name || data.customerName || '',
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (customer || data.customerId) {
      let balanceChange = 0;
      if (data.type === 'credit') balanceChange = data.amount;
      if (data.type === 'payment' || data.type === 'return' || data.type === 'discount') {
        balanceChange = -data.amount;
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === data.customerId
            ? {
                ...c,
                currentBalance: Math.max(0, c.currentBalance + balanceChange),
                lastTransaction: data.date,
              }
            : c
        )
      );
    }
    logActivity(`Transaction: ${data.type} ₹${data.amount}`, 'transaction');
    return newTx;
  }, [customers, logActivity]);

  const getCustomerTransactions = useCallback(
    (customerId) => transactions.filter((t) => t.customerId === customerId),
    [transactions]
  );

  const recordPayment = useCallback(({ customerId, amount, method = 'Cash', date, notes, invoiceId }) => {
    const amt = Number(amount) || 0;
    if (!customerId || amt <= 0) return null;

    const tx = addTransaction({
      date: date || new Date().toISOString().split('T')[0],
      customerId,
      type: 'payment',
      itemDescription: invoiceId ? `Payment against invoice` : 'Payment received',
      quantity: 1,
      rate: amt,
      amount: amt,
      notes: notes || '',
      paymentMethod: method,
    });

    if (invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const paid = (Number(inv.paidAmount) || 0) + amt;
          const balance = Math.max(0, (Number(inv.total) || 0) - paid);
          let status = 'unpaid';
          if (paid >= inv.total) status = 'paid';
          else if (paid > 0) status = 'partial';
          return { ...inv, paidAmount: paid, balance, status };
        })
      );
    }

    logActivity(`Payment recorded: ₹${amt}`, 'payment');
    return tx;
  }, [addTransaction, logActivity]);

  const addInvoice = useCallback((data) => {
    const prefix = settings.invoicePrefix || profile.invoicePrefix || 'SGT';
    const totals = calcInvoiceTotals(data.items, data.discount, data.taxRate);
    const paid = Number(data.paidAmount) || 0;
    const total = totals.total;
    const balance = Math.max(0, total - paid);
    let status = 'unpaid';
    if (paid >= total && total > 0) status = 'paid';
    else if (paid > 0) status = 'partial';

    const customer = customers.find((c) => c.id === data.customerId);
    const newInvoice = {
      ...data,
      ...totals,
      id: generateId('inv'),
      invoiceNumber: data.invoiceNumber || nextInvoiceNumber(invoices, prefix),
      customerName: customer?.name || data.customerName || '',
      customerBusiness: customer?.businessName || data.customerBusiness || '',
      customerAddress: customer?.address || data.customerAddress || '',
      customerGst: customer?.gst || data.customerGst || '',
      customerMobile: customer?.mobile || data.customerMobile || '',
      paidAmount: paid,
      balance,
      status: data.status || status,
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    logActivity(`Invoice created: ${newInvoice.invoiceNumber}`, 'invoice');
    return newInvoice;
  }, [customers, invoices, settings.invoicePrefix, profile.invoicePrefix, logActivity]);

  const updateInvoice = useCallback((id, data) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const merged = { ...inv, ...data };
        if (data.items || data.discount != null || data.taxRate != null) {
          const totals = calcInvoiceTotals(merged.items, merged.discount, merged.taxRate);
          const paid = Number(merged.paidAmount) || 0;
          const balance = Math.max(0, totals.total - paid);
          let status = merged.status;
          if (paid >= totals.total && totals.total > 0) status = 'paid';
          else if (paid > 0) status = 'partial';
          else status = 'unpaid';
          return { ...merged, ...totals, balance, status };
        }
        return merged;
      })
    );
  }, []);

  const deleteInvoice = useCallback((id) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    logActivity('Invoice deleted', 'invoice');
  }, [logActivity]);

  const duplicateInvoice = useCallback((id) => {
    const source = invoices.find((i) => i.id === id);
    if (!source) return null;
    const prefix = settings.invoicePrefix || profile.invoicePrefix || 'SGT';
    return addInvoice({
      ...source,
      invoiceNumber: nextInvoiceNumber(invoices, prefix),
      date: new Date().toISOString().split('T')[0],
      paidAmount: 0,
      status: 'unpaid',
      notes: `Duplicated from ${source.invoiceNumber}`,
    });
  }, [invoices, addInvoice, settings.invoicePrefix, profile.invoicePrefix]);

  const getInvoice = useCallback(
    (id) => invoices.find((i) => i.id === id),
    [invoices]
  );

  const importInvoiceAsTransaction = useCallback((invoiceData) => {
    let customer = customers.find(
      (c) =>
        (invoiceData.customerMobile && c.mobile === invoiceData.customerMobile) ||
        (invoiceData.customerName && c.name.toLowerCase() === invoiceData.customerName.toLowerCase()) ||
        (invoiceData.customerGst && c.gst && c.gst === invoiceData.customerGst)
    );

    if (!customer && invoiceData.customerName) {
      customer = addCustomer({
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

    const txs = items.map((item) =>
      addTransaction({
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        customerId: customer?.id,
        type: 'credit',
        itemDescription: item.description,
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || Number(item.amount) || 0,
        amount: Number(item.amount) || (Number(item.quantity) || 1) * (Number(item.rate) || 0),
        notes: `From invoice ${invoiceData.invoiceNumber || ''}`.trim(),
        paymentMethod: invoiceData.paymentMethod || 'Credit',
      })
    );

    const invoice = addInvoice({
      ...invoiceData,
      customerId: customer?.id,
      items: items.map((item, i) => ({
        id: i + 1,
        description: item.description,
        hsn: item.hsn || '',
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      paymentMethod: invoiceData.paymentMethod || 'Credit',
      terms: invoiceData.terms || 'Payment due within 15 days.',
      dueDate: invoiceData.dueDate || '',
      paidAmount: invoiceData.paidAmount || 0,
    });

    logActivity('Invoice imported via OCR/upload', 'invoice');
    return { customer, transactions: txs, invoice };
  }, [customers, addCustomer, addTransaction, addInvoice, logActivity]);

  const restoreBackup = useCallback((data) => {
    if (data.customers) setCustomers(data.customers);
    if (data.transactions) setTransactions(data.transactions);
    if (data.invoices) setInvoices(data.invoices);
    if (data.notifications) setNotifications(data.notifications);
    if (data.settings) setSettings({ ...defaultSettings, ...data.settings });
    if (data.profile) setProfile({ ...businessProfile, ...data.profile });
    if (data.activityLog) setActivityLog(data.activityLog);
    logActivity('Backup restored', 'system');
  }, [logActivity]);

  const resetDemoData = useCallback(() => {
    setCustomers(initialCustomers);
    setTransactions(initialTransactions);
    setInvoices(initialInvoices);
    setNotifications(initialNotifications);
    setSettings(defaultSettings);
    setProfile(businessProfile);
    setActivityLog([{ id: generateId('act'), type: 'system', message: 'Demo data reset', at: new Date().toISOString() }]);
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    // Prefer fixed demo date if today txs empty (keeps demo dashboard alive)
    const todayTxs = transactions.filter((t) => t.date === today);
    const demoTxs = transactions.filter((t) => t.date === '2026-08-03');
    const useTxs = todayTxs.length ? todayTxs : demoTxs;

    const todaySales = useTxs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const todayCollection = useTxs.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
    const pendingAmount = customers.reduce((s, c) => s + c.currentBalance, 0);
    const overdueCustomers = customers.filter((c) => c.status === 'overdue').length;
    const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial');
    const invoiceDue = unpaidInvoices.reduce((s, i) => s + (i.balance || 0), 0);

    return {
      todaySales,
      todayCredit: todaySales,
      todayCollection,
      pendingAmount,
      totalCustomers: customers.length,
      totalTransactions: transactions.length,
      totalInvoices: invoices.length,
      unpaidInvoices: unpaidInvoices.length,
      overdueCustomers,
      invoiceDue,
      collectionRate: pendingAmount + todayCollection > 0
        ? Math.round((todayCollection / (pendingAmount + todayCollection || 1)) * 100)
        : 0,
    };
  }, [customers, transactions, invoices]);

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
    setSidebarOpen,
    setSidebarCollapsed,
    setCommandOpen,
    setSettings,
    setProfile,
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
