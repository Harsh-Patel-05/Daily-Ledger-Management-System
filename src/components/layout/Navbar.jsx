import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSearch,
  FaChevronDown,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaCompressAlt,
  FaExpandAlt,
  FaPlus,
  FaUserPlus,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaClock,
  FaCalendarCheck,
  FaReceipt,
  FaQuestionCircle,
  FaBoxes,
  FaShoppingCart,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaUsers,
  FaTruck,
  FaBook,
  FaChartBar,
  FaPercentage,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModal } from '../../context/ModalContext';
import { useTour } from '../../context/TourContext';
import { useInventory } from '../../context/InventoryContext';
import { useCompanies } from '../../context/CompaniesContext';
import Avatar from '../ui/Avatar';
import CompanySwitcher from './CompanySwitcher';
import { cn } from '../../utils/formatters';

/**
 * Create menu groups — mirrors sidebar module order (no separate flow strip).
 */
const CREATE_GROUPS = [
  {
    id: 'companies',
    label: 'Companies',
    items: [
      { label: 'Create Company', icon: FaPlus, action: 'nav', to: '/companies/create' },
      { label: 'All Companies', icon: FaUsers, action: 'nav', to: '/companies' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { label: 'Charts of Account', icon: FaBook, action: 'nav', to: '/accounts/charts' },
    ],
  },
  {
    id: 'parties',
    label: 'Parties',
    items: [
      { label: 'Add Customer', icon: FaUserPlus, action: 'modal', type: 'quickCustomer' },
      { label: 'Vendors', icon: FaTruck, action: 'nav', to: '/parties/vendors' },
      { label: 'Outstanding', icon: FaClock, action: 'nav', to: '/parties/outstanding' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { label: 'Add Product', icon: FaBoxes, action: 'nav', to: '/inventory/add' },
      { label: 'Stock In/Out', icon: FaExchangeAlt, action: 'modal', type: 'quickStock' },
      { label: 'Low Stock', icon: FaBoxes, action: 'nav', to: '/inventory/low-stock' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { label: 'Sales Invoice', icon: FaFileInvoiceDollar, action: 'nav', to: '/invoices/create' },
      { label: 'Sales Payments', icon: FaHandHoldingUsd, action: 'nav', to: '/sales/payments' },
      { label: 'Sales Returns', icon: FaExchangeAlt, action: 'nav', to: '/sales/returns' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    items: [
      { label: 'Purchase Bill', icon: FaShoppingCart, action: 'nav', to: '/purchase/bills' },
      { label: 'Purchase Payment', icon: FaMoneyBillWave, action: 'nav', to: '/purchase/payments' },
      { label: 'Purchase Returns', icon: FaExchangeAlt, action: 'nav', to: '/purchase/returns' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    items: [
      { label: 'Payment In', icon: FaHandHoldingUsd, action: 'modal', type: 'recordPayment' },
      { label: 'Payment Out', icon: FaMoneyBillWave, action: 'nav', to: '/payments/out' },
      { label: 'Payment History', icon: FaBook, action: 'nav', to: '/payments/history' },
    ],
  },
  {
    id: 'ledger',
    label: 'Ledger',
    items: [
      { label: 'Party Ledger', icon: FaBook, action: 'nav', to: '/ledger/party' },
      { label: 'Day Book', icon: FaBook, action: 'nav', to: '/ledger/day-book' },
      { label: 'Day Closing', icon: FaCalendarCheck, action: 'modal', type: 'dayClosing' },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    items: [
      { label: 'Add Expense', icon: FaReceipt, action: 'modal', type: 'quickExpense' },
      { label: 'Categories', icon: FaReceipt, action: 'nav', to: '/expenses/categories' },
      { label: 'Expense Reports', icon: FaChartBar, action: 'nav', to: '/expenses/reports' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports / GST',
    items: [
      { label: 'GST Dashboard', icon: FaPercentage, action: 'nav', to: '/gst', gstOnly: true },
      { label: 'Sales Reports', icon: FaChartBar, action: 'nav', to: '/reports/sales' },
      { label: 'Profit / Loss', icon: FaChartBar, action: 'nav', to: '/reports/profit-loss' },
    ],
  },
];

function CreateMenu({ open, onAction, isGstEnabled = true }) {
  if (!open) return null;
  const groups = CREATE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isGstEnabled || !item.gstOnly),
    label: !isGstEnabled && group.id === 'reports' ? 'Reports' : group.label,
  })).filter((g) => g.items.length);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      className="absolute right-0 top-full mt-2 w-72 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border z-[80] flex flex-col overflow-hidden max-h-[min(32rem,calc(100vh-5rem))]"
      data-tour="quick-actions"
    >
      <div className="shrink-0 px-3 py-2.5 border-b border-border/70 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Create</p>
        <p className="text-[10px] text-muted mt-0.5">Quick actions by module</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin">
        {groups.map((group) => (
          <div key={group.id} className="border-b border-border/60 dark:border-slate-700/80 last:border-b-0">
            <p className="sticky top-0 z-[1] px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted bg-surface/95 dark:bg-surface/95 backdrop-blur-sm">
              {group.label}
            </p>
            {group.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(item);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center shrink-0">
                  <item.icon size={12} className="text-slate-500 dark:text-slate-300" />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border/70 dark:border-slate-700 p-2 bg-surface">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction({ action: 'modal', type: 'dueCollections' });
          }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
        >
          <FaClock size={13} />
          Collections Due
        </button>
      </div>
    </motion.div>
  );
}

export default function Navbar() {
  const {
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    unreadCount,
    customers,
    invoices,
    setCommandOpen,
    profile,
    settings,
    setSettings,
  } = useApp();
  const { products } = useInventory();
  const { companies, isGstEnabled } = useCompanies();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { openModal } = useModal();
  const { startTour } = useTour();
  const navigate = useNavigate();
  const location = useLocation();

  const handleThemeToggle = () => {
    const nextMode = darkMode ? 'light' : 'dark';
    toggleDarkMode();
    if (settings) {
      setSettings({ ...settings, theme: nextMode }).catch(() => {});
    }
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const createRef = useRef(null);
  const mobileCreateRef = useRef(null);

  useEffect(() => {
    setCreateOpen(false);
    setMobileCreateOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (createRef.current && !createRef.current.contains(e.target)) setCreateOpen(false);
      if (mobileCreateRef.current && !mobileCreateRef.current.contains(e.target)) setMobileCreateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? [
        ...companies
          .filter((c) =>
            (c.name || '').toLowerCase().includes(q)
            || (c.gstin || '').toLowerCase().includes(q)
            || (c.mobile || '').includes(searchQuery.trim())
          )
          .slice(0, 3)
          .map((c) => ({
            type: 'Company',
            id: c.id,
            label: c.name,
            sub: c.gstin || c.city || 'Company',
            to: `/companies/${c.id}`,
            tone: 'blue',
          })),
        ...customers
          .filter((c) =>
            (c.name || '').toLowerCase().includes(q)
            || (c.mobile || '').includes(searchQuery.trim())
            || (c.businessName || '').toLowerCase().includes(q)
          )
          .slice(0, 4)
          .map((c) => ({
            type: 'Customer',
            id: c.id,
            label: c.name,
            sub: c.businessName || c.mobile || 'Party',
            to: `/customers/${c.id}`,
            tone: 'blue',
          })),
        ...products
          .filter((p) => (p.name || '').toLowerCase().includes(q))
          .slice(0, 3)
          .map((p) => ({
            type: 'Product',
            id: p.id,
            label: p.name,
            sub: 'Inventory',
            to: `/inventory/${p.id}`,
            tone: 'purple',
          })),
        ...invoices
          .filter((inv) =>
            (inv.invoiceNumber || '').toLowerCase().includes(q)
            || (inv.customerName || '').toLowerCase().includes(q)
          )
          .slice(0, 3)
          .map((inv) => ({
            type: 'Invoice',
            id: inv.id,
            label: inv.invoiceNumber || `Invoice #${inv.id}`,
            sub: inv.customerName || 'Sales',
            to: `/invoices/${inv.id}`,
            tone: 'emerald',
          })),
      ]
    : [];

  const shopName =
    profile?.shopName
    || settings?.businessName
    || user?.shopName
    || 'Your Shop';
  const ownerName = profile?.ownerName || user?.name || 'Owner';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const runAction = (item) => {
    setCreateOpen(false);
    setMobileCreateOpen(false);
    if (item.action === 'modal') {
      openModal(item.type);
      return;
    }
    if (item.action === 'nav' && item.to) navigate(item.to);
  };

  const toneClass = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return (
    <header className="sticky top-0 z-20 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border-b border-border dark:border-border no-print overflow-visible">
      {/* Row 1: context + tools */}
      <div className="flex items-center justify-between h-14 px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            aria-label="Open menu"
          >
            <FaBars size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <FaExpandAlt size={14} /> : <FaCompressAlt size={14} />}
          </button>

          <CompanySwitcher className="hidden sm:block shrink-0" />

          <div className="relative hidden md:block ml-1 lg:ml-2 flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searchQuery.trim()) setCommandOpen(true);
                }}
                placeholder="Search party, company, product, invoice…"
                className="w-full rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white dark:focus:bg-slate-700 transition-all"
              />
            </div>
            <AnimatePresence>
              {searchOpen && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border overflow-hidden z-50 max-h-80 flex flex-col"
                >
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-5 text-center space-y-2">
                      <p className="text-sm text-muted">No results found</p>
                      <button
                        type="button"
                        onClick={() => { setSearchOpen(false); setCommandOpen(true); }}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Open command palette
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-y-auto overscroll-contain scrollbar-thin max-h-80">
                      {searchResults.map((r) => (
                        <button
                          key={`${r.type}-${r.id}`}
                          type="button"
                          onClick={() => {
                            navigate(r.to);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left"
                        >
                          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', toneClass[r.tone])}>
                            {r.type}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.label}</p>
                            <p className="text-xs text-muted truncate">{r.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <CompanySwitcher className="sm:hidden" />
          <div className="relative hidden lg:block" ref={createRef} data-tour="create-menu">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen(false);
                setSearchOpen(false);
                setMobileCreateOpen(false);
                setCreateOpen((v) => !v);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                createOpen
                  ? 'bg-primary text-white'
                  : 'bg-primary text-white hover:opacity-90'
              )}
              aria-expanded={createOpen}
            >
              <FaPlus size={11} />
              Create
              <FaChevronDown size={9} className={cn('transition-transform', createOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {createOpen && <CreateMenu open={createOpen} onAction={runAction} isGstEnabled={isGstEnabled} />}
            </AnimatePresence>
          </div>

          <div className="relative lg:hidden" ref={mobileCreateRef} data-tour="create-menu">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen(false);
                setCreateOpen(false);
                setMobileCreateOpen((v) => !v);
              }}
              className="p-2.5 rounded-xl bg-primary text-white hover:opacity-90"
              title="Create"
            >
              <FaPlus size={14} />
            </button>
            <AnimatePresence>
              {mobileCreateOpen && <CreateMenu open={mobileCreateOpen} onAction={runAction} isGstEnabled={isGstEnabled} />}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="md:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            title="Search"
          >
            <FaSearch size={15} />
          </button>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            data-tour="command-palette"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border dark:border-slate-600 text-xs text-muted hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Command palette (Ctrl+K)"
          >
            <FaSearch size={11} />
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold">Ctrl K</kbd>
          </button>

          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            title="Toggle theme"
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
          </button>

          <button
            type="button"
            onClick={() => startTour(true)}
            className="hidden sm:flex p-2.5 rounded-xl hover:bg-primary/10 text-primary"
            title="Website tour"
          >
            <FaQuestionCircle size={16} />
          </button>

          <Link
            to="/notifications"
            className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <FaBell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 sm:pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Avatar name={shopName} src={profile?.logo || undefined} size="sm" rounded="xl" />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[120px]">
                  {shopName}
                </p>
                <p className="text-[10px] text-muted truncate">{ownerName}</p>
              </div>
              <FaChevronDown size={10} className="text-slate-400 hidden md:block" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-60 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border overflow-hidden py-1 z-50"
                >
                  <div className="px-4 py-3 border-b border-border dark:border-slate-700 flex items-center gap-3">
                    <Avatar name={shopName} src={profile?.logo || undefined} size="md" rounded="xl" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{shopName}</p>
                      <p className="text-xs text-muted truncate">{ownerName}</p>
                    </div>
                  </div>
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <FaUser size={13} /> Profile
                  </Link>
                  <Link to="/settings/business" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <FaCog size={13} /> Settings
                  </Link>
                  <Link to="/users" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <FaUsers size={13} /> Users & Roles
                  </Link>
                  <button type="button" onClick={() => { setProfileOpen(false); startTour(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <FaQuestionCircle size={13} /> Website Tour
                  </button>
                  <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20">
                    <FaSignOutAlt size={13} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
