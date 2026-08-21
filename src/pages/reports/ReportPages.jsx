import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanies } from '../../context/CompaniesContext';
import { getSalesRegister, getPurchaseRegister } from '../../api/books';
import { getReports } from '../../api/core';
import { formatCurrency } from '../../utils/formatters';
import ReportPage, { ReportLinks } from '../../components/pages/ReportPage';
import PageHeader from '../../components/pages/PageHeader';
import { Card, Table, Loader } from '../../components/ui';

export function ReportsHub() {
  const { isGstEnabled } = useCompanies();
  const links = [
    { to: '/reports/sales', label: 'Sales Reports', description: 'Invoices and collections' },
    { to: '/reports/purchase', label: 'Purchase Reports', description: 'Bills and payables' },
    { to: '/reports/payments', label: 'Payment Reports', description: 'In and out cashflow' },
    { to: '/reports/outstanding', label: 'Outstanding Reports', description: 'Party dues' },
    { to: '/reports/inventory', label: 'Inventory Reports', description: 'Stock valuation' },
    { to: '/reports/expenses', label: 'Expense Reports', description: 'Spend by category' },
    { to: '/reports/profit-loss', label: 'Profit/Loss Summary', description: 'P&L overview' },
    ...(isGstEnabled
      ? [{ to: '/reports/gst', label: 'GST Reports', description: 'Tax summaries' }]
      : []),
    { to: '/reports/sales-register', label: 'Sales Register', description: 'Invoice register' },
    { to: '/reports/purchase-register', label: 'Purchase Register', description: 'Bill register' },
    { to: '/reports/journal-register', label: 'Journal Register', description: 'Journal vouchers' },
    { to: '/reports/trial-balance', label: 'Trial Balance', description: 'Dr / Cr totals' },
    { to: '/reports/balance-sheet', label: 'Balance Sheet', description: 'Assets & liabilities' },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle="Business insights across modules"
        breadcrumbs={[{ label: 'Reports' }]}
      />
      <Card>
        <ReportLinks links={links} />
      </Card>
      <p className="text-sm text-muted">
        Looking for the classic report tabs?{' '}
        <Link to="/reports/classic" className="text-primary hover:underline">Open classic reports</Link>
      </p>
    </div>
  );
}

export function SalesReports() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getSalesRegister(), getReports({ type: 'summary' }).catch(() => null)])
      .then(([reg, rep]) => {
        if (cancelled) return;
        setRows(reg?.rows || reg?.invoices || (Array.isArray(reg) ? reg : []) || []);
        setSummary(rep);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  const total = rows.reduce((s, i) => s + (Number(i.total || i.amount || i.grandTotal) || 0), 0);

  return (
    <ReportPage
      title="Sales Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Sales Reports' }]}
      stats={[
        { label: 'Invoices', value: rows.length },
        { label: 'Sales Value', value: total, currency: true, color: 'green' },
        { label: 'From API', value: summary ? 'Yes' : 'Register', color: 'blue' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'invoiceNumber', label: 'Invoice', render: (v, row) => v || row.number || '—' },
            { key: 'party', label: 'Party', render: (v, row) => v || row.customerName || '—' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Amount', render: (v, row) => formatCurrency(v || row.amount || row.grandTotal) },
          ]}
          data={rows.slice(0, 50)}
        />
      )}
    </ReportPage>
  );
}

