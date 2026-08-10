import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { formatCurrency } from '../../utils/formatters';
import ReportPage, { ReportLinks } from '../../components/pages/ReportPage';
import PageHeader from '../../components/pages/PageHeader';
import { Card, Table } from '../../components/ui';

export function ReportsHub() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle="Business insights across modules"
        breadcrumbs={[{ label: 'Reports' }]}
      />
      <Card>
        <ReportLinks
          links={[
            { to: '/reports/sales', label: 'Sales Reports', description: 'Invoices and collections' },
            { to: '/reports/purchase', label: 'Purchase Reports', description: 'Bills and payables' },
            { to: '/reports/payments', label: 'Payment Reports', description: 'In and out cashflow' },
            { to: '/reports/outstanding', label: 'Outstanding Reports', description: 'Party dues' },
            { to: '/reports/inventory', label: 'Inventory Reports', description: 'Stock valuation' },
            { to: '/reports/expenses', label: 'Expense Reports', description: 'Spend by category' },
            { to: '/reports/profit-loss', label: 'Profit/Loss Summary', description: 'P&L overview' },
            { to: '/reports/gst', label: 'GST Reports', description: 'Tax summaries' },
          ]}
        />
      </Card>
      <p className="text-sm text-muted">
        Looking for the classic report tabs?{' '}
        <Link to="/reports/classic" className="text-primary hover:underline">Open classic reports</Link>
      </p>
    </div>
  );
}

export function SalesReports() {
  const { invoices, stats } = useApp();
  const total = invoices.reduce((s, i) => s + (Number(i.total || i.grandTotal) || 0), 0);
  const paid = invoices.filter((i) => i.status === 'paid').length;
  return (
    <ReportPage
      title="Sales Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Sales Reports' }]}
      stats={[
        { label: 'Invoices', value: invoices.length },
        { label: 'Sales Value', value: total, currency: true, color: 'green' },
        { label: 'Paid Invoices', value: paid, color: 'blue' },
        { label: 'Credit', value: stats?.totalCredit || 0, currency: true, color: 'amber' },
      ]}
    >
      <Table
        columns={[
          { key: 'invoiceNumber', label: 'Invoice' },
          { key: 'status', label: 'Status' },
          { key: 'total', label: 'Amount', render: (v, row) => formatCurrency(v || row.grandTotal) },
        ]}
        data={invoices.slice(0, 20)}
      />
    </ReportPage>
  );
}

export function PurchaseReports() {
  const { purchaseBills } = useLocalModules();
  const items = purchaseBills.items;
  const total = items.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const payable = items.reduce((s, b) => s + (Number(b.balance) || 0), 0);
  return (
    <ReportPage
      title="Purchase Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Purchase Reports' }]}
      stats={[
        { label: 'Bills', value: items.length },
        { label: 'Purchase Value', value: total, currency: true },
        { label: 'Payable', value: payable, currency: true, color: 'amber' },
      ]}
    >
      <Table
        columns={[
          { key: 'billNo', label: 'Bill' },
          { key: 'supplierName', label: 'Supplier' },
          { key: 'total', label: 'Total', render: (v) => formatCurrency(v) },
          { key: 'balance', label: 'Balance', render: (v) => formatCurrency(v) },
        ]}
        data={items}
      />
    </ReportPage>
  );
}

export function PaymentReports() {
  const { transactions } = useApp();
  const inAmt = transactions.filter((t) => ['payment', 'credit_payment'].includes(t.type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const outAmt = transactions.filter((t) => ['expense', 'payment_out'].includes(t.type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return (
    <ReportPage
      title="Payment Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Payment Reports' }]}
      stats={[
        { label: 'Payment In', value: inAmt, currency: true, color: 'green' },
        { label: 'Payment Out', value: outAmt, currency: true, color: 'red' },
        { label: 'Net', value: inAmt - outAmt, currency: true, color: 'blue' },
      ]}
    >
      <p className="text-sm text-muted">Detailed history is available under Payments → Payment History.</p>
    </ReportPage>
  );
}

export function OutstandingReports() {
  const { customers } = useApp();
  const due = customers.filter((c) => Number(c.currentBalance) > 0);
  const total = due.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0);
  return (
    <ReportPage
      title="Outstanding Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Outstanding Reports' }]}
      stats={[
        { label: 'Parties Due', value: due.length, color: 'amber' },
        { label: 'Total Due', value: total, currency: true, color: 'red' },
      ]}
    >
      <Table
        columns={[
          { key: 'name', label: 'Party' },
          { key: 'currentBalance', label: 'Outstanding', render: (v) => formatCurrency(v) },
        ]}
        data={due}
      />
    </ReportPage>
  );
}

export function InventoryReports() {
  const { products, stats } = useInventory();
  const value = products.reduce((s, p) => s + (Number(p.stockQty) || 0) * (Number(p.purchasePrice) || 0), 0);
  return (
    <ReportPage
      title="Inventory Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Inventory Reports' }]}
      stats={[
        { label: 'Products', value: products.length },
        { label: 'Stock Value', value, currency: true, color: 'blue' },
        { label: 'Low Stock', value: stats.lowStockItems?.length || 0, color: 'amber' },
        { label: 'Out of Stock', value: stats.outOfStockItems?.length || 0, color: 'red' },
      ]}
    >
      <Table
        columns={[
          { key: 'name', label: 'Product' },
          { key: 'stockQty', label: 'Qty' },
          { key: 'purchasePrice', label: 'Cost', render: (v) => formatCurrency(v) },
        ]}
        data={products.slice(0, 20)}
      />
    </ReportPage>
  );
}

export function ExpenseReportPage() {
  const { expenses } = useLocalModules();
  const items = expenses.items;
  const total = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return (
    <ReportPage
      title="Expense Reports"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Expense Reports' }]}
      stats={[{ label: 'Total Expenses', value: total, currency: true, color: 'red' }, { label: 'Entries', value: items.length }]}
    >
      <Table
        columns={[
          { key: 'categoryName', label: 'Category' },
          { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
        ]}
        data={items}
      />
    </ReportPage>
  );
}

export function ProfitLossSummary() {
  const { invoices, transactions } = useApp();
  const { expenses, purchaseBills } = useLocalModules();

  const sales = invoices.reduce((s, i) => s + (Number(i.total || i.grandTotal) || 0), 0);
  const purchase = purchaseBills.items.reduce((s, b) => s + (Number(b.total) || 0), 0);
  const expense = expenses.items.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    + transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const profit = sales - purchase - expense;

  return (
    <ReportPage
      title="Profit / Loss Summary"
      breadcrumbs={[{ label: 'Reports', to: '/reports/sales' }, { label: 'Profit/Loss Summary' }]}
      stats={[
        { label: 'Sales', value: sales, currency: true, color: 'green' },
        { label: 'Purchases', value: purchase, currency: true, color: 'purple' },
        { label: 'Expenses', value: expense, currency: true, color: 'red' },
        { label: 'Net P/L', value: profit, currency: true, color: profit >= 0 ? 'blue' : 'red' },
      ]}
    >
      <p className="text-sm text-muted">Frontend estimate using sales invoices, purchase bills and expenses. Backend P&amp;L will refine this later.</p>
    </ReportPage>
  );
}

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
