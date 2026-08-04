import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';

export default function FloatingAddButton({ to, onClick, label = 'Add' }) {
  const className =
    'flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3.5 rounded-2xl soft-shadow font-medium text-sm transition-colors';

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-40 no-print"
    >
      {to ? (
        <Link to={to} className={className}>
          <FaPlus size={14} />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ) : (
        <button onClick={onClick} className={className}>
          <FaPlus size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      )}
    </motion.div>
  );
}
