import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { cn } from '../../utils/formatters';

export default function Pagination({ page, totalPages, onPageChange, total, perPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      {total != null && (
        <p className="text-sm text-muted">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronLeft size={12} />
        </button>
        {start > 1 && (
          <>
            <PageBtn page={1} current={page} onClick={onPageChange} />
            {start > 2 && <span className="px-1 text-muted">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageBtn key={p} page={p} current={page} onClick={onPageChange} />
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-muted">…</span>}
            <PageBtn page={totalPages} current={page} onClick={onPageChange} />
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function PageBtn({ page, current, onClick }) {
  return (
    <button
      onClick={() => onClick(page)}
      className={cn(
        'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors',
        page === current
          ? 'bg-primary text-white'
          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
      )}
    >
      {page}
    </button>
  );
}
