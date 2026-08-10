import { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt,
  FaUsers,
  FaBook,
  FaChartBar,
  FaBell,
  FaUser,
  FaCog,
  FaTimes,
  FaBookOpen,
  FaFileInvoiceDollar,
  FaBoxes,
  FaShoppingCart,
  FaMoneyBillWave,
  FaReceipt,
  FaPercentage,
  FaUserShield,
  FaChevronDown,
} from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/formatters';
import { menuConfig, accountLinks } from '../../navigation/menuConfig';

const ICONS = {
  FaTachometerAlt,
  FaUsers,
  FaBook,
  FaChartBar,
  FaBell,
  FaUser,
  FaCog,
  FaFileInvoiceDollar,
  FaBoxes,
  FaShoppingCart,
  FaMoneyBillWave,
  FaReceipt,
  FaPercentage,
  FaUserShield,
};

function sectionIsActive(item, pathname) {
  if (item.to) return pathname === item.to || pathname.startsWith(`${item.to}/`);
  return (item.children || []).some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
}

function childIsActive(childTo, pathname) {
  const prefixOnly = ['/gst', '/expenses', '/users', '/reports'].includes(childTo);
  if (prefixOnly) return pathname === childTo;
  return pathname === childTo || pathname.startsWith(`${childTo}/`);
}

