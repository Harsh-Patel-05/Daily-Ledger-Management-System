import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBookOpen } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/Loader';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-slate-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <FaBookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Daily Ledger</h1>
              <p className="text-xs text-white/60">Management System</p>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Manage your shop<br />ledger with ease
            </h2>
            <p className="text-white/70 text-base max-w-md leading-relaxed">
              Track credits, collections, and customers — the modern way to maintain your Roj Mel.
              Built for Indian shopkeepers.
            </p>
            <div className="flex gap-8 mt-10">
              {[
                { value: '10K+', label: 'Shops' },
                { value: '₹50Cr+', label: 'Tracked' },
                { value: '99.9%', label: 'Uptime' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">© 2026 Daily Ledger Management System</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <FaBookOpen className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-white">Daily Ledger</h1>
              <p className="text-[10px] text-muted">Management System</p>
            </div>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
