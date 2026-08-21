import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { calcInvoiceTotals, inferDestination } from '../../utils/invoiceUtils';
import {
  applyProductToLine,
  stockIssuesForItems,
} from '../../utils/inventoryInvoice';
import { nextInvoiceNumber as fetchNextInvoiceNumber } from '../../api/invoices';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Breadcrumbs, Card, CardHeader, Input, Dropdown, DatePicker, Button } from '../../components/ui';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const DEFAULT_INVOICE_FORMAT = 'classic';

const emptyItem = () => ({
  id: Date.now() + Math.random(),
  productId: '',
  description: '',
  hsn: '',
  quantity: 1,
  rate: '',
  amount: 0,
});

export default function CreateInvoice() {
  const { customers, settings, profile, addInvoice } = useApp();
  const { products, getProduct } = useInventory();
  const { isGstEnabled } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();

  const prefix = settings.invoicePrefix || profile.invoicePrefix || 'INV';
  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const [form, setForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    customerId: '',
    items: [emptyItem()],
    discount: 0,
    taxRate: settings.defaultTaxRate || 18,
    paidAmount: 0,
    paymentMethod: 'Credit',
    paymentTerms: '',
    gstType: 'GST',
    notes: '',
    terms: '',
    deliveryNote: '',
    referenceNo: '',
    otherReferences: '',
    buyerOrderNo: '',
    buyerOrderDate: '',
    dispatchDocNo: '',
    deliveryNoteDate: '',
    dispatchedThrough: '',
    destination: '',
    termsOfDelivery: '',
    format: DEFAULT_INVOICE_FORMAT,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGstEnabled) {
      setForm((f) => ({
        ...f,
        gstType: 'Non-GST',
        taxRate: 0,
        items: (f.items || []).map((it) => ({ ...it, hsn: it.hsn || '' })),
      }));
    } else if (settings.defaultGstMode === 'non_gst') {
      setForm((f) => ({ ...f, gstType: 'Non-GST', taxRate: 0 }));
    }
  }, [isGstEnabled, settings.defaultGstMode]);

  useEffect(() => {
    let cancelled = false;
    fetchNextInvoiceNumber()
      .then((res) => {
        if (!cancelled && res?.invoiceNumber) {
          setForm((f) => ({ ...f, invoiceNumber: res.invoiceNumber }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setForm((f) => ({
            ...f,
            invoiceNumber: `${prefix}-${new Date().getFullYear()}-XXXX`,
          }));
        }
      });
    return () => { cancelled = true; };
  }, [prefix]);

  // When customer changes, fill destination / payment terms from party master
  useEffect(() => {
    if (!form.customerId) return;
    const c = customers.find((x) => String(x.id) === String(form.customerId));
    if (!c) return;
    setForm((f) => ({
      ...f,
      destination: f.destination || inferDestination(c.address || c.shippingAddress || '', '', c.state || ''),
      paymentTerms: f.paymentTerms || (c.creditDays ? `${c.creditDays} Days` : f.paymentMethod || ''),
    }));
  }, [form.customerId, customers]);

  const gstSale = form.gstType === 'GST';
  const effectiveTaxRate = gstSale ? form.taxRate : 0;
  const totals = useMemo(
    () => calcInvoiceTotals(form.items, form.discount, effectiveTaxRate),
    [form.items, form.discount, effectiveTaxRate]
  );

  const updateItem = (id, key, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item) => {
        if (item.id !== id) return item;
        if (key === 'productId') {
          if (!value) {
            return { ...item, productId: '', description: '', hsn: '', rate: '', amount: 0 };
          }
          const product = getProduct(value);
          return applyProductToLine(item, product);
        }
        const next = { ...item, [key]: value };
        if (key === 'description' && item.productId) {
          const product = getProduct(item.productId);
          if (product && value !== product.name) next.productId = '';
        }
        const qty = Number(key === 'quantity' ? value : next.quantity) || 0;
        const rate = Number(key === 'rate' ? value : next.rate) || 0;
        next.amount = qty * rate;
        return next;
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.items.some((i) => i.description && i.amount > 0)) errs.items = 'Add at least one valid item';

    const validItems = form.items.filter((i) => i.description && i.amount > 0);
    const stockIssues = stockIssuesForItems(validItems, getProduct);
    if (stockIssues.length) {
      errs.items = stockIssues[0];
      toast.error(stockIssues[0]);
    }

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const lineItems = validItems.map((i, idx) => ({
        id: idx + 1,
        productId: i.productId || '',
        description: i.description,
        hsn: i.hsn,
        quantity: Number(i.quantity) || 1,
        rate: Number(i.rate) || 0,
        amount: Number(i.amount) || 0,
      }));

      const invoice = await addInvoice({
        ...form,
        items: lineItems,
        discount: Number(form.discount) || 0,
        gstType: form.gstType,
        taxRate: gstSale ? (Number(form.taxRate) || 0) : 0,
        paidAmount: Number(form.paidAmount) || 0,
      });

      // Stock is deducted on the backend when productId is present
      window.dispatchEvent(new Event('dlms:refresh-inventory'));
      toast.success('Invoice created successfully');
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create invoice'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <Breadcrumbs items={[
        { label: 'Invoices', to: '/invoices' },
        { label: 'Create Invoice' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to="/invoices" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Invoice</h1>
          <p className="text-sm text-muted">GST or Non-GST sale — stock deducts when a product is selected</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Invoice #"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            />
            <DatePicker
              label="Date"
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
            />
            <DatePicker
              label="Due Date"
              value={form.dueDate}
              onChange={(v) => setForm({ ...form, dueDate: v })}
            />
            <Dropdown
              label="Customer"
              value={form.customerId}
              onChange={(v) => setForm({ ...form, customerId: v })}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.businessName}` }))}
              placeholder="Select customer"
              error={errors.customerId}
              required
            />
            {isGstEnabled ? (
              <Dropdown
                label="Invoice Type"
                value={form.gstType}
                onChange={(v) => setForm({
                  ...form,
                  gstType: v,
                  taxRate: v === 'Non-GST' ? 0 : (form.taxRate || settings.defaultTaxRate || 18),
                })}
                options={[
                  { value: 'GST', label: 'GST (Tax Invoice)' },
                  { value: 'Non-GST', label: 'Non-GST (Bill / Invoice)' },
                ]}
              />
            ) : (
              <Input label="Invoice Type" value="Non-GST (this company)" disabled />
            )}
            <Dropdown
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(v) => setForm({ ...form, paymentMethod: v, paymentTerms: form.paymentTerms || v })}
              options={['Credit', 'Cash', 'UPI', 'Bank', 'Cheque'].map((m) => ({ value: m, label: m }))}
            />
            <Input
              label="Mode / Terms of Payment"
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              placeholder="e.g. 15 Days / Credit"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Dispatch / Reference (shows on tax invoice)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Delivery Note" value={form.deliveryNote} onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })} />
            <Input label="Reference No. & Date" value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
            <Input label="Other References" value={form.otherReferences} onChange={(e) => setForm({ ...form, otherReferences: e.target.value })} />
            <Input label="Buyer’s Order No." value={form.buyerOrderNo} onChange={(e) => setForm({ ...form, buyerOrderNo: e.target.value })} />
            <DatePicker label="Buyer’s Order Date" value={form.buyerOrderDate} onChange={(v) => setForm({ ...form, buyerOrderDate: v })} />
            <Input label="Dispatch Doc No." value={form.dispatchDocNo} onChange={(e) => setForm({ ...form, dispatchDocNo: e.target.value })} />
            <DatePicker label="Delivery Note Date" value={form.deliveryNoteDate} onChange={(v) => setForm({ ...form, deliveryNoteDate: v })} />
            <Input label="Dispatched through" value={form.dispatchedThrough} onChange={(e) => setForm({ ...form, dispatchedThrough: e.target.value })} />
            <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="City / place" />
            <Input label="Terms of Delivery" value={form.termsOfDelivery} onChange={(e) => setForm({ ...form, termsOfDelivery: e.target.value })} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Line Items"
            action={
              <Button
                type="button"
                size="sm"
                variant="soft"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
              >
                <FaPlus size={11} /> Add Item
              </Button>
            }
          />
          {errors.items && <p className="text-xs text-danger mb-3">{errors.items}</p>}
          <div className="space-y-3">
            {form.items.map((item, idx) => {
              const linked = item.productId ? getProduct(item.productId) : null;
              return (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {idx === 0 ? 'From Inventory' : undefined}
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                        className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Custom item (manual)</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · stock {formatNumber(p.stockQty)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-7">
                      <Input
                        label={idx === 0 ? 'Description' : undefined}
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-2">
                      {gstSale ? (
                        <Input
                          label={idx === 0 ? 'HSN' : undefined}
                          value={item.hsn}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                          placeholder="HSN"
                        />
                      ) : idx === 0 ? (
                        <div className="text-xs text-muted pb-2">HSN not required for Non-GST</div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 sm:contents gap-2">
                      <div className="sm:col-span-2">
                        <Input
                          label={idx === 0 ? 'Qty' : undefined}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          label={idx === 0 ? 'Rate' : undefined}
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] sm:contents gap-2 items-end">
                      <div className="sm:col-span-3">
                        <Input label={idx === 0 ? 'Amount' : undefined} value={formatCurrency(item.amount)} disabled />
                      </div>
                      <div className="sm:col-span-2 flex justify-end pb-1">
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== item.id) }))}
                            className="p-2.5 rounded-lg text-danger hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {linked && (
                    <p className="text-[11px] text-muted">
                      Stock after sale: {formatNumber(Math.max(0, Number(linked.stockQty) - (Number(item.quantity) || 0)))}
                      {Number(item.quantity) > Number(linked.stockQty) && (
                        <span className="text-danger ml-2">Insufficient stock</span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Discount (₹)"
              type="number"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
            {gstSale ? (
              <Input
                label="GST Rate (%)"
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            ) : (
              <div className="rounded-xl border border-border dark:border-slate-600 px-3.5 py-2.5">
                <p className="text-xs text-muted">GST</p>
                <p className="text-sm font-semibold mt-1">Not applicable</p>
              </div>
            )}
            <Input
              label="Paid Amount (₹)"
              type="number"
              value={form.paidAmount}
              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
            />
          </div>
          <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted">Subtotal</p>
              <p className="font-semibold">{formatCurrency(totals.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{gstSale ? 'Tax (GST)' : 'Tax'}</p>
              <p className="font-semibold">{gstSale ? formatCurrency(totals.taxAmount) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Grand Total</p>
              <p className="font-bold text-primary text-lg">{formatCurrency(totals.total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Balance</p>
              <p className="font-semibold text-amber-600">
                {formatCurrency(Math.max(0, totals.total - (Number(form.paidAmount) || 0)))}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Input label="Terms" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Generate Invoice</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
