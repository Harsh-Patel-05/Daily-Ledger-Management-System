import { cn } from '../../utils/formatters';

const variants = {
  primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm',
  secondary: 'bg-secondary hover:bg-secondary-dark text-white shadow-sm',
  outline: 'border border-border bg-surface hover:bg-slate-50 text-slate-700 dark:bg-surface dark:border-border dark:text-slate-200 dark:hover:bg-slate-700',
  ghost: 'hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-300',
  danger: 'bg-danger hover:bg-red-600 text-white shadow-sm',
  soft: 'bg-primary-soft hover:bg-primary-soft-hover text-primary dark:text-primary-light',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  icon: 'p-2.5',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
