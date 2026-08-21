import { useEffect, useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { useLocalModules } from '../../context/LocalModulesContext';
import { useCompanies } from '../../context/CompaniesContext';
import { getCashBook, getDayBook, getClosingBalance } from '../../api/core';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CrudListPage from '../../components/pages/CrudListPage';
import PageHeader from '../../components/pages/PageHeader';
import { Card, Table, Button, DatePicker, EmptyState, StatCard, Loader } from '../../components/ui';

export function CashBook() {
  const { activeCompany } = useCompanies();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ rows: [], cashIn: 0, cashOut: 0, net: 0 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCashBook(date)
      .then((res) => {
        if (!cancelled) setData(res || { rows: [], cashIn: 0, cashOut: 0, net: 0 });
      })
      .catch(() => {
        if (!cancelled) setData({ rows: [], cashIn: 0, cashOut: 0, net: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [date, activeCompany?.id]);

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
        subtitle="Live from backend · cash receipts and payments"
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Cash Book' }]}
      />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Cash In" value={formatCurrency(data.cashIn)} color="green" />
        <StatCard title="Cash Out" value={formatCurrency(data.cashOut)} color="red" />
        <StatCard title="Net Cash" value={formatCurrency(data.net)} color="blue" />
      </div>
      <Card>
        <div className="mb-4 max-w-xs">
          <DatePicker label="Date" value={date} onChange={setDate} />
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : (data.rows || []).length === 0 ? (
          <EmptyState title="No cash entries" description="Cash transactions for this date will appear here." />
        ) : (
          <Table columns={columns} data={data.rows || []} />
        )}
      </Card>
    </div>
  );
}

export function DayBook() {
  const { openModal } = useModal();
  const { activeCompany } = useCompanies();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDayBook(date)
      .then((res) => {
        if (!cancelled) setRows(res?.rows || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [date, activeCompany?.id]);

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
        subtitle="Live from backend · all entries for a selected day"
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Day Book' }]}
        actions={<Button variant="outline" onClick={() => openModal('dayClosing')}>Day Closing</Button>}
      />
      <Card>
        <div className="mb-4 max-w-xs">
          <DatePicker label="Date" value={date} onChange={setDate} />
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : rows.length === 0 ? (
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
      subtitle="Stored on server · used in Party Ledger"
      breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Opening Balance' }]}
      externalCollection={openingBalances}
      addLabel="Add Balance"
      searchKeys={['partyName', 'partyType', 'type']}
      fields={[
        {
          key: 'partyType',
          label: 'Type',
          type: 'select',
          options: [
            { value: 'customer', label: 'Customer' },
            { value: 'supplier', label: 'Vendor' },
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
  const { activeCompany } = useCompanies();
  const asOf = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClosingBalance(asOf)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [asOf, activeCompany?.id]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Closing Balance"
        subtitle={`Live snapshot as of ${asOf}`}
        breadcrumbs={[{ label: 'Ledger', to: '/ledger/party' }, { label: 'Closing Balance' }]}
      />
      {loading ? (
        <Card className="py-12 flex justify-center"><Loader /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Receivables" value={formatCurrency(data?.receivable)} color="amber" />
          <StatCard title="Payables" value={formatCurrency(data?.payable)} color="red" />
          <StatCard title="Today In" value={formatCurrency(data?.todayIn)} color="green" />
          <StatCard title="Today Out" value={formatCurrency(data?.todayOut)} color="blue" />
        </div>
      )}
    </div>
  );
}
