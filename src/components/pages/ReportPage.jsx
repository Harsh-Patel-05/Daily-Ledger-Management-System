import { Link } from 'react-router-dom';
import { FaChartBar } from 'react-icons/fa';
import PageHeader from '../../components/pages/PageHeader';
import { Card, StatCard, EmptyState } from '../../components/ui';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Lightweight report shell — frontend only, optional stats + table/content slot.
 */
export default function ReportPage({
  title,
  subtitle,
  breadcrumbs,
  stats = [],
  children,
  empty,
  actions,
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle || 'Frontend preview · Backend coming later'}
        breadcrumbs={breadcrumbs || [{ label: 'Reports', to: '/reports/sales' }, { label: title }]}
        actions={actions}
      />

      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              title={s.label}
              value={s.currency ? formatCurrency(s.value) : formatNumber(s.value)}
              icon={s.icon || FaChartBar}
              color={s.color || 'blue'}
            />
          ))}
        </div>
      )}

      <Card>
        {empty ? (
          <EmptyState
            title={empty.title || 'No data'}
            description={empty.description || 'Data will appear once you have transactions.'}
            actionLabel={empty.actionLabel}
            onAction={empty.onAction}
          />
        ) : (
          children
        )}
      </Card>
    </div>
  );
}

export function ReportLinks({ links = [] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="rounded-xl border border-border dark:border-slate-700 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <p className="font-semibold text-slate-800 dark:text-white">{l.label}</p>
          <p className="text-xs text-muted mt-1">{l.description}</p>
        </Link>
      ))}
    </div>
  );
}
