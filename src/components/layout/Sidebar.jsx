import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaExchangeAlt,
  FaBook,
  FaChartBar,
  FaChartPie,
  FaBell,
  FaUser,
  FaCog,
  FaTimes,
  FaBookOpen,
  FaFileInvoiceDollar,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/formatters';

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
  { to: '/customers', label: 'Customers', icon: FaUsers },
  { to: '/transactions', label: 'Transactions', icon: FaExchangeAlt },
  { to: '/invoices', label: 'Invoices', icon: FaFileInvoiceDollar },
  { to: '/ledger', label: 'Ledger', icon: FaBook },
  { to: '/reports', label: 'Reports', icon: FaChartBar },
  { to: '/analytics', label: 'Analytics', icon: FaChartPie },
  { to: '/notifications', label: 'Notifications', icon: FaBell },
  { to: '/profile', label: 'Profile', icon: FaUser },
  { to: '/settings', label: 'Settings', icon: FaCog },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, unreadCount, profile } = useApp();
  const location = useLocation();

  const shopLabel = profile?.shopName || profile?.businessName || 'Your Shop';
  const locationLabel = profile?.address
    ? profile.address.split(',').slice(-2).join(',').trim() || profile.address
    : 'Update profile details';

  const SidebarContent = ({ collapsed = false }) => (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border/60 dark:border-slate-700', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <FaBookOpen className="text-white" size={16} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">Daily Ledger</h1>
            <p className="text-[10px] text-muted truncate">Management System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && item.to === '/notifications' && unreadCount > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-danger text-white'
                )}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-border/60 dark:border-slate-700">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{shopLabel}</p>
            <p className="text-[10px] text-muted mt-0.5 truncate">{locationLabel}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white dark:bg-slate-800 border-r border-border dark:border-slate-700 z-30 transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-800 z-50 lg:hidden shadow-xl"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <FaTimes size={14} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
