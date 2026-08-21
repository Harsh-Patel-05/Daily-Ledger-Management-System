import { useMemo, useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useApp } from '../../context/AppContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, Modal,
  EmptyState, ConfirmationDialog,
} from '../../components/ui';

export default function SalesReturns() {
  const { customers, invoices } = useApp();
  const { salesReturns } = useLocalModules();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    customerId: '',
    invoiceId: '',
    amount: '',
    reason: '',
    gstApplicable: 'yes',
  });
  const debouncedSearch = useDebounce(search);

  const enriched = useMemo(() => salesReturns.items.map((r) => ({
    ...r,
    customerName: customers.find((c) => String(c.id) === String(r.customerId))?.name || r.customerName || '—',
    invoiceNo: invoices.find((i) => String(i.id) === String(r.invoiceId))?.invoiceNumber || r.invoiceNo || '—',
  })), [salesReturns.items, customers, invoices]);

  const list = useMemo(
    () => filterBySearch(enriched, debouncedSearch, ['customerName', 'invoiceNo', 'reason']),
    [enriched, debouncedSearch]
  );
  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 8);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerId || !form.amount) {
      toast.error('Customer and amount are required');
      return;
    }
    const amount = Number(form.amount) || 0;
    const customer = customers.find((c) => String(c.id) === String(form.customerId));
    const invoice = invoices.find((i) => String(i.id) === String(form.invoiceId));
    setSaving(true);
    try {
      // Backend SalesReturn create also writes Transaction type=return
      const __apiRes = await salesReturns.add({
        ...form,
        amount,
        customerName: customer?.name || '',
        invoiceNo: invoice?.invoiceNumber || '',
        gstApplicable: form.gstApplicable === 'yes',
      });
      toast.success(getApiMessage(__apiRes, 'Sales return recorded · customer balance updated'));
      setOpen(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        customerId: '',
        invoiceId: '',
        amount: '',
        reason: '',
        gstApplicable: 'yes',
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save return'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'customerName', label: 'Customer' },
    { key: 'invoiceNo', label: 'Invoice' },
    { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
    {
      key: 'gstApplicable',
      label: 'GST',
      render: (v) => (v ? 'GST' : 'Non-GST'),
    },
    { key: 'reason', label: 'Reason', render: (v) => v || '—' },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button type="button" className="text-xs text-red-500" onClick={() => setDeleteId(row.id)}>Delete</button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Returns"
        subtitle="GST and Non-GST sales returns"
        breadcrumbs={[{ label: 'Sales', to: '/sales/invoices' }, { label: 'Sales Returns' }]}
        actions={<Button onClick={() => setOpen(true)}><FaPlus size={12} /> Add Return</Button>}
      />
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search returns..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No sales returns" description="Record returned goods against sales invoices." actionLabel="Add Return" onAction={() => setOpen(true)} />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Sales Return">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          <Dropdown
            label="Customer"
            value={form.customerId}
            onChange={set('customerId')}
            options={customers.map((c) => ({ value: String(c.id), label: c.name }))}
            required
          />
          <Dropdown
            label="Invoice (optional)"
            value={form.invoiceId}
            onChange={set('invoiceId')}
            options={invoices.map((i) => ({ value: String(i.id), label: i.invoiceNumber || String(i.id) }))}
          />
          <Input label="Amount" type="number" value={form.amount} onChange={set('amount')} required />
          <Dropdown
            label="Tax Type"
            value={form.gstApplicable}
            onChange={set('gstApplicable')}
            options={[
              { value: 'yes', label: 'GST' },
              { value: 'no', label: 'Non-GST' },
            ]}
          />
          <Input label="Reason" value={form.reason} onChange={set('reason')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          try {
            await salesReturns.remove(deleteId);
            setDeleteId(null);
            toast.success('Deleted');
          } catch (err) {
            toast.error(getApiErrorMessage(err, 'Delete failed'));
          }
        }}
        title="Delete return?"
        message="This will permanently delete the sales return on the server."
      />
    </div>
  );
}
