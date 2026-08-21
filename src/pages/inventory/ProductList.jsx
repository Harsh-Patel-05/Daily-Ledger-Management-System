import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaPlus, FaEye, FaEdit, FaTrash, FaBoxes, FaExclamationTriangle,
  FaTimesCircle, FaRupeeSign, FaTags, FaTruck, FaExchangeAlt, FaSortAmountDown,
  FaFileImport, FaFileDownload,
} from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { filterBySearch, sortBy, getStatusColor } from '../../utils/helpers';
import {
  Breadcrumbs, Card, SearchBox, Filter, Table, Pagination,
  Button, ConfirmationDialog, EmptyState, ExportButton, StatCard, Modal,
} from '../../components/ui';
import { exportToCsv, downloadProductImportSample } from '../../utils/exportCsv';
import { importProducts } from '../../api/inventory';
import { booksList } from '../../api/books';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

function stockBadge(product) {
  const qty = Number(product.stockQty) || 0;
  if (qty <= 0) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Out of stock</span>;
  }
  if (qty <= 10) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Low stock</span>;
  }
  return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">In stock</span>;
}

export default function ProductList() {
  const {
    products, categories, brands, stats, getCategory, getBrand, deleteProduct,
    error, refreshAll,
  } = useInventory();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteId, setDeleteId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [itemGroups, setItemGroups] = useState([]);
  const fileInputRef = useRef(null);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    booksList('item-groups')
      .then((d) => setItemGroups(Array.isArray(d) ? d : d?.results || []))
      .catch(() => setItemGroups([]));
  }, []);

  const filtered = useMemo(() => {
    let list = filterBySearch(products, debouncedSearch, ['name', 'brand', 'sku', 'barcode', 'itemGroup']);
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (categoryFilter) list = list.filter((p) => String(p.categoryId) === String(categoryFilter));
    if (brandFilter) list = list.filter((p) => String(p.brandId) === String(brandFilter));
    if (itemGroupFilter) list = list.filter((p) => String(p.itemGroupId) === String(itemGroupFilter));
    if (stockFilter === 'low') {
      list = list.filter((p) => Number(p.stockQty) > 0 && Number(p.stockQty) <= 10);
    } else if (stockFilter === 'out') {
      list = list.filter((p) => Number(p.stockQty) <= 0);
    } else if (stockFilter === 'ok') {
      list = list.filter((p) => Number(p.stockQty) > 10);
    }
    return sortBy(list, sortKey, sortDir);
  }, [products, debouncedSearch, statusFilter, categoryFilter, brandFilter, itemGroupFilter, stockFilter, sortKey, sortDir]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);

  useEffect(() => { resetPage(); }, [debouncedSearch, statusFilter, categoryFilter, brandFilter, itemGroupFilter, stockFilter]);

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteId);
      setDeleteId(null);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setUpdateExisting(true);
    setImportOpen(true);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Choose a CSV or Excel file');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importProducts(importFile, { updateExisting });
      setImportResult(result);
      await refreshAll();
      toast.success(
        `Import done: ${result.created || 0} new, ${result.updated || 0} updated`
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
          <p className="text-xs text-muted">
            {[getBrand(row.brandId)?.name || row.brand, getCategory(row.categoryId)?.name || 'Uncategorized', row.itemGroup]
              .filter(Boolean)
              .join(' · ')}
          </p>
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
      key: 'purchasedQuantity',
      label: 'Purchased Qty',
      render: (v) => formatNumber(v || 0),
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
          <Link to="/inventory/brands">
            <Button variant="outline"><FaTags size={12} /> Brands</Button>
          </Link>
          <Link to="/inventory/stock">
            <Button variant="outline"><FaExchangeAlt size={12} /> Stock</Button>
          </Link>
          <Link to="/inventory/low-stock">
            <Button variant="outline"><FaExclamationTriangle size={12} /> Low Stock</Button>
          </Link>
          <Link to="/parties/vendors">
            <Button variant="outline"><FaTruck size={12} /> Vendors</Button>
          </Link>
          <ExportButton
            onExport={() => {
              exportToCsv(
                filtered.map((p) => ({
                  Name: p.name,
                  Brand: getBrand(p.brandId)?.name || p.brand || '',
                  Category: getCategory(p.categoryId)?.name || '',
                  Stock: p.stockQty,
                  PurchasedQuantity: p.purchasedQuantity,
                  PurchaseDate: p.purchaseDate || '',
                  PurchaseWithoutGst: p.purchasePriceWithoutGst ?? p.purchasePrice,
                  PurchaseWithGst: p.purchasePriceWithGst,
                  SellingWithoutGst: p.sellingPriceWithoutGst ?? p.sellingPrice,
                  SellingWithGst: p.sellingPriceWithGst,
                  GstRate: p.taxRate,
                  Status: p.status,
                })),
                'inventory-products.csv'
              );
              toast.success('Products exported');
            }}
          />
          <Button variant="outline" onClick={openImport}>
            <FaFileImport size={12} /> Import
          </Button>
          <Link to="/inventory/add">
            <Button><FaPlus size={12} /> Add Product</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={String(stats.totalProducts)} icon={FaBoxes} color="blue" />
        <StatCard title="Stock Value" value={stats.stockValueWithGst || stats.stockValue || 0} icon={FaRupeeSign} color="green" />
        <StatCard title="Low Stock" value={String(stats.lowStock)} icon={FaExclamationTriangle} color="amber" />
        <StatCard title="Out of Stock" value={String(stats.outOfStock)} icon={FaTimesCircle} color="red" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name or company..."
            className="w-full"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <Filter
              value={brandFilter}
              onChange={setBrandFilter}
              label="All Companies"
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Filter
              value={categoryFilter}
              onChange={setCategoryFilter}
              label="All Categories"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Filter
              value={itemGroupFilter}
              onChange={setItemGroupFilter}
              label="All Item Groups"
              options={itemGroups.map((g) => ({ value: g.id, label: g.name }))}
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

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product and its stock history?"
        confirmText="Delete"
      />

      <Modal
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        title="Import Products"
        size="md"
        footer={(
          <>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              Close
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!importFile}>
              <FaFileImport size={12} /> Upload & Import
            </Button>
          </>
        )}
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted">
            Upload the same CSV from Export, or an Excel (.xlsx) with columns like
            Name / Product Name, Brand, Category, prices, Stock.
          </p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              downloadProductImportSample();
              toast.success('Sample file downloaded');
            }}
          >
            <FaFileDownload size={12} /> Download sample CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary file:font-medium"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null);
              setImportResult(null);
            }}
          />
          {importFile && (
            <p className="text-slate-700 dark:text-slate-200">
              Selected: <span className="font-medium">{importFile.name}</span>
            </p>
          )}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            <span>
              Update existing products (same name). Uncheck to only create new ones.
            </span>
          </label>
          {importResult && (
            <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
              <p className="font-medium text-slate-800 dark:text-slate-100">Result</p>
              <p>File rows: {importResult.sourceRows ?? importResult.total ?? 0}</p>
              <p>Unique products: {importResult.uniqueProducts ?? importResult.total ?? 0}</p>
              {(importResult.duplicatesCollapsed ?? 0) > 0 && (
                <p className="text-amber-700 dark:text-amber-300">
                  Duplicate names merged: {importResult.duplicatesCollapsed}
                  {' '}(same product name counted once)
                </p>
              )}
              <p>Created: {importResult.created ?? 0}</p>
              <p>Updated: {importResult.updated ?? 0}</p>
              <p>Skipped: {importResult.skipped ?? 0}</p>
              {importResult.errors?.length > 0 && (
                <div className="pt-2 text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Row errors</p>
                  <ul className="list-disc pl-5">
                    {importResult.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
