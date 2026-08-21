import { useMemo, useState } from 'react';
import { FaPrint, FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../utils/helpers';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DayClosingModal() {
  const { current, closeModal } = useModal();
  const open = current?.type === 'dayClosing';
  const { transactions, profile, closeDay } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const today = todayISO();
    const todays = transactions.filter((t) => t.date === today);

    const byType = {
      credit: 0,
      payment: 0,
      return: 0,
      discount: 0,
      expense: 0,
    };
    const byMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0]));

    todays.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (byType[t.type] !== undefined) byType[t.type] += amt;
      if (t.type === 'payment') {
        const method = t.paymentMethod || 'Cash';
        if (byMethod[method] !== undefined) byMethod[method] += amt;
      }
    });

    const net = byType.payment - byType.expense;
    const count = todays.length;

    return { today, todays, byType, byMethod, net, count };
  }, [transactions]);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCloseDay = async () => {
    setSaving(true);
    try {
      const __apiRes = await closeDay({
        date: summary.today,
        message:
          `Day closing ${summary.today} · Collection ${formatCurrency(summary.byType.payment)} · ` +
          `Credit ${formatCurrency(summary.byType.credit)} · Expense ${formatCurrency(summary.byType.expense)}`,
      });
      toast.success(getApiMessage(__apiRes, 'Day closing saved on server'));
      closeModal();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save day closing'));
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { label: 'Credit sales (Mall diya)', value: summary.byType.credit, tone: 'text-blue-600' },
    { label: 'Payments collected', value: summary.byType.payment, tone: 'text-emerald-600' },
    { label: 'Returns', value: summary.byType.return, tone: 'text-amber-600' },
    { label: 'Discounts', value: summary.byType.discount, tone: 'text-purple-600' },
    { label: 'Shop expenses', value: summary.byType.expense, tone: 'text-red-600' },
  ];

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Day Closing — Roj Mel"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handlePrint}>
            <FaPrint size={12} /> Print
          </Button>
          <Button variant="outline" onClick={closeModal}>Close</Button>
          <Button onClick={handleCloseDay} loading={saving}>
            <FaCheckCircle size={12} /> Mark Day Closed
          </Button>
        </>
      }
    >
      <div className="space-y-5" id="day-closing-print">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {profile?.shopName || 'Your Shop'}
            </p>
            <p className="text-xs text-muted">{formatDate(summary.today)} · {summary.count} entries today</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted font-semibold">Net (collect − expense)</p>
            <p className={`text-xl font-bold ${summary.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summary.net)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today&apos;s ledger</p>
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-700/40"
            >
              <span className="text-sm text-slate-700 dark:text-slate-200">{r.label}</span>
              <span className={`text-sm font-bold ${r.tone}`}>{formatCurrency(r.value)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Collection by method</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <div
                key={m}
                className="p-3 rounded-xl border border-border dark:border-border"
              >
                <p className="text-[10px] uppercase text-muted font-semibold">{m}</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {formatCurrency(summary.byMethod[m] || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {summary.todays.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent today</p>
            <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1.5">
              {summary.todays.slice(0, 12).map((t) => (
                <div key={t.id} className="flex justify-between text-xs px-1 py-1">
                  <span className="text-muted truncate pr-2">
                    {t.itemDescription || t.type}
                    {t.customerName ? ` · ${t.customerName}` : ''}
                  </span>
                  <span className="font-medium shrink-0">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
