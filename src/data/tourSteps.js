/**
 * Guided product tour — walks every sidebar module & page in business order.
 * Generated from menuConfig so tour stays in sync with the sidebar.
 */
import { menuConfig, accountLinks } from '../navigation/menuConfig';

/** Bump when tour content changes so users see the new walkthrough. */
export const TOUR_STORAGE_KEY = 'dlms_tour_done_v2';

/** data-tour id for a top-level sidebar section */
export function navSectionTourId(sectionId) {
  return `nav-${sectionId}`;
}

/** data-tour id for a sidebar child link */
export function navChildTourId(sectionId, childTo) {
  const slug = String(childTo || '')
    .replace(/^\//, '')
    .replace(/\//g, '-');
  return `nav-${sectionId}--${slug}`;
}

const SECTION_BLURBS = {
  dashboard: 'Your daily home — sales, collections, dues and stock alerts at a glance.',
  companies: 'Manage companies and switch the active company / financial year from the header.',
  'account-master': 'Chart of accounts, ledger accounts, bank accounts and transporters — set these up once.',
  parties: 'Customers, vendors and outstanding balances. Add parties before sales or purchases.',
  inventory: 'Items, groups, categories, brands, units, HSN, godowns and stock — your item master.',
  sales: 'Quotations → orders → challans → invoices → payments & returns. Full sales cycle.',
  purchase: 'Purchase orders, bills, GRN, debit notes, payments and returns.',
  expenses: 'Expense categories, entries and expense reports for shop costs.',
  payments: 'Receipts, payments, contra, bank reconciliation, journal and GST journal.',
  ledger: 'Party ledger, cash book, day book, opening and closing balances.',
  stock: 'Stock adjustment and stock journal for warehouse movements.',
  gst: 'GST dashboard, summaries, GSTR-1 / 3B, e-invoice and e-way bill.',
  reports: 'Sales, purchase, payment, inventory, P&L, registers, trial balance and balance sheet.',
  users: 'Users, roles and the module permission matrix for your team.',
  settings: 'Business, GST, invoice, inventory, payment, tax, series and print templates.',
};

const CHILD_HINTS = {
  '/accounts/charts': 'Tree of account groups and ledgers for this company.',
  '/accounts': 'Create and manage individual ledger accounts.',
  '/accounts/bank': 'Bank and cash accounts used in receipts, payments and contra.',
  '/accounts/transporters': 'Transporter masters for e-way and deliveries.',
  '/parties/customers': 'Customer / debtor master linked to sales and outstanding.',
  '/parties/vendors': 'Vendor / creditor master linked to purchase bills.',
  '/parties/suppliers': 'Vendor / creditor master linked to purchase bills.',
  '/parties/outstanding': 'Who owes you and whom you owe — follow up from here.',
  '/inventory/products': 'Item catalogue with purchase/selling price and stock.',
  '/inventory/groups': 'Group items for easier reporting and filters.',
  '/inventory/categories': 'Category master used on products.',
  '/inventory/brands': 'Brand / manufacturer master.',
  '/inventory/units': 'UOM symbols (Nos, Kg, Mtr…) for billing.',
  '/inventory/hsn': 'HSN / SAC codes and GST rates for compliance.',
  '/inventory/godowns': 'Warehouses / godowns for stock location.',
  '/inventory/stock': 'Current stock levels across items.',
  '/inventory/low-stock': 'Items that need reorder attention.',
  '/sales/invoices': 'Create GST / Non-GST sales invoices from parties + items.',
  '/sales/quotations': 'Send quotes before converting to order or invoice.',
  '/sales/proforma': 'Proforma invoices for advances / confirmation.',
  '/sales/orders': 'Confirmed sales orders pending delivery / invoice.',
  '/sales/challans': 'Delivery challans when goods leave the warehouse.',
  '/sales/credit-notes': 'Credit notes for sales returns / adjustments.',
  '/sales/payments': 'Record money received against sales invoices.',
  '/sales/returns': 'Sales return entries linked to invoices.',
  '/sales/bulk-update': 'Update many invoice statuses in one place.',
  '/purchase/orders': 'Purchase orders to vendors before goods arrive.',
  '/purchase/bills': 'Purchase bills / invoices from vendors.',
  '/purchase/grn': 'Goods receipt notes when stock comes in.',
  '/purchase/debit-notes': 'Debit notes for purchase returns / claims.',
  '/purchase/payments': 'Payments made to vendors against bills.',
  '/purchase/returns': 'Purchase return records.',
  '/expenses/categories': 'Classify rent, salary, utilities and other costs.',
  '/expenses': 'Log day-to-day shop expenses.',
  '/expenses/reports': 'Expense totals by category and period.',
  '/payments/in': 'Receipt voucher — money coming into cash/bank.',
  '/payments/out': 'Payment voucher — money going out.',
  '/ledger/contra': 'Move funds between cash and bank accounts.',
  '/ledger/bank-reconciliation': 'Match book balance with bank statement.',
  '/ledger/journal': 'Manual journal vouchers for adjustments.',
  '/ledger/gst-journal': 'GST adjustments, ITC reversal and RCM entries.',
  '/payments/history': 'All payment / receipt history in one list.',
  '/ledger/party': 'Full ledger of a customer or vendor.',
  '/ledger/cash-book': 'Cash-in and cash-out register.',
  '/ledger/day-book': 'All vouchers for a day (day book).',
  '/ledger/opening-balance': 'Opening balances at financial year start.',
  '/ledger/closing-balance': 'Closing balances for review.',
  '/inventory/stock-adjustment': 'Correct stock quantity with a reason.',
  '/inventory/stock-journal': 'Transfer stock between godowns / items.',
  '/gst': 'GST compliance dashboard for the period.',
  '/gst/summary': 'Taxable value and tax summary.',
  '/gst/hsn-sac': 'HSN/SAC-wise outward / inward summary.',
  '/gst/tax-summary': 'CGST / SGST / IGST totals.',
  '/gst/sales': 'GST sales register view.',
  '/gst/purchase': 'GST purchase register view.',
  '/gst/gstr-1': 'GSTR-1 outward supplies preview.',
  '/gst/gstr-3b': 'GSTR-3B monthly summary preview.',
  '/gst/e-invoice': 'E-invoice / IRN workflow.',
  '/gst/e-way': 'E-way bill with transporter / vehicle.',
  '/reports/sales': 'Sales reports by period and party.',
  '/reports/purchase': 'Purchase reports by vendor and period.',
  '/reports/payments': 'Payment collection and payout reports.',
  '/reports/outstanding': 'Receivable / payable ageing.',
  '/reports/inventory': 'Stock valuation and movement reports.',
  '/reports/expenses': 'Expense analysis reports.',
  '/reports/profit-loss': 'Profit & loss summary.',
  '/reports/gst': 'GST-oriented report pack.',
  '/reports/sales-register': 'Sales voucher register.',
  '/reports/purchase-register': 'Purchase voucher register.',
  '/reports/journal-register': 'Journal voucher register.',
  '/reports/trial-balance': 'Trial balance from chart of accounts.',
  '/reports/balance-sheet': 'Assets vs liabilities snapshot.',
  '/users': 'Staff accounts under your shop.',
  '/users/roles': 'Default roles: Owner, Staff, Accountant.',
  '/users/permissions': 'Toggle view / create / edit / delete per module.',
  '/settings/business': 'Shop name, GSTIN, address and branding.',
  '/settings/gst': 'Default tax behaviour and GST options.',
  '/settings/invoice': 'Invoice format, prefix and terms.',
  '/settings/inventory': 'Stock alerts and inventory defaults.',
  '/settings/payment': 'Payment modes and reminder options.',
  '/settings/tax': 'Default tax rate and fiscal preferences.',
  '/settings/user': 'Your profile and preference settings.',
  '/settings/series': 'Document number series by FY.',
  '/settings/print': 'Print templates for invoices and vouchers.',
  '/notifications': 'Alerts for dues, low stock and activity.',
  '/profile': 'Your login profile and tour replay.',
};

function sectionStep(item) {
  const firstChild = item.children?.[0];
  return {
    id: `section-${item.id}`,
    target: navSectionTourId(item.id),
    title: item.label,
    body:
      SECTION_BLURBS[item.id]
      || `${item.label} section. Expand it in the sidebar to open its pages.`,
    placement: 'right',
    route: item.to || firstChild?.to || '/dashboard',
    openSection: item.children ? item.id : undefined,
  };
}

function childStep(item, child) {
  return {
    id: `child-${item.id}-${child.to}`,
    target: navChildTourId(item.id, child.to),
    title: child.label,
    body:
      CHILD_HINTS[child.to]
      || `${child.label} under ${item.label}. Open this page from the sidebar to work here.`,
    placement: 'right',
    route: child.to,
    openSection: item.id,
  };
}

function linkStep(item) {
  return {
    id: `link-${item.id}`,
    target: navSectionTourId(item.id),
    title: item.label,
    body: SECTION_BLURBS[item.id] || `Open ${item.label} from the sidebar.`,
    placement: 'right',
    route: item.to,
  };
}

const menuSteps = menuConfig.flatMap((item) => {
  if (!item.children?.length) return [linkStep(item)];
  return [sectionStep(item), ...item.children.map((child) => childStep(item, child))];
});

const accountSteps = accountLinks.map((link) => {
  const id = link.to.replace(/^\//, '');
  return {
    id: `account-${id}`,
    target: `nav-account-${id}`,
    title: link.label,
    body: CHILD_HINTS[link.to] || `${link.label} is under Account in the sidebar footer.`,
    placement: 'right',
    route: link.to,
  };
});

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Daily Ledger',
    body: 'This tour walks every sidebar module in order — masters first, then sales & purchase, accounting, GST, reports and settings.',
    placement: 'center',
    headline: 'Learn the full menu, step by step',
    highlights: [
      'Masters: companies, accounts, parties, items',
      'Transactions: sales, purchase, expenses',
      'Close with ledger, GST, reports & settings',
    ],
  },
  {
    id: 'sidebar',
    target: 'sidebar',
    title: 'Sidebar — your full menu',
    body: 'Left sidebar lists every module in business order. Accordion sections expand in place — only one stays open at a time.',
    placement: 'right',
    route: '/dashboard',
  },
  {
    id: 'company-switcher',
    target: 'company-switcher',
    title: 'Company & financial year',
    body: 'Switch active company and FY from the header. All books data follows the selected company.',
    placement: 'bottom',
    route: '/dashboard',
  },
  {
    id: 'create-menu',
    target: 'create-menu',
    title: 'Create menu',
    body: 'Use + Create for quick actions — customer, invoice, purchase bill, payment, expense, day closing and more.',
    placement: 'bottom',
    route: '/dashboard',
  },
  {
    id: 'dashboard-stats',
    target: 'dashboard-stats',
    title: 'Dashboard overview',
    body: 'Live cards show today’s sales, collections, dues and stock alerts — your morning check before work.',
    placement: 'bottom',
    route: '/dashboard',
  },
  ...menuSteps,
  {
    id: 'command-palette',
    target: 'command-palette',
    title: 'Command palette',
    body: 'Press Ctrl+K anytime to jump to any page or run quick actions without hunting the menu.',
    placement: 'bottom',
    route: '/dashboard',
  },
  ...accountSteps,
  {
    id: 'finish',
    title: 'You’re ready',
    body: 'You’ve walked the full sidebar. Use Create and Ctrl+K for speed. Replay this tour anytime from Settings or profile.',
    placement: 'center',
    headline: 'Full shop workflow unlocked',
    highlights: [
      'Sidebar = every module, step by step',
      'Create = quick actions',
      'Ctrl+K = jump anywhere',
    ],
    route: '/dashboard',
  },
];
