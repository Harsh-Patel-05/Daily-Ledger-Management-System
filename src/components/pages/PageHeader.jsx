import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Breadcrumbs from '../ui/Breadcrumbs';

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  backTo,
  actions,
}) {
  return (
    <div className="space-y-4">
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {backTo && (
            <Link
              to={backTo}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 shrink-0"
            >
              <FaArrowLeft size={14} />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
