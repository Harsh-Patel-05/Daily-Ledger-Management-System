export const generateId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const paginate = (items, page = 1, perPage = 10) => {
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    total: items.length,
    page,
    perPage,
    totalPages: Math.ceil(items.length / perPage) || 1,
  };
};

export const sortBy = (items, key, direction = 'asc') => {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (typeof aVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
};

export const filterBySearch = (items, query, keys = []) => {
  if (!query?.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter((item) =>
    keys.some((key) => String(item[key] || '').toLowerCase().includes(q))
  );
};

export const getStatusColor = (status) => {
  const map = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    discontinued: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    credit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };
  return map[status?.toLowerCase()] || map.inactive;
};

export const TRANSACTION_TYPES = {
  credit: { label: 'Credit (Mall Diya)', color: 'text-blue-600', bg: 'bg-blue-50' },
  payment: { label: 'Payment Received', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  return: { label: 'Return', color: 'text-amber-600', bg: 'bg-amber-50' },
  discount: { label: 'Discount', color: 'text-purple-600', bg: 'bg-purple-50' },
  expense: { label: 'Expense', color: 'text-red-600', bg: 'bg-red-50' },
};

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank', 'Cheque'];
