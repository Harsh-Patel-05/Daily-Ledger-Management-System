import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaUpload, FaEye, FaTrash } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import {
  Breadcrumbs, Card, SearchBox, Filter, Table, Pagination,
  Button, Badge, ConfirmationDialog, EmptyState, ExportButton,
} from '../../components/ui';
import { exportToCsv, invoicesToCsvRows } from '../../utils/exportCsv';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

export default function InvoiceList() {
  const { invoices, deleteInvoice } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    let list = filterBySearch(invoices, debouncedSearch, [
      'invoiceNumber', 'customerName', 'customerBusiness',
    ]);
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (typeFilter) list = list.filter((i) => (i.gstType || (Number(i.taxAmount) > 0 ? 'GST' : 'Non-GST')) === typeFilter);
    return list;
  }, [invoices, debouncedSearch, statusFilter, typeFilter]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);

  useEffect(() => { resetPage(); }, [debouncedSearch, statusFilter, typeFilter]);

  const statusVariant = {
    paid: 'success',
    partial: 'warning',
    unpaid: 'primary',
    overdue: 'danger',
  };

  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (v) => <span className="font-semibold text-primary">{v}</span>,
    },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    {
      key: 'gstType',
      label: 'Type',
      render: (v, row) => {
        const type = v || (Number(row.taxAmount) > 0 ? 'GST' : 'Non-GST');
        return (
          <Badge variant={type === 'GST' ? 'primary' : 'default'}>{type}</Badge>
        );
      },
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{v}</p>
          <p className="text-xs text-muted">{row.customerBusiness}</p>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Amount',
      align: 'right',
      render: (v) => <span className="font-semibold">{formatCurrency(v)}</span>,
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (v) => (
        <span className={v > 0 ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <Badge variant={statusVariant[v] || 'default'}>{v}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/invoices/${row.id}`)}
            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30"
            title="View"
          >
            <FaEye size={13} />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30"
            title="Delete"
          >
            <FaTrash size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Sales Invoices' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Invoices</h1>
          <p className="text-sm text-muted mt-0.5">{invoices.length} invoices · generate or upload</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            onExport={() => {
              exportToCsv(invoicesToCsvRows(filtered), 'invoices.csv');
              toast.success('Invoices exported');
            }}
          />
          <Link to="/invoices/upload">
            <Button variant="outline"><FaUpload size={12} /> Upload Invoice</Button>
          </Link>
          <Link to="/invoices/create">
            <Button><FaPlus size={12} /> Create Invoice</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            title: 'Quick Invoice',
            desc: 'Create invoice fast in a modal with customer & product.',
            action: () => openModal('quickInvoice'),
            icon: FaPlus,
            color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30',
          },
          {
            title: 'Upload & Extract',
            desc: 'Upload invoice photo. OCR fills data — no manual entry.',
            to: '/invoices/upload',
            icon: FaUpload,
            color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30',
          },
        ].map((card) => (
          card.to ? (
            <Link key={card.title} to={card.to}>
              <Card hover className="h-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{card.title}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{card.desc}</p>
              </Card>
            </Link>
          ) : (
            <button key={card.title} type="button" onClick={card.action} className="text-left w-full">
              <Card hover className="h-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{card.title}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{card.desc}</p>
              </Card>
            </button>
          )
        ))}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search invoice #, customer..."
            className="flex-1"
          />
          <Filter
            value={statusFilter}
            onChange={setStatusFilter}
            label="All Status"
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <Filter
            value={typeFilter}
            onChange={setTypeFilter}
            label="All Types"
            options={[
              { value: 'GST', label: 'GST' },
              { value: 'Non-GST', label: 'Non-GST' },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="reports"
            title="No invoices yet"
            description="Create a new invoice or upload an existing one to extract data."
            actionLabel="Create Invoice"
            onAction={() => navigate('/invoices/create')}
          />
        ) : (
          <>
            <Table columns={columns} data={data} onRowClick={(row) => navigate(`/invoices/${row.id}`)} />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await deleteInvoice(deleteId);
            setDeleteId(null);
            toast.success('Invoice deleted');
          } catch (err) {
            toast.error(getApiErrorMessage(err, 'Delete failed'));
          }
        }}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice?"
        confirmText="Delete"
      />
    </div>
  );
}
