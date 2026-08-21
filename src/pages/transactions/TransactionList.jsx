import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch, TRANSACTION_TYPES } from '../../utils/helpers';
import { exportToCsv, transactionsToCsvRows } from '../../utils/exportCsv';
import {
  Breadcrumbs, Card, SearchBox, Filter, Table, Pagination,
  Button, Badge, EmptyState, ExportButton, DatePicker,
} from '../../components/ui';

export default function TransactionList() {
  const { transactions } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    let list = filterBySearch(transactions, debouncedSearch, ['customerName', 'itemDescription', 'paymentMethod']);
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (fromDate) list = list.filter((t) => t.date >= fromDate);
    if (toDate) list = list.filter((t) => t.date <= toDate);
    return list;
  }, [transactions, debouncedSearch, typeFilter, fromDate, toDate]);

  const summary = useMemo(() => ({
    credit: filtered.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    payment: filtered.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0),
    count: filtered.length,
  }), [filtered]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 10);

  useEffect(() => { resetPage(); }, [debouncedSearch, typeFilter, fromDate, toDate]);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    {
      key: 'customerName',
      label: 'Customer',
      render: (v, row) => (
        <Link to={`/customers/${row.customerId}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {v}
        </Link>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (v) => (
        <Badge variant={v === 'payment' ? 'success' : v === 'credit' ? 'primary' : v === 'expense' ? 'danger' : 'warning'}>
          {TRANSACTION_TYPES[v]?.label || v}
        </Badge>
      ),
    },
    { key: 'itemDescription', label: 'Description' },
    { key: 'quantity', label: 'Qty', align: 'center' },
    { key: 'rate', label: 'Rate', align: 'right', render: (v) => formatCurrency(v) },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (v, row) => (
        <span className={`font-semibold ${row.type === 'payment' || row.type === 'return' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
          {formatCurrency(v)}
        </span>
      ),
    },
    { key: 'paymentMethod', label: 'Method' },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Transactions' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Transactions</h1>
          <p className="text-sm text-muted mt-0.5">{transactions.length} total entries</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            onExport={() => {
              exportToCsv(transactionsToCsvRows(filtered), 'transactions.csv');
              toast.success('Transactions exported');
            }}
          />
          <Link to="/transactions/add">
            <Button><FaPlus size={12} /> New Transaction</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-muted">Filtered Credits</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.credit)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-muted">Filtered Collections</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.payment)}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-muted">Matching Entries</p>
          <p className="text-lg font-bold text-slate-800 dark:text-white">{summary.count}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 mb-5">
          <SearchBox value={search} onChange={setSearch} placeholder="Search transactions..." className="w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Filter
              value={typeFilter}
              onChange={setTypeFilter}
              label="All Types"
              options={Object.entries(TRANSACTION_TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <DatePicker label="" value={fromDate} onChange={setFromDate} className="w-full" />
            <DatePicker label="" value={toDate} onChange={setToDate} className="w-full" />
            {(fromDate || toDate || typeFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto justify-center"
                onClick={() => { setFromDate(''); setToDate(''); setTypeFilter(''); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="transactions"
            title="No transactions found"
            description="Create your first transaction or adjust filters."
            actionLabel="New Transaction"
            onAction={() => navigate('/transactions/add')}
          />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>
    </div>
  );
}
