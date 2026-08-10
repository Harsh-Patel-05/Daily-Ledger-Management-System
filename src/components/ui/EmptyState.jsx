import { motion } from 'framer-motion';
import { FaInbox, FaUsers, FaExchangeAlt, FaBell, FaFileAlt, FaBoxes } from 'react-icons/fa';
import Button from './Button';

const icons = {
  default: FaInbox,
  customers: FaUsers,
  transactions: FaExchangeAlt,
  notifications: FaBell,
  reports: FaFileAlt,
  inventory: FaBoxes,
};

export default function EmptyState({
  type = 'default',
  title = 'No data found',
  description = 'There is nothing to display here yet.',
  actionLabel,
  onAction,
}) {
  const Icon = icons[type] || icons.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-5">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </motion.div>
  );
}
