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
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModal } from '../../context/ModalContext';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/formatters';

export default function Navbar() {
  const { setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, unreadCount, customers, transactions, setCommandOpen } = useApp();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { openModal } = useModal();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-border dark:border-slate-700 no-print">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-3">
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
          <div className="relative hidden sm:block" ref={searchRef}>
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
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl soft-shadow border border-border dark:border-slate-700 overflow-hidden"
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
          <div className="hidden lg:flex items-center gap-1 mr-1">
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
          </div>
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border dark:border-slate-600 text-xs text-muted hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Command palette (Ctrl+K)"
          >
            <FaSearch size={11} />
            <span>Command</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold">⌘K</kbd>
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            title="Toggle dark mode"
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
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
              <Avatar name={user?.name || 'User'} size="sm" />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-muted">{user?.role}</p>
              </div>
              <FaChevronDown size={10} className="text-slate-400 hidden md:block" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl soft-shadow border border-border dark:border-slate-700 overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-border dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-muted truncate">{user?.email}</p>
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
