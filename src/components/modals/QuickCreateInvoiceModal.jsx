import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { useStackedModal } from '../../hooks/useStackedModal';
import { calcInvoiceTotals } from '../../utils/invoiceUtils';
import {
  stockIssuesForItems,
} from '../../utils/inventoryInvoice';
import { nextInvoiceNumber as fetchNextInvoiceNumber } from '../../api/invoices';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const DEFAULT_INVOICE_FORMAT = 'classic';

export default function QuickCreateInvoiceModal() {
  const { inStack, open, payload, closeModal } = useStackedModal('quickInvoice');
  const { customers, settings, profile, addInvoice } = useApp();
  const { products, getProduct } = useInventory();
  const { isGstEnabled } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();

  const prefix = settings.invoicePrefix || profile.invoicePrefix || 'INV';
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  useEffect(() => {
    if (inStack && !form) {
      setForm({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        customerId: payload.customerId || '',
        productId: '',
        description: '',
        quantity: '1',
        rate: '',
        discount: 0,
        taxRate: !isGstEnabled || settings.defaultGstMode === 'non_gst' ? 0 : (settings.defaultTaxRate || 18),
        gstType: !isGstEnabled || settings.defaultGstMode === 'non_gst' ? 'Non-GST' : 'GST',
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
      form.gstType === 'Non-GST' ? 0 : form.taxRate
    );
  }, [form, amount]);

  if (!inStack || !form) return null;

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => {
      if (key === 'productId') {
        if (!value) return { ...f, productId: '', description: '', rate: '' };
        const product = getProduct(value);
        if (!product) return { ...f, productId: value };
        return {
          ...f,
          productId: product.id,
          description: product.name,
          rate: String(product.sellingPrice ?? ''),
          taxRate: product.taxRate ?? f.taxRate,
        };
      }
      return { ...f, [key]: value };
    });
  };

  const submit = async () => {
    const errs = {};
    if (!form.customerId) errs.customerId = 'Required';
    if (!form.description.trim()) errs.description = 'Required';
    if (amount <= 0) errs.rate = 'Enter rate';

    const line = {
      productId: form.productId || '',
      description: form.description,
      quantity: Number(form.quantity) || 1,
      rate: Number(form.rate) || 0,
      amount,
    };
    const stockIssues = stockIssuesForItems([line], getProduct);
    if (stockIssues.length) {
      errs.quantity = stockIssues[0];
      toast.error(stockIssues[0]);
    }

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const invoice = await addInvoice({
        invoiceNumber: form.invoiceNumber || `${prefix}-TEMP`,
        date: form.date,
        dueDate: '',
        customerId: form.customerId,
        items: [{
          id: 1,
          productId: form.productId || '',
          description: form.description,
          hsn: '',
          quantity: Number(form.quantity) || 1,
          rate: Number(form.rate) || 0,
          amount,
        }],
        discount: Number(form.discount) || 0,
        gstType: form.gstType || 'GST',
        taxRate: form.gstType === 'Non-GST' ? 0 : (Number(form.taxRate) || 0),
        paidAmount: 0,
        paymentMethod: form.paymentMethod,
        notes: 'Created via quick invoice modal',
        terms: `Payment due within ${settings.defaultPaymentTerms || 15} days.`,
        format: DEFAULT_INVOICE_FORMAT,
      });

      toast.success(`Invoice ${invoice.invoiceNumber} created`);
      window.dispatchEvent(new Event('dlms:refresh-inventory'));
      closeModal();
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create invoice'));
    } finally {
      setLoading(false);
    }
  };

  const linked = form.productId ? getProduct(form.productId) : null;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Create Invoice"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Create Invoice</Button>
        </>
      }
    >
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
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            From Inventory
          </label>
          <select
            value={form.productId}
            onChange={set('productId')}
            className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Custom item (manual)</option>
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · stock {formatNumber(p.stockQty)} · {formatCurrency(p.sellingPrice)}
              </option>
            ))}
          </select>
          {linked && (
            <p className="text-[11px] text-muted mt-1">
              Available: {formatNumber(linked.stockQty)}
            </p>
          )}
        </div>
        <Input
          label="Item Description"
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          containerClassName="sm:col-span-2"
          required
        />
        <Input label="Qty" type="number" value={form.quantity} onChange={set('quantity')} error={errors.quantity} />
        <Input label="Rate (₹)" type="number" value={form.rate} onChange={set('rate')} error={errors.rate} />
        <Input label="Discount" type="number" value={form.discount} onChange={set('discount')} />
        {isGstEnabled ? (
          <Dropdown
            label="Invoice Type"
            value={form.gstType}
            onChange={(v) => setForm((f) => ({
              ...f,
              gstType: v,
              taxRate: v === 'Non-GST' ? 0 : (f.taxRate || settings.defaultTaxRate || 18),
            }))}
            options={[
              { value: 'GST', label: 'GST' },
              { value: 'Non-GST', label: 'Non-GST' },
            ]}
          />
        ) : (
          <Input label="Invoice Type" value="Non-GST" disabled />
        )}
        {isGstEnabled && form.gstType !== 'Non-GST' && (
          <Input label="GST %" type="number" value={form.taxRate} onChange={set('taxRate')} />
        )}
        <Dropdown
          label="Payment Method"
          value={form.paymentMethod}
          onChange={set('paymentMethod')}
          options={['Credit', 'Cash', 'UPI', 'Bank', 'Cheque'].map((m) => ({ value: m, label: m }))}
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between items-center">
        <span className="text-sm text-muted">Grand Total</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(totals.total)}</span>
      </div>
    </Modal>
  );
}