export function PurchaseReports() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPurchaseRegister()
      .then((reg) => {
        if (!cancelled) setRows(reg?.rows || reg?.bills || (Array.isArray(reg) ? reg : []) || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  const total = rows.reduce((s, b) => s + (Number(b.total || b.amount) || 0), 0);
  const payable = rows.reduce((s, b) => s + (Number(b.balance) || 0), 0);

  return (
    <ReportPage
      title="Purchase Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Purchase Reports' }]}
      stats={[
        { label: 'Bills', value: rows.length },
        { label: 'Purchase Value', value: total, currency: true },
        { label: 'Payable', value: payable, currency: true, color: 'amber' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'billNo', label: 'Bill', render: (v, row) => v || row.number || '—' },
            { key: 'supplierName', label: 'Vendor', render: (v, row) => v || row.party || '—' },
            { key: 'total', label: 'Total', render: (v, row) => formatCurrency(v || row.amount) },
            { key: 'balance', label: 'Balance', render: (v) => formatCurrency(v || 0) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function PaymentReports() {
  const { activeCompany } = useCompanies();
  const [summary, setSummary] = useState({ paymentIn: 0, paymentOut: 0, net: 0 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReports({ type: 'payments' })
      .then((res) => {
        if (cancelled) return;
        setSummary(res?.summary || { paymentIn: 0, paymentOut: 0, net: 0 });
        setRows(res?.rows || res?.paymentMethods || []);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({ paymentIn: 0, paymentOut: 0, net: 0 });
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage
      title="Payment Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Payment Reports' }]}
      stats={[
        { label: 'Payment In', value: summary.paymentIn, currency: true, color: 'green' },
        { label: 'Payment Out', value: summary.paymentOut, currency: true, color: 'red' },
        { label: 'Net', value: summary.net, currency: true, color: 'blue' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'payment_method', label: 'Method', render: (v, row) => v || row.method || '—' },
            { key: 'count', label: 'Count' },
            { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function OutstandingReports() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ partiesDue: 0, totalDue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReports({ type: 'outstanding' })
      .then((res) => {
        if (cancelled) return;
        setRows(res?.rows || []);
        setSummary(res?.summary || { partiesDue: 0, totalDue: 0 });
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setSummary({ partiesDue: 0, totalDue: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage
      title="Outstanding Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Outstanding Reports' }]}
      stats={[
        { label: 'Parties Due', value: summary.partiesDue, color: 'amber' },
        { label: 'Total Due', value: summary.totalDue, currency: true, color: 'red' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Party' },
            { key: 'currentBalance', label: 'Outstanding', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export function InventoryReports() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ products: 0, stockValue: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReports({ type: 'inventory' })
      .then((res) => {
        if (cancelled) return;
        setRows(res?.rows || []);
        setSummary(res?.summary || { products: 0, stockValue: 0, lowStock: 0, outOfStock: 0 });
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setSummary({ products: 0, stockValue: 0, lowStock: 0, outOfStock: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage
      title="Inventory Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Inventory Reports' }]}
      stats={[
        { label: 'Products', value: summary.products },
        { label: 'Stock Value', value: summary.stockValue, currency: true, color: 'blue' },
        { label: 'Low Stock', value: summary.lowStock, color: 'amber' },
        { label: 'Out of Stock', value: summary.outOfStock, color: 'red' },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'stockQty', label: 'Qty' },
            {
              key: 'purchasePriceWithGst',
              label: 'Cost',
              render: (_, row) =>
                formatCurrency(Number(row.purchasePriceWithGst) || Number(row.purchasePrice) || 0),
            },
          ]}
          data={rows.slice(0, 50)}
        />
      )}
    </ReportPage>
  );
}

export function ExpenseReportPage() {
  const { activeCompany } = useCompanies();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalExpenses: 0, entries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReports({ type: 'expenses' })
      .then((res) => {
        if (cancelled) return;
        setRows(res?.rows || []);
        setSummary(res?.summary || { totalExpenses: 0, entries: 0 });
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setSummary({ totalExpenses: 0, entries: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  return (
    <ReportPage
      title="Expense Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Expense Reports' }]}
      stats={[
        { label: 'Total Expenses', value: summary.totalExpenses, currency: true, color: 'red' },
        { label: 'Entries', value: summary.entries },
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center"><Loader /></div>
      ) : (
        <Table
          columns={[
            { key: 'categoryName', label: 'Category' },
            { key: 'count', label: 'Entries' },
            { key: 'total', label: 'Amount', render: (v) => formatCurrency(v) },
          ]}
          data={rows}
        />
      )}
    </ReportPage>
  );
}

export { ProfitLossPage as ProfitLossSummary } from '../modules/MunimPages';

export function GstReports() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="GST Reports"
        subtitle="Jump to GST module reports"
        breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'GST Reports' }]}
      />
      <Card>
        <ReportLinks
          links={[
            { to: '/gst', label: 'GST Dashboard', description: 'Overview' },
            { to: '/gst/summary', label: 'GST Summary', description: 'Input vs output' },
            { to: '/gst/hsn-sac', label: 'HSN/SAC', description: 'Code wise' },
            { to: '/gst/tax-summary', label: 'Tax Summary', description: 'CGST/SGST/IGST' },
          ]}
        />
      </Card>
    </div>
  );
}
