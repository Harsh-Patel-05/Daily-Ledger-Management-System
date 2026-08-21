import { useMemo, useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useApiCollection } from '../../hooks/useApiCollection';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../context/ToastContext';
import { filterBySearch } from '../../utils/helpers';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, Modal,
  ConfirmationDialog, EmptyState,
} from '../ui';
import PageHeader from './PageHeader';

/**
 * Generic CRUD list — always backed by backend API
 * (apiResource → books API, or externalCollection from context).
 */
export default function CrudListPage({
  title,
  subtitle,
  breadcrumbs,
  fields = [],
  columns,
  searchKeys = [],
  emptyTitle = 'No records yet',
  emptyDescription = 'Add your first record to get started.',
  addLabel = 'Add',
  getInitialForm,
  externalCollection,
  onCreate,
  apiResource,
  apiQuery = '',
  mapRow,
  toPayload,
}) {
  const toast = useToast();
  const api = useApiCollection(apiResource || null, {
    query: apiQuery,
    mapRow,
    toPayload,
    enabled: Boolean(apiResource) && !externalCollection,
  });
  const collection = externalCollection || (apiResource ? api : null);
  if (!collection) {
    throw new Error(`CrudListPage "${title}" requires apiResource or externalCollection (API-backed).`);
  }
  const { items, add, update, remove } = collection;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const debouncedSearch = useDebounce(search);

  const defaults = useMemo(() => {
    if (getInitialForm) return getInitialForm();
    return fields.reduce((acc, f) => {
      acc[f.key] = f.defaultValue ?? (f.type === 'number' ? '' : f.type === 'select' ? (f.options?.[0]?.value ?? f.options?.[0] ?? '') : '');
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
    fields.forEach((f) => {
      if (f.key === 'password') next[f.key] = '';
      else next[f.key] = row[f.key] ?? next[f.key];
    });
    setForm(next);
    setErrors({});
    setOpen(true);
  };

  const setField = (key) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      const required = typeof f.required === 'function' ? f.required({ editing }) : f.required;
      if (required && !String(form[f.key] ?? '').trim()) {
        errs[f.key] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = { ...form };
    fields.forEach((f) => {
      if (f.type === 'number') payload[f.key] = Number(form[f.key]) || 0;
    });
    if (editing && !payload.password) delete payload.password;

    setSaving(true);
    try {
      let res;
      if (editing) {
        res = await update(editing.id, payload);
        toast.success(getApiMessage(res, `${title} updated successfully`));
      } else if (onCreate) {
        res = await onCreate(payload);
        toast.success(getApiMessage(res, `${title} created successfully`));
      } else {
        res = await add(payload);
        toast.success(getApiMessage(res, `${title} created successfully`));
      }
      setOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await remove(deleteId);
      setDeleteId(null);
      toast.success(getApiMessage(res, 'Deleted successfully'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
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
      ...fields.filter((f) => f.key !== 'password').slice(0, 4).map((f) => ({
        key: f.key,
        label: f.label,
        render: (v) => (f.type === 'number' ? v : (v || '—')),
      })),
      actionColumn,
    ];

  const visibleFields = fields.filter((f) => {
    if (typeof f.showWhen === 'function') return f.showWhen({ editing });
    return true;
  });

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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${title}` : `Add ${title}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {visibleFields.map((f) => {
            if (f.type === 'select') {
              return (
                <Dropdown
                  key={f.key}
                  label={f.label}
                  value={form[f.key] ?? ''}
                  onChange={setField(f.key)}
                  options={f.options || []}
                  error={errors[f.key]}
                  required={typeof f.required === 'function' ? f.required({ editing }) : f.required}
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
                type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={form[f.key] ?? ''}
                onChange={setField(f.key)}
                error={errors[f.key]}
                placeholder={typeof f.placeholder === 'function' ? f.placeholder({ editing }) : f.placeholder}
                required={typeof f.required === 'function' ? f.required({ editing }) : f.required}
              />
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Update' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete?"
        message="This will permanently delete the record on the server."
      />
    </div>
  );
}
