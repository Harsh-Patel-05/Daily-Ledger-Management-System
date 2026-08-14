import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { formatCurrency } from '../../utils/formatters';
import { isGstSale } from '../../utils/invoiceUtils';
import PageHeader from '../../components/pages/PageHeader';
import ReportPage, { ReportLinks } from '../../components/pages/ReportPage';
import { Card, StatCard, Table } from '../../components/ui';

function useGstStats() {
  const { invoices } = useApp();
  const { purchaseBills } = useLocalModules();
  const bills = purchaseBills.items;

  return useMemo(() => {
    const gstSales = invoices.filter((i) => isGstSale(i));
    const nonGstSales = invoices.filter((i) => !isGstSale(i));
    const salesTaxable = gstSales.reduce((s, i) => s + (Number(i.subtotal || i.taxableAmount) || 0), 0);
    const salesGst = gstSales.reduce((s, i) => s + (Number(i.taxAmount || i.gstAmount) || 0), 0);
    const salesTotal = invoices.reduce((s, i) => s + (Number(i.total || i.grandTotal) || 0), 0);

    const gstPurchase = bills.filter((b) => b.gstType === 'GST');
    const purchaseTaxable = gstPurchase.reduce((s, b) => s + (Number(b.taxableAmount) || 0), 0);
    const purchaseGst = gstPurchase.reduce((s, b) => s + (Number(b.gstAmount) || 0), 0);

    return {
      gstSales,
      nonGstSales,
      salesTaxable,
      salesGst,
      salesTotal,
      gstPurchase,
      purchaseTaxable,
      purchaseGst,
      netGst: salesGst - purchaseGst,
      invoices,
      purchaseBills: bills,
    };
  }, [invoices, bills]);
}

export function GstDashboard() {
  const g = useGstStats();
  return (
    <div className="space-y-4">
      <PageHeader
        title="GST Dashboard"
        subtitle="GST + Non-GST overview (frontend)"
        breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Dashboard' }]}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Output GST" value={formatCurrency(g.salesGst)} color="blue" />
        <StatCard title="Input GST" value={formatCurrency(g.purchaseGst)} color="purple" />
        <StatCard title="Net GST" value={formatCurrency(g.netGst)} color="amber" />
        <StatCard title="Non-GST Sales" value={String(g.nonGstSales.length)} color="green" />
      </div>
      <Card>
        <ReportLinks
          links={[
            { to: '/gst/summary', label: 'GST Summary', description: 'Taxable + tax totals' },
            { to: '/gst/hsn-sac', label: 'HSN/SAC Summary', description: 'By HSN codes' },
            { to: '/gst/tax-summary', label: 'Tax Summary', description: 'CGST / SGST / IGST view' },
            { to: '/gst/sales', label: 'GST Sales', description: 'GST sales invoices' },
            { to: '/gst/purchase', label: 'GST Purchase', description: 'GST purchase bills' },
          ]}
        />
      </Card>
    </div>
  );
}

export function GstSummary() {
  const g = useGstStats();
  return (
    <ReportPage
      title="GST Summary"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Summary' }]}
      stats={[
        { label: 'Taxable Sales', value: g.salesTaxable, currency: true },
        { label: 'Output GST', value: g.salesGst, currency: true, color: 'blue' },
        { label: 'Taxable Purchase', value: g.purchaseTaxable, currency: true, color: 'purple' },
        { label: 'Input GST', value: g.purchaseGst, currency: true, color: 'amber' },
      ]}
    >
      <p className="text-sm text-muted mb-4">
        Net payable GST: <strong className="text-slate-800 dark:text-white">{formatCurrency(g.netGst)}</strong>
        {' '}· Supports both GST and Non-GST billing.
      </p>
      <Link to="/gst" className="text-sm text-primary hover:underline">Back to GST Dashboard</Link>
    </ReportPage>
  );
}

export function HsnSacSummary() {
  const { invoices } = useApp();
  const rows = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      if (!isGstSale(inv)) return;
      (inv.items || []).forEach((item) => {
        const hsn = item.hsn || item.hsnSac || 'N/A';
        if (!map[hsn]) map[hsn] = { id: hsn, hsn, qty: 0, taxable: 0, tax: 0 };
        map[hsn].qty += Number(item.quantity || item.qty) || 0;
        const line = Number(item.amount || item.total || (item.rate * item.quantity)) || 0;
        map[hsn].taxable += line;
        map[hsn].tax += Number(item.taxAmount) || 0;
      });
    });
    return Object.values(map);
  }, [invoices]);

  return (
    <ReportPage title="HSN/SAC Summary" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'HSN/SAC Summary' }]}>
      <Table
        columns={[
          { key: 'hsn', label: 'HSN/SAC' },
          { key: 'qty', label: 'Qty' },
          { key: 'taxable', label: 'Taxable', render: (v) => formatCurrency(v) },
          { key: 'tax', label: 'Tax', render: (v) => formatCurrency(v) },
        ]}
        data={rows}
      />
    </ReportPage>
  );
}

export function TaxSummary() {
  const g = useGstStats();
  const half = g.salesGst / 2;
  const rows = [
    { id: '1', tax: 'CGST', output: half, input: g.purchaseGst / 2, net: half - g.purchaseGst / 2 },
    { id: '2', tax: 'SGST', output: half, input: g.purchaseGst / 2, net: half - g.purchaseGst / 2 },
    { id: '3', tax: 'IGST', output: 0, input: 0, net: 0 },
  ];
  return (
    <ReportPage
      title="Tax Summary"
      breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'Tax Summary' }]}
      stats={[
        { label: 'Output GST', value: g.salesGst, currency: true },
        { label: 'Input GST', value: g.purchaseGst, currency: true },
        { label: 'Net GST', value: g.netGst, currency: true, color: 'amber' },
      ]}
    >
      <Table
        columns={[
          { key: 'tax', label: 'Tax' },
          { key: 'output', label: 'Output', render: (v) => formatCurrency(v) },
          { key: 'input', label: 'Input', render: (v) => formatCurrency(v) },
          { key: 'net', label: 'Net', render: (v) => formatCurrency(v) },
        ]}
        data={rows}
      />
    </ReportPage>
  );
}

export function GstSales() {
  const g = useGstStats();
  return (
    <ReportPage title="GST Sales" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Sales' }]}>
      <Table
        columns={[
          { key: 'invoiceNumber', label: 'Invoice' },
          { key: 'customerName', label: 'Customer', render: (v, row) => v || row.customer || '—' },
          { key: 'subtotal', label: 'Taxable', render: (v, row) => formatCurrency(v || row.taxableAmount) },
          { key: 'taxAmount', label: 'GST', render: (v, row) => formatCurrency(v || row.gstAmount) },
          { key: 'total', label: 'Total', render: (v, row) => formatCurrency(v || row.grandTotal) },
        ]}
        data={g.gstSales}
      />
    </ReportPage>
  );
}

export function GstPurchase() {
  const g = useGstStats();
  return (
    <ReportPage title="GST Purchase" breadcrumbs={[{ label: 'GST', to: '/gst' }, { label: 'GST Purchase' }]}>
      <Table
        columns={[
          { key: 'billNo', label: 'Bill No' },
          { key: 'supplierName', label: 'Supplier' },
          { key: 'taxableAmount', label: 'Taxable', render: (v) => formatCurrency(v) },
          { key: 'gstAmount', label: 'GST', render: (v) => formatCurrency(v) },
          { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
        ]}
        data={g.gstPurchase}
      />
    </ReportPage>
  );
}
