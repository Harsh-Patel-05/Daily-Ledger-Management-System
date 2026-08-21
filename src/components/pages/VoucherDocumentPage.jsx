import { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaExchangeAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  booksList,
  booksCreate,
  booksUpdate,
  booksDelete,
  convertVoucher,
  mapVoucherRow,
  toVoucherPayload,
} from '../../api/books';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { calcGstBreakup } from '../../utils/invoiceUtils';
import { applyProductToLine } from '../../utils/inventoryInvoice';
import { filterBySearch } from '../../utils/helpers';
import { formatCurrency } from '../../utils/formatters';
import PageHeader from './PageHeader';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Card, SearchBox, Table, Pagination, Button, Input, Dropdown, DatePicker,
  ConfirmationDialog, EmptyState, Badge, Modal,
} from '../ui';

const CONVERT_MAP = {
  quotation: { target: 'sales_order', label: 'Convert to Sales Order' },
  sales_order: { target: 'invoice', label: 'Convert to Invoice' },
  proforma: { target: 'invoice', label: 'Convert to Invoice' },
  delivery_challan: { target: 'invoice', label: 'Convert to Invoice' },
  purchase_order: { target: 'bill', label: 'Convert to Purchase Bill' },
  grn: { target: 'bill', label: 'Convert to Purchase Bill' },
};

const emptyLine = () => ({
  id: `tmp-${Date.now()}-${Math.random()}`,
  productId: '',
  description: '',
  hsn: '',
  quantity: 1,
  rate: '',
  amount: 0,
  taxRate: 18,
});

/**
 * Munim-style sales/purchase voucher workspace: list + full line-item form (GST / Non-GST).
 */
