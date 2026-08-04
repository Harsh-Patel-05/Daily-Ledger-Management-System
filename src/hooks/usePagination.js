import { useState, useMemo } from 'react';

export function usePagination(items = [], perPage = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(items.length / perPage) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  const goToPage = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const resetPage = () => setPage(1);

  return {
    page,
    perPage,
    totalPages,
    total: items.length,
    data: paginated,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    setPage,
  };
}

export default usePagination;
