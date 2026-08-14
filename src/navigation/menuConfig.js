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
      { to: '/parties/customers', label: 'Customers', aliases: ['/customers'] },
      { to: '/parties/suppliers', label: 'Suppliers' },
      { to: '/parties/outstanding', label: 'Outstanding' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'FaBoxes',
    children: [
      { to: '/inventory/products', label: 'Products', aliases: ['/inventory/add'] },
      { to: '/inventory/categories', label: 'Categories' },
      { to: '/inventory/brands', label: 'Brands' },
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
      { to: '/sales/invoices', label: 'Sales Invoices', aliases: ['/invoices'] },
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
      { to: '/ledger/day-book', label: 'Day Book', aliases: ['/transactions'] },
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
    aliases: ['/reports', '/analytics'],
    children: [
      { to: '/reports/sales', label: 'Sales Reports', aliases: ['/reports/classic', '/analytics'] },
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

function normalizePath(pathname = '') {
  if (!pathname) return '/';
  const [path] = pathname.split(/[?#]/);
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

/** True when pathname is this route or a nested page under it. */
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

/**
 * Longest-prefix match so /expenses/categories wins over /expenses,
 * and aliases like /customers/:id still highlight Parties → Customers.
 */
export function getActiveNav(pathname = '') {
  const path = normalizePath(pathname);
  let best = { section: null, child: null, score: -1 };

  const consider = (section, child, to) => {
    if (!pathMatches(path, to)) return;
    const score = normalizePath(to).length;
    const better = score > best.score || (score === best.score && child && !best.child);
    if (better) best = { section, child, score };
  };

  menuConfig.forEach((item) => {
    if (item.to) consider(item, null, item.to);
    (item.aliases || []).forEach((alias) => consider(item, null, alias));
    (item.children || []).forEach((child) => {
      patternsFor(child).forEach((to) => consider(item, child, to));
    });
  });

  accountLinks.forEach((item) => {
    patternsFor(item).forEach((to) => consider({ id: 'account', label: 'Account' }, item, to));
  });

  // /inventory/:id (product details / edit) is not a named submenu
  const invSeg = path.split('/').filter(Boolean);
  const namedInventory = new Set([
    'products', 'categories', 'brands', 'stock', 'low-stock', 'stock-adjustment', 'suppliers', 'add',
  ]);
  if (invSeg[0] === 'inventory' && invSeg[1] && !namedInventory.has(invSeg[1])) {
    const inventory = menuConfig.find((i) => i.id === 'inventory');
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

/** Resolve current page label from pathname for navbar title. */
export function getPageTitle(pathname = '') {
  if (!pathname || pathname === '/') return { title: 'Dashboard', section: null };

  const { section, child } = getActiveNav(pathname);
  if (!section) return { title: 'Daily Ledger', section: null };

  const label = child?.label || section.label;
  const sectionLabel = section.id === 'account' ? 'Account' : section.label;
  if (sectionLabel && sectionLabel !== label) {
    return { title: label, section: sectionLabel };
  }
  return { title: label, section: null };
}
