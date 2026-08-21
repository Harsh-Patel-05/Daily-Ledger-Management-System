import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaIndustry } from 'react-icons/fa';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Breadcrumbs, Card, Button, Input, Modal, ConfirmationDialog, EmptyState,
} from '../../components/ui';

const COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

export default function Brands() {
  const { brands, products, addBrand, updateBrand, deleteBrand } = useInventory();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const productCount = (id) => products.filter((p) => String(p.brandId) === String(id)).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', color: COLORS[0] });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (brand) => {
    setEditing(brand);
    setForm({ name: brand.name, description: brand.description || '', color: brand.color || COLORS[0] });
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Brand / company name is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      if (editing) {
        const __apiRes = await updateBrand(editing.id, form);
        toast.success(getApiMessage(__apiRes, 'Brand updated'));
      } else {
        const __apiRes = await addBrand(form);
        toast.success(getApiMessage(__apiRes, 'Brand added'));
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
      await deleteBrand(deleteId);
      setDeleteId(null);
      toast.success('Brand deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Inventory', to: '/inventory/products' },
        { label: 'Brands' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/inventory/products" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Brands</h1>
            <p className="text-sm text-muted mt-0.5">{brands.length} companies / brands</p>
          </div>
        </div>
        <Button onClick={openCreate}><FaPlus size={12} /> Add Brand</Button>
      </div>

      <Card>
        {brands.length === 0 ? (
          <EmptyState
            type="inventory"
            title="No brands yet"
            description="Add companies like Fybros, Renove, Armor — then assign them on products."
            actionLabel="Add Brand"
            onAction={openCreate}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="rounded-xl border border-border/60 dark:border-slate-700 p-4 hover:soft-shadow transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: brand.color || COLORS[0] }}
                    >
                      <FaIndustry size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{brand.name}</p>
                      <p className="text-xs text-muted mt-0.5">{productCount(brand.id)} products</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(brand)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700"
                      title="Edit"
                    >
                      <FaEdit size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(brand.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30"
                      title="Delete"
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>
                {brand.description && (
                  <p className="text-sm text-muted mt-3 line-clamp-2">{brand.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Brand' : 'Add Brand'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company / Brand Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Fybros"
            error={errors.name}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    form.color === c ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
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
        title="Delete brand?"
        message="This brand will be removed. Products using it must be reassigned first."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
