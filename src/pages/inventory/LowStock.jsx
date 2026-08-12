import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaExchangeAlt } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatNumber } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { Card, SearchBox, Table, Pagination, Button, EmptyState, StatCard } from '../../components/ui';

export default function LowStock() {
  const { products, stats, getCategory } = useInventory();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const list = useMemo(() => {
    const low = products.filter((p) => {
      const qty = Number(p.stockQty) || 0;
      return qty > 0 && qty <= 10;
    });
    return filterBySearch(low, debouncedSearch, ['name', 'brand']);
  }, [products, debouncedSearch]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (_, row) => (
        <div>
          <Link to={`/inventory/${row.id}`} className="font-medium text-primary hover:underline">{row.name}</Link>
          <p className="text-xs text-muted">{getCategory(row.categoryId)?.name || '—'}</p>
        </div>
      ),
    },
    {
      key: 'stockQty',
      label: 'Current Stock',
      render: (_, row) => (
        <span className={Number(row.stockQty) <= 0 ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
          {formatNumber(row.stockQty)}
        </span>
      ),
    },
    {
      key: 'purchasedQuantity',
      label: 'Purchased Qty',
      render: (v) => formatNumber(v || 0),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <Link to={`/inventory/stock-adjustment?product=${row.id}`}>
          <Button size="sm" variant="outline"><FaExchangeAlt size={11} /> Adjust</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Low Stock"
        subtitle="Products with stock 10 or below"
        breadcrumbs={[{ label: 'Inventory', to: '/inventory/products' }, { label: 'Low Stock' }]}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title="Low Stock" value={String(stats.lowStockItems?.length || 0)} icon={FaExclamationTriangle} color="amber" />
        <StatCard title="Out of Stock" value={String(stats.outOfStockItems?.length || 0)} color="red" />
      </div>
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search products..." /></div>
        {list.length === 0 ? (
          <EmptyState title="Stock looks healthy" description="No products with stock 10 or below." />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}
