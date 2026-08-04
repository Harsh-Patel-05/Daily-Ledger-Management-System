import { Link } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
      <Link
        to="/dashboard"
        className="text-muted hover:text-primary transition-colors flex items-center gap-1"
      >
        <FaHome size={12} />
      </Link>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <FaChevronRight size={10} className="text-slate-300" />
          {item.to && idx < items.length - 1 ? (
            <Link to={item.to} className="text-muted hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-700 dark:text-slate-200 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
