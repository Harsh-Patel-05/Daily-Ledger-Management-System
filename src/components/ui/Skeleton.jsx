import { cn } from '../../utils/formatters';

export default function Skeleton({ className = '', variant = 'rect' }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200 dark:bg-slate-700',
        variant === 'circle' ? 'rounded-full' : 'rounded-xl',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-[12px] p-5 card-shadow border border-border/60 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12" variant="circle" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
