import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { Card, SearchBox, Table, Pagination, Button, EmptyState, StatCard } from '../../components/ui';

export default function SalesPayments() {
  const { transactions, customers } = useApp();
  const { openModal } = useModal();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const nameOf = (id) => customers.find((c) => String(c.id) === String(id))?.name || '—';

  const list = useMemo(() => {
    const rows = transactions
      .filter((t) => t.type === 'payment' || t.type === 'credit_payment')
      .map((t) => ({ ...t, customerName: nameOf(t.customerId) }));
    return filterBySearch(rows, debouncedSearch, ['customerName', 'notes', 'paymentMode', 'reference']);
  }, [transactions, customers, debouncedSearch]);

  const total = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const { data, page, totalPages, total: count, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'customerName', label: 'Customer' },
    { key: 'paymentMode', label: 'Mode', render: (v) => v || '—' },
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
        title="Sales Payments"
        subtitle="Payments received against sales"
        breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Sales Payments' }]}
        actions={<Button onClick={() => openModal('recordPayment')}>Record Payment</Button>}
      />
      <StatCard title="Total Received" value={formatCurrency(total)} color="green" />
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search payments..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No sales payments" description="Record a payment from a customer to see it here." actionLabel="Record Payment" onAction={() => openModal('recordPayment')} />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={count} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}
