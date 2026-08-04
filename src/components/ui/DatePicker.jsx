import { cn } from '../../utils/formatters';

export default function DatePicker({
  label,
  value,
  onChange,
  className = '',
  error,
  required,
  ...props
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-slate-800',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100',
          'transition-all duration-200',
          error && 'border-danger'
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
