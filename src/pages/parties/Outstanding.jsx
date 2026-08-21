import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { filterBySearch, sortBy } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { Card, SearchBox, Table, Pagination, Button, EmptyState, Avatar, StatCard } from '../../components/ui';

export default function Outstanding() {
  const { customers } = useApp();
  const { supplierPayables } = useLocalModules();
  const { openModal } = useModal();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('receivable');
  const debouncedSearch = useDebounce(search);

  const receivables = useMemo(() => {
    const due = customers
      .filter((c) => Number(c.currentBalance) > 0)
      .map((c) => ({ ...c, partyType: 'customer' }));
    return sortBy(filterBySearch(due, debouncedSearch, ['name', 'mobile', 'businessName']), 'currentBalance', 'desc');
  }, [customers, debouncedSearch]);

  const payables = useMemo(() => {
    return sortBy(
      filterBySearch(supplierPayables, debouncedSearch, ['name']),
      'currentBalance',
      'desc'
    );
  }, [supplierPayables, debouncedSearch]);

  const list = tab === 'receivable' ? receivables : payables;
  const totalDue = list.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0);
  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 10);
  useEffect(() => { resetPage(); }, [debouncedSearch, tab]);

  const columns = tab === 'receivable'
    ? [
      {
        key: 'name',
        label: 'Customer',
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div>
              <Link to={`/customers/${row.id}`} className="font-medium text-primary hover:underline">{row.name}</Link>
              <p className="text-xs text-muted">{row.businessName || 'Customer'}</p>
            </div>
          </div>
        ),
      },
      { key: 'mobile', label: 'Phone', render: (v) => formatPhone(v) },
      {
        key: 'currentBalance',
        label: 'Outstanding',
        render: (v) => <span className="font-semibold text-amber-600">{formatCurrency(v)}</span>,
      },
      {
        key: 'actions',
        label: '',
        render: (_, row) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={() => openModal('recordPayment', { customerId: row.id })}>Collect</Button>
            <Button size="sm" variant="outline" onClick={() => openModal('sendReminder', { customerId: row.id })}>
              <FaBell size={11} /> Remind
            </Button>
          </div>
        ),
      },
    ]
    : [
      { key: 'name', label: 'Vendor' },
      {
        key: 'currentBalance',
        label: 'Payable',
        render: (v) => <span className="font-semibold text-red-600">{formatCurrency(v)}</span>,
      },
      {
        key: 'actions',
        label: '',
        render: () => (
          <Link to="/purchase/payments">
            <Button size="sm" variant="outline">Pay</Button>
          </Link>
        ),
      },
    ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Outstanding"
        subtitle="Receivables from customers · Payables to vendors"
        breadcrumbs={[{ label: 'Party Master', to: '/parties/customers' }, { label: 'Outstanding' }]}
        actions={<Button variant="outline" onClick={() => openModal('dueCollections')}>Due Collections</Button>}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title="Customer Due" value={formatCurrency(receivables.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0))} color="amber" />
        <StatCard title="Vendor Payable" value={formatCurrency(payables.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0))} color="red" />
      </div>

      <div className="flex gap-2">
        {[
          { id: 'receivable', label: 'Receivable (Customers)' },
          { id: 'payable', label: 'Payable (Vendors)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === t.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search parties..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No outstanding" description={tab === 'receivable' ? 'All customers settled.' : 'No vendor dues from purchase bills.'} />
        ) : (
          <>
            <p className="text-sm text-muted mb-3">Total: <strong>{formatCurrency(totalDue)}</strong></p>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  );
}
