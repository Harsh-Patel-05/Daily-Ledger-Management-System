import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../../utils/helpers';
import { Breadcrumbs, Card, Input, Dropdown, DatePicker, Button } from '../../components/ui';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function AddTransaction() {
  const { customers, addTransaction } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: searchParams.get('customer') || '',
    type: 'credit',
    itemDescription: '',
    quantity: '1',
    rate: '',
    amount: '',
    notes: '',
    paymentMethod: 'Cash',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'quantity' || key === 'rate') {
        const qty = Number(key === 'quantity' ? value : next.quantity) || 0;
        const rate = Number(key === 'rate' ? value : next.rate) || 0;
        if (next.type === 'credit' || next.type === 'return') {
          next.amount = String(qty * rate || '');
        }
      }
      if (key === 'type' && (value === 'payment' || value === 'discount' || value === 'expense')) {
        next.quantity = '1';
        next.rate = next.amount;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.customerId && form.type !== 'expense') errs.customerId = 'Customer is required';
    if (!form.type) errs.type = 'Type is required';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Valid amount required';
    if (!form.date) errs.date = 'Date is required';
    if ((form.type === 'credit' || form.type === 'return') && !form.itemDescription.trim()) {
      errs.itemDescription = 'Description is required';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const __apiRes = await addTransaction({
        date: form.date,
        customerId: form.customerId || customers[0]?.id,
        type: form.type,
        itemDescription: form.itemDescription || TRANSACTION_TYPES[form.type]?.label || form.type,
        quantity: Number(form.quantity) || 1,
        rate: Number(form.rate) || Number(form.amount),
        amount: Number(form.amount),
        notes: form.notes,
        paymentMethod: form.paymentMethod,
      });
      toast.success(getApiMessage(__apiRes, 'Transaction created successfully'));
      navigate('/transactions');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create transaction'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs items={[
        { label: 'Transactions', to: '/transactions' },
        { label: 'New Transaction' },
      ]} />
      <div className="flex items-center gap-3">
        <Link to="/transactions" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">New Transaction</h1>
          <p className="text-sm text-muted">Record a credit, payment, return, or expense</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DatePicker label="Date" value={form.date} onChange={set('date')} error={errors.date} required />
            <Dropdown
              label="Transaction Type"
              value={form.type}
              onChange={set('type')}
              options={Object.entries(TRANSACTION_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
              required
            />
            {form.type !== 'expense' && (
              <Dropdown
                label="Customer"
                value={form.customerId}
                onChange={set('customerId')}
                options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.businessName}` }))}
                placeholder="Select customer"
                error={errors.customerId}
                required
                className="sm:col-span-2"
              />
            )}
            <Input
              label="Item Description"
              value={form.itemDescription}
              onChange={set('itemDescription')}
              placeholder="e.g. Rice Basmati 25kg"
              error={errors.itemDescription}
              containerClassName="sm:col-span-2"
            />
            {(form.type === 'credit' || form.type === 'return') && (
              <>
                <Input label="Quantity" type="number" value={form.quantity} onChange={set('quantity')} min="1" />
                <Input label="Rate (₹)" type="number" value={form.rate} onChange={set('rate')} placeholder="0" />
              </>
            )}
            <Input
              label="Amount (₹)"
              type="number"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0"
              error={errors.amount}
              required
            />
            <Dropdown
              label="Payment Method"
              value={form.paymentMethod}
              onChange={set('paymentMethod')}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Save Transaction</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
