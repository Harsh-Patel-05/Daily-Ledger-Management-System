import { useMemo } from 'react';
import { PRODUCT_STATUSES } from '../../data/inventoryDefaults';
import { useLocalModules } from '../../context/LocalModulesContext';
import { Input, Button } from '../../components/ui';

export default function ProductForm({
  form,
  setForm,
  errors = {},
  categories = [],
  suppliers = [],
  loading = false,
  submitLabel = 'Save Product',
  onSubmit,
  onCancel,
  showOpeningStock = false,
}) {
  const { unitOptions } = useLocalModules();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const margin = useMemo(() => {
    const buy = Number(form.purchasePrice) || 0;
    const sell = Number(form.sellingPrice) || 0;
    if (!buy) return null;
    return Math.round(((sell - buy) / buy) * 100);
  }, [form.purchasePrice, form.sellingPrice]);

  const units = unitOptions;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          label="Product Name"
          value={form.name}
          onChange={set('name')}
          placeholder="Product name"
          error={errors.name}
          required
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={set('sku')}
          placeholder="SKU"
          error={errors.sku}
        />
        <Input
          label="Barcode"
          value={form.barcode}
          onChange={set('barcode')}
          placeholder="Optional barcode"
        />
        <Input
          label="HSN Code"
          value={form.hsn}
          onChange={set('hsn')}
          placeholder="HSN code"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
          <select
            value={form.categoryId}
            onChange={set('categoryId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Supplier</label>
          <select
            value={form.supplierId}
            onChange={set('supplierId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unit</label>
          <select
            value={form.unit}
            onChange={set('unit')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{units.length ? 'Select unit' : 'Add units in Inventory → Units'}</option>
            {units.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
          <select
            value={form.status}
            onChange={set('status')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>

        <Input
          label="Purchase Price (₹)"
          type="number"
          value={form.purchasePrice}
          onChange={set('purchasePrice')}
          placeholder="0"
          error={errors.purchasePrice}
        />
        <Input
          label="Selling Price (₹)"
          type="number"
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
          placeholder="0"
          error={errors.sellingPrice}
        />
        <Input
          label="Tax Rate (%)"
          type="number"
          value={form.taxRate}
          onChange={set('taxRate')}
          placeholder="18"
        />
        <div className="flex items-end">
          <div className="w-full rounded-xl border border-border/60 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3.5 py-2.5">
            <p className="text-xs text-muted">Margin</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {margin == null ? '—' : `${margin}%`}
            </p>
          </div>
        </div>

        {showOpeningStock && (
          <Input
            label="Opening Stock"
            type="number"
            value={form.stockQty}
            onChange={set('stockQty')}
            placeholder="0"
            error={errors.stockQty}
          />
        )}
        <Input
          label="Reorder Level"
          type="number"
          value={form.reorderLevel}
          onChange={set('reorderLevel')}
          placeholder="10"
        />
        <Input
          label="Reorder Qty"
          type="number"
          value={form.reorderQty}
          onChange={set('reorderQty')}
          placeholder="50"
        />
        <Input
          label="Storage Location"
          value={form.location}
          onChange={set('location')}
          placeholder="Location"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={set('description')}
          rows={3}
          placeholder="Product notes..."
          className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
