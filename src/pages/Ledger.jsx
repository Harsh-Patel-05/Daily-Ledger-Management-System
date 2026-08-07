import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaPrint, FaFileExport, FaBook } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_TYPES } from '../utils/helpers';
import { exportToCsv } from '../utils/exportCsv';
import {
  Breadcrumbs, Card, CardHeader, Dropdown, DatePicker, Button, Badge, EmptyState,
} from '../components/ui';

export default function Ledger() {
  const { customers, getCustomerTransactions, getCustomer } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customerId, setCustomerId] = useState(searchParams.get('customer') || '');
  const [month, setMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const customer = customerId ? getCustomer(customerId) : null;

  const ledgerEntries = useMemo(() => {
    if (!customerId) return [];
    let txs = getCustomerTransactions(customerId);

    if (month) {
      txs = txs.filter((t) => t.date.startsWith(month));
    }
    if (fromDate) txs = txs.filter((t) => t.date >= fromDate);
    if (toDate) txs = txs.filter((t) => t.date <= toDate);

    txs = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));

    const openingBalance = 0;
    let running = openingBalance;
    const entries = txs.map((tx) => {
      let credit = 0;
      let debit = 0;
      if (tx.type === 'credit') credit = tx.amount;
      if (tx.type === 'payment' || tx.type === 'return' || tx.type === 'discount') debit = tx.amount;
      running = running + credit - debit;
      return { ...tx, credit, debit, runningBalance: running };
    });

    return {
      openingBalance,
      entries,
      closingBalance: running,
      totalCredit: entries.reduce((s, e) => s + e.credit, 0),
      totalPayment: entries.reduce((s, e) => s + e.debit, 0),
    };
  }, [customerId, month, fromDate, toDate, getCustomerTransactions]);

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    if (id) setSearchParams({ customer: id });
    else setSearchParams({});
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!customer || !ledgerEntries?.entries?.length) {
      toast.error('Nothing to export');
      return;
    }
    const rows = ledgerEntries.entries.map((e) => ({
      Date: e.date,
      Type: e.type,
      Description: e.itemDescription || e.description || '',
      Credit: e.credit,
      Debit: e.debit,
      Balance: e.runningBalance,
      Method: e.paymentMethod || '',
      Notes: e.notes || '',
    }));
    exportToCsv(rows, `ledger-${customer.name.replace(/\s+/g, '-').toLowerCase()}.csv`);
    toast.success('Ledger exported as CSV');
  };

  const typeColor = (type) => {
    if (type === 'credit') return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
    if (type === 'payment') return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10';
    if (type === 'return') return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
    if (type === 'discount') return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10';
    return 'border-l-slate-400';
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Ledger' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customer Ledger</h1>
          <p className="text-sm text-muted mt-0.5">Roj Mel — detailed account statement</p>
        </div>
        {customer && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FaFileExport size={12} /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <FaPrint size={12} /> Print
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dropdown
            label="Customer"
            value={customerId}
            onChange={handleCustomerChange}
            options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.businessName}` }))}
            placeholder="Select customer"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <DatePicker label="From Date" value={fromDate} onChange={setFromDate} />
          <DatePicker label="To Date" value={toDate} onChange={setToDate} />
        </div>
      </Card>

      {!customerId ? (
        <Card>
          <EmptyState
            type="default"
            title="Select a customer"
            description="Choose a customer from the dropdown above to view their ledger statement."
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Opening Balance', value: ledgerEntries.openingBalance, color: 'text-slate-700' },
              { label: 'Total Credit', value: ledgerEntries.totalCredit, color: 'text-blue-600' },
              { label: 'Total Payments', value: ledgerEntries.totalPayment, color: 'text-emerald-600' },
              { label: 'Closing Balance', value: ledgerEntries.closingBalance, color: 'text-amber-600' },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p className="text-xs text-muted font-medium">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color} dark:text-inherit`}>{formatCurrency(s.value)}</p>
              </Card>
            ))}
          </div>

          {/* Customer header for print */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FaBook size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{customer.name}</h2>
                  <p className="text-sm text-muted">{customer.businessName} · {customer.mobile}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Current Balance</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(customer.currentBalance)}</p>
              </div>
            </div>

            {/* Ledger Timeline */}
            {ledgerEntries.entries.length === 0 ? (
              <EmptyState title="No entries" description="No ledger entries found for the selected filters." />
            ) : (
              <div className="space-y-0">
                {/* Opening */}
                <div className="flex gap-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-700" />
                    <div className="w-0.5 flex-1 bg-border dark:bg-slate-700" />
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Opening Balance</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(ledgerEntries.openingBalance)}</p>
                  </div>
                </div>

                {ledgerEntries.entries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-800 ${
                        entry.type === 'credit' ? 'bg-blue-500' :
                        entry.type === 'payment' ? 'bg-emerald-500' :
                        entry.type === 'return' ? 'bg-amber-500' : 'bg-purple-500'
                      }`} />
                      {idx < ledgerEntries.entries.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border dark:bg-slate-700" />
                      )}
                    </div>
                    <div className={`flex-1 mb-4 p-4 rounded-xl border-l-4 ${typeColor(entry.type)}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={entry.type === 'payment' ? 'success' : entry.type === 'credit' ? 'primary' : 'warning'}>
                              {TRANSACTION_TYPES[entry.type]?.label || entry.type}
                            </Badge>
                            <span className="text-xs text-muted">{formatDate(entry.date)}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1.5">{entry.itemDescription}</p>
                          {entry.notes && <p className="text-xs text-muted mt-0.5">{entry.notes}</p>}
                          <p className="text-xs text-muted mt-1">
                            {entry.paymentMethod}
                            {entry.quantity > 1 && ` · Qty: ${entry.quantity} × ${formatCurrency(entry.rate)}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {entry.credit > 0 && (
                            <p className="text-sm font-bold text-blue-600">+{formatCurrency(entry.credit)}</p>
                          )}
                          {entry.debit > 0 && (
                            <p className="text-sm font-bold text-emerald-600">−{formatCurrency(entry.debit)}</p>
                          )}
                          <p className="text-xs text-muted mt-1">Bal: {formatCurrency(entry.runningBalance)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Closing */}
                <div className="flex gap-4 pt-2">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/40" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Closing Balance</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(ledgerEntries.closingBalance)}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Traditional table view */}
          {ledgerEntries.entries.length > 0 && (
            <Card>
              <CardHeader title="Ledger Statement (Table View)" />
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                      {['Date', 'Particulars', 'Type', 'Credit (Dr)', 'Payment (Cr)', 'Balance'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
                    <tr className="bg-slate-50/50 dark:bg-slate-700/20">
                      <td className="px-4 py-3 text-sm" colSpan={3}>Opening Balance</td>
                      <td className="px-4 py-3 text-sm">—</td>
                      <td className="px-4 py-3 text-sm">—</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(ledgerEntries.openingBalance)}</td>
                    </tr>
                    {ledgerEntries.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{e.itemDescription}</td>
                        <td className="px-4 py-3 text-sm">{TRANSACTION_TYPES[e.type]?.label || e.type}</td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-600">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(e.runningBalance)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50/50 dark:bg-amber-900/10 font-semibold">
                      <td className="px-4 py-3 text-sm" colSpan={3}>Closing Balance</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{formatCurrency(ledgerEntries.totalCredit)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600">{formatCurrency(ledgerEntries.totalPayment)}</td>
                      <td className="px-4 py-3 text-sm text-amber-600">{formatCurrency(ledgerEntries.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
