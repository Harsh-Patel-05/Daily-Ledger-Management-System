import { useMemo, useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useLocalCollection } from '../../hooks/useLocalCollection';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../context/ToastContext';
import { filterBySearch } from '../../utils/helpers';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, Modal,
  ConfirmationDialog, EmptyState, FloatingAddButton,
} from '../ui';
import PageHeader from './PageHeader';

/**
 * Generic frontend CRUD list for modules without backend yet.
 * fields: [{ key, label, type?: 'text'|'number'|'select'|'textarea', required?, options?, search? }]
 */
export default function CrudListPage({
  title,
  subtitle,
  breadcrumbs,
  storageKey,
  seed = [],
  fields = [],
  columns,
  searchKeys = [],
  emptyTitle = 'No records yet',
  emptyDescription = 'Add your first record to get started.',
  addLabel = 'Add',
  getInitialForm,
  externalCollection,
  onCreate,
}) {
  const toast = useToast();
  const local = useLocalCollection(
    externalCollection ? null : (storageKey || 'dlms_unused'),
    externalCollection ? [] : seed
  );
  const collection = externalCollection || local;
  const { items, add, update, remove } = collection;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const debouncedSearch = useDebounce(search);

  const defaults = useMemo(() => {
    if (getInitialForm) return getInitialForm();
    return fields.reduce((acc, f) => {
      acc[f.key] = f.defaultValue ?? (f.type === 'number' ? '' : f.type === 'select' ? (f.options?.[0]?.value ?? '') : '');
      return acc;
    }, {});
  }, [fields, getInitialForm]);

  const filtered = useMemo(() => {
    const keys = searchKeys.length ? searchKeys : fields.map((f) => f.key);
    return filterBySearch(items, debouncedSearch, keys);
  }, [items, debouncedSearch, searchKeys, fields]);

  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaults });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const next = { ...defaults };
    fields.forEach((f) => { next[f.key] = row[f.key] ?? next[f.key]; });
    setForm(next);
    setErrors({});
    setOpen(true);
  };

  const setField = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      if (f.required && !String(form[f.key] ?? '').trim()) {
        errs[f.key] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = { ...form };
    fields.forEach((f) => {
      if (f.type === 'number') payload[f.key] = Number(form[f.key]) || 0;
    });

    if (editing) {
      update(editing.id, payload);
      toast.success(`${title} updated`);
    } else if (onCreate) {
      onCreate(payload);
      toast.success(`${title} added`);
    } else {
      add(payload);
      toast.success(`${title} added`);
    }
    setOpen(false);
  };

  const handleDelete = () => {
    remove(deleteId);
    setDeleteId(null);
    toast.success('Deleted');
  };

  const actionColumn = {
    key: 'actions',
    label: '',
    render: (_, row) => (
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <FaEdit size={13} />
        </button>
        <button type="button" onClick={() => setDeleteId(row.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
          <FaTrash size={13} />
        </button>
      </div>
    ),
  };

  const tableColumns = columns
    ? (columns.some((c) => c.key === 'actions') ? columns : [...columns, actionColumn])
    : [
      ...fields.slice(0, 4).map((f) => ({
        key: f.key,
        label: f.label,
        render: (v) => (f.type === 'number' ? v : (v || '—')),
      })),
      actionColumn,
    ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle || `${items.length} records`}
        breadcrumbs={breadcrumbs}
        actions={<Button onClick={openCreate}><FaPlus size={12} /> {addLabel}</Button>}
      />

      <Card>
        <div className="mb-4">
          <SearchBox value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={addLabel} onAction={openCreate} />
        ) : (
          <>
            <Table columns={tableColumns} data={data} />
            <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={goToPage} />
          </>
        )}
      </Card>

      <FloatingAddButton onClick={openCreate} />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title}` : `Add ${title}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => {
            if (f.type === 'select') {
              return (
                <Dropdown
                  key={f.key}
                  label={f.label}
                  value={form[f.key] ?? ''}
                  onChange={setField(f.key)}
                  options={f.options || []}
                  error={errors[f.key]}
                />
              );
            }
            if (f.type === 'textarea') {
              return (
                <div key={f.key} className="w-full">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {f.label}
                  </label>
                  <textarea
                    rows={3}
                    value={form[f.key] ?? ''}
                    onChange={setField(f.key)}
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-slate-800 dark:bg-surface dark:border-border dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {errors[f.key] && <p className="mt-1 text-xs text-danger">{errors[f.key]}</p>}
                </div>
              );
            }
            return (
              <Input
                key={f.key}
                label={f.label}
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={form[f.key] ?? ''}
                onChange={setField(f.key)}
                error={errors[f.key]}
              />
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete record?"
        message="This will remove the record from local storage."
      />
    </div>
  );
}
