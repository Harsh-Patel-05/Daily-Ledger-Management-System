import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { formatPhone } from '../../utils/formatters';
import { filterBySearch, sortBy, getStatusColor } from '../../utils/helpers';
import { formatDisplayDate } from '../../data/companies';
import { exportToCsv } from '../../utils/exportCsv';
import {
  Breadcrumbs, Card, SearchBox, Table, Pagination,
  Button, ConfirmationDialog, EmptyState, ExportButton,
} from '../../components/ui';
import { cn } from '../../utils/formatters';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'own', label: 'Own' },
  { id: 'managed', label: 'Managed' },
];

export default function CompanyList() {
  const { companies, switchCompany, removeCompany, activeCompanyId } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [deleteId, setDeleteId] = useState(null);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    let list = filterBySearch(companies, debouncedSearch, [
      'name', 'gstin', 'mobile', 'city', 'state', 'legalName', 'alias',
    ]);
    if (tab === 'own') list = list.filter((c) => (c.ownership || 'own') === 'own');
    if (tab === 'managed') list = list.filter((c) => (c.ownership || 'own') === 'shared' || c.ownership === 'managed');
    list = sortBy(list, 'name', 'asc');
    return [...list].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
  }, [companies, debouncedSearch, tab]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 10);

  useEffect(() => { resetPage(); }, [debouncedSearch, tab]);

  const handleDelete = async () => {
    try {
      await removeCompany(deleteId);
      setDeleteId(null);
      toast.success('Company deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const openCompany = async (row, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    try {
      if (String(row.id) !== String(activeCompanyId)) {
        await switchCompany(row.id);
        toast.success(`Working in ${row.name}`);
      }
      navigate(`/companies/${row.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open company'));
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Company Name',
      mobilePrimary: true,
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => openCompany(row, e)}
          className="text-left font-medium text-primary hover:underline truncate max-w-[220px]"
        >
          {row.name || 'Untitled'}
        </button>
      ),
    },
    {
      key: 'gstin',
      label: 'GSTIN/UIN',
      render: (v) => v || '—',
    },
    {
      key: 'mobile',
      label: 'Mobile No.',
      render: (v) => formatPhone(v),
    },
    {
      key: 'organizationType',
      label: 'Organization Type',
      hideOnMobile: true,
      render: (v) => v || '—',
    },
    {
      key: 'city',
      label: 'City',
      hideOnMobile: true,
      render: (v) => v || '—',
    },
    {
      key: 'state',
      label: 'State',
      hideOnMobile: true,
      render: (v) => v || '—',
    },
    {
      key: 'establishDate',
      label: 'Establish Date',
      hideOnMobile: true,
      render: (v) => formatDisplayDate(v),
    },
    {
      key: 'subscriptionStatus',
      label: 'Subscription Status',
      render: (v) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(v)}`}>
          {v || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      isActions: true,
      render: (_, row) => (
        <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/companies/${row.id}/edit`)}
            className="text-sm font-medium text-primary hover:underline px-1"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(row.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
            title={row.isPrimary ? 'Primary company cannot be deleted' : 'Delete'}
            disabled={row.isPrimary}
          >
            <FaTrash size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Companies' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Companies</h1>
          <p className="text-sm text-muted mt-0.5">
            Switch from the header anytime — active company drives the whole app
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            onExport={() => {
              if (!filtered.length) {
                toast.error('Nothing to export');
                return;
              }
              exportToCsv(
                filtered.map((c) => ({
                  Name: c.name,
                  GSTIN: c.gstin || '',
                  Mobile: c.mobile || '',
                  Organization: c.organizationType || '',
                  City: c.city || '',
                  State: c.state || '',
                  Established: c.establishDate || '',
                  Status: c.subscriptionStatus || '',
                  Type: c.ownership || 'own',
                })),
                'companies.csv'
              );
              toast.success('Companies exported');
            }}
          />
          <Link to="/companies/create">
            <Button><FaPlus size={12} /> Create Company</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, GSTIN, mobile, city..."
            className="w-full max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="companies"
            title="No companies found"
            description="Create a company with GST or without GST to get started."
            actionLabel="Create Company"
            onAction={() => navigate('/companies/create')}
          />
        ) : (
          <>
            <Table columns={columns} data={data} onRowClick={(row) => openCompany(row)} />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
