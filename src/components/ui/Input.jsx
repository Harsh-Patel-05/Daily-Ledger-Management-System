import { forwardRef } from 'react';
import { cn } from '../../utils/formatters';

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = '', containerClassName = '', ...props },
  ref
) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {props.required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-slate-800',
            'placeholder:text-slate-400 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500',
            'disabled:bg-slate-50 disabled:cursor-not-allowed dark:disabled:bg-slate-900',
            Icon && 'pl-10',
            error && 'border-danger focus:ring-danger/30 focus:border-danger',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
});

export default Input;
