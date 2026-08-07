import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FaEllipsisH,
  FaQuestionCircle,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModal } from '../../context/ModalContext';
import { useTour } from '../../context/TourContext';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/formatters';

export default function Navbar() {
  const { setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, unreadCount, customers, transactions, setCommandOpen, profile, settings, setSettings, stats } = useApp();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { openModal } = useModal();
  const { startTour } = useTour();
  const navigate = useNavigate();

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const actionsRef = useRef(null);
  const mobileActionsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false);
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(e.target)) setMobileActionsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = searchQuery.trim()
    ? [
        ...customers
          .filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.mobile.includes(searchQuery) ||
            c.businessName.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 4)
          .map((c) => ({ type: 'customer', id: c.id, label: c.name, sub: c.businessName })),
        ...transactions
          .filter((t) =>
            t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.itemDescription.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 3)
          .map((t) => ({ type: 'transaction', id: t.id, label: t.itemDescription, sub: t.customerName })),
      ]
    : [];

  const shopName =
    profile?.shopName ||
    settings?.businessName ||
    user?.shopName ||
    'Your Shop';
  const ownerName = profile?.ownerName || user?.name || 'Owner';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-surface/80 dark:bg-surface/80 backdrop-blur-md border-b border-border dark:border-border no-print">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <FaBars size={18} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <FaExpandAlt size={14} /> : <FaCompressAlt size={14} />}
          </button>

          {/* Global Search */}
          <div className="relative hidden md:block" ref={searchRef}>
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
                placeholder="Search… or Ctrl+K"
                className="w-56 lg:w-72 rounded-xl border border-border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white dark:focus:bg-slate-700 transition-all"
              />
            </div>
            <AnimatePresence>
              {searchOpen && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border dark:border-border overflow-hidden"
                >
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted text-center">No results found</p>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => {
                          navigate(r.type === 'customer' ? `/customers/${r.id}` : '/transactions');
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                      >
                        <span className={cn(
                          'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                          r.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        )}>
                          {r.type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.label}</p>
                          <p className="text-xs text-muted truncate">{r.sub}</p>
                        </div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden lg:flex items-center gap-1 mr-1" data-tour="quick-actions">
            <button
              onClick={() => openModal('recordPayment')}
              className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"
              title="Record payment"
            >
              <FaHandHoldingUsd size={15} />
            </button>
            <button
              onClick={() => openModal('dueCollections')}
              className="relative p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
              title="Collections due"
            >
              <FaClock size={15} />
              {stats?.overdueCustomers > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger" />
              )}
            </button>
            <button
              onClick={() => openModal('quickCustomer')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              title="Quick add customer"
            >
              <FaUserPlus size={15} />
            </button>
            <button
              onClick={() => openModal('quickTransaction')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              title="Quick transaction"
            >
              <FaPlus size={15} />
            </button>
            <button
              onClick={() => openModal('invoiceFormat')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              title="Create invoice"
            >
              <FaFileInvoiceDollar size={15} />
            </button>

            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setActionsOpen((v) => !v)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                title="More quick actions"
              >
                <FaEllipsisH size={15} />
              </button>
              <AnimatePresence>
                {actionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border overflow-hidden py-1 z-50"
                  >
                    {[
                      { label: 'Day Closing (Roj Mel)', icon: FaCalendarCheck, type: 'dayClosing' },
                      { label: 'Quick Expense', icon: FaReceipt, type: 'quickExpense' },
                      { label: 'Record Payment', icon: FaHandHoldingUsd, type: 'recordPayment' },
                      { label: 'Collections Due', icon: FaClock, type: 'dueCollections' },
                      { label: 'Quick Invoice', icon: FaFileInvoiceDollar, type: 'quickInvoice' },
                    ].map((a) => (
                      <button
                        key={a.type}
                        type="button"
                        onClick={() => {
                          setActionsOpen(false);
                          openModal(a.type);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <a.icon size={13} className="text-muted" />
                        {a.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile / tablet quick actions */}
          <div className="relative lg:hidden" ref={mobileActionsRef}>
            <button
              onClick={() => setMobileActionsOpen((v) => !v)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              title="Quick actions"
            >
              <FaPlus size={15} />
            </button>
            <AnimatePresence>
              {mobileActionsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl soft-shadow border border-border overflow-hidden py-1 z-50"
                >
                  {[
                    { label: 'Record Payment', icon: FaHandHoldingUsd, type: 'recordPayment' },
                    { label: 'Collections Due', icon: FaClock, type: 'dueCollections' },
                    { label: 'Day Closing', icon: FaCalendarCheck, type: 'dayClosing' },
                    { label: 'Quick Expense', icon: FaReceipt, type: 'quickExpense' },
                    { label: 'Add Customer', icon: FaUserPlus, type: 'quickCustomer' },
                    { label: 'Transaction', icon: FaPlus, type: 'quickTransaction' },
                    { label: 'Create Invoice', icon: FaFileInvoiceDollar, type: 'invoiceFormat' },
                  ].map((a) => (
                    <button
                      key={a.type}
                      type="button"
                      onClick={() => {
                        setMobileActionsOpen(false);
                        openModal(a.type);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <a.icon size={13} className="text-muted" />
                      {a.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setCommandOpen(true)}
            data-tour="command-palette"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border dark:border-slate-600 text-xs text-muted hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Command palette (Ctrl+K)"
          >
            <FaSearch size={11} />
            <span>Command</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold">⌘K</kbd>
          </button>
          <button
            onClick={handleThemeToggle}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            title="Toggle dark mode"
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
          </button>

          <button
            onClick={() => startTour(true)}
            className="hidden sm:flex p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"
            title="Start website tour"
          >
            <FaQuestionCircle size={16} />
          </button>

          <Link
            to="/notifications"
            className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <FaBell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Avatar name={shopName} src={profile?.logo || undefined} size="sm" rounded="xl" />
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[140px]">
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
                  className="absolute right-0 top-full mt-2 w-60 bg-surface dark:bg-surface rounded-xl soft-shadow border border-border dark:border-border overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-border dark:border-slate-700 flex items-center gap-3">
                    <Avatar name={shopName} src={profile?.logo || undefined} size="md" rounded="xl" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{shopName}</p>
                      <p className="text-xs text-muted truncate">{ownerName}</p>
                      <p className="text-[10px] text-muted truncate">{user?.email || profile?.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <FaUser size={13} /> Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <FaCog size={13} /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      startTour(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <FaQuestionCircle size={13} /> Website Tour
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
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
