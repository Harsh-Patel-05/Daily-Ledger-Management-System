import { cn } from '../../utils/formatters';

export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'primary',
  showLabel = true,
  className = '',
  size = 'md',
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const over = value > max && max > 0;

  const colors = {
    primary: over ? 'bg-danger' : 'bg-primary',
    green: over ? 'bg-danger' : 'bg-secondary',
    amber: over ? 'bg-danger' : 'bg-amber-500',
  };

  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-muted mb-1">
          <span>{pct}% used</span>
          {over && <span className="text-danger font-semibold">Over limit</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
