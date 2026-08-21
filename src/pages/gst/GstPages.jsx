import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanies } from '../../context/CompaniesContext';
import { getTaxSummary, getHsnSummary } from '../../api/gst';
import { formatCurrency } from '../../utils/formatters';
import PageHeader from '../../components/pages/PageHeader';
import ReportPage, { ReportLinks } from '../../components/pages/ReportPage';
import { Card, StatCard, Table, Loader } from '../../components/ui';

function useGstSummary() {
  const { activeCompany } = useCompanies();
  const [data, setData] = useState({
    rows: [],
    summary: {
      salesTaxable: 0,
      purchaseTaxable: 0,
      outputGst: 0,
      inputGst: 0,
      netGst: 0,
      nonGstSales: 0,
      gstSalesCount: 0,
      gstPurchaseCount: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTaxSummary()
      .then((res) => {
        if (!cancelled) {
          setData({
            rows: res?.rows || [],
            summary: res?.summary || data.summary,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData((d) => d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id]);

  return { ...data, loading };
}

export function GstDashboard() {
  const { summary, loading } = useGstSummary();
  return (
    <div className="space-y-4">
      <PageHeader
        title="GST Dashboard"
        subtitle="Live from backend · GST overview"
        breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Dashboard' }]}
      />
      {loading ? (
        <Card className="py-12 flex justify-center"><Loader /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Output GST" value={formatCurrency(summary.outputGst)} color="blue" />
          <StatCard title="Input GST" value={formatCurrency(summary.inputGst)} color="purple" />
          <StatCard title="Net GST" value={formatCurrency(summary.netGst)} color="amber" />
          <StatCard title="Non-GST Sales" value={String(summary.nonGstSales || 0)} color="green" />
        </div>
      )}
      <Card>
        <ReportLinks
          links={[
            { to: '/gst/summary', label: 'GST Summary', description: 'Taxable + tax totals' },
            { to: '/gst/hsn-sac', label: 'HSN/SAC Summary', description: 'By HSN codes' },
            { to: '/gst/tax-summary', label: 'Tax Summary', description: 'CGST / SGST / IGST view' },
            { to: '/gst/sales', label: 'GST Sales', description: 'GST sales invoices' },
            { to: '/gst/purchase', label: 'GST Purchase', description: 'GST purchase bills' },
            { to: '/gst/gstr-1', label: 'GSTR-1', description: 'Outward supplies' },
            { to: '/gst/gstr-3b', label: 'GSTR-3B', description: 'Monthly summary' },
            { to: '/gst/e-invoice', label: 'E-Invoice', description: 'IRN generate / cancel' },
            { to: '/gst/e-way', label: 'E-Way Bill', description: 'E-way documents' },
          ]}
        />
      </Card>
    </div>
  );
}

export function GstSummary() {
  const { summary, loading } = useGstSummary();
  if (loading) {
    return (
      <ReportPage title="GST Summary" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Summary' }]}>
        <div className="py-12 flex justify-center"><Loader /></div>
      </ReportPage>
    );
  }
  return (
    <ReportPage
      title="GST Summary"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Summary' }]}
      stats={[
        { label: 'Taxable Sales', value: summary.salesTaxable, currency: true },
        { label: 'Output GST', value: summary.outputGst, currency: true, color: 'blue' },
        { label: 'Taxable Purchase', value: summary.purchaseTaxable, currency: true, color: 'purple' },
        { label: 'Input GST', value: summary.inputGst, currency: true, color: 'amber' },
      ]}
    >
      <p className="text-sm text-muted mb-4">
        Net payable GST:{' '}
        <strong className="text-slate-800 dark:text-white">{formatCurrency(summary.netGst)}</strong>
        {' '}· Data from backend tax-summary.
      </p>
      <Link to="/gst" className="text-sm text-primary hover:underline">Back to GST Dashboard</Link>
    </ReportPage>
  );
}

export function HsnSacSummary() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHsnSummary()
      .then((res) => {
        if (!cancelled) {
          setRows((res?.rows || []).map((r, i) => ({ id: r.hsn || i, ...r })));
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage title="HSN/SAC Summary" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'HSN/SAC Summary' }]}>
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'hsn', label: 'HSN/SAC' },
            { key: 'qty', label: 'Qty' },
            { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
            { key: 'tax', label: 'Tax', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function TaxSummary() {
  const { rows, summary, loading } = useGstSummary();
  return (
    <ReportPage
      title="Tax Summary"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'Tax Summary' }]}
      stats={[
        { label: 'Output GST', value: summary.outputGst, currency: true },
        { label: 'Input GST', value: summary.inputGst, currency: true },
        { label: 'Net GST', value: summary.netGst, currency: true, color: 'amber' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'tax', label: 'Tax' },
            { key: 'output', label: 'Output', render: (v) => formatCurrency(v) },
            { key: 'input', label: 'Input', render: (v) => formatCurrency(v) },
            { key: 'net', label: 'Net', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function GstSales() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import('../../api/gst')
      .then(({ getGstr1 }) => getGstr1())
      .then((res) => {
        if (!cancelled) setRows([...(res?.b2b || []), ...(res?.b2c || [])]);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage title="GST Sales" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Sales' }]}>
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'invoiceNumber', label: 'Invoice' },
            { key: 'party', label: 'Customer' },
            { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
            { key: 'tax', label: 'GST', render: (v) => formatCurrency(v) },
            { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function GstPurchase() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import('../../api/purchase')
      .then(({ listBills }) => listBills())
      .then((bills) => {
        if (!cancelled) {
          setRows((bills || []).filter((b) => b.gstType === 'GST' || Number(b.gstAmount) > 0));
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage title="GST Purchase" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Purchase' }]}>
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'billNo', label: 'Bill No' },
            { key: 'supplierName', label: 'Vendor' },
            { key: 'taxableAmount', label: 'Taxable', render: (v) => formatCurrency(v) },
            { key: 'gstAmount', label: 'GST', render: (v) => formatCurrency(v) },
            { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}
