import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import CommandPalette from '../components/layout/CommandPalette';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/formatters';
import { PageLoader } from '../components/ui';

export default function AppLayout() {
  const { sidebarCollapsed, dataLoading, dataReady, dataError, refreshAll } = useApp();

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        <Navbar />
        <main className="p-4 lg:p-6 max-w-[1400px]">
          {dataLoading && !dataReady ? (
            <PageLoader />
          ) : dataError && !dataReady ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-red-600 font-medium">{dataError}</p>
              <p className="text-sm text-muted">Is the Django API running on port 8001?</p>
              <button
                type="button"
                onClick={() => refreshAll()}
                className="text-sm text-primary font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
