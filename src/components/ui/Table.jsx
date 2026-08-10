import { cn } from '../../utils/formatters';

function cellValue(col, row) {
  return col.render ? col.render(row[col.key], row) : row[col.key];
}

function visibleColumns(columns) {
  return columns.filter((col) => !col.hideOnMobile);
}

function pickPrimaryColumn(columns) {
  const visible = visibleColumns(columns);
  return visible.find((c) => c.mobilePrimary) || visible[0] || columns[0];
}

function isActionsColumn(col) {
  return col.key === 'actions' || col.isActions;
}

export default function Table({ columns, data, onRowClick, emptyMessage = 'No data found', className = '' }) {
  if (!data?.length) {
    return (
      <div className="text-center py-12 text-muted text-sm">{emptyMessage}</div>
    );
  }

  const primaryCol = pickPrimaryColumn(columns);
  const mobileCols = visibleColumns(columns).filter((c) => c !== primaryCol && !isActionsColumn(c));
  const actionsCol = columns.find(isActionsColumn);

  return (
    <div className={cn('min-w-0', className)}>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          <div
            key={row.id || idx}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            className={cn(
              'rounded-xl border border-border/70 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3.5',
              onRowClick && 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {cellValue(primaryCol, row)}
              </div>
              {actionsCol && (
                <div
                  className="shrink-0 flex flex-wrap justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cellValue(actionsCol, row)}
                </div>
              )}
            </div>
            {mobileCols.length > 0 && (
              <dl className="mt-3 space-y-1.5">
                {mobileCols.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="text-muted shrink-0">{col.mobileLabel || col.label}</dt>
                    <dd
                      className={cn(
                        'text-right text-slate-700 dark:text-slate-300 min-w-0',
                        col.wrap ? 'whitespace-normal break-words' : 'truncate'
                      )}
                    >
                      {cellValue(col, row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin -mx-1">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-border dark:border-slate-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider',
                    !col.wrap && 'whitespace-nowrap',
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
                      'px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300',
                      col.wrap ? 'whitespace-normal break-words' : 'whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className
                    )}
                  >
                    {cellValue(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
