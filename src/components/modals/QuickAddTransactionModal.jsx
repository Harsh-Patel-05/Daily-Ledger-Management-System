import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../../utils/helpers';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';

export default function QuickAddTransactionModal() {
  const { current, closeModal, openModal } = useModal();
  const open = current?.type === 'quickTransaction';
  const { customers, addTransaction, getCustomer } = useApp();
  const toast = useToast();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    type: 'credit',
    itemDescription: '',
    quantity: '1',
    rate: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [forceOverLimit, setForceOverLimit] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      date: new Date().toISOString().split('T')[0],
      customerId: current?.payload?.customerId || '',
      type: current?.payload?.type || 'credit',
      itemDescription: '',
      quantity: '1',
      rate: '',
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
    });
    setErrors({});
    setForceOverLimit(false);
  }, [open, current?.payload?.customerId, current?.payload?.type]);

  const selectedCustomer = useMemo(
    () => (form.customerId ? getCustomer(form.customerId) : null),
    [form.customerId, getCustomer],
  );

  const creditWarning = useMemo(() => {
    if (form.type !== 'credit' || !selectedCustomer) return null;
    const limit = Number(selectedCustomer.creditLimit || 0);
    if (limit <= 0) return null;
    const bal = Number(selectedCustomer.currentBalance || 0);
    const amt = Number(form.amount || 0);
    const next = bal + amt;
    if (amt <= 0) return null;
    if (next > limit) {
      return {
        overBy: next - limit,
        next,
        limit,
        bal,
      };
    }
    if (next / limit >= 0.9) {
      return { near: true, next, limit, bal, remaining: limit - next };
    }
    return null;
  }, [form.type, form.amount, selectedCustomer]);

  if (!open) return null;

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'quantity' || key === 'rate') {
        const qty = Number(key === 'quantity' ? value : next.quantity) || 0;
        const rate = Number(key === 'rate' ? value : next.rate) || 0;
        if (next.type === 'credit' || next.type === 'return') next.amount = String(qty * rate || '');
      }
      return next;
    });
    if (key === 'amount' || key === 'customerId' || key === 'type') setForceOverLimit(false);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.customerId && form.type !== 'expense') errs.customerId = 'Select customer';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Valid amount required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (creditWarning?.overBy && !forceOverLimit) {
      toast.error(`Credit limit exceed hoga by ${formatCurrency(creditWarning.overBy)}. Confirm again to proceed.`);
      setForceOverLimit(true);
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        date: form.date,
        customerId: form.type === 'expense' ? null : (form.customerId || customers[0]?.id),
        type: form.type,
        itemDescription: form.itemDescription || TRANSACTION_TYPES[form.type]?.label,
        quantity: Number(form.quantity) || 1,
        rate: Number(form.rate) || Number(form.amount),
        amount: Number(form.amount),
        notes: form.notes,
        paymentMethod: form.paymentMethod,
      });
      toast.success('Transaction saved');
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Transaction"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => { closeModal(); openModal('quickCustomer'); }}>
            + New Customer
          </Button>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>
            {forceOverLimit && creditWarning?.overBy ? 'Confirm Over Limit' : 'Save'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Date" value={form.date} onChange={set('date')} required />
        <Dropdown
          label="Type"
          value={form.type}
          onChange={set('type')}
          options={Object.entries(TRANSACTION_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        {form.type !== 'expense' && (
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
        )}
        <Input
          label="Description"
          value={form.itemDescription}
          onChange={set('itemDescription')}
          placeholder="Item / note"
          containerClassName="sm:col-span-2"
        />
        {(form.type === 'credit' || form.type === 'return') && (
          <>
            <Input label="Qty" type="number" value={form.quantity} onChange={set('quantity')} />
            <Input label="Rate" type="number" value={form.rate} onChange={set('rate')} />
          </>
        )}
        <Input label="Amount (₹)" type="number" value={form.amount} onChange={set('amount')} error={errors.amount} required />
        <Dropdown
          label="Payment Method"
          value={form.paymentMethod}
          onChange={set('paymentMethod')}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        />

        {selectedCustomer && form.type !== 'expense' && (
          <div className="sm:col-span-2 text-xs text-muted flex justify-between px-0.5">
            <span>Current balance: {formatCurrency(selectedCustomer.currentBalance)}</span>
            {Number(selectedCustomer.creditLimit) > 0 && (
              <span>Limit: {formatCurrency(selectedCustomer.creditLimit)}</span>
            )}
          </div>
        )}

        {creditWarning?.overBy && (
          <div className="sm:col-span-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            Credit limit ({formatCurrency(creditWarning.limit)}) exceed hoga.
            New balance {formatCurrency(creditWarning.next)} — over by {formatCurrency(creditWarning.overBy)}.
            {forceOverLimit ? ' Save again to confirm.' : ''}
          </div>
        )}
        {creditWarning?.near && !creditWarning?.overBy && (
          <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            Limit ke near — sirf {formatCurrency(creditWarning.remaining)} remaining after this sale.
          </div>
        )}
      </form>
    </Modal>
  );
}
