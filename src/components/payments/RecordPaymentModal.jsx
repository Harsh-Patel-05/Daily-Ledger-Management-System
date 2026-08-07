import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_METHODS } from '../../utils/helpers';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import DatePicker from '../ui/DatePicker';
import Button from '../ui/Button';

export default function RecordPaymentModal({
  open,
  onClose,
  customerId: initialCustomerId,
  customerName,
  balance: initialBalance = 0,
  invoiceId = null,
  invoiceNumber = null,
  defaultAmount = '',
  allowCustomerPick = false,
}) {
  const { recordPayment, customers, getCustomer } = useApp();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(initialCustomerId || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCustomer = useMemo(() => {
    if (selectedId) return getCustomer(selectedId) || customers.find((c) => String(c.id) === String(selectedId));
    return null;
  }, [selectedId, getCustomer, customers]);

  const balance = selectedCustomer
    ? Number(selectedCustomer.currentBalance || 0)
    : Number(initialBalance || 0);
  const displayName = selectedCustomer?.name || customerName || 'Customer';

  const debtors = useMemo(
    () =>
      [...customers]
        .filter((c) => Number(c.currentBalance || 0) > 0)
        .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance)),
    [customers],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialCustomerId || '');
    setMethod('Cash');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes(invoiceNumber ? `Against ${invoiceNumber}` : '');
    const bal = initialCustomerId
      ? Number(getCustomer(initialCustomerId)?.currentBalance || initialBalance || 0)
      : Number(initialBalance || 0);
    setAmount(String(defaultAmount || (bal > 0 ? bal : '') || ''));
  }, [open, initialCustomerId, initialBalance, defaultAmount, invoiceNumber, getCustomer]);

  useEffect(() => {
    if (!open || !allowCustomerPick || !selectedId) return;
    const c = getCustomer(selectedId);
    if (c && Number(c.currentBalance) > 0) {
      setAmount(String(Math.round(Number(c.currentBalance))));
    }
  }, [selectedId, allowCustomerPick, open, getCustomer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cid = selectedId || initialCustomerId;
    if (!cid) {
      toast.error('Select a customer');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await recordPayment({
        customerId: cid,
        amount: Number(amount),
        method,
        date,
        notes,
        invoiceId,
      });
      toast.success(`Payment of ${formatCurrency(Number(amount))} recorded`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save Payment</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {allowCustomerPick && !initialCustomerId ? (
          <Dropdown
            label="Customer (pending balance)"
            value={selectedId}
            onChange={setSelectedId}
            options={debtors.map((c) => ({
              value: c.id,
              label: `${c.name} — ${formatCurrency(c.currentBalance)}`,
            }))}
            placeholder="Select customer"
            required
          />
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</p>
              {invoiceNumber && <p className="text-xs text-muted">{invoiceNumber}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted uppercase">Outstanding</p>
              <p className="text-sm font-bold text-amber-600">{formatCurrency(balance)}</p>
            </div>
          </div>
        )}

        {allowCustomerPick && selectedCustomer && (
          <div className="flex justify-between text-xs text-muted px-1">
            <span>Outstanding</span>
            <span className="font-semibold text-amber-600">{formatCurrency(balance)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Dropdown
            label="Payment Method"
            value={method}
            onChange={setMethod}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          />
          <DatePicker label="Date" value={date} onChange={setDate} />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {balance > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[0.25, 0.5, 1].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAmount(String(Math.round(balance * f)))}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary-soft text-primary font-medium hover:bg-primary-soft-hover transition-colors"
              >
                {f === 1 ? 'Full' : `${f * 100}%`} ({formatCurrency(Math.round(balance * f))})
              </button>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
