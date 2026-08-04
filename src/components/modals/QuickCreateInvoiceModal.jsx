import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useStackedModal } from '../../hooks/useStackedModal';
import { calcInvoiceTotals } from '../../utils/invoiceUtils';
import { nextInvoiceNumber as fetchNextInvoiceNumber } from '../../api/invoices';
import { INVOICE_FORMATS, getInvoiceFormat } from '../../data/invoiceFormats';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';

export default function QuickCreateInvoiceModal() {
  const { inStack, open, payload, closeModal, openModal } = useStackedModal('quickInvoice');
  const { customers, settings, profile, addInvoice } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const prefix = settings.invoicePrefix || profile.invoicePrefix || 'INV';
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (inStack && !form) {
      setForm({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        customerId: payload.customerId || '',
        description: '',
        quantity: '1',
        rate: '',
        discount: 0,
        taxRate: settings.defaultTaxRate || 18,
        format: payload.format || 'classic',
        paymentMethod: 'Credit',
      });
      fetchNextInvoiceNumber()
        .then((res) => {
          if (res?.invoiceNumber) {
            setForm((f) => (f ? { ...f, invoiceNumber: res.invoiceNumber } : f));
          }
        })
        .catch(() => {});
    }
    if (!inStack) setForm(null);
  }, [inStack]);

  const amount = form ? (Number(form.quantity) || 0) * (Number(form.rate) || 0) : 0;
  const totals = useMemo(() => {
    if (!form) return { total: 0 };
    return calcInvoiceTotals(
      [{ quantity: form.quantity, rate: form.rate, amount }],
      form.discount,
      form.taxRate
    );
  }, [form, amount]);

  if (!inStack || !form) return null;

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async () => {
    const errs = {};
    if (!form.customerId) errs.customerId = 'Required';
    if (!form.description.trim()) errs.description = 'Required';
    if (amount <= 0) errs.rate = 'Enter rate';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const invoice = await addInvoice({
        invoiceNumber: form.invoiceNumber,
        date: form.date,
        dueDate: '',
        customerId: form.customerId,
        items: [{
          id: 1,
          description: form.description,
          hsn: '',
          quantity: Number(form.quantity) || 1,
          rate: Number(form.rate) || 0,
          amount,
        }],
        discount: Number(form.discount) || 0,
        taxRate: Number(form.taxRate) || 0,
        paidAmount: 0,
        paymentMethod: form.paymentMethod,
        notes: 'Created via quick invoice modal',
        terms: `Payment due within ${settings.defaultPaymentTerms || 15} days.`,
        format: form.format,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      closeModal();
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const fmt = getInvoiceFormat(form.format);

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Create Invoice"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() =>
              openModal('invoiceFormat', {
                selected: form.format,
                onSelect: (id) => setForm((f) => ({ ...f, format: id })),
              })
            }
          >
            Change Format ({fmt.name})
          </Button>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Create Invoice</Button>
        </>
      }
    >
      <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm flex justify-between gap-2">
        <span className="text-slate-700 dark:text-slate-200">
          Format: <strong>{fmt.name}</strong> · {fmt.nameHi}
        </span>
        <button
          type="button"
          className="text-primary text-xs font-semibold"
          onClick={() =>
            openModal('invoiceFormat', {
              selected: form.format,
              onSelect: (id) => setForm((f) => ({ ...f, format: id })),
            })
          }
        >
          Change
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Invoice #" value={form.invoiceNumber} onChange={set('invoiceNumber')} />
        <DatePicker label="Date" value={form.date} onChange={set('date')} />
        <Dropdown
          label="Customer"
          value={form.customerId}
          onChange={set('customerId')}
          options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.businessName}` }))}
          placeholder="Select customer"
          error={errors.customerId}
          className="sm:col-span-2"
          required
        />
        <Input
          label="Item Description"
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          containerClassName="sm:col-span-2"
          required
        />
        <Input label="Qty" type="number" value={form.quantity} onChange={set('quantity')} />
        <Input label="Rate (₹)" type="number" value={form.rate} onChange={set('rate')} error={errors.rate} />
        <Input label="Discount" type="number" value={form.discount} onChange={set('discount')} />
        <Input label="GST %" type="number" value={form.taxRate} onChange={set('taxRate')} />
        <Dropdown
          label="Format"
          value={form.format}
          onChange={set('format')}
          options={INVOICE_FORMATS.map((f) => ({ value: f.id, label: f.name }))}
        />
        <Dropdown
          label="Payment Method"
          value={form.paymentMethod}
          onChange={set('paymentMethod')}
          options={['Credit', 'Cash', 'UPI', 'Bank', 'Cheque'].map((m) => ({ value: m, label: m }))}
        />
      </div>

      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between items-center">
        <span className="text-sm text-muted">Grand Total</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(totals.total)}</span>
      </div>
    </Modal>
  );
}
