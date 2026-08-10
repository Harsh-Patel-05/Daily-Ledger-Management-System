import { useMemo } from 'react';
import { PRODUCT_STATUSES } from '../../data/inventoryDefaults';
import { Input, Button, DatePicker } from '../../components/ui';

function withGst(excl, taxRate) {
  const e = Number(excl) || 0;
  const t = Number(taxRate) || 0;
  return Math.round(e * (1 + t / 100) * 100) / 100;
}

function withoutGst(incl, taxRate) {
  const i = Number(incl) || 0;
  const t = Number(taxRate) || 0;
  const factor = 1 + t / 100;
  if (!factor) return i;
  return Math.round((i / factor) * 100) / 100;
}

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
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setExcl = (exclKey, inclKey) => (e) => {
    const excl = e.target.value;
    setForm((f) => ({
      ...f,
      [exclKey]: excl,
      [inclKey]: withGst(excl, f.taxRate),
    }));
  };

  const setIncl = (exclKey, inclKey) => (e) => {
    const incl = e.target.value;
    setForm((f) => ({
      ...f,
      [inclKey]: incl,
      [exclKey]: withoutGst(incl, f.taxRate),
    }));
  };

  const setTaxRate = (e) => {
    const taxRate = e.target.value;
    setForm((f) => ({
      ...f,
      taxRate,
      purchasePriceWithGst: withGst(f.purchasePrice, taxRate),
      sellingPriceWithGst: withGst(f.sellingPrice, taxRate),
    }));
  };

  const margin = useMemo(() => {
    const buy = Number(form.purchasePrice) || 0;
    const sell = Number(form.sellingPrice) || 0;
    if (!buy) return null;
    return Math.round(((sell - buy) / buy) * 100);
  }, [form.purchasePrice, form.sellingPrice]);

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

        <DatePicker
          label="Purchase Date"
          value={form.purchaseDate || ''}
          onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))}
        />

        <Input
          label="GST Rate (%)"
          type="number"
          value={form.taxRate}
          onChange={setTaxRate}
          placeholder="18"
        />

        <Input
          label="Purchase Price (Without GST)"
          type="number"
          value={form.purchasePrice}
          onChange={setExcl('purchasePrice', 'purchasePriceWithGst')}
          placeholder="0"
          error={errors.purchasePrice}
        />
        <Input
          label="Purchase Price (With GST)"
          type="number"
          value={form.purchasePriceWithGst ?? ''}
          onChange={setIncl('purchasePrice', 'purchasePriceWithGst')}
          placeholder="0"
        />
        <Input
          label="Selling Price (Without GST)"
          type="number"
          value={form.sellingPrice}
          onChange={setExcl('sellingPrice', 'sellingPriceWithGst')}
          placeholder="0"
          error={errors.sellingPrice}
        />
        <Input
          label="Selling Price (With GST)"
          type="number"
          value={form.sellingPriceWithGst ?? ''}
          onChange={setIncl('sellingPrice', 'sellingPriceWithGst')}
          placeholder="0"
        />

        <div className="flex items-end sm:col-span-2">
          <div className="w-full rounded-xl border border-border/60 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3.5 py-2.5">
            <p className="text-xs text-muted">Margin (on without-GST prices)</p>
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
