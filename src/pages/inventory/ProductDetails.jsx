import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaEdit, FaTrash, FaExchangeAlt, FaBoxOpen, FaMapMarkerAlt,
  FaTag, FaTruck, FaBarcode,
} from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { STOCK_MOVEMENT_TYPES } from '../../data/inventoryDefaults';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { getStatusColor } from '../../utils/helpers';
import {
  Breadcrumbs, Card, CardHeader, Button,
  ConfirmationDialog, StatCard,
} from '../../components/ui';

export default function ProductDetails() {
  const { id } = useParams();
  const {
    getProduct, getCategory, getSupplier, getProductMovements, deleteProduct,
  } = useInventory();
  const toast = useToast();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const product = getProduct(id);
  const movements = getProductMovements(id).slice(0, 12);
  const category = product ? getCategory(product.categoryId) : null;
  const supplier = product ? getSupplier(product.supplierId) : null;

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-2">Product not found</p>
        <Link to="/inventory" className="text-primary text-sm">Back to inventory</Link>
      </div>
    );
  }

  const stockValue = Number(product.stockQty || 0) * Number(product.purchasePrice || 0);
  const margin = Number(product.purchasePrice)
    ? Math.round(((Number(product.sellingPrice) - Number(product.purchasePrice)) / Number(product.purchasePrice)) * 100)
    : 0;

  const handleDelete = async () => {
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      navigate('/inventory');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Inventory', to: '/inventory' },
        { label: product.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/inventory" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{product.name}</h1>
            <p className="text-sm text-muted">{product.sku || 'No SKU'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/inventory/stock?product=${id}`}>
            <Button size="sm" variant="secondary"><FaExchangeAlt size={12} /> Adjust Stock</Button>
          </Link>
          <Link to={`/inventory/${id}/edit`}>
            <Button variant="outline" size="sm"><FaEdit size={12} /> Edit</Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <FaTrash size={12} /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Current Stock" value={`${formatNumber(product.stockQty)} ${product.unit}`} icon={FaBoxOpen} color="blue" />
        <StatCard title="Stock Value" value={stockValue} icon={FaTag} color="green" />
        <StatCard title="Selling Price" value={product.sellingPrice} icon={FaTag} color="purple" />
        <StatCard title="Margin" value={`${margin}%`} icon={FaTag} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FaBoxOpen size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{product.name}</h2>
            <span className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(product.status)}`}>
              {product.status}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <InfoRow icon={FaBarcode} label="Barcode" value={product.barcode || '—'} />
            <InfoRow icon={FaTag} label="Category" value={category?.name || 'Uncategorized'} />
            <InfoRow icon={FaTruck} label="Supplier" value={supplier?.name || '—'} />
            <InfoRow icon={FaMapMarkerAlt} label="Location" value={product.location || '—'} />
            <InfoRow icon={FaTag} label="HSN" value={product.hsn || '—'} />
            <InfoRow icon={FaBoxOpen} label="Reorder Level" value={`${formatNumber(product.reorderLevel)} ${product.unit}`} />
          </div>

          {product.description && (
            <div className="mt-5 pt-4 border-t border-border/60 dark:border-slate-700">
              <p className="text-xs font-medium text-muted mb-1">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{product.description}</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Pricing" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <PriceTile label="Purchase" value={formatCurrency(product.purchasePrice)} />
              <PriceTile label="Selling" value={formatCurrency(product.sellingPrice)} />
              <PriceTile label="Tax" value={`${product.taxRate}%`} />
              <PriceTile label="Reorder Qty" value={formatNumber(product.reorderQty)} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent Stock Movements"
              action={
                <Link to={`/inventory/stock?product=${id}`} className="text-sm text-primary font-medium">
                  View all
                </Link>
              }
            />
            {movements.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">No stock movements yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border/60 dark:border-slate-700">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Qty</th>
                      <th className="pb-2 font-medium">Stock</th>
                      <th className="pb-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 dark:divide-slate-700/60">
                    {movements.map((m) => {
                      const meta = STOCK_MOVEMENT_TYPES[m.type] || STOCK_MOVEMENT_TYPES.adjust;
                      return (
                        <tr key={m.id}>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">{formatDate(m.date)}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-2.5 font-medium">{formatNumber(m.quantity)}</td>
                          <td className="py-2.5 text-muted">{m.previousQty} → {m.newQty}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">{m.reason || m.reference || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmationDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="This will remove the product and its stock history."
        confirmText="Delete"
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
        <Icon size={12} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function PriceTile({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}