export default function VoucherDocumentPage({
  docType,
  title,
  subtitle,
  breadcrumbs,
  addLabel = 'Create',
  partyKind = 'customer', // customer | supplier
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const { customers } = useApp();
  const { products, getProduct, suppliers } = useInventory();
  const { activeCompany, isGstEnabled } = useCompanies();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const debouncedSearch = useDebounce(search);

  const isSales = partyKind === 'customer';
  const convertMeta = CONVERT_MAP[docType];

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await booksList('vouchers', `doc_type=${docType}`);
      setItems(rows.map(mapVoucherRow));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load documents'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, activeCompany?.id]);

  const filtered = useMemo(
    () => filterBySearch(items, debouncedSearch, ['number', 'party', 'status', 'gstType']),
    [items, debouncedSearch]
  );
  const { data, page, totalPages, total, perPage, goToPage, resetPage } = usePagination(filtered, 8);
  useEffect(() => { resetPage(); }, [debouncedSearch]);

  const partyOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: c.businessName || c.name,
      })),
    [customers]
  );
  const supplierOptions = useMemo(
    () => (suppliers || []).map((s) => ({ value: String(s.id), label: s.name })),
    [suppliers]
  );

  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.status === 'active'),
    [products]
  );

  const gstSale = form.gstType !== 'Non-GST';
  const totals = useMemo(
    () =>
      calcGstBreakup({
        items: form.items || [],
        discount: form.discount,
        taxRate: form.taxRate,
        gstType: form.gstType,
        isInterstate: form.isInterstate,
      }),
    [form.items, form.discount, form.taxRate, form.gstType, form.isInterstate]
  );

  const openCreate = () => {
    setEditingId(null);
    const nonGst = !isGstEnabled;
    setForm({
      number: `${docType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      customerId: '',
      supplierId: '',
      party: '',
      items: [emptyLine()],
      discount: 0,
      taxRate: nonGst ? 0 : 18,
      gstType: nonGst ? 'Non-GST' : 'GST',
      placeOfSupply: activeCompany?.state || '',
      isInterstate: false,
      status: 'Open',
      notes: '',
      terms: '',
    });
    setEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const nonGst = !isGstEnabled;
    setForm({
      ...row,
      items: row.items?.length ? row.items : [emptyLine()],
      customerId: row.customerId ? String(row.customerId) : '',
      supplierId: row.supplierId ? String(row.supplierId) : '',
      ...(nonGst
        ? {
            gstType: 'Non-GST',
            taxRate: 0,
            items: (row.items?.length ? row.items : [emptyLine()]).map((l) => ({
              ...l,
              taxRate: 0,
            })),
          }
        : {}),
    });
    setEditorOpen(true);
  };

  const setParty = (id) => {
    if (isSales) {
      const c = customers.find((x) => String(x.id) === String(id));
      const companyState = (activeCompany?.state || '').trim().toUpperCase();
      const partyState = (c?.state || '').trim().toUpperCase();
      const interstate = Boolean(companyState && partyState && companyState !== partyState);
      setForm((f) => ({
        ...f,
        customerId: id,
        party: c ? (c.businessName || c.name) : '',
        placeOfSupply: c?.state || activeCompany?.state || '',
        isInterstate: interstate,
      }));
    } else {
      const s = (suppliers || []).find((x) => String(x.id) === String(id));
      const companyState = (activeCompany?.state || '').trim().toUpperCase();
      const partyState = (s?.state || '').trim().toUpperCase();
      const interstate = Boolean(companyState && partyState && companyState !== partyState);
      setForm((f) => ({
        ...f,
        supplierId: id,
        party: s?.name || '',
        placeOfSupply: s?.state || activeCompany?.state || '',
        isInterstate: interstate,
      }));
    }
  };

  const updateLine = (id, key, value) => {
    setForm((f) => ({
      ...f,
      items: (f.items || []).map((line) => {
        if (line.id !== id) return line;
        if (key === 'productId') {
          if (!value) {
            return { ...line, productId: '', description: '', hsn: '', rate: '', amount: 0 };
          }
          const product = getProduct(value);
          const next = applyProductToLine(line, product);
          return {
            ...next,
            taxRate: f.gstType === 'Non-GST' ? 0 : (Number(product?.taxRate) || f.taxRate || 18),
          };
        }
        const next = { ...line, [key]: value };
        const qty = Number(next.quantity) || 0;
        const rate = Number(next.rate) || 0;
        next.amount = Math.round(qty * rate * 100) / 100;
        return next;
      }),
    }));
  };

  const save = async () => {
    if (!form.number?.trim()) {
      toast.error('Document number is required');
      return;
    }
    if (isSales && !form.customerId) {
      toast.error('Select a customer');
      return;
    }
    if (!isSales && !form.supplierId) {
      toast.error('Select a vendor');
      return;
    }
    if (!(form.items || []).some((l) => l.description && Number(l.quantity) > 0)) {
      toast.error('Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      const payload = toVoucherPayload(docType, {
        ...form,
        taxableAmount: totals.subtotal - totals.discount,
        taxAmount: totals.taxAmount,
        amount: totals.total,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        taxRate: gstSale ? form.taxRate : 0,
      });
      if (editingId) {
        const res = await booksUpdate('vouchers', editingId, payload);
        toast.success(getApiMessage(res, 'Document updated successfully'));
      } else {
        const res = await booksCreate('vouchers', payload);
        toast.success(getApiMessage(res, 'Document created successfully'));
      }
      setEditorOpen(false);
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (row) => {
    if (!convertMeta) return;
    try {
      const res = await convertVoucher(row.id, convertMeta.target);
      toast.success(getApiMessage(res, convertMeta.label.replace('Convert to ', 'Created ')));
      await reload();
      if (res?.invoice_id) navigate(`/invoices/${res.invoice_id}`);
      else if (res?.bill_id) navigate('/purchase/bills');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Convert failed'));
    }
  };

  const handleDelete = async () => {
    try {
      const res = await booksDelete('vouchers', deleteId);
      setDeleteId(null);
      toast.success(getApiMessage(res, 'Deleted successfully'));
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  const columns = [
    { key: 'number', label: 'Number', mobilePrimary: true },
    { key: 'date', label: 'Date' },
    { key: 'party', label: isSales ? 'Customer' : 'Vendor' },
    {
      key: 'gstType',
      label: 'Type',
      render: (v) => <Badge variant={v === 'Non-GST' ? 'default' : 'primary'}>{v || 'GST'}</Badge>,
    },
    { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <Badge variant={v === 'Converted' || v === 'Completed' ? 'success' : 'warning'}>{v || 'Open'}</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      isActions: true,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {convertMeta && row.status !== 'Converted' && (
            <button
              type="button"
              title={convertMeta.label}
              onClick={() => handleConvert(row)}
              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600"
            >
              <FaExchangeAlt size={12} />
            </button>
          )}
          <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <FaEdit size={12} />
          </button>
          <button type="button" onClick={() => setDeleteId(row.id)} className="p-2 rounded-lg hover:bg-red-50 text-danger">
            <FaTrash size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle || 'Line items · GST / Non-GST · convert to next document'}
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={openCreate}>
            <FaPlus size={12} /> {addLabel}
          </Button>
        }
      />

      <Card>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search number, party, status..."
          className="mb-4 max-w-md"
        />
        {loading ? (
          <p className="text-sm text-muted py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Create with line items and GST or Non-GST."
            actionLabel={addLabel}
            onAction={openCreate}
          />
        ) : (
          <>
            <Table columns={columns} data={data} onRowClick={openEdit} />
            <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} total={total} perPage={perPage} />
          </>
        )}
      </Card>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? `Edit ${title}` : addLabel}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input label="Number" required value={form.number || ''} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            <DatePicker label="Date" value={form.date || ''} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            <Dropdown
              label={isSales ? 'Customer' : 'Vendor'}
              required
              value={isSales ? form.customerId : form.supplierId}
              onChange={setParty}
              options={isSales ? partyOptions : supplierOptions}
              placeholder="Select…"
            />
            {isGstEnabled ? (
              <Dropdown
                label="GST Type"
                value={form.gstType || 'GST'}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    gstType: v,
                    taxRate: v === 'Non-GST' ? 0 : (f.taxRate || 18),
                    items: (f.items || []).map((l) => ({
                      ...l,
                      taxRate: v === 'Non-GST' ? 0 : (l.taxRate || f.taxRate || 18),
                    })),
                  }))
                }
                options={[
                  { value: 'GST', label: 'With GST' },
                  { value: 'Non-GST', label: 'Without GST' },
                ]}
              />
            ) : (
              <Input label="Billing Type" value="Non-GST (this company)" disabled />
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {gstSale && (
              <Input
                label="Tax rate %"
                type="number"
                value={form.taxRate ?? 18}
                onChange={(e) => setForm((f) => ({ ...f, taxRate: Number(e.target.value) || 0 }))}
              />
            )}
            <Input
              label="Place of supply"
              value={form.placeOfSupply || ''}
              onChange={(e) => setForm((f) => ({ ...f, placeOfSupply: e.target.value }))}
            />
            {gstSale && (
              <Dropdown
                label="Supply type"
                value={form.isInterstate ? 'inter' : 'intra'}
                onChange={(v) => setForm((f) => ({ ...f, isInterstate: v === 'inter' }))}
                options={[
                  { value: 'intra', label: 'Intra-state (CGST+SGST)' },
                  { value: 'inter', label: 'Inter-state (IGST)' },
                ]}
              />
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Line items</p>
              <Button
                size="sm"
                variant="soft"
                onClick={() => setForm((f) => ({ ...f, items: [...(f.items || []), emptyLine()] }))}
              >
                <FaPlus size={10} /> Add line
              </Button>
            </div>
            <div className="divide-y divide-border">
              {(form.items || []).map((line) => (
                <div key={line.id} className="p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4">
                    <Dropdown
                      label="Item"
                      value={line.productId ? String(line.productId) : ''}
                      onChange={(v) => updateLine(line.id, 'productId', v)}
                      options={activeProducts.map((p) => ({ value: String(p.id), label: p.name }))}
                      placeholder="Select product"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Input
                      label="Description"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <Input label="HSN" value={line.hsn} onChange={(e) => updateLine(line.id, 'hsn', e.target.value)} />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <Input label="Qty" type="number" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <Input label="Rate" type="number" value={line.rate} onChange={(e) => updateLine(line.id, 'rate', e.target.value)} />
                  </div>
                  <div className="col-span-8 sm:col-span-1">
                    <p className="text-xs text-muted mb-1">Amount</p>
                    <p className="text-sm font-semibold py-2">{formatCurrency(line.amount)}</p>
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      className="p-2 text-danger"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          items: (f.items || []).filter((l) => l.id !== line.id),
                        }))
                      }
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Discount"
              type="number"
              value={form.discount ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) || 0 }))}
            />
            <div className="rounded-xl border border-border p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Taxable</span><span>{formatCurrency(totals.subtotal - totals.discount)}</span></div>
              {gstSale && !form.isInterstate && (
                <>
                  <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(totals.cgstAmount)}</span></div>
                  <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(totals.sgstAmount)}</span></div>
                </>
              )}
              {gstSale && form.isInterstate && (
                <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(totals.igstAmount)}</span></div>
              )}
              {!gstSale && <div className="flex justify-between text-muted"><span>Tax</span><span>Non-GST</span></div>}
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
            </div>
          </div>

          <Input
            label="Notes"
            value={form.notes || ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete document"
        message="This cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
