/**
 * App navigation — accordion sidebar (expand in place).
 */
export const menuConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'FaTachometerAlt',
    to: '/dashboard',
    group: 'General',
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: 'FaBuilding',
    to: '/companies',
    group: 'General',
  },
  {
    id: 'account-master',
    label: 'Account Master',
    icon: 'FaSitemap',
    group: 'Master',
    children: [
      { to: '/accounts/charts', label: 'Charts of Account' },
      { to: '/accounts', label: 'Accounts' },
      { to: '/accounts/bank', label: 'Bank' },
      { to: '/accounts/transporters', label: 'Transporter' },
    ],
  },
  {
    id: 'parties',
    label: 'Party Master',
    icon: 'FaUsers',
    group: 'Master',
    children: [
      { to: '/parties/customers', label: 'Customers', aliases: ['/customers'] },
      { to: '/parties/vendors', label: 'Vendors', aliases: ['/parties/suppliers', '/inventory/suppliers', '/inventory/vendors'] },
      { to: '/parties/outstanding', label: 'Outstanding' },
    ],
  },
  {
    id: 'inventory',
    label: 'Item Master',
    icon: 'FaBoxes',
    group: 'Master',
    children: [
      { to: '/inventory/products', label: 'Items', aliases: ['/inventory/add'] },
      { to: '/inventory/groups', label: 'Item Groups' },
      { to: '/inventory/categories', label: 'Categories' },
      { to: '/inventory/brands', label: 'Brands' },
      { to: '/inventory/units', label: 'Units' },
      { to: '/inventory/hsn', label: 'HSN / SAC', gstOnly: true },
      { to: '/inventory/godowns', label: 'Godowns' },
      { to: '/inventory/stock', label: 'Stock' },
      { to: '/inventory/low-stock', label: 'Low Stock' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'FaFileInvoiceDollar',
    group: 'Transactions',
    children: [
      { to: '/sales/invoices', label: 'Sales Invoice', aliases: ['/invoices'] },
      { to: '/sales/quotations', label: 'Quotation' },
      { to: '/sales/proforma', label: 'Proforma Invoice' },
      { to: '/sales/orders', label: 'Sales Order' },
      { to: '/sales/challans', label: 'Delivery Challan' },
      { to: '/sales/credit-notes', label: 'Credit Note' },
      { to: '/sales/payments', label: 'Sales Payments' },
      { to: '/sales/returns', label: 'Sales Returns' },
      { to: '/sales/bulk-update', label: 'Bulk Invoice Update' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: 'FaShoppingCart',
    group: 'Transactions',
    children: [
      { to: '/purchase/orders', label: 'Purchase Order' },
      { to: '/purchase/bills', label: 'Purchase Bill' },
      { to: '/purchase/grn', label: 'Goods Receipt' },
      { to: '/purchase/debit-notes', label: 'Debit Note' },
      { to: '/purchase/payments', label: 'Purchase Payments' },
      { to: '/purchase/returns', label: 'Purchase Returns' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'FaReceipt',
    group: 'Transactions',
    children: [
      { to: '/expenses/categories', label: 'Expense Categories' },
      { to: '/expenses', label: 'Expenses' },
      { to: '/expenses/reports', label: 'Expense Reports' },
    ],
  },
  {
    id: 'payments',
    label: 'Core Accounting',
    icon: 'FaMoneyBillWave',
    group: 'Core Accounting',
    children: [
      { to: '/payments/in', label: 'Receipt' },
      { to: '/payments/out', label: 'Payment' },
      { to: '/ledger/contra', label: 'Contra Entry' },
      { to: '/ledger/bank-reconciliation', label: 'Bank Reconciliation' },
      { to: '/ledger/journal', label: 'Journal Voucher' },
      { to: '/ledger/gst-journal', label: 'GST Journal', gstOnly: true },
      { to: '/payments/history', label: 'Payment History' },
    ],
  },
  {
    id: 'ledger',
    label: 'Ledger / Accounting',
    icon: 'FaBook',
    group: 'Core Accounting',
    children: [
      { to: '/ledger/party', label: 'Party Ledger' },
      { to: '/ledger/cash-book', label: 'Cash Book' },
      { to: '/ledger/day-book', label: 'Day Book', aliases: ['/transactions'] },
      { to: '/ledger/opening-balance', label: 'Opening Balance' },
      { to: '/ledger/closing-balance', label: 'Closing Balance' },
    ],
  },
  {
    id: 'stock',
    label: 'Inventory',
    icon: 'FaBoxes',
    group: 'Inventory',
    children: [
      { to: '/inventory/stock-adjustment', label: 'Stock Adjustment' },
      { to: '/inventory/stock-journal', label: 'Stock Journal' },
    ],
  },
  {
    id: 'gst',
    label: 'GST Compliance',
    icon: 'FaPercentage',
    group: 'Business Review',
    gstOnly: true,
    children: [
      { to: '/gst', label: 'GST Dashboard' },
      { to: '/gst/summary', label: 'GST Summary' },
      { to: '/gst/hsn-sac', label: 'HSN/SAC Summary' },
      { to: '/gst/tax-summary', label: 'Tax Summary' },
      { to: '/gst/sales', label: 'GST Sales' },
      { to: '/gst/purchase', label: 'GST Purchase' },
      { to: '/gst/gstr-1', label: 'GSTR-1' },
      { to: '/gst/gstr-3b', label: 'GSTR-3B' },
      { to: '/gst/e-invoice', label: 'E-Invoice' },
      { to: '/gst/e-way', label: 'E-Way Bill' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'FaChartBar',
    group: 'Business Review',
    aliases: ['/reports', '/analytics'],
    children: [
      { to: '/reports/sales', label: 'Sales Reports', aliases: ['/reports/classic', '/analytics'] },
      { to: '/reports/purchase', label: 'Purchase Reports' },
      { to: '/reports/payments', label: 'Payment Reports' },
      { to: '/reports/outstanding', label: 'Outstanding Reports' },
      { to: '/reports/inventory', label: 'Inventory Reports' },
      { to: '/reports/expenses', label: 'Expense Reports' },
      { to: '/reports/profit-loss', label: 'Profit/Loss Summary' },
      { to: '/reports/gst', label: 'GST Reports', gstOnly: true },
      { to: '/reports/sales-register', label: 'Sales Register' },
      { to: '/reports/purchase-register', label: 'Purchase Register' },
      { to: '/reports/journal-register', label: 'Journal Register' },
      { to: '/reports/trial-balance', label: 'Trial Balance' },
      { to: '/reports/balance-sheet', label: 'Balance Sheet' },
    ],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: 'FaUserShield',
    group: 'Admin',
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
    group: 'Admin',
    children: [
      { to: '/settings/business', label: 'Business Settings' },
      { to: '/settings/gst', label: 'GST Settings', gstOnly: true },
      { to: '/settings/invoice', label: 'Invoice Settings' },
      { to: '/settings/inventory', label: 'Inventory Settings' },
      { to: '/settings/payment', label: 'Payment Settings' },
      { to: '/settings/tax', label: 'Tax Settings' },
      { to: '/settings/user', label: 'User Settings' },
      { to: '/settings/series', label: 'Series Configuration' },
      { to: '/settings/print', label: 'Print Templates' },
    ],
  },
];

export const accountLinks = [
  { to: '/notifications', label: 'Notifications', icon: 'FaBell' },
  { to: '/profile', label: 'Profile', icon: 'FaUser' },
];

/** Hide GST-only sections/links when company is Unregistered / Without GST. */
export function filterMenuConfig(items = menuConfig, isGstEnabled = true) {
  if (isGstEnabled) return items;
  return items
    .filter((item) => !item.gstOnly)
    .map((item) => {
      if (!item.children?.length) return item;
      const children = item.children.filter((c) => !c.gstOnly);
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean);
}

function normalizePath(pathname = '') {
  if (!pathname) return '/';
  const [path] = pathname.split(/[?#]/);
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

export function pathMatches(pathname, to) {
  if (!to) return false;
  const path = normalizePath(pathname);
  const base = normalizePath(to);
  return path === base || path.startsWith(`${base}/`);
}

function patternsFor(entry) {
  if (!entry) return [];
  return [entry.to, ...(entry.aliases || [])].filter(Boolean);
}

export function getActiveNav(pathname = '', menu = menuConfig) {
  const path = normalizePath(pathname);
  let best = { section: null, child: null, score: -1 };

  const consider = (section, child, to) => {
    if (!pathMatches(path, to)) return;
    const score = normalizePath(to).length;
    const better = score > best.score || (score === best.score && child && !best.child);
    if (better) best = { section, child, score };
  };

  menu.forEach((item) => {
    if (item.to) consider(item, null, item.to);
    (item.aliases || []).forEach((alias) => consider(item, null, alias));
    (item.children || []).forEach((child) => {
      patternsFor(child).forEach((to) => consider(item, child, to));
    });
  });

  accountLinks.forEach((item) => {
    patternsFor(item).forEach((to) => consider({ id: 'account', label: 'Account' }, item, to));
  });

  const invSeg = path.split('/').filter(Boolean);
  const namedInventory = new Set([
    'products', 'categories', 'brands', 'stock', 'low-stock', 'stock-adjustment', 'suppliers', 'vendors', 'add',
    'units', 'hsn', 'godowns', 'stock-journal', 'groups',
  ]);
  if (invSeg[0] === 'inventory' && invSeg[1] && !namedInventory.has(invSeg[1])) {
    const inventory = menu.find((i) => i.id === 'inventory');
    const products = inventory?.children?.find((c) => c.to === '/inventory/products');
    if (inventory && products) {
      best = { section: inventory, child: products, score: '/inventory/products'.length };
    }
  }

  return best;
}

export function sectionIsActive(item, pathname) {
  const { section } = getActiveNav(pathname);
  return section?.id === item.id;
}

export function childIsActive(child, pathname) {
  const { child: activeChild } = getActiveNav(pathname);
  return !!activeChild && activeChild.to === child.to;
}

export function getPageTitle(pathname = '') {
  if (!pathname || pathname === '/') return { title: 'Dashboard', section: null };
  const path = normalizePath(pathname);
  if (path === '/companies/create') return { title: 'Create Company', section: 'Companies' };
  if (/^\/companies\/[^/]+\/edit$/.test(path)) return { title: 'Edit Company', section: 'Companies' };
  if (/^\/companies\/[^/]+$/.test(path)) return { title: 'Company Profile', section: 'Companies' };

  const { section, child } = getActiveNav(pathname);
  if (!section) return { title: 'Daily Ledger', section: null };

  const label = child?.label || section.label;
  const sectionLabel = section.id === 'account' ? 'Account' : section.label;
  if (sectionLabel && sectionLabel !== label) {
    return { title: label, section: sectionLabel };
  }
  return { title: label, section: null };
}
