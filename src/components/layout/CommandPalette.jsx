import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaSearch, FaTachometerAlt, FaUsers, FaExchangeAlt, FaFileInvoiceDollar,
  FaBook, FaChartBar, FaChartPie, FaBell, FaCog, FaUser, FaPlus, FaUpload,
  FaMoon, FaSun, FaKeyboard,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useModal } from '../../context/ModalContext';
import { cn } from '../../utils/formatters';

const navCommands = [
  { id: 'dash', label: 'Go to Dashboard', icon: FaTachometerAlt, to: '/dashboard', group: 'Navigate' },
  { id: 'cust', label: 'Customers', icon: FaUsers, to: '/customers', group: 'Navigate' },
  { id: 'txn', label: 'Transactions', icon: FaExchangeAlt, to: '/transactions', group: 'Navigate' },
  { id: 'inv', label: 'Invoices', icon: FaFileInvoiceDollar, to: '/invoices', group: 'Navigate' },
  { id: 'led', label: 'Ledger', icon: FaBook, to: '/ledger', group: 'Navigate' },
  { id: 'rep', label: 'Reports', icon: FaChartBar, to: '/reports', group: 'Navigate' },
  { id: 'ana', label: 'Analytics', icon: FaChartPie, to: '/analytics', group: 'Navigate' },
  { id: 'not', label: 'Notifications', icon: FaBell, to: '/notifications', group: 'Navigate' },
  { id: 'pro', label: 'Profile', icon: FaUser, to: '/profile', group: 'Navigate' },
  { id: 'set', label: 'Settings', icon: FaCog, to: '/settings', group: 'Navigate' },
];

export default function CommandPalette() {
  const { commandOpen, setCommandOpen, customers, invoices } = useApp();
  const { darkMode, toggleDarkMode } = useTheme();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandOpen]);

  const commands = useMemo(() => {
    const dynamic = [
      ...navCommands,
      {
        id: 'q-cust',
        label: 'Quick Add Customer',
        icon: FaPlus,
        group: 'Actions',
        action: () => openModal('quickCustomer'),
      },
      {
        id: 'q-txn',
        label: 'Quick Transaction',
        icon: FaPlus,
        group: 'Actions',
        action: () => openModal('quickTransaction'),
      },
      {
        id: 'q-inv-fmt',
        label: 'Choose Invoice Format',
        icon: FaFileInvoiceDollar,
        group: 'Actions',
        action: () => openModal('invoiceFormat'),
      },
      {
        id: 'q-inv',
        label: 'Quick Create Invoice',
        icon: FaFileInvoiceDollar,
        group: 'Actions',
        action: () => openModal('quickInvoice'),
      },
      {
        id: 'up-inv',
        label: 'Upload Invoice (OCR)',
        icon: FaUpload,
        to: '/invoices/upload',
        group: 'Actions',
      },
      {
        id: 'theme',
        label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: darkMode ? FaSun : FaMoon,
        group: 'Actions',
        action: () => toggleDarkMode(),
      },
      ...customers.slice(0, 8).map((c) => ({
        id: `c-${c.id}`,
        label: c.name,
        sub: c.businessName,
        icon: FaUsers,
        group: 'Customers',
        action: () => openModal('viewCustomer', { customerId: c.id }),
      })),
      ...invoices.slice(0, 5).map((i) => ({
        id: `i-${i.id}`,
        label: i.invoiceNumber,
        sub: i.customerName,
        icon: FaFileInvoiceDollar,
        to: `/invoices/${i.id}`,
        group: 'Invoices',
      })),
    ];

    if (!query.trim()) return dynamic;
    const q = query.toLowerCase();
    return dynamic.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.sub?.toLowerCase().includes(q) ||
        c.group?.toLowerCase().includes(q)
    );
  }, [query, customers, invoices, darkMode, toggleDarkMode, openModal]);

  useEffect(() => setIndex(0), [query]);

  const run = (cmd) => {
    if (!cmd) return;
    setCommandOpen(false);
    if (cmd.action) cmd.action();
    else if (cmd.to) navigate(cmd.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(commands[index]);
    }
  };

  return (
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setCommandOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl soft-shadow border border-border dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-border dark:border-slate-700">
              <FaSearch className="text-slate-400" size={14} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages, customers, invoices, actions…"
                className="flex-1 py-4 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted font-medium">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin py-2">
              {commands.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No results</p>
              ) : (
                commands.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === index ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    )}
                  >
                    <cmd.icon size={14} className="shrink-0 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cmd.label}</p>
                      {cmd.sub && <p className="text-[11px] text-muted truncate">{cmd.sub}</p>}
                    </div>
                    <span className="text-[10px] text-muted uppercase tracking-wide">{cmd.group}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-border dark:border-slate-700 flex items-center gap-2 text-[10px] text-muted">
              <FaKeyboard size={10} />
              <span>↑↓ navigate · Enter open · Ctrl+K toggle</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
