import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { Card, SearchBox, Table, Pagination, Button, EmptyState, StatCard } from '../../components/ui';

function payMethod(t) {
  return t.paymentMethod || t.paymentMode || t.mode || '—';
}

export function PaymentIn() {
  const { transactions, customers } = useApp();
  const { openModal } = useModal();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const list = useMemo(() => {
    const rows = transactions
      .filter((t) => ['payment', 'credit_payment'].includes(t.type))
      .map((t) => ({
        ...t,
        partyName: customers.find((c) => String(c.id) === String(t.customerId))?.name || '—',
        method: payMethod(t),
      }));
    return filterBySearch(rows, debouncedSearch, ['partyName', 'notes', 'method', 'reference']);
  }, [transactions, customers, debouncedSearch]);

  const totalAmt = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'partyName', label: 'From' },
    { key: 'method', label: 'Mode' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v) => <span className="font-semibold text-emerald-600">{formatCurrency(v)}</span>,
    },
    { key: 'notes', label: 'Notes', render: (v) => v || '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment In"
        subtitle="Money received from customers"
        breadcrumbs={[{ label: 'Payments', to: '/payments/history' }, { label: 'Payment In' }]}
        actions={<Button onClick={() => openModal('recordPayment')}>Record Payment In</Button>}
      />
      <StatCard title="Total In" value={formatCurrency(totalAmt)} color="green" />
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No payment in yet" description="Collect from customers to see entries here." actionLabel="Record Payment" onAction={() => openModal('recordPayment')} />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}

export function PaymentOut() {
  const { transactions } = useApp();
  const { purchasePayments, expenses } = useLocalModules();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const list = useMemo(() => {
    const fromTx = transactions
      .filter((t) => t.type === 'expense' || t.type === 'payment_out')
      .map((t) => ({
        id: `tx-${t.id}`,
        date: t.date,
        partyName: t.notes || t.itemDescription || 'Expense',
        method: payMethod(t),
        amount: t.amount,
        source: 'Expense Txn',
        notes: t.notes,
      }));
    const fromPurchase = purchasePayments.items.map((p) => ({
      id: `pp-${p.id}`,
      date: p.date,
      partyName: p.supplierName,
      method: p.mode || '—',
      amount: p.amount,
      source: 'Purchase',
      notes: p.billNo ? `Bill ${p.billNo}` : p.notes,
    }));
    const fromExp = expenses.items.map((e) => ({
      id: `ex-${e.id}`,
      date: e.date,
      partyName: e.categoryName,
      method: e.paymentMode || '—',
      amount: e.amount,
      source: 'Expense',
      notes: e.notes,
    }));
    const rows = [...fromTx, ...fromPurchase, ...fromExp]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return filterBySearch(rows, debouncedSearch, ['partyName', 'notes', 'method', 'source']);
  }, [transactions, purchasePayments.items, expenses.items, debouncedSearch]);

  const totalAmt = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'source', label: 'Source' },
    { key: 'partyName', label: 'To / Category' },
    { key: 'method', label: 'Mode' },
    {
      key: 'amount',
      label: 'Amount',
      render: (v) => <span className="font-semibold text-red-600">{formatCurrency(v)}</span>,
    },
    { key: 'notes', label: 'Notes', render: (v) => v || '—' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment Out"
        subtitle="Vendor payments + expenses"
        breadcrumbs={[{ label: 'Payments', to: '/payments/history' }, { label: 'Payment Out' }]}
        actions={(
          <>
            <Button variant="outline" onClick={() => navigate('/purchase/payments')}>Purchase Payment</Button>
            <Button onClick={() => openModal('quickExpense')}>Quick Expense</Button>
          </>
        )}
      />
      <StatCard title="Total Out" value={formatCurrency(totalAmt)} color="red" />
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No payment out yet" description="Pay vendors or add expenses." />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}

export default function PaymentHistory() {
  const { transactions, customers } = useApp();
  const { purchasePayments, expenses } = useLocalModules();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const list = useMemo(() => {
    const moneyTypes = ['payment', 'credit_payment', 'expense', 'payment_out'];
    const rows = [
      ...transactions
        .filter((t) => moneyTypes.includes(t.type))
        .map((t) => ({
          id: `tx-${t.id}`,
          date: t.date,
          direction: ['payment', 'credit_payment'].includes(t.type) ? 'In' : 'Out',
          partyName: customers.find((c) => String(c.id) === String(t.customerId))?.name || t.notes || '—',
          type: t.type,
          method: payMethod(t),
          amount: t.amount,
        })),
      ...purchasePayments.items.map((p) => ({
        id: `pp-${p.id}`,
        date: p.date,
        direction: 'Out',
        partyName: p.supplierName,
        type: 'purchase_payment',
        method: p.mode,
        amount: p.amount,
      })),
      ...expenses.items.map((e) => ({
        id: `ex-${e.id}`,
        date: e.date,
        direction: 'Out',
        partyName: e.categoryName,
        type: 'expense',
        method: e.paymentMode,
        amount: e.amount,
      })),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return filterBySearch(rows, debouncedSearch, ['partyName', 'type', 'method', 'direction']);
  }, [transactions, customers, purchasePayments.items, expenses.items, debouncedSearch]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'direction', label: 'In/Out' },
    { key: 'partyName', label: 'Party' },
    { key: 'type', label: 'Type' },
    { key: 'method', label: 'Mode', render: (v) => v || '—' },
    { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment History"
        subtitle="All payment in and out across sales, purchase & expenses"
        breadcrumbs={[{ label: 'Payments', to: '/payments/history' }, { label: 'Payment History' }]}
        actions={(
          <Link to="/payments/in"><Button variant="outline" size="sm">Payment In</Button></Link>
        )}
      />
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search history..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No payment history" description="Payments will appear as you collect and pay." />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}
