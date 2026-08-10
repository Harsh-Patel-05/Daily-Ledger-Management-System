import { useState, useEffect } from 'react';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { PAYMENT_METHODS } from '../../utils/helpers';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Transport',
  'Salary / Labour',
  'Packaging',
  'Purchase (cash)',
  'Misc',
];

export default function QuickExpenseModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'quickExpense';
  const { addExpense, expenseCategories } = useLocalModules();
  const toast = useToast();

  const categories = expenseCategories.items.length
    ? expenseCategories.items.filter((c) => c.status !== 'inactive').map((c) => c.name)
    : EXPENSE_CATEGORIES;

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Misc',
    itemDescription: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      date: new Date().toISOString().split('T')[0],
      category: current?.payload?.category || 'Misc',
      itemDescription: '',
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
    });
  }, [open, current?.payload?.category]);

  if (!open) return null;

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      // Backend expense create also writes Transaction type=expense
      await addExpense({
        date: form.date,
        categoryName: form.category,
        amount: Number(form.amount),
        paymentMode: form.paymentMethod,
        notes: form.itemDescription || form.notes,
        gstType: 'Non-GST',
      });
      toast.success('Expense recorded');
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Quick Expense"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Save Expense</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Date" value={form.date} onChange={set('date')} required />
        <Dropdown
          label="Category"
          value={form.category}
          onChange={set('category')}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <Input
          label="Description"
          value={form.itemDescription}
          onChange={set('itemDescription')}
          placeholder="What did you spend on?"
          containerClassName="sm:col-span-2"
        />
        <Input
          label="Amount (₹)"
          type="number"
          value={form.amount}
          onChange={set('amount')}
          required
        />
        <Dropdown
          label="Paid via"
          value={form.paymentMethod}
          onChange={set('paymentMethod')}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        />
        <Input
          label="Notes"
          value={form.notes}
          onChange={set('notes')}
          containerClassName="sm:col-span-2"
        />
      </form>
    </Modal>
  );
}
