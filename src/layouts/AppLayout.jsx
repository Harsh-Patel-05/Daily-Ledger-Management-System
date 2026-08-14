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
  const { sidebarCollapsed, dataLoading, dataReady } = useApp();
  const { ready: invReady, loading: invLoading } = useInventory();
  const { enableAutoStart } = useTour();

  const booting = (dataLoading && !dataReady) || (invLoading && !invReady);
  const showLoader = booting;

  useEffect(() => {
    if (dataReady && invReady) enableAutoStart();
  }, [dataReady, invReady, enableAutoStart]);

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
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
