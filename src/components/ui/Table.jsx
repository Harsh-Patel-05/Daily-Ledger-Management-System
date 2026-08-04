import { cn } from '../../utils/formatters';

export default function Table({ columns, data, onRowClick, emptyMessage = 'No data found', className = '' }) {
  if (!data?.length) {
    return (
      <div className="text-center py-12 text-muted text-sm">{emptyMessage}</div>
    );
  }

  return (
    <div className={cn('overflow-x-auto scrollbar-thin -mx-1', className)}>
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-border dark:border-slate-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
