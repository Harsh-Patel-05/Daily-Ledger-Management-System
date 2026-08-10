import { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useStackedModal } from '../../hooks/useStackedModal';
import { STOCK_MOVEMENT_TYPES } from '../../data/inventoryDefaults';
import { formatNumber } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const initial = {
  productId: '',
  type: 'in',
  quantity: '',
  newQty: '',
  reason: '',
  reference: '',
  date: new Date().toISOString().split('T')[0],
};

export default function QuickStockModal() {
  const { inStack, open, payload, closeModal } = useStackedModal('quickStock');
  const { products, getProduct, recordStockMovement } = useInventory();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inStack) {
      setForm(initial);
      setErrors({});
      return;
    }
    setForm({
      ...initial,
      productId: payload.productId || '',
      type: payload.type || 'in',
      date: new Date().toISOString().split('T')[0],
    });
  }, [inStack, payload.productId, payload.type]);

  if (!inStack) return null;

  const selected = form.productId ? getProduct(form.productId) : null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.productId) errs.productId = 'Select a product';
    if (form.type === 'adjust') {
      if (form.newQty === '' || Number(form.newQty) < 0) errs.newQty = 'Enter valid qty';
    } else if (!form.quantity || Number(form.quantity) <= 0) {
      errs.quantity = 'Enter valid qty';
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

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Stock Movement"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Save</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
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
          {selected && (
            <p className="text-xs text-muted mt-1.5">
              Current stock: {formatNumber(selected.stockQty)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(STOCK_MOVEMENT_TYPES).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: value }))}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                form.type === value
                  ? `${meta.bg} ${meta.color} border-current`
                  : 'border-border dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {form.type === 'adjust' ? (
          <Input
            label="New Quantity"
            type="number"
            value={form.newQty}
            onChange={set('newQty')}
            error={errors.newQty}
            required
          />
        ) : (
          <Input
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={set('quantity')}
            error={errors.quantity}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          <Input label="Reference" value={form.reference} onChange={set('reference')} placeholder="PO / Invoice #" />
        </div>
        <Input label="Reason" value={form.reason} onChange={set('reason')} placeholder="Optional" />
      </form>
    </Modal>
  );
}
