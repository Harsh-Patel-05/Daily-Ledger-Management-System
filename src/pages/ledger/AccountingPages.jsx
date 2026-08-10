import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useModal } from '../../context/ModalContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CrudListPage from '../../components/pages/CrudListPage';
import PageHeader from '../../components/pages/PageHeader';
import { Card, Table, Button, DatePicker, EmptyState, StatCard } from '../../components/ui';

export function CashBook() {
  const { transactions } = useApp();
  const { purchasePayments, expenses } = useLocalModules();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const rows = useMemo(() => {
    const fromTx = transactions
      .filter((t) => {
        const mode = (t.paymentMethod || t.paymentMode || 'Cash').toLowerCase();
        const isCash = mode === 'cash';
        const d = (t.date || '').slice(0, 10);
        return isCash && (!date || d === date);
      })
      .map((t) => ({
        id: `tx-${t.id}`,
        date: t.date,
        note: t.notes || t.itemDescription || t.type,
        inAmt: ['payment', 'credit_payment', 'sale'].includes(t.type) ? Number(t.amount) || 0 : 0,
        outAmt: ['expense', 'payment_out', 'return'].includes(t.type) ? Number(t.amount) || 0 : 0,
      }));

    const fromPurchase = purchasePayments.items
      .filter((p) => {
        const mode = (p.mode || 'Cash').toLowerCase();
        return mode === 'cash' && (!date || (p.date || '').slice(0, 10) === date);
      })
      .map((p) => ({
        id: `pp-${p.id}`,
        date: p.date,
        note: `Purchase · ${p.supplierName}${p.billNo ? ` · ${p.billNo}` : ''}`,
        inAmt: 0,
        outAmt: Number(p.amount) || 0,
      }));

    const fromExp = expenses.items
      .filter((e) => {
        const mode = (e.paymentMode || 'Cash').toLowerCase();
        return mode === 'cash' && (!date || (e.date || '').slice(0, 10) === date);
      })
      .map((e) => ({
        id: `ex-${e.id}`,
        date: e.date,
        note: e.categoryName || e.notes || 'Expense',
        inAmt: 0,
        outAmt: Number(e.amount) || 0,
      }));

    return [...fromTx, ...fromPurchase, ...fromExp].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [transactions, purchasePayments.items, expenses.items, date]);

  const cashIn = rows.reduce((s, r) => s + r.inAmt, 0);
  const cashOut = rows.reduce((s, r) => s + r.outAmt, 0);

  const columns = [
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'note', label: 'Particulars' },
    { key: 'inAmt', label: 'Cash In', render: (v) => (v ? formatCurrency(v) : '—') },
    { key: 'outAmt', label: 'Cash Out', render: (v) => (v ? formatCurrency(v) : '—') },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cash Book"
        subtitle="Cash receipts and payments"
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Cash Book' }]}
      />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Cash In" value={formatCurrency(cashIn)} color="green" />
        <StatCard title="Cash Out" value={formatCurrency(cashOut)} color="red" />
        <StatCard title="Net Cash" value={formatCurrency(cashIn - cashOut)} color="blue" />
      </div>
      <Card>
        <div className="mb-4 max-w-xs">
          <DatePicker label="Date" value={date} onChange={setDate} />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No cash entries" description="Cash transactions for this date will appear here." />
        ) : (
          <Table columns={columns} data={rows} />
        )}
      </Card>
    </div>
  );
}