function getInitialOpenSections(pathname) {
  const active = menuConfig.find(
    (item) => item.children && sectionIsActive(item, pathname)
  );
  return active ? { [active.id]: true } : {};
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, unreadCount, profile } = useApp();
  const location = useLocation();
  const [openSections, setOpenSections] = useState(() => getInitialOpenSections(location.pathname));

  const desktopNavRef = useRef(null);
  const mobileNavRef = useRef(null);
  const scrollPosRef = useRef(0);

  const shopLabel = profile?.shopName || profile?.businessName || 'Your Shop';
  const locationLabel = profile?.address
    ? profile.address.split(',').slice(-2).join(',').trim() || profile.address
    : 'Update profile details';

  // Accordion: only the active module section stays open
  useEffect(() => {
    const activeId = menuConfig.find(
      (item) => item.children && sectionIsActive(item, location.pathname)
    )?.id;

    setOpenSections((prev) => {
      // Dashboard / Notifications / Profile: no module section → close all
      if (!activeId) {
        const anyOpen = Object.values(prev).some(Boolean);
        return anyOpen ? {} : prev;
      }
      const keys = Object.keys(prev).filter((k) => prev[k]);
      if (keys.length === 1 && keys[0] === activeId) return prev;
      return { [activeId]: true };
    });
  }, [location.pathname]);

  // Product tour can force-open a section while highlighting it
  useEffect(() => {
    const onTourExpand = (e) => {
      const id = e.detail?.sectionId;
      if (!id) return;
      setOpenSections({ [id]: true });
    };
    window.addEventListener('dlms-tour-expand', onTourExpand);
    return () => window.removeEventListener('dlms-tour-expand', onTourExpand);
  }, []);

  const restoreScrollToActive = useCallback(() => {
    const containers = [desktopNavRef.current, mobileNavRef.current].filter(Boolean);
    containers.forEach((nav) => {
      const activeEl = nav.querySelector('[data-nav-active="true"]');
      if (!activeEl) {
        // Fallback: restore previous scroll if no active marker yet
        if (scrollPosRef.current > 0) {
          nav.scrollTop = scrollPosRef.current;
        }
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const padding = 48;
      const above = elRect.top < navRect.top + padding;
      const below = elRect.bottom > navRect.bottom - padding;
      if (above || below) {
        activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
      // Persist after layout settles
      requestAnimationFrame(() => {
        scrollPosRef.current = nav.scrollTop;
      });
    });
  }, []);

  useEffect(() => {
    // Wait for section expand animation / paint, then pin to active item
    const t1 = requestAnimationFrame(() => {
      restoreScrollToActive();
    });
    const t2 = setTimeout(restoreScrollToActive, 220);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, openSections, sidebarCollapsed, sidebarOpen, restoreScrollToActive]);

  const onNavScroll = (e) => {
    scrollPosRef.current = e.currentTarget.scrollTop;
  };

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      // Clicking open section closes it; opening another closes the rest
      if (prev[id]) return {};
      return { [id]: true };
    });
  };

  const linkClass = (active, collapsed) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
      active
        ? 'bg-primary text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50',
      collapsed && 'justify-center px-2'
    );

  const childLinkClass = (active) =>
    cn(
      'flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
      active
        ? 'text-primary bg-primary/10 dark:bg-primary/20'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
    );

  const renderNav = (collapsed, navRef) => (
    <>
      {menuConfig.map((item) => {
        const Icon = ICONS[item.icon] || FaCog;
        const active = sectionIsActive(item, location.pathname);

        if (!item.children) {
          return (
            <NavLink
              key={item.id}
              to={item.to}
              data-tour={`nav-${item.id}`}
              data-nav-active={active ? 'true' : undefined}
              onClick={() => {
                setOpenSections({});
                setSidebarOpen(false);
              }}
              className={linkClass(active, collapsed)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </NavLink>
          );
        }

        const expanded = !!openSections[item.id];

        if (collapsed) {
          return (
            <NavLink
              key={item.id}
              to={item.children[0].to}
              data-tour={`nav-${item.id}`}
              data-nav-active={active ? 'true' : undefined}
              onClick={() => setSidebarOpen(false)}
              className={linkClass(active, true)}
              title={item.label}
            >
              <Icon size={16} className="shrink-0" />
            </NavLink>
          );
        }

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggleSection(item.id)}
              data-tour={`nav-${item.id}`}
              data-nav-active={active && !item.children.some((c) => childIsActive(c.to, location.pathname)) ? 'true' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'text-primary bg-primary/5 dark:bg-primary/10'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <FaChevronDown
                size={11}
                className={cn('text-slate-400 transition-transform', expanded && 'rotate-180')}
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                  onAnimationComplete={restoreScrollToActive}
                >
                  <div className="py-1 space-y-0.5">
                    {item.children.map((child) => {
                      const exactish = childIsActive(child.to, location.pathname);
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          data-nav-active={exactish ? 'true' : undefined}
                          onClick={() => setSidebarOpen(false)}
                          className={childLinkClass(exactish)}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {!collapsed && (
        <p className="px-3 pt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Account
        </p>
      )}
      {collapsed && <div className="mx-2 my-2 border-t border-border/60 dark:border-slate-700" />}

      {accountLinks.map((item) => {
        const Icon = ICONS[item.icon] || FaUser;
        const active = location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            data-nav-active={active ? 'true' : undefined}
            onClick={() => {
              setOpenSections({});
              setSidebarOpen(false);
            }}
            className={linkClass(active, collapsed)}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.to === '/notifications' && unreadCount > 0 && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  active ? 'bg-white/20 text-white' : 'bg-danger text-white'
                )}
              >
                {unreadCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </>
  );

  const shell = (collapsed, navRef) => (
    <div className="flex flex-col h-full min-h-0" data-tour="sidebar">
      <div className={cn('shrink-0 flex items-center gap-3 px-4 py-5 border-b border-border/60 dark:border-slate-700', collapsed && 'justify-center px-2')}>
        {profile?.logo ? (
          <img
            key={profile.logo}
            src={profile.logo}
            alt={shopLabel}
            className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-white"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <FaBookOpen className="text-white" size={16} />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">{shopLabel}</h1>
            <p className="text-[10px] text-muted truncate">Daily Ledger</p>
          </div>
        )}
      </div>

      <nav
        ref={navRef}
        onScroll={onNavScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin py-3 px-3 space-y-1"
      >
        {renderNav(collapsed, navRef)}
      </nav>

      {!collapsed && (
        <div className="shrink-0 px-4 py-4 border-t border-border/60 dark:border-slate-700">
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
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen min-h-0 bg-surface dark:bg-surface border-r border-border dark:border-border z-30 transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {shell(sidebarCollapsed, desktopNavRef)}
      </aside>

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
              className="fixed left-0 top-0 h-screen w-64 min-h-0 bg-surface dark:bg-surface z-50 lg:hidden shadow-xl flex flex-col"
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 z-10"
              >
                <FaTimes size={14} />
              </button>
              {shell(false, mobileNavRef)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
