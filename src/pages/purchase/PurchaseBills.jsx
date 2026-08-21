import { useMemo, useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useInventory } from '../../context/InventoryContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, Modal,
  EmptyState, StatCard, ConfirmationDialog,
} from '../../components/ui';

const emptyForm = (isGstEnabled, billNo = '') => ({
  billNo,
  date: new Date().toISOString().slice(0, 10),
  supplierName: '',
  taxableAmount: '',
  gstAmount: '',
  paid: '',
  gstType: isGstEnabled ? 'GST' : 'Non-GST',
  productId: '',
  stockQty: '',
});

export default function PurchaseBills() {
  const { purchaseBills, addPurchaseBill } = useLocalModules();
  const { suppliers, products } = useInventory();
  const { isGstEnabled } = useCompanies();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(isGstEnabled));
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (!isGstEnabled) {
      setForm((f) => ({ ...f, gstType: 'Non-GST', gstAmount: '0' }));
    }
  }, [isGstEnabled]);

  const list = useMemo(
    () => filterBySearch(purchaseBills.items, debouncedSearch, ['billNo', 'supplierName', 'gstType', 'status']),
    [purchaseBills.items, debouncedSearch]
  );
  const totals = useMemo(() => ({
    bills: purchaseBills.items.length,
    payable: purchaseBills.items.reduce((s, b) => s + (Number(b.balance) || 0), 0),
    purchase: purchaseBills.items.reduce((s, b) => s + (Number(b.total) || 0), 0),
  }), [purchaseBills.items]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(list, 8);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const set = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm(
      isGstEnabled,
      `PB-${String(purchaseBills.items.length + 2).padStart(3, '0')}`
    ));
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      billNo: row.billNo || '',
      date: row.date || new Date().toISOString().slice(0, 10),
      supplierName: row.supplierName || '',
      taxableAmount: String(row.taxableAmount ?? row.subtotal ?? ''),
      gstAmount: String(row.gstAmount ?? row.taxAmount ?? ''),
      paid: String(row.paid ?? row.paidAmount ?? ''),
      gstType: row.gstType || (isGstEnabled ? 'GST' : 'Non-GST'),
      productId: '',
      stockQty: '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.billNo || !form.supplierName || !form.taxableAmount) {
      toast.error('Bill no, vendor and amount required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const __apiRes = await purchaseBills.update(editing.id, form);
        toast.success(getApiMessage(__apiRes, 'Purchase bill updated'));
      } else {
        await addPurchaseBill(form);
        const qty = Number(form.stockQty) || 0;
        toast.success(
          form.productId && qty > 0
            ? 'Purchase bill added · stock updated'
            : 'Purchase bill added'
        );
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save bill'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await purchaseBills.remove(deleteId);
      setDeleteId(null);
      toast.success('Deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const columns = [
    { key: 'billNo', label: 'Bill No' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'supplierName', label: 'Vendor' },
    { key: 'gstType', label: 'Type' },
    { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
    { key: 'balance', label: 'Balance', render: (v) => <span className="text-amber-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex gap-2 justify-end">
          <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => openEdit(row)} aria-label="Edit">
            <FaEdit size={12} />
          </button>
          <button type="button" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => setDeleteId(row.id)} aria-label="Delete">
            <FaTrash size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Bills"
        subtitle="GST and Non-GST purchase · optional stock-in · payments update balance"
        breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Purchase Bills' }]}
        actions={<Button onClick={openCreate}><FaPlus size={12} /> Add Bill</Button>}
      />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Bills" value={String(totals.bills)} color="blue" />
        <StatCard title="Purchase Value" value={formatCurrency(totals.purchase)} color="purple" />
        <StatCard title="Payable" value={formatCurrency(totals.payable)} color="amber" />
      </div>
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search bills..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No purchase bills" description="Add vendor bills to track purchases." actionLabel="Add Bill" onAction={openCreate} />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Purchase Bill' : 'Add Purchase Bill'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Bill No" value={form.billNo} onChange={set('billNo')} required />
          <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          <Dropdown
            label="Vendor"
            value={form.supplierName}
            onChange={set('supplierName')}
            options={[
              ...suppliers.map((s) => ({ value: s.name, label: s.name })),
            ]}
            required
          />
          {isGstEnabled ? (
            <Dropdown
              label="Tax Type"
              value={form.gstType}
              onChange={set('gstType')}
              options={[
                { value: 'GST', label: 'GST' },
                { value: 'Non-GST', label: 'Non-GST' },
              ]}
            />
          ) : (
            <Input label="Tax Type" value="Non-GST" disabled />
          )}
          <Input label="Taxable Amount" type="number" value={form.taxableAmount} onChange={set('taxableAmount')} required />
          {isGstEnabled && form.gstType === 'GST' && (
            <Input label="GST Amount" type="number" value={form.gstAmount} onChange={set('gstAmount')} />
          )}
          <Input label="Paid Now" type="number" value={form.paid} onChange={set('paid')} />
          {!editing && (
            <>
              <Dropdown
                label="Stock In Product (optional)"
                value={form.productId}
                onChange={set('productId')}
                options={[
                  { value: '', label: '— Skip stock —' },
                  ...products.map((p) => ({ value: String(p.id), label: p.name })),
                ]}
              />
              {form.productId && (
                <Input label="Stock Quantity" type="number" value={form.stockQty} onChange={set('stockQty')} />
              )}
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Update Bill' : 'Save Bill'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete bill?"
        message="This will permanently delete the purchase bill on the server."
      />
    </div>
  );
}
