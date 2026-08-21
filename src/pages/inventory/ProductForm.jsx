import { useMemo } from 'react';
import { PRODUCT_STATUSES } from '../../data/inventoryDefaults';
import { Input, Button, DatePicker } from '../../components/ui';

export default function ProductForm({
  form,
  setForm,
  errors = {},
  categories = [],
  brands = [],
  itemGroups = [],
  suppliers = [],
  units = [],
  godowns = [],
  loading = false,
  submitLabel = 'Save Product',
  onSubmit,
  onCancel,
  showOpeningStock = false,
}) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const margin = useMemo(() => {
    const buy = Number(form.purchasePrice) || Number(form.purchasePriceWithGst) || 0;
    const sell = Number(form.sellingPrice) || Number(form.sellingPriceWithGst) || 0;
    if (!buy) return null;
    return Math.round(((sell - buy) / buy) * 100);
  }, [form.purchasePrice, form.purchasePriceWithGst, form.sellingPrice, form.sellingPriceWithGst]);

  const alts = form.alternateUnits || [];
  const setAlt = (idx, key, value) => {
    setForm((f) => {
      const next = [...(f.alternateUnits || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...f, alternateUnits: next };
    });
  };
  const addAlt = () => {
    setForm((f) => ({
      ...f,
      alternateUnits: [...(f.alternateUnits || []), { unitId: '', conversionFactor: 1, barcode: '' }],
    }));
  };
  const removeAlt = (idx) => {
    setForm((f) => ({
      ...f,
      alternateUnits: (f.alternateUnits || []).filter((_, i) => i !== idx),
    }));
  };

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

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company / Brand</label>
          <select
            value={form.brandId}
            onChange={set('brandId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <Input
          label="SKU"
          value={form.sku || ''}
          onChange={set('sku')}
          placeholder="Item code"
        />
        <Input
          label="Barcode"
          value={form.barcode || ''}
          onChange={set('barcode')}
          placeholder="Scan or type barcode"
          error={errors.barcode}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Base Unit</label>
          <select
            value={form.unitId || ''}
            onChange={set('unitId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.formalName ? ` (${u.formalName})` : ''}</option>
            ))}
          </select>
        </div>

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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Item Group</label>
          <select
            value={form.itemGroupId || ''}
            onChange={set('itemGroupId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select item group</option>
            {itemGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Vendor</label>
          <select
            value={form.supplierId}
            onChange={set('supplierId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select vendor</option>
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
          onChange={set('taxRate')}
          placeholder="18"
        />

        <Input
          label="Purchase Price (Without GST)"
          type="number"
          value={form.purchasePrice}
          onChange={set('purchasePrice')}
          placeholder="0"
          error={errors.purchasePrice}
        />
        <Input
          label="Purchase Price (With GST)"
          type="number"
          value={form.purchasePriceWithGst ?? ''}
          onChange={set('purchasePriceWithGst')}
          placeholder="0"
        />
        <Input
          label="Selling Price (Without GST)"
          type="number"
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
          placeholder="0"
          error={errors.sellingPrice}
        />
        <Input
          label="Selling Price (With GST)"
          type="number"
          value={form.sellingPriceWithGst ?? ''}
          onChange={set('sellingPriceWithGst')}
          placeholder="0"
        />

        <div className="flex items-end sm:col-span-2">
          <div className="w-full rounded-xl border border-border/60 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3.5 py-2.5">
            <p className="text-xs text-muted">Margin</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {margin == null ? '—' : `${margin}%`}
            </p>
          </div>
        </div>

        {showOpeningStock && (
          <>
            <Input
              label="Opening Stock (base unit)"
              type="number"
              value={form.stockQty}
              onChange={set('stockQty')}
              placeholder="0"
              error={errors.stockQty}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Opening Godown</label>
              <select
                value={form.godownId || ''}
                onChange={set('godownId')}
                className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Default (Main Godown)</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <Input
          label="Purchased Quantity"
          type="number"
          value={form.purchasedQuantity}
          onChange={set('purchasedQuantity')}
          placeholder="0"
          error={errors.purchasedQuantity}
        />
        <Input
          label="Reorder Level"
          type="number"
          value={form.reorderLevel ?? 0}
          onChange={set('reorderLevel')}
          placeholder="0"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 dark:border-slate-600 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Alternate Units</p>
            <p className="text-xs text-muted">1 alternate = conversion × base unit (e.g. Box = 12 Nos)</p>
          </div>
          <Button type="button" variant="outline" onClick={addAlt}>Add unit</Button>
        </div>
        {alts.length === 0 && <p className="text-xs text-muted">No alternate units</p>}
        {alts.map((row, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-muted mb-1">Unit</label>
              <select
                value={row.unitId || ''}
                onChange={(e) => setAlt(idx, 'unitId', e.target.value)}
                className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {units
                  .filter((u) => String(u.id) !== String(form.unitId))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
              </select>
            </div>
            <Input
              label="Conversion"
              type="number"
              value={row.conversionFactor ?? 1}
              onChange={(e) => setAlt(idx, 'conversionFactor', e.target.value)}
            />
            <Input
              label="Barcode"
              value={row.barcode || ''}
              onChange={(e) => setAlt(idx, 'barcode', e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => removeAlt(idx)}>Remove</Button>
          </div>
        ))}
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
