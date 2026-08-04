import { FaFilter } from 'react-icons/fa';
import { cn } from '../../utils/formatters';

export default function Filter({
  options = [],
  value,
  onChange,
  label = 'Filter',
  className = '',
}) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <FaFilter className="absolute left-3 text-slate-400 pointer-events-none" size={12} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-xl border border-border bg-white pl-8 pr-8 py-2.5 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100',
          'cursor-pointer transition-all duration-200'
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1rem',
        }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
}
