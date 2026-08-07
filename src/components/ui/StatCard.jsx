import { cn, formatCurrency } from '../../utils/formatters';

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, className = '' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };

  return (
    <div
      className={cn(
        'bg-surface dark:bg-surface rounded-[12px] p-5 card-shadow border border-border/60 dark:border-border',
        'hover:soft-shadow transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted font-medium truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">
            {typeof value === 'number' ? formatCurrency(value) : value}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1.5 font-medium', trend.up ? 'text-emerald-600' : 'text-red-500')}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl shrink-0', colors[color])}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
