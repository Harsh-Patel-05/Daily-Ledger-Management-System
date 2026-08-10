import { useMemo, useState } from 'react';
import { FaBell, FaHandHoldingUsd, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DueCollectionsModal() {
  const { current, closeModal, openModal } = useModal();
  const open = current?.type === 'dueCollections';
  const { customers, invoices } = useApp();
  const [tab, setTab] = useState('overdue');

  const data = useMemo(() => {
    const today = todayISO();
    const withBalance = [...customers]
      .filter((c) => Number(c.currentBalance || 0) > 0)
      .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance));

    const overdue = withBalance.filter((c) => c.status === 'overdue');
    const active = withBalance.filter((c) => c.status !== 'overdue');

    const dueInvoices = invoices
      .filter((i) => i.status !== 'paid' && Number(i.balance || 0) > 0)
      .map((i) => ({
        ...i,
        isOverdue: i.dueDate ? i.dueDate < today : i.status === 'overdue',
        isDueToday: i.dueDate === today,
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance));

    const dueTodayInvoices = dueInvoices.filter((i) => i.isDueToday || i.isOverdue);
    const totalDue = withBalance.reduce((s, c) => s + Number(c.currentBalance || 0), 0);

    return { overdue, active, dueTodayInvoices, totalDue, withBalance };
  }, [customers, invoices]);

  if (!open) return null;

  const list =
    tab === 'overdue' ? data.overdue
      : tab === 'all' ? data.withBalance
        : data.dueTodayInvoices;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Collections Due"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={closeModal}>Close</Button>
          <Button onClick={() => { closeModal(); openModal('recordPayment'); }}>
            <FaHandHoldingUsd size={12} /> Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <p className="text-[10px] uppercase text-muted font-semibold">Overdue</p>
            <p className="text-lg font-bold text-red-600">{data.overdue.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <p className="text-[10px] uppercase text-muted font-semibold">Pending cust.</p>
            <p className="text-lg font-bold text-amber-600">{data.withBalance.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary-soft border border-primary/15">
            <p className="text-[10px] uppercase text-muted font-semibold">Total due</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(data.totalDue)}</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-700/50">
          {[
            { id: 'overdue', label: 'Overdue', short: 'Due', icon: FaExclamationTriangle },
            { id: 'all', label: 'All pending', short: 'All', icon: FaClock },
            { id: 'invoices', label: 'Invoice due', short: 'Inv', icon: FaBell },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-1.5 sm:px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <t.icon size={11} className="shrink-0" />
              <span className="sm:hidden truncate">{t.short}</span>
              <span className="hidden sm:inline truncate">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[360px] overflow-y-auto scrollbar-thin space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">
              {tab === 'overdue' ? 'No overdue customers 🎉' : 'Nothing pending'}
            </p>
          ) : tab === 'invoices' ? (
            list.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border dark:border-border hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {inv.invoiceNumber}
                    </p>
                    <Badge variant={inv.isOverdue ? 'danger' : 'warning'}>
                      {inv.isDueToday ? 'Due today' : inv.isOverdue ? 'Overdue' : inv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted truncate">
                    {inv.customerName}
                    {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(inv.balance)}</p>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    closeModal();
                    openModal('recordPayment', {
                      customerId: inv.customerId,
                      invoiceId: inv.id,
                      invoiceNumber: inv.invoiceNumber,
                      defaultAmount: inv.balance,
                    });
                  }}
                >
                  Collect
                </Button>
              </div>
            ))
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border dark:border-border hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                    {c.status === 'overdue' && <Badge variant="danger">Overdue</Badge>}
                  </div>
                  <p className="text-xs text-muted truncate">
                    {c.businessName || formatPhone(c.mobile)}
                    {c.creditLimit ? ` · Limit ${formatCurrency(c.creditLimit)}` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(c.currentBalance)}</p>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      closeModal();
                      openModal('recordPayment', {
                        customerId: c.id,
                        defaultAmount: c.currentBalance,
                      });
                    }}
                  >
                    Pay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      closeModal();
                      openModal('sendReminder', { customerId: c.id });
                    }}
                    title="Send reminder"
                  >
                    <FaBell size={11} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
