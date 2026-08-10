import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { cn } from '../../utils/formatters';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  className = '',
}) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'relative w-full bg-surface dark:bg-surface soft-shadow border border-border dark:border-border',
              'rounded-t-2xl sm:rounded-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col',
              'pb-[env(safe-area-inset-bottom)]',
              sizes[size],
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border dark:border-slate-700 shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 pr-2 truncate">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            )}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto scrollbar-thin min-h-0 flex-1">
              {children}
            </div>
            {footer && (
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border dark:border-slate-700 flex flex-wrap justify-end gap-2 sm:gap-3 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
