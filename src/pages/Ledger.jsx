import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaPrint, FaFileExport, FaBook } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getLedger } from '../api/core';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_TYPES } from '../utils/helpers';
import { exportToCsv } from '../utils/exportCsv';
import { getApiMessage, getApiErrorMessage } from '../utils/apiMessage';
import {
  Breadcrumbs, Card, CardHeader, Dropdown, DatePicker, Button, Badge, EmptyState, Loader,
} from '../components/ui';

export default function Ledger() {
  const { customers, getCustomer } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customerId, setCustomerId] = useState(searchParams.get('customer') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState(null);

  const customer = customerId ? getCustomer(customerId) : null;

  const load = useCallback(async () => {
    if (!customerId) {
      setLedger(null);
      return;
    }
    setLoading(true);
    try {
      const data = await getLedger(customerId, {
        date_from: fromDate || undefined,
        date_to: toDate || undefined,
      });
      setLedger(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load ledger'));
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, toDate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    if (id) setSearchParams({ customer: id });
    else setSearchParams({});
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const name = ledger?.customer?.name || customer?.name;
    if (!name || !ledger?.entries?.length) {
      toast.error('Nothing to export');
      return;
    }
    const rows = ledger.entries.map((e) => ({
      Date: e.date,
      Type: e.type,
      Description: e.itemDescription || e.description || '',
      Debit: e.debit,
      Credit: e.credit,
      Balance: e.runningBalance ?? e.balance,
      Method: e.paymentMethod || '',
      Notes: e.notes || '',
    }));
    exportToCsv(rows, `ledger-${String(name).replace(/\s+/g, '-').toLowerCase()}.csv`);
    toast.success('Ledger exported as CSV');
  };

  const typeColor = (type) => {
    if (type === 'credit') return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
    if (type === 'payment') return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10';
    if (type === 'return') return 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
    return 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10';
  };

  const opening = Number(ledger?.openingBalance) || 0;
  const closing = Number(ledger?.closingBalance) || 0;
  const totalDebit = Number(ledger?.totalDebit ?? ledger?.totalCreditSale) || 0;
  const totalCredit = Number(ledger?.totalCredit ?? ledger?.totalPayment) || 0;
  const entries = ledger?.entries || [];
  const party = ledger?.customer || customer;

  return (
    <div className="space-y-4">
      <div className="no-print">
        <Breadcrumbs items={[{ label: 'Ledger' }, { label: 'Party Ledger' }]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Party Ledger</h1>
            <p className="text-sm text-muted">Live from backend · running balance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!customerId}>
              <FaPrint size={12} /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!entries.length}>
              <FaFileExport size={12} /> Export
            </Button>
          </div>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader title="Filters" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Dropdown
            label="Customer"
            value={customerId}
            onChange={handleCustomerChange}
            options={customers.map((c) => ({
              value: String(c.id),
              label: `${c.name}${c.businessName ? ` — ${c.businessName}` : ''}`,
            }))}
            placeholder="Select customer"
          />
          <DatePicker label="From" value={fromDate} onChange={setFromDate} />
          <DatePicker label="To" value={toDate} onChange={setToDate} />
        </div>
      </Card>

      {!customerId ? (
        <Card>
          <EmptyState
            type="default"
            title="Select a customer"
            description="Choose a customer to load their ledger from the server."
          />
        </Card>
      ) : loading ? (
        <Card className="py-16 flex justify-center"><Loader /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Opening Balance', value: opening, color: 'text-slate-700' },
              { label: 'Total Debit (Sales)', value: totalDebit, color: 'text-blue-600' },
              { label: 'Total Credit (Payments)', value: totalCredit, color: 'text-emerald-600' },
              { label: 'Closing Balance', value: closing, color: 'text-amber-600' },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p className="text-xs text-muted font-medium">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FaBook size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{party?.name}</h2>
                  <p className="text-sm text-muted">
                    {party?.businessName} · {party?.mobile}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Current Balance</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(party?.currentBalance ?? closing)}
                </p>
              </div>
            </div>

            {entries.length === 0 ? (
              <EmptyState title="No entries" description="No ledger entries for the selected filters." />
            ) : (
              <div className="space-y-0">
                <div className="flex gap-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-700" />
                    <div className="w-0.5 flex-1 bg-border dark:bg-slate-700" />
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Opening Balance</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(opening)}</p>
                  </div>
                </div>

                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-800 ${
                        entry.type === 'credit' ? 'bg-blue-500'
                          : entry.type === 'payment' ? 'bg-emerald-500'
                            : entry.type === 'return' ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      />
                      {idx < entries.length - 1 && (
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
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1.5">
                            {entry.itemDescription || entry.description}
                          </p>
                          {entry.notes && <p className="text-xs text-muted mt-0.5">{entry.notes}</p>}
                          <p className="text-xs text-muted mt-1">{entry.paymentMethod}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {entry.debit > 0 && (
                            <p className="text-sm font-bold text-blue-600">Dr {formatCurrency(entry.debit)}</p>
                          )}
                          {entry.credit > 0 && (
                            <p className="text-sm font-bold text-emerald-600">Cr {formatCurrency(entry.credit)}</p>
                          )}
                          <p className="text-xs text-muted mt-1">
                            Bal {formatCurrency(entry.runningBalance ?? entry.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
