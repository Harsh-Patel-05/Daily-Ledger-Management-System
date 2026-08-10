import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FaFileAlt, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaUsers, FaExclamationTriangle, FaTrophy, FaHandHoldingUsd } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import {
  monthlyTrendFromAnalytics,
  weeklyReportFromTransactions,
  topCustomersFromAnalytics,
} from '../utils/reportBuilders';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Breadcrumbs, Card, CardHeader, Badge, StatCard } from '../components/ui';

const tabs = [
  { id: 'daily', label: 'Daily', icon: FaCalendarDay },
  { id: 'weekly', label: 'Weekly', icon: FaCalendarWeek },
  { id: 'monthly', label: 'Monthly', icon: FaCalendarAlt },
  { id: 'customer', label: 'Customer', icon: FaUsers },
  { id: 'outstanding', label: 'Outstanding', icon: FaExclamationTriangle },
  { id: 'top', label: 'Top Customers', icon: FaTrophy },
  { id: 'collection', label: 'Collection', icon: FaHandHoldingUsd },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily');
  const { transactions, customers, stats, reportsData, analyticsData } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = formatDate(today);
  const todayTxs = useMemo(
    () => transactions.filter((t) => t.date === today),
    [transactions, today]
  );

  const outstanding = useMemo(
    () => [...customers].filter((c) => c.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance),
    [customers]
  );

  const weekly = useMemo(
    () => weeklyReportFromTransactions(transactions),
    [transactions]
  );

  const monthly = useMemo(
    () => monthlyTrendFromAnalytics(analyticsData),
    [analyticsData]
  );

  const topCust = useMemo(
    () => topCustomersFromAnalytics(analyticsData, customers),
    [analyticsData, customers]
  );

  const collectionTotal = monthly.reduce((s, m) => s + m.collection, 0);
  const creditTotal = monthly.reduce((s, m) => s + m.credit, 0);
  const avgCollection = monthly.length ? Math.round(collectionTotal / monthly.length) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Reports' }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
        <p className="text-sm text-muted mt-0.5">Business insights and financial summaries</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border dark:border-slate-700 hover:border-primary/30'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Today's Sales" value={stats.todaySales} icon={FaFileAlt} color="blue" />
            <StatCard title="Today's Collection" value={stats.todayCollection} icon={FaHandHoldingUsd} color="green" />
            <StatCard title="Transactions Today" value={String(todayTxs.length)} icon={FaCalendarDay} color="purple" />
          </div>
          <Card>
            <CardHeader title={`Daily Report — ${todayLabel}`} subtitle="All transactions for today" />
            <div className="overflow-x-auto scrollbar-thin">
              {todayTxs.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">No transactions today</p>
              ) : (
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700">
                      {['Customer', 'Type', 'Description', 'Method', 'Amount'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
                    {todayTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-3 text-sm font-medium">{tx.customerName}</td>
                        <td className="px-4 py-3"><Badge variant={tx.type === 'payment' ? 'success' : 'primary'}>{tx.type}</Badge></td>
                        <td className="px-4 py-3 text-sm text-muted">{tx.itemDescription}</td>
                        <td className="px-4 py-3 text-sm text-muted">{tx.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'weekly' && (
        <Card>
          <CardHeader title="Weekly Report" subtitle="Sales & collection — last 7 days" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="sales" fill="#2563EB" name="Sales" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collection" fill="#10B981" name="Collection" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {activeTab === 'monthly' && (
        <Card>
          <CardHeader title="Monthly Report" subtitle="Credit vs collection by month" />
          <div className="h-80">
            {monthly.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No monthly data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="credit" fill="#2563EB" name="Credit" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="collection" fill="#10B981" name="Collection" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" fill="#F59E0B" name="Profit" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'customer' && (
        <Card>
          <CardHeader title="Customer Report" subtitle="All customers with balances" />
          <div className="overflow-x-auto scrollbar-thin">
            {customers.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No customers yet</p>
            ) : (
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-border dark:border-slate-700">
                    {['Customer', 'Business', 'Balance', 'Credit Limit', 'Status', 'Last Txn'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-muted">{c.businessName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-600">{formatCurrency(c.currentBalance)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(c.creditLimit)}</td>
                      <td className="px-4 py-3"><Badge variant={c.status === 'active' ? 'success' : c.status === 'overdue' ? 'danger' : 'default'}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-sm text-muted">{formatDate(c.lastTransaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'outstanding' && (
        <Card>
          <CardHeader title="Outstanding Report" subtitle={`${outstanding.length} customers with pending dues`} />
          <div className="space-y-3">
            {outstanding.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No outstanding balances</p>
            ) : (
              outstanding.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <span className="text-sm font-bold text-muted w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-muted">{c.businessName}</p>
                  </div>
                  <Badge variant={c.status === 'overdue' ? 'danger' : 'warning'}>{c.status}</Badge>
                  <p className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(c.currentBalance)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'top' && (
        <Card>
          <CardHeader title="Top Customers" subtitle="By outstanding amount" />
          <div className="h-80">
            {topCust.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCust} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#2563EB" name="Outstanding" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'collection' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Collection"
              value={Number(reportsData?.summary?.payment) || collectionTotal}
              icon={FaHandHoldingUsd}
              color="green"
            />
            <StatCard
              title="Total Credit"
              value={Number(reportsData?.summary?.credit) || creditTotal}
              icon={FaFileAlt}
              color="blue"
            />
            <StatCard title="Avg Monthly Collection" value={avgCollection} icon={FaCalendarAlt} color="purple" />
          </div>
          <Card>
            <CardHeader title="Collection Report" subtitle="Monthly collection trend" />
            <div className="h-80">
              {monthly.length === 0 ? (
                <p className="text-sm text-muted text-center py-24">No collection data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="collection" fill="#10B981" name="Collection" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
