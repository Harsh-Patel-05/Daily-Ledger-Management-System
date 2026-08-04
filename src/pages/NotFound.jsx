import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <p className="text-8xl font-bold text-primary/20 dark:text-primary/30">404</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mt-2">Page not found</h1>
        <p className="text-sm text-muted mt-2 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard">
            <Button><FaHome size={12} /> Go to Dashboard</Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <FaArrowLeft size={12} /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
