import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { STOCK_MOVEMENT_TYPES } from '../../data/inventoryDefaults';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatDate, formatNumber } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import {
  Breadcrumbs, Card, CardHeader, SearchBox, Filter, Table, Pagination,
  Button, Input, Modal, EmptyState,
} from '../../components/ui';

const initialForm = {
  productId: '',
  type: 'in',
  quantity: '',
  newQty: '',
  reason: '',
  reference: '',
  date: new Date().toISOString().split('T')[0],
};

export default function StockMovements() {
  const {
    products, movements, getProduct, recordStockMovement, stats,
  } = useInventory();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselect = searchParams.get('product') || '';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(!!preselect);
  const [form, setForm] = useState({ ...initialForm, productId: preselect });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (preselect) {
      setForm((f) => ({ ...f, productId: preselect }));
      setOpen(true);
    }
  }, [preselect]);

  const enriched = useMemo(() => {
    return movements.map((m) => {
      const product = getProduct(m.productId);
      return {
        ...m,
        productName: product?.name || 'Deleted product',
        sku: product?.sku || '',
      };
    });
  }, [movements, getProduct]);

  const filtered = useMemo(() => {
    let list = filterBySearch(enriched, debouncedSearch, ['productName', 'sku', 'reason', 'reference']);
    if (typeFilter) list = list.filter((m) => m.type === typeFilter);
    if (preselect) list = list.filter((m) => String(m.productId) === String(preselect));
    return list;
  }, [enriched, debouncedSearch, typeFilter, preselect]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 10);

  useEffect(() => { resetPage(); }, [debouncedSearch, typeFilter, preselect]);

  const selectedProduct = form.productId ? getProduct(form.productId) : null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openModal = () => {
    setForm({ ...initialForm, productId: preselect || '' });
    setErrors({});
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setErrors({});
    if (preselect) {
      searchParams.delete('product');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.productId) errs.productId = 'Select a product';
    if (form.type === 'adjust') {
      if (form.newQty === '' || Number(form.newQty) < 0) errs.newQty = 'Enter a valid quantity';
    } else if (!form.quantity || Number(form.quantity) <= 0) {
      errs.quantity = 'Enter a valid quantity';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await recordStockMovement({
        productId: form.productId,
        type: form.type,
        quantity: Number(form.quantity),
        newQty: Number(form.newQty),
        reason: form.reason,
        reference: form.reference,
        date: form.date,
      });
      toast.success('Stock updated');
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (v) => formatDate(v),
    },
    {
      key: 'productName',
      label: 'Product',
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.productName}</p>
          <p className="text-xs text-muted">{row.sku || '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (v) => {
        const meta = STOCK_MOVEMENT_TYPES[v] || STOCK_MOVEMENT_TYPES.adjust;
        return (
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'quantity',
      label: 'Qty',
      render: (v) => formatNumber(v),
    },
    {
      key: 'newQty',
      label: 'Balance',
      render: (_, row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.previousQty} → <span className="font-semibold text-slate-800 dark:text-slate-100">{row.newQty}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason / Ref',
      render: (_, row) => row.reason || row.reference || '—',
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Inventory', to: '/inventory/products' },
        { label: 'Stock Movements' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/inventory/products" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Stock Movements</h1>
            <p className="text-sm text-muted mt-0.5">
              {movements.length} records · {stats.lowStock} low · {stats.outOfStock} out
            </p>
          </div>
        </div>
        <Button onClick={openModal}><FaPlus size={12} /> Record Movement</Button>
      </div>

      {(stats.lowStockItems.length > 0 || stats.outOfStockItems.length > 0) && (
        <Card>
          <CardHeader title="Stock Alerts" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.outOfStockItems.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/inventory/${p.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-red-600">Out of stock</p>
                </div>
                <span className="text-sm font-bold text-red-600">0</span>
              </Link>
            ))}
            {stats.lowStockItems.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/inventory/${p.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Below reorder ({p.reorderLevel})</p>
                </div>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{p.stockQty}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search product, reason, reference..."
            className="flex-1"
          />
          <Filter
            value={typeFilter}
            onChange={setTypeFilter}
            label="All Types"
            options={Object.entries(STOCK_MOVEMENT_TYPES).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          {preselect && (
            <Button
              variant="outline"
              onClick={() => {
                searchParams.delete('product');
                setSearchParams(searchParams, { replace: true });
              }}
            >
              Clear product filter
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="inventory"
            title="No stock movements"
            description="Record stock in, out, returns, or adjustments."
            actionLabel="Record Movement"
            onAction={openModal}
          />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title="Record Stock Movement" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Product</label>
            <select
              value={form.productId}
              onChange={set('productId')}
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatNumber(p.stockQty)})
                </option>
              ))}
            </select>
            {errors.productId && <p className="text-xs text-danger mt-1">{errors.productId}</p>}
            {selectedProduct && (
              <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
                <FaExchangeAlt size={10} /> Current stock: {formatNumber(selectedProduct.stockQty)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(STOCK_MOVEMENT_TYPES).map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: value }))}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    form.type === value
                      ? `${meta.bg} ${meta.color} border-current`
                      : 'border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'adjust' ? (
            <Input
              label="New Stock Quantity"
              type="number"
              value={form.newQty}
              onChange={set('newQty')}
              placeholder="Set absolute qty"
              error={errors.newQty}
              required
            />
          ) : (
            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={set('quantity')}
              placeholder="0"
              error={errors.quantity}
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={set('date')} />
            <Input label="Reference" value={form.reference} onChange={set('reference')} placeholder="PO / Invoice #" />
          </div>
          <Input label="Reason" value={form.reason} onChange={set('reason')} placeholder="Optional note" />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Save Movement</Button>
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
