import { useEffect, useMemo, useState } from 'react';
import { FaBolt, FaPlus, FaBan, FaTrash } from 'react-icons/fa';
import {
  getGstr1,
  getGstr3b,
  listEInvoices,
  createEInvoice,
  generateIrn,
  cancelEInvoice,
  deleteEInvoice,
  listEWayBills,
  createEWayBill,
  generateEWay,
  cancelEWay,
  deleteEWay,
} from '../../api/gst';
import { useApp } from '../../context/AppContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { isGstSale } from '../../utils/invoiceUtils';
import PageHeader from '../../components/pages/PageHeader';
import ReportPage from '../../components/pages/ReportPage';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';
import {
  Card, Table, Button, Input, DatePicker, Dropdown, Modal, Badge,
} from '../../components/ui';

function periodDefaults() {
  const now = new Date();
  return { month: String(now.getMonth() + 1), year: String(now.getFullYear()) };
}

function PeriodFilters({ month, year, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <Dropdown
        label="Month"
        value={month}
        onChange={(v) => onChange({ month: v, year })}
        options={Array.from({ length: 12 }, (_, i) => ({
          value: String(i + 1),
          label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
        }))}
      />
      <Input
        label="Year"
        type="number"
        value={year}
        onChange={(e) => onChange({ month, year: e.target.value })}
        className="max-w-[8rem]"
      />
    </div>
  );
}

