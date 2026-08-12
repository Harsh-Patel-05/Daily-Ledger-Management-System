import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import CommandPalette from '../components/layout/CommandPalette';
import { useApp } from '../context/AppContext';
import { useInventory } from '../context/InventoryContext';
import { useTour } from '../context/TourContext';
import { cn } from '../utils/formatters';
import { PageLoader } from '../components/ui';

export default function AppLayout() {
  const { sidebarCollapsed, dataLoading, dataReady, dataError, refreshAll } = useApp();
  const {
    ready: invReady,
    loading: invLoading,
    error: invError,
    refreshAll: refreshInventory,
  } = useInventory();
  const { enableAutoStart } = useTour();

  const booting = (dataLoading && !dataReady) || (invLoading && !invReady);
  // Soft-fail: after first attempt, still show app so local modules work without API
  const bootError = false;
  const showApiBanner = (!dataReady && dataError) || (!invReady && invError);
  const showLoader = booting && !dataError && !invError;

  useEffect(() => {
    if ((dataReady && invReady) || dataError || invError) enableAutoStart();
  }, [dataReady, invReady, dataError, invError, enableAutoStart]);

  const handleRetry = () => {
    refreshAll();
    refreshInventory();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'min-w-0 overflow-x-clip transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        <Navbar />
        <main className="mx-auto w-full min-w-0 max-w-[1400px] p-4 lg:p-6">
          {showLoader ? (
            <PageLoader />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {(showApiBanner || dataError || invError) && (
                <div className="mb-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {dataError || invError || 'API unavailable — local modules still work.'}
                    {' '}
                    Run <code className="font-semibold">npm start</code> (Django :8000 + Vite :5173).
                  </span>
                  <button type="button" onClick={handleRetry} className="font-medium underline">
                    Retry
                  </button>
                </div>
              )}
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
