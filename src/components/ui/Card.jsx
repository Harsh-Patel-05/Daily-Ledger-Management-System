import { cn } from '../../utils/formatters';

export default function Card({ children, className = '', padding = true, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-[12px] card-shadow border border-border/60 dark:border-slate-700',
        padding && 'p-5',
        hover && 'transition-shadow hover:soft-shadow cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        {title && <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
