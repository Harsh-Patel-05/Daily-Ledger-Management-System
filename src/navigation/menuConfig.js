/**
 * App navigation — matches business workflow IA.
 * Existing routes reused where features already exist.
 */
export const menuConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'FaTachometerAlt',
    to: '/dashboard',
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: 'FaUsers',
    children: [
      { to: '/parties/customers', label: 'Customers' },
      { to: '/parties/suppliers', label: 'Suppliers' },
      { to: '/parties/outstanding', label: 'Outstanding' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'FaBoxes',
    children: [
      { to: '/inventory/products', label: 'Products' },
      { to: '/inventory/categories', label: 'Categories' },
      { to: '/inventory/units', label: 'Units' },
      { to: '/inventory/stock', label: 'Stock' },
      { to: '/inventory/low-stock', label: 'Low Stock' },
      { to: '/inventory/stock-adjustment', label: 'Stock Adjustment' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'FaFileInvoiceDollar',
    children: [
      { to: '/sales/invoices', label: 'Sales Invoices' },
      { to: '/sales/payments', label: 'Sales Payments' },
      { to: '/sales/returns', label: 'Sales Returns' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: 'FaShoppingCart',
    children: [
      { to: '/purchase/bills', label: 'Purchase Bills' },
      { to: '/purchase/payments', label: 'Purchase Payments' },
      { to: '/purchase/returns', label: 'Purchase Returns' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'FaMoneyBillWave',
    children: [
      { to: '/payments/in', label: 'Payment In' },
      { to: '/payments/out', label: 'Payment Out' },
      { to: '/payments/history', label: 'Payment History' },
    ],
  },
  {
    id: 'ledger',
    label: 'Ledger / Accounting',
    icon: 'FaBook',
    children: [
      { to: '/ledger/party', label: 'Party Ledger' },
      { to: '/ledger/cash-book', label: 'Cash Book' },
      { to: '/ledger/day-book', label: 'Day Book' },
      { to: '/ledger/opening-balance', label: 'Opening Balance' },
      { to: '/ledger/closing-balance', label: 'Closing Balance' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'FaReceipt',
    children: [
      { to: '/expenses/categories', label: 'Expense Categories' },
      { to: '/expenses', label: 'Expenses' },
      { to: '/expenses/reports', label: 'Expense Reports' },
    ],
  },
  {
    id: 'gst',
    label: 'GST',
    icon: 'FaPercentage',
    children: [
      { to: '/gst', label: 'GST Dashboard' },
      { to: '/gst/summary', label: 'GST Summary' },
      { to: '/gst/hsn-sac', label: 'HSN/SAC Summary' },
      { to: '/gst/tax-summary', label: 'Tax Summary' },
      { to: '/gst/sales', label: 'GST Sales' },
      { to: '/gst/purchase', label: 'GST Purchase' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'FaChartBar',
    children: [
      { to: '/reports/sales', label: 'Sales Reports' },
      { to: '/reports/purchase', label: 'Purchase Reports' },
      { to: '/reports/payments', label: 'Payment Reports' },
      { to: '/reports/outstanding', label: 'Outstanding Reports' },
      { to: '/reports/inventory', label: 'Inventory Reports' },
      { to: '/reports/expenses', label: 'Expense Reports' },
      { to: '/reports/profit-loss', label: 'Profit/Loss Summary' },
      { to: '/reports/gst', label: 'GST Reports' },
    ],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: 'FaUserShield',
    children: [
      { to: '/users', label: 'Users' },
      { to: '/users/roles', label: 'Roles' },
      { to: '/users/permissions', label: 'Permissions' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'FaCog',
    children: [
      { to: '/settings/business', label: 'Business Settings' },
      { to: '/settings/gst', label: 'GST Settings' },
      { to: '/settings/invoice', label: 'Invoice Settings' },
      { to: '/settings/inventory', label: 'Inventory Settings' },
      { to: '/settings/payment', label: 'Payment Settings' },
      { to: '/settings/tax', label: 'Tax Settings' },
      { to: '/settings/user', label: 'User Settings' },
    ],
  },
];

export const accountLinks = [
  { to: '/notifications', label: 'Notifications', icon: 'FaBell' },
  { to: '/profile', label: 'Profile', icon: 'FaUser' },
];

/** Resolve current page label from pathname for navbar title. */
export function getPageTitle(pathname = '') {
  if (!pathname || pathname === '/') return 'Dashboard';

  let best = null;
  let bestLen = -1;

  const consider = (to, label, section) => {
    if (!to) return;
    const match = pathname === to || pathname.startsWith(`${to}/`);
    if (!match) return;
    if (to.length > bestLen) {
      bestLen = to.length;
      best = { label, section };
    }
  };

  menuConfig.forEach((item) => {
    if (item.to) consider(item.to, item.label, item.label);
    (item.children || []).forEach((child) => {
      consider(child.to, child.label, item.label);
    });
  });

  accountLinks.forEach((item) => consider(item.to, item.label, 'Account'));

  const extras = [
    { to: '/customers', label: 'Customers', section: 'Parties' },
    { to: '/invoices', label: 'Sales Invoices', section: 'Sales' },
    { to: '/inventory', label: 'Products', section: 'Inventory' },
    { to: '/transactions', label: 'Transactions', section: 'Account' },
    { to: '/analytics', label: 'Analytics', section: 'Reports' },
    { to: '/profile', label: 'Profile', section: 'Account' },
    { to: '/notifications', label: 'Notifications', section: 'Account' },
  ];
  extras.forEach((e) => consider(e.to, e.label, e.section));

  if (!best) return 'Daily Ledger';
  if (best.section && best.section !== best.label) {
    return { title: best.label, section: best.section };
  }
  return { title: best.label, section: null };
}
