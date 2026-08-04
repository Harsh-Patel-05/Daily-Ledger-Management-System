import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash, FaPalette } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { calcInvoiceTotals, nextInvoiceNumber } from '../../utils/invoiceUtils';
import { INVOICE_FORMATS, getInvoiceFormat } from '../../data/invoiceFormats';
import { formatCurrency } from '../../utils/formatters';
import { Breadcrumbs, Card, CardHeader, Input, Dropdown, DatePicker, Button } from '../../components/ui';

const emptyItem = () => ({ id: Date.now(), description: '', hsn: '', quantity: 1, rate: '', amount: 0 });

export default function CreateInvoice() {
  const { customers, invoices, settings, profile, addInvoice } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [searchParams] = useSearchParams();

  const prefix = settings.invoicePrefix || profile.invoicePrefix || 'SGT';
  const initialFormat = searchParams.get('format') || 'classic';

  const [form, setForm] = useState({
    invoiceNumber: nextInvoiceNumber(invoices, prefix),
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    customerId: '',
    items: [emptyItem()],
    discount: 0,
    taxRate: settings.defaultTaxRate || 18,
    paidAmount: 0,
    paymentMethod: 'Credit',
    notes: 'Thank you for your business!',
    terms: 'Payment due within 15 days. Goods once sold will not be taken back.',
    format: initialFormat,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const totals = useMemo(
    () => calcInvoiceTotals(form.items, form.discount, form.taxRate),
    [form.items, form.discount, form.taxRate]
  );

  const fmt = getInvoiceFormat(form.format);

  const updateItem = (id, key, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [key]: value };
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
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const invoice = addInvoice({
      ...form,
      items: form.items
        .filter((i) => i.description)
        .map((i, idx) => ({
          id: idx + 1,
          description: i.description,
          hsn: i.hsn,
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || 0,
        })),
      discount: Number(form.discount) || 0,
      taxRate: Number(form.taxRate) || 0,
      paidAmount: Number(form.paidAmount) || 0,
    });
    setLoading(false);
    toast.success('Invoice created successfully');
    navigate(`/invoices/${invoice.id}`);
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
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Invoice</h1>
          <p className="text-sm text-muted">Format: {fmt.name} · logo + GST ready</p>
        </div>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Invoice Format: {fmt.name}</p>
            <p className="text-xs text-muted">{fmt.description}</p>
          </div>
          <div className="flex gap-2">
            <Dropdown
              value={form.format}
              onChange={(v) => setForm({ ...form, format: v })}
              options={INVOICE_FORMATS.map((f) => ({ value: f.id, label: f.name }))}
              className="min-w-[160px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openModal('invoiceFormat', {
                  selected: form.format,
                  onSelect: (id) => setForm((f) => ({ ...f, format: id })),
                })
              }
            >
              <FaPalette size={12} /> Browse Formats
            </Button>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader title="Invoice Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Invoice Number" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} required />
            <DatePicker label="Invoice Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
            <DatePicker label="Due Date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <Dropdown
              label="Customer"
              value={form.customerId}
              onChange={(v) => setForm({ ...form, customerId: v })}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.businessName}` }))}
              placeholder="Select customer"
              error={errors.customerId}
              required
              className="sm:col-span-2"
            />
            <Dropdown
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(v) => setForm({ ...form, paymentMethod: v })}
              options={['Credit', 'Cash', 'UPI', 'Bank', 'Cheque'].map((m) => ({ value: m, label: m }))}
            />
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
            {form.items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <div className="col-span-12 sm:col-span-4">
                  <Input
                    label={idx === 0 ? 'Description' : undefined}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Item name"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'HSN' : undefined}
                    value={item.hsn}
                    onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                    placeholder="HSN"
                  />
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <Input
                    label={idx === 0 ? 'Qty' : undefined}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'Rate' : undefined}
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-8 sm:col-span-2">
                  <Input label={idx === 0 ? 'Amount' : undefined} value={formatCurrency(item.amount)} disabled />
                </div>
                <div className="col-span-4 sm:col-span-1 flex justify-end pb-1">
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
            ))}
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
            <Input
              label="GST Rate (%)"
              type="number"
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
            />
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
              <p className="text-xs text-muted">Tax</p>
              <p className="font-semibold">{formatCurrency(totals.taxAmount)}</p>
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
