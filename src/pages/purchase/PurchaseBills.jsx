import { useMemo, useState, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useInventory } from '../../context/InventoryContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import PageHeader from '../../components/pages/PageHeader';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, Modal,
  EmptyState, FloatingAddButton, StatCard, ConfirmationDialog,
} from '../../components/ui';

export default function PurchaseBills() {
  const { purchaseBills, addPurchaseBill } = useLocalModules();
  const { suppliers, products } = useInventory();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    billNo: '',
    date: new Date().toISOString().slice(0, 10),
    supplierName: '',
    taxableAmount: '',
    gstAmount: '',
    paid: '',
    gstType: 'GST',
    productId: '',
    stockQty: '',
  });
  const debouncedSearch = useDebounce(search);

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
    setForm({
      billNo: `PB-${String(purchaseBills.items.length + 2).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      supplierName: '',
      taxableAmount: '',
      gstAmount: '',
      paid: '',
      gstType: 'GST',
      productId: '',
      stockQty: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.billNo || !form.supplierName || !form.taxableAmount) {
      toast.error('Bill no, supplier and amount required');
      return;
    }
    setSaving(true);
    try {
      await addPurchaseBill(form);
      const qty = Number(form.stockQty) || 0;
      toast.success(
        form.productId && qty > 0
          ? 'Purchase bill added · stock updated'
          : 'Purchase bill added'
      );
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err.message || 'Could not save bill');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'billNo', label: 'Bill No' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'supplierName', label: 'Supplier' },
    { key: 'gstType', label: 'Type' },
    { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
    { key: 'balance', label: 'Balance', render: (v) => <span className="text-amber-600 font-medium">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status' },
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
        title="Purchase Bills"
        subtitle="GST and Non-GST purchase · optional stock-in · payments update balance"
        breadcrumbs={[{ label: 'Purchase', to: '/purchase/bills' }, { label: 'Purchase Bills' }]}
        actions={<Button onClick={() => { resetForm(); setOpen(true); }}><FaPlus size={12} /> Add Bill</Button>}
      />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Bills" value={String(totals.bills)} color="blue" />
        <StatCard title="Purchase Value" value={formatCurrency(totals.purchase)} color="purple" />
        <StatCard title="Payable" value={formatCurrency(totals.payable)} color="amber" />
      </div>
      <Card>
        <div className="mb-4"><SearchBox value={search} onChange={setSearch} placeholder="Search bills..." /></div>
        {list.length === 0 ? (
          <EmptyState title="No purchase bills" description="Add supplier bills to track purchases." actionLabel="Add Bill" onAction={() => { resetForm(); setOpen(true); }} />
        ) : (
          <>
            <Table columns={columns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>
      <FloatingAddButton onClick={() => { resetForm(); setOpen(true); }} />

      <Modal open={open} onClose={() => setOpen(false)} title="Add Purchase Bill">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Bill No" value={form.billNo} onChange={set('billNo')} required />
          <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          <Dropdown
            label="Supplier"
            value={form.supplierName}
            onChange={set('supplierName')}
            options={[
              ...suppliers.map((s) => ({ value: s.name, label: s.name })),
            ]}
            required
          />
          <Dropdown
            label="Tax Type"
            value={form.gstType}
            onChange={set('gstType')}
            options={[
              { value: 'GST', label: 'GST' },
              { value: 'Non-GST', label: 'Non-GST' },
            ]}
          />
          <Input label="Taxable Amount" type="number" value={form.taxableAmount} onChange={set('taxableAmount')} required />
          {form.gstType === 'GST' && (
            <Input label="GST Amount" type="number" value={form.gstAmount} onChange={set('gstAmount')} />
          )}
          <Input label="Paid Now" type="number" value={form.paid} onChange={set('paid')} />
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Bill</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { purchaseBills.remove(deleteId); setDeleteId(null); toast.success('Deleted'); }}
        title="Delete bill?"
        message="Remove this purchase bill."
      />
    </div>
  );
}
