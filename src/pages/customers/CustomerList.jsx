import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaEye, FaEdit, FaTrash, FaBook, FaSortAmountDown, FaBell } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatPhone, formatDate } from '../../utils/formatters';
import { filterBySearch, sortBy, getStatusColor } from '../../utils/helpers';
import {
  Breadcrumbs, Card, SearchBox, Filter, Table, Pagination,
  Button, Avatar, ConfirmationDialog, FloatingAddButton, EmptyState, ExportButton, ProgressBar,
} from '../../components/ui';
import { exportToCsv, customersToCsvRows } from '../../utils/exportCsv';

export default function CustomerList() {
  const { customers, deleteCustomer } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const { openModal } = useModal();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    let list = filterBySearch(customers, debouncedSearch, ['name', 'mobile', 'businessName', 'gst']);
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    return sortBy(list, sortKey, sortDir);
  }, [customers, debouncedSearch, statusFilter, sortKey, sortDir]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);

  useEffect(() => { resetPage(); }, [debouncedSearch, statusFilter]);

  const handleDelete = () => {
    deleteCustomer(deleteId);
    setDeleteId(null);
    toast.success('Customer deleted successfully');
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
            <p className="text-xs text-muted">{row.businessName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mobile',
      label: 'Phone',
      render: (v) => formatPhone(v),
    },
    {
      key: 'currentBalance',
      label: 'Balance / Limit',
      render: (_, row) => (
        <div className="min-w-[120px]">
          <p className={`text-sm font-semibold ${row.currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatCurrency(row.currentBalance)}
          </p>
          <ProgressBar value={row.currentBalance} max={row.creditLimit} showLabel={false} size="sm" className="mt-1" color="amber" />
        </div>
      ),
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      align: 'right',
      render: (v) => formatCurrency(v),
    },
    {
      key: 'lastTransaction',
      label: 'Last Txn',
      render: (v) => formatDate(v),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(v)}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openModal('viewCustomer', { customerId: row.id })} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30" title="Quick view">
            <FaEye size={13} />
          </button>
          <button onClick={() => navigate(`/customers/${row.id}/edit`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700" title="Edit">
            <FaEdit size={13} />
          </button>
          <button onClick={() => openModal('sendReminder', { customerId: row.id })} className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-900/30" title="Reminder">
            <FaBell size={13} />
          </button>
          <button onClick={() => navigate(`/ledger?customer=${row.id}`)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-900/30" title="Ledger">
            <FaBook size={13} />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30" title="Delete">
            <FaTrash size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Customers' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customers</h1>
          <p className="text-sm text-muted mt-0.5">{customers.length} total customers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            onExport={() => {
              exportToCsv(customersToCsvRows(filtered), 'customers.csv');
              toast.success('Customers exported');
            }}
          />
          <Button variant="outline" onClick={() => openModal('quickCustomer')}>
            <FaPlus size={12} /> Quick Add
          </Button>
          <Link to="/customers/add">
            <Button><FaPlus size={12} /> Add Customer</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, business, GST..."
            className="flex-1"
          />
          <Filter
            value={statusFilter}
            onChange={setStatusFilter}
            label="All Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <div className="relative inline-flex items-center">
            <FaSortAmountDown className="absolute left-3 text-slate-400" size={12} />
            <select
              value={`${sortKey}-${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('-');
                setSortKey(k);
                setSortDir(d);
              }}
              className="appearance-none rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 pl-8 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="currentBalance-desc">Balance High–Low</option>
              <option value="currentBalance-asc">Balance Low–High</option>
              <option value="lastTransaction-desc">Recent First</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="customers"
            title="No customers found"
            description="Try adjusting your search or add a new customer."
            actionLabel="Add Customer"
            onAction={() => navigate('/customers/add')}
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={data}
              onRowClick={(row) => navigate(`/customers/${row.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <FloatingAddButton to="/customers/add" label="Add Customer" />

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
