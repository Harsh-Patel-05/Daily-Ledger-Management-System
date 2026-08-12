import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/pages/PageHeader';
import { Card, CardHeader, Button, Input, Dropdown, EmptyState } from '../../components/ui';
import { formatNumber } from '../../utils/formatters';

export default function StockAdjustment() {
  const { products, recordStockMovement, getProduct } = useInventory();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get('product') || '';
  const [form, setForm] = useState({
    productId: preselect,
    newQty: '',
    reason: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (preselect) setForm((f) => ({ ...f, productId: preselect }));
  }, [preselect]);

  const product = form.productId ? getProduct(form.productId) : null;
  const options = useMemo(
    () => products.map((p) => ({ value: String(p.id), label: p.name })),
    [products]
  );

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.productId) errs.productId = 'Select a product';
    if (form.newQty === '' || Number.isNaN(Number(form.newQty))) errs.newQty = 'Enter new quantity';
    if (!form.reason.trim()) errs.reason = 'Reason is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await recordStockMovement({
        productId: form.productId,
        type: 'adjust',
        newQty: Number(form.newQty),
        reason: form.reason,
        date: form.date,
        reference: 'STOCK-ADJ',
      });
      toast.success('Stock adjusted');
      setForm((f) => ({ ...f, newQty: '', reason: '' }));
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Adjustment"
        subtitle="Correct physical stock vs system quantity"
        breadcrumbs={[{ label: 'Inventory', to: '/inventory/products' }, { label: 'Stock Adjustment' }]}
        backTo="/inventory/stock"
        actions={
          <Link to="/inventory/stock">
            <Button variant="outline">View Stock Movements</Button>
          </Link>
        }
      />

      {products.length === 0 ? (
        <Card>
          <EmptyState
            type="inventory"
            title="No products"
            description="Add products before adjusting stock."
            actionLabel="Add Product"
            onAction={() => navigate('/inventory/add')}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Adjust Quantity" subtitle="This creates an adjustment stock movement" />
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4 max-w-3xl">
            <Dropdown
              label="Product"
              value={String(form.productId || '')}
              onChange={set('productId')}
              options={options}
              error={errors.productId}
              required
            />
            <Input label="Date" type="date" value={form.date} onChange={set('date')} />
            <Input
              label="Current Stock"
              value={product ? formatNumber(product.stockQty) : '—'}
              disabled
            />
            <Input
              label="New Quantity"
              type="number"
              value={form.newQty}
              onChange={set('newQty')}
              error={errors.newQty}
              required
            />
            <div className="sm:col-span-2">
              <Input label="Reason" value={form.reason} onChange={set('reason')} error={errors.reason} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={loading}><FaSave size={12} /> Save Adjustment</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
