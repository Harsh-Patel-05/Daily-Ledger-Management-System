import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../../utils/helpers';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';

export default function QuickAddTransactionModal() {
  const { current, closeModal, openModal } = useModal();
  const open = current?.type === 'quickTransaction';
  const { customers, addTransaction } = useApp();
  const toast = useToast();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customerId: current?.payload?.customerId || '',
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
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.customerId && form.type !== 'expense') errs.customerId = 'Select customer';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Valid amount required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await addTransaction({
        date: form.date,
        customerId: form.customerId || customers[0]?.id,
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
          <Button onClick={submit} loading={loading}>Save</Button>
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
      </form>
    </Modal>
  );
}