export function DayBook() {
  const { transactions, invoices } = useApp();
  const { purchaseBills, purchasePayments, expenses } = useLocalModules();
  const { openModal } = useModal();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const rows = useMemo(() => {
    const tx = transactions
      .filter((t) => (t.date || '').slice(0, 10) === date)
      .map((t) => ({
        id: `t-${t.id}`,
        time: t.date,
        type: t.type,
        ref: t.reference || 'Txn',
        amount: t.amount,
        note: t.notes || t.itemDescription,
      }));
    const inv = invoices
      .filter((i) => (i.date || i.invoiceDate || '').slice(0, 10) === date)
      .map((i) => ({
        id: `i-${i.id}`,
        time: i.date || i.invoiceDate,
        type: 'invoice',
        ref: i.invoiceNumber,
        amount: i.total || i.grandTotal,
        note: i.customerName || 'Sales invoice',
      }));
    const bills = purchaseBills.items
      .filter((b) => (b.date || '').slice(0, 10) === date)
      .map((b) => ({
        id: `pb-${b.id}`,
        time: b.date,
        type: 'purchase',
        ref: b.billNo,
        amount: b.total,
        note: b.supplierName,
      }));
    const pays = purchasePayments.items
      .filter((p) => (p.date || '').slice(0, 10) === date)
      .map((p) => ({
        id: `pp-${p.id}`,
        time: p.date,
        type: 'purchase_payment',
        ref: p.billNo || 'Pay',
        amount: p.amount,
        note: p.supplierName,
      }));
    const exp = expenses.items
      .filter((e) => (e.date || '').slice(0, 10) === date)
      .map((e) => ({
        id: `ex-${e.id}`,
        time: e.date,
        type: 'expense',
        ref: e.categoryName || 'Expense',
        amount: e.amount,
        note: e.notes,
      }));
    return [...tx, ...inv, ...bills, ...pays, ...exp].sort((a, b) =>
      String(b.time).localeCompare(String(a.time))
    );
  }, [transactions, invoices, purchaseBills.items, purchasePayments.items, expenses.items, date]);

  const columns = [
    { key: 'time', label: 'Date', render: (v) => formatDate(v) },
    { key: 'type', label: 'Type' },
    { key: 'ref', label: 'Reference' },
    { key: 'note', label: 'Particulars', render: (v) => v || '—' },
    { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Day Book"
        subtitle="All entries for a selected day"
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Day Book' }]}
        actions={<Button variant="outline" onClick={() => openModal('dayClosing')}>Day Closing</Button>}
      />
      <Card>
        <div className="mb-4 max-w-xs">
          <DatePicker label="Date" value={date} onChange={setDate} />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No entries today" description="Sales, payments and expenses for this day will show here." />
        ) : (
          <Table columns={columns} data={rows} />
        )}
      </Card>
    </div>
  );
}

export function OpeningBalancePage() {
  const { openingBalances } = useLocalModules();
  return (
    <CrudListPage
      title="Opening Balance"
      subtitle="Used as starting point in Party Ledger when party name matches"
      breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Opening Balance' }]}
      externalCollection={openingBalances}
      storageKey="__opening_balances_ui"
      addLabel="Add Balance"
      searchKeys={['partyName', 'partyType', 'type']}
      fields={[
        {
          key: 'partyType',
          label: 'Type',
          type: 'select',
          options: [
            { value: 'customer', label: 'Customer' },
            { value: 'supplier', label: 'Supplier' },
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank' },
          ],
          defaultValue: 'customer',
        },
        { key: 'partyName', label: 'Party / Account', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        {
          key: 'type',
          label: 'Dr / Cr',
          type: 'select',
          options: [
            { value: 'debit', label: 'Debit' },
            { value: 'credit', label: 'Credit' },
          ],
          defaultValue: 'debit',
        },
        { key: 'asOf', label: 'As Of', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
      ]}
    />
  );
}

export function ClosingBalance() {
  const { customers, transactions, stats } = useApp();
  const { supplierPayables, expenses } = useLocalModules();
  const asOf = new Date().toISOString().slice(0, 10);

  const receivable = customers.reduce((s, c) => s + Math.max(Number(c.currentBalance) || 0, 0), 0);
  const payable = supplierPayables.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0);
  const todayOut = transactions
    .filter((t) => (t.date || '').slice(0, 10) === asOf && ['expense', 'payment_out'].includes(t.type))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
    + expenses.items.filter((e) => (e.date || '').slice(0, 10) === asOf).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const todayIn = transactions
    .filter((t) => (t.date || '').slice(0, 10) === asOf && ['payment', 'credit_payment'].includes(t.type))
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Closing Balance"
        subtitle={`As of ${formatDate(asOf)}`}
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Closing Balance' }]}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Receivables" value={formatCurrency(receivable)} color="amber" />
        <StatCard title="Payables" value={formatCurrency(payable)} color="red" />
        <StatCard title="Today In" value={formatCurrency(todayIn)} color="green" />
        <StatCard title="Today Out" value={formatCurrency(todayOut)} color="purple" />
      </div>
      <Card>
        <p className="text-sm text-muted">
          Net position (receivable − payable): <strong>{formatCurrency(receivable - payable)}</strong>.
          Customers: {customers.length}. Transactions: {transactions.length}.
          {stats?.totalCredit != null && <> Overall credit: {formatCurrency(stats.totalCredit)}.</>}
        </p>
      </Card>
    </div>
  );
}
