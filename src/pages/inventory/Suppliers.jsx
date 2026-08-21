import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaPhone, FaEnvelope } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatPhone } from '../../utils/formatters';
import { filterBySearch } from '../../utils/helpers';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Breadcrumbs, Card, SearchBox, Button, Input, Modal,
  ConfirmationDialog, EmptyState, Table,
} from '../../components/ui';

const emptyForm = {
  name: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
  gst: '',
  notes: '',
};

export default function Suppliers() {
  const {
    suppliers, products, addSupplier, updateSupplier, deleteSupplier,
  } = useInventory();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(
    () => filterBySearch(suppliers, debouncedSearch, ['name', 'contactPerson', 'mobile', 'email', 'gst']),
    [suppliers, debouncedSearch]
  );

  const productCount = (id) => products.filter((p) => String(p.supplierId) === String(id)).length;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (sup) => {
    setEditing(sup);
    setForm({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      mobile: sup.mobile || '',
      email: sup.email || '',
      address: sup.address || '',
      gst: sup.gst || '',
      notes: sup.notes || '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Vendor name is required';
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Enter 10-digit mobile';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      if (editing) {
        const __apiRes = await updateSupplier(editing.id, form);
        toast.success(getApiMessage(__apiRes, 'Vendor updated'));
      } else {
        const __apiRes = await addSupplier(form);
        toast.success(getApiMessage(__apiRes, 'Vendor added'));
      }
      setOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSupplier(deleteId);
      setDeleteId(null);
      toast.success('Vendor deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Vendor',
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
          <p className="text-xs text-muted">{row.contactPerson || '—'}</p>
        </div>
      ),
    },
    {
      key: 'mobile',
      label: 'Contact',
      render: (_, row) => (
        <div className="text-sm space-y-0.5">
          <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <FaPhone size={10} className="text-muted" /> {formatPhone(row.mobile)}
          </p>
          {row.email && (
            <p className="flex items-center gap-1.5 text-xs text-muted truncate max-w-[180px]">
              <FaEnvelope size={10} /> {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'gst',
      label: 'GST',
      render: (v) => v || '—',
    },
    {
      key: 'products',
      label: 'Products',
      render: (_, row) => productCount(row.id),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700"
            title="Edit"
          >
            <FaEdit size={13} />
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
      <Breadcrumbs items={[
        { label: 'Party Master', to: '/parties/customers' },
        { label: 'Vendors' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/parties/customers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Vendors</h1>
            <p className="text-sm text-muted mt-0.5">{suppliers.length} vendors</p>
          </div>
        </div>
        <Button onClick={openCreate}><FaPlus size={12} /> Add Vendor</Button>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, GST..."
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            type="inventory"
            title="No vendors found"
            description="Add vendors to track purchase sources."
            actionLabel="Add Vendor"
            onAction={openCreate}
          />
        ) : (
          <Table columns={columns} data={filtered} />
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Vendor' : 'Add Vendor'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Vendor Name" value={form.name} onChange={set('name')} error={errors.name} required />
            <Input label="Contact Person" value={form.contactPerson} onChange={set('contactPerson')} />
            <Input label="Mobile" value={form.mobile} onChange={set('mobile')} error={errors.mobile} placeholder="10-digit" />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} />
            <Input label="GST Number" value={form.gst} onChange={set('gst')} />
            <Input label="Address" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>{editing ? 'Update' : 'Save'}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message="Products linked to this vendor will be unassigned."
        confirmText="Delete"
      />
    </div>
  );
}