export function Gstr1Page() {
  const toast = useToast();
  const { activeCompany } = useCompanies();
  const [period, setPeriod] = useState(periodDefaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await getGstr1(period));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load GSTR-1'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period.month, period.year, activeCompany?.id]);

  const s = data?.summary || {};
  const cols = [
    { key: 'invoiceNumber', label: 'Invoice' },
    { key: 'date', label: 'Date' },
    { key: 'party', label: 'Party' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
    { key: 'cgst', label: 'CGST', render: (v) => formatCurrency(v) },
    { key: 'sgst', label: 'SGST', render: (v) => formatCurrency(v) },
    { key: 'igst', label: 'IGST', render: (v) => formatCurrency(v) },
    { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
  ];

  return (
    <ReportPage
      title="GSTR-1"
      subtitle="Outward supplies from GST sales (local data — GSTN filing not connected)"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GSTR-1' }]}
      stats={[
        { label: 'B2B', value: s.b2bCount || 0 },
        { label: 'B2C', value: s.b2cCount || 0 },
        { label: 'Taxable', value: s.taxable || 0, currency: true },
        { label: 'Tax', value: s.tax || 0, currency: true, color: 'amber' },
      ]}
    >
      <PeriodFilters {...period} onChange={setPeriod} />
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">B2B (registered)</h3>
            <Table columns={cols} data={data?.b2b || []} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">B2C (unregistered)</h3>
            <Table columns={cols} data={data?.b2c || []} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">HSN summary</h3>
            <Table
              columns={[
                { key: 'hsn', label: 'HSN' },
                { key: 'qty', label: 'Qty' },
                { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
                { key: 'tax', label: 'Tax', render: (v) => formatCurrency(v) },
              ]}
              data={data?.hsn || []}
            />
          </div>
        </div>
      )}
    </ReportPage>
  );
}

export function Gstr3bPage() {
  const toast = useToast();
  const { activeCompany } = useCompanies();
  const [period, setPeriod] = useState(periodDefaults);
  const [data, setData] = useState(null);

  useEffect(() => {
    getGstr3b(period)
      .then(setData)
      .catch((err) => {
        toast.error(getApiErrorMessage(err, 'Failed to load GSTR-3B'));
        setData(null);
      });
  }, [period.month, period.year, activeCompany?.id]);

  const out = data?.outward || {};
  const inn = data?.inward || {};
  const net = data?.net || {};

  return (
    <ReportPage
      title="GSTR-3B"
      subtitle="Monthly summary (local) — GSTN filing not connected"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GSTR-3B' }]}
      stats={[
        { label: 'Outward taxable', value: out.taxable || 0, currency: true },
        { label: 'Output tax', value: out.tax || 0, currency: true, color: 'blue' },
        { label: 'Input tax', value: inn.tax || 0, currency: true, color: 'purple' },
        { label: 'Net payable', value: net.tax || 0, currency: true, color: 'amber' },
      ]}
    >
      <PeriodFilters {...period} onChange={setPeriod} />
      <Table
        columns={[
          { key: 'head', label: 'Particulars' },
          { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
          { key: 'cgst', label: 'CGST', render: (v) => formatCurrency(v) },
          { key: 'sgst', label: 'SGST', render: (v) => formatCurrency(v) },
          { key: 'igst', label: 'IGST', render: (v) => formatCurrency(v) },
          { key: 'tax', label: 'Total tax', render: (v) => formatCurrency(v) },
        ]}
        data={[
          { id: '1', head: '3.1 Outward supplies', ...out },
          { id: '2', head: '4 Eligible ITC (inward)', ...inn },
          { id: '3', head: 'Net tax', taxable: 0, ...net },
        ]}
      />
    </ReportPage>
  );
}

export function EinvoicePage() {
  const toast = useToast();
  const { invoices } = useApp();
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  const reload = () =>
    listEInvoices()
      .then((list) =>
        setRows(
          list.map((r) => ({
            id: r.id,
            invoiceNumber: r.invoiceNumber || r.invoice_number,
            invoiceDate: r.invoiceDate || r.invoice_date,
            buyerName: r.buyerName || r.buyer_name,
            buyerGstin: r.buyerGstin || r.buyer_gstin,
            total: Number(r.total) || 0,
            irn: r.irn || '',
            status: r.status,
          }))
        )
      )
      .catch((e) => toast.error(e?.message || 'Load failed'));

  useEffect(() => {
    reload();
  }, [activeCompany?.id]);

  const gstInvoices = useMemo(
    () => invoices.filter((i) => isGstSale(i) && i.customerGst),
    [invoices]
  );

  const save = async () => {
    try {
      await createEInvoice(form);
      setOpen(false);
      toast.success('E-invoice draft created');
      reload();
    } catch (e) {
      toast.error(e?.message || 'Create failed');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="E-Invoice"
        subtitle="Local IRN generate/cancel (NIC API not connected)"
        breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'E-Invoice' }]}
        actions={
          <Button onClick={() => {
            setForm({
              invoiceNumber: '',
              invoiceDate: new Date().toISOString().slice(0, 10),
              buyerName: '',
              buyerGstin: '',
              taxableAmount: 0,
              taxAmount: 0,
              total: 0,
            });
            setOpen(true);
          }}
          >
            <FaPlus size={12} /> New e-invoice
          </Button>
        }
      />
      <Card>
        <Table
          columns={[
            { key: 'invoiceNumber', label: 'Invoice' },
            { key: 'invoiceDate', label: 'Date' },
            { key: 'buyerName', label: 'Buyer' },
            { key: 'buyerGstin', label: 'GSTIN' },
            { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
            {
              key: 'irn',
              label: 'IRN',
              render: (v) => (v ? `${String(v).slice(0, 12)}…` : '—'),
            },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <Badge variant={v === 'Generated' ? 'success' : v === 'Cancelled' ? 'danger' : 'warning'}>{v}</Badge>,
            },
            {
              key: 'actions',
              label: '',
              isActions: true,
              render: (_, row) => (
                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  {row.status === 'Draft' && (
                    <button type="button" className="p-2 text-primary" title="Generate IRN" onClick={async () => {
                      try {
                        const __apiRes = await generateIrn(row.id);
                        toast.success(getApiMessage(__apiRes, 'IRN generated'));
                        reload();
                      } catch (e) {
                        toast.error(e?.message || 'Failed');
                      }
                    }}
                    >
                      <FaBolt size={12} />
                    </button>
                  )}
                  {row.status !== 'Cancelled' && (
                    <button type="button" className="p-2 text-amber-600" title="Cancel" onClick={async () => {
                      await cancelEInvoice(row.id);
                      reload();
                    }}
                    >
                      <FaBan size={12} />
                    </button>
                  )}
                  <button type="button" className="p-2 text-danger" onClick={async () => {
                    await deleteEInvoice(row.id);
                    reload();
                  }}
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ),
            },
          ]}
          data={rows}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create e-invoice draft" footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save draft</Button>
        </div>
      )}
      >
        <div className="space-y-3">
          <Dropdown
            label="From GST invoice"
            value={form.invoiceId ? String(form.invoiceId) : ''}
            onChange={(id) => {
              const inv = gstInvoices.find((i) => String(i.id) === String(id));
              if (!inv) return;
              setForm({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.date,
                buyerName: inv.customerBusiness || inv.customerName,
                buyerGstin: inv.customerGst,
                taxableAmount: Number(inv.subtotal) - Number(inv.discount || 0),
                taxAmount: inv.taxAmount,
                total: inv.total,
              });
            }}
            options={gstInvoices.map((i) => ({
              value: String(i.id),
              label: `${i.invoiceNumber} · ${i.customerName}`,
            }))}
            placeholder="Select invoice"
          />
          <Input label="Invoice no." value={form.invoiceNumber || ''} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />
          <DatePicker label="Date" value={form.invoiceDate || ''} onChange={(v) => setForm((f) => ({ ...f, invoiceDate: v }))} />
          <Input label="Buyer" value={form.buyerName || ''} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))} />
          <Input label="Buyer GSTIN" value={form.buyerGstin || ''} onChange={(e) => setForm((f) => ({ ...f, buyerGstin: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

export function EwayPage() {
  const toast = useToast();
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  const reload = () =>
    listEWayBills()
      .then((list) =>
        setRows(
          list.map((r) => ({
            id: r.id,
            documentNumber: r.documentNumber || r.document_number,
            documentDate: r.documentDate || r.document_date,
            vehicleNo: r.vehicleNo || r.vehicle_no,
            transporterName: r.transporterName || r.transporter_name,
            ewbNumber: r.ewbNumber || r.ewb_number,
            status: r.status,
            taxableAmount: Number(r.taxableAmount ?? r.taxable_amount) || 0,
          }))
        )
      )
      .catch((e) => toast.error(e?.message || 'Load failed'));

  useEffect(() => {
    reload();
  }, [activeCompany?.id]);

  const save = async () => {
    try {
      await createEWayBill(form);
      setOpen(false);
      toast.success('E-way draft created');
      reload();
    } catch (e) {
      toast.error(e?.message || 'Create failed');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="E-Way Bill"
        subtitle="Local e-way generate/cancel (NIC API not connected)"
        breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'E-Way Bill' }]}
        actions={(
          <Button onClick={() => {
            setForm({
              documentNumber: `DOC-${Date.now().toString().slice(-6)}`,
              documentDate: new Date().toISOString().slice(0, 10),
              fromPlace: activeCompany?.city || '',
              toPlace: '',
              transporterName: '',
              vehicleNo: '',
              distanceKm: 50,
              taxableAmount: 0,
            });
            setOpen(true);
          }}
          >
            <FaPlus size={12} /> New e-way
          </Button>
        )}
      />
      <Card>
        <Table
          columns={[
            { key: 'documentNumber', label: 'Doc no.' },
            { key: 'documentDate', label: 'Date' },
            { key: 'transporterName', label: 'Transporter' },
            { key: 'vehicleNo', label: 'Vehicle' },
            { key: 'ewbNumber', label: 'EWB no.' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <Badge variant={v === 'Active' ? 'success' : v === 'Cancelled' ? 'danger' : 'warning'}>{v}</Badge>,
            },
            {
              key: 'actions',
              label: '',
              isActions: true,
              render: (_, row) => (
                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                  {row.status === 'Draft' && (
                    <button type="button" className="p-2 text-primary" onClick={async () => {
                      const __apiRes = await generateEWay(row.id);
                      toast.success(getApiMessage(__apiRes, 'E-way generated'));
                      reload();
                    }}
                    >
                      <FaBolt size={12} />
                    </button>
                  )}
                  {row.status !== 'Cancelled' && (
                    <button type="button" className="p-2 text-amber-600" onClick={async () => {
                      await cancelEWay(row.id);
                      reload();
                    }}
                    >
                      <FaBan size={12} />
                    </button>
                  )}
                  <button type="button" className="p-2 text-danger" onClick={async () => {
                    await deleteEWay(row.id);
                    reload();
                  }}
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ),
            },
          ]}
          data={rows}
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create e-way draft" footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save draft</Button>
        </div>
      )}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Document no." value={form.documentNumber || ''} onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} />
          <DatePicker label="Date" value={form.documentDate || ''} onChange={(v) => setForm((f) => ({ ...f, documentDate: v }))} />
          <Input label="From" value={form.fromPlace || ''} onChange={(e) => setForm((f) => ({ ...f, fromPlace: e.target.value }))} />
          <Input label="To" value={form.toPlace || ''} onChange={(e) => setForm((f) => ({ ...f, toPlace: e.target.value }))} />
          <Input label="Transporter" value={form.transporterName || ''} onChange={(e) => setForm((f) => ({ ...f, transporterName: e.target.value }))} />
          <Input label="Vehicle no." value={form.vehicleNo || ''} onChange={(e) => setForm((f) => ({ ...f, vehicleNo: e.target.value }))} />
          <Input label="Distance (km)" type="number" value={form.distanceKm ?? 0} onChange={(e) => setForm((f) => ({ ...f, distanceKm: Number(e.target.value) || 0 }))} />
          <Input label="Taxable value" type="number" value={form.taxableAmount ?? 0} onChange={(e) => setForm((f) => ({ ...f, taxableAmount: Number(e.target.value) || 0 }))} />
        </div>
      </Modal>
    </div>
  );
}
