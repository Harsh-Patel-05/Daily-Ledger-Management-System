import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaPlus, FaEye, FaEdit, FaTrash, FaBoxes, FaExclamationTriangle,
  FaTimesCircle, FaRupeeSign, FaTags, FaTruck, FaExchangeAlt, FaSortAmountDown,
} from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { filterBySearch, sortBy, getStatusColor } from '../../utils/helpers';
import {
  Breadcrumbs, Card, SearchBox, Filter, Table, Pagination,
  Button, ConfirmationDialog, FloatingAddButton, EmptyState, ExportButton, StatCard,
} from '../../components/ui';
import { exportToCsv } from '../../utils/exportCsv';

function stockBadge(product) {
  const qty = Number(product.stockQty) || 0;
  const reorder = Number(product.reorderLevel) || 0;
  if (qty <= 0) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Out of stock</span>;
  }
  if (qty <= reorder) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Low stock</span>;
  }
  return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">In stock</span>;
}

export default function ProductList() {
  const {
    products, categories, stats, getCategory, deleteProduct,
    error, refreshAll,
  } = useInventory();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    let list = filterBySearch(products, debouncedSearch, ['name', 'sku', 'barcode', 'hsn', 'location']);
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (categoryFilter) list = list.filter((p) => String(p.categoryId) === String(categoryFilter));
    if (stockFilter === 'low') {
      list = list.filter((p) => Number(p.stockQty) > 0 && Number(p.stockQty) <= Number(p.reorderLevel));
    } else if (stockFilter === 'out') {
      list = list.filter((p) => Number(p.stockQty) <= 0);
    } else if (stockFilter === 'ok') {
      list = list.filter((p) => Number(p.stockQty) > Number(p.reorderLevel));
    }
    return sortBy(list, sortKey, sortDir);
  }, [products, debouncedSearch, statusFilter, categoryFilter, stockFilter, sortKey, sortDir]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);

  useEffect(() => { resetPage(); }, [debouncedSearch, statusFilter, categoryFilter, stockFilter]);

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteId);
      setDeleteId(null);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
          <p className="text-xs text-muted">{row.sku || 'No SKU'} · {getCategory(row.categoryId)?.name || 'Uncategorized'}</p>
        </div>
      ),
    },
    {
      key: 'stockQty',
      label: 'Stock',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {formatNumber(row.stockQty)}
          </p>
          <div className="mt-1">{stockBadge(row)}</div>
        </div>
      ),
    },
    {
      key: 'purchaseDate',
      label: 'Purchase Date',
      render: (v) => (v ? formatDate(v) : '—'),
    },
    {
      key: 'purchasePrice',
      label: 'Buy / Sell',
      render: (_, row) => (
        <div className="text-sm space-y-1">
          <div>
            <p className="text-[10px] uppercase text-muted">Without GST</p>
            <p className="text-muted">{formatCurrency(row.purchasePriceWithoutGst ?? row.purchasePrice)} / {formatCurrency(row.sellingPriceWithoutGst ?? row.sellingPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">With GST ({row.taxRate ?? 18}%)</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {formatCurrency(row.purchasePriceWithGst ?? row.purchasePrice)} / {formatCurrency(row.sellingPriceWithGst ?? row.sellingPrice)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (v) => v || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(v)}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate(`/inventory/${row.id}`)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30" title="View">
            <FaEye size={13} />
          </button>
          <button onClick={() => navigate(`/inventory/${row.id}/edit`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700" title="Edit">
            <FaEdit size={13} />
          </button>
          <button onClick={() => navigate(`/inventory/stock?product=${row.id}`)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-900/30" title="Stock">
            <FaExchangeAlt size={13} />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30" title="Delete">
            <FaTrash size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Inventory' }]} />
      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => refreshAll()} className="font-medium underline">
            Retry API
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory</h1>
          <p className="text-sm text-muted mt-0.5">{products.length} products in catalog</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/inventory/categories">
            <Button variant="outline"><FaTags size={12} /> Categories</Button>
          </Link>
          <Link to="/inventory/stock">
            <Button variant="outline"><FaExchangeAlt size={12} /> Stock</Button>
          </Link>
          <Link to="/inventory/low-stock">
            <Button variant="outline"><FaExclamationTriangle size={12} /> Low Stock</Button>
          </Link>
          <Link to="/parties/suppliers">
            <Button variant="outline"><FaTruck size={12} /> Suppliers</Button>
          </Link>
          <ExportButton
            onExport={() => {
              exportToCsv(
                filtered.map((p) => ({
                  Name: p.name,
                  SKU: p.sku,
                  Category: getCategory(p.categoryId)?.name || '',
                  Stock: p.stockQty,
                  PurchaseDate: p.purchaseDate || '',
                  PurchaseWithoutGst: p.purchasePriceWithoutGst ?? p.purchasePrice,
                  PurchaseWithGst: p.purchasePriceWithGst,
                  SellingWithoutGst: p.sellingPriceWithoutGst ?? p.sellingPrice,
                  SellingWithGst: p.sellingPriceWithGst,
                  GstRate: p.taxRate,
                  ReorderLevel: p.reorderLevel,
                  Location: p.location || '',
                  Status: p.status,
                })),
                'inventory-products.csv'
              );
              toast.success('Products exported');
            }}
          />
          <Link to="/inventory/add">
            <Button><FaPlus size={12} /> Add Product</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={String(stats.totalProducts)} icon={FaBoxes} color="blue" />
        <StatCard title="Stock Value" value={stats.stockValue} icon={FaRupeeSign} color="green" />
        <StatCard title="Low Stock" value={String(stats.lowStock)} icon={FaExclamationTriangle} color="amber" />
        <StatCard title="Out of Stock" value={String(stats.outOfStock)} icon={FaTimesCircle} color="red" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, SKU, barcode, HSN..."
            className="w-full"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Filter
              value={categoryFilter}
              onChange={setCategoryFilter}
              label="All Categories"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Filter
              value={statusFilter}
              onChange={setStatusFilter}
              label="All Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'discontinued', label: 'Discontinued' },
              ]}
            />
            <Filter
              value={stockFilter}
              onChange={setStockFilter}
              label="All Stock"
              options={[
                { value: 'ok', label: 'In Stock' },
                { value: 'low', label: 'Low Stock' },
                { value: 'out', label: 'Out of Stock' },
              ]}
            />
            <div className="relative inline-flex items-center w-full">
              <FaSortAmountDown className="absolute left-3 text-slate-400" size={12} />
              <select
                value={`${sortKey}-${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split('-');
                  setSortKey(k);
                  setSortDir(d);
                }}
                className="appearance-none w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 pl-8 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="stockQty-asc">Stock Low–High</option>
                <option value="stockQty-desc">Stock High–Low</option>
                <option value="sellingPrice-desc">Price High–Low</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="inventory"
            title="No products found"
            description="Try adjusting filters or add your first product."
            actionLabel="Add Product"
            onAction={() => navigate('/inventory/add')}
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={data}
              onRowClick={(row) => navigate(`/inventory/${row.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <FloatingAddButton to="/inventory/add" label="Add Product" />

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product and its stock history?"
        confirmText="Delete"
      />
    </div>
  );
}
