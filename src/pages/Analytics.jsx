import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { FaChartLine, FaChartBar, FaUsers } from 'react-icons/fa';
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  monthlyCollection, outstandingTrend, topCustomers as demoTopCustomers, topProducts,
} from '../data/analytics';
import { formatCurrency } from '../utils/formatters';
import { Breadcrumbs, Card, CardHeader, StatCard } from '../components/ui';

export default function Analytics() {
  const { analyticsData, stats } = useApp();

  const monthly = useMemo(() => {
    if (analyticsData?.monthlyTrend?.length) {
      return analyticsData.monthlyTrend.map((m) => ({
        month: m.month,
        credit: m.credit || 0,
        collection: m.payment || 0,
        profit: Math.max(0, (m.payment || 0) - (m.expense || 0)),
      }));
    }
    return monthlyCollection;
  }, [analyticsData]);

  const topCust = analyticsData?.topCustomers?.length
    ? analyticsData.topCustomers
    : demoTopCustomers;

  const outstanding = useMemo(() => {
    if (analyticsData?.monthlyTrend?.length) {
      let run = 0;
      return analyticsData.monthlyTrend.map((m) => {
        run += (m.credit || 0) - (m.payment || 0);
        return { month: m.month, amount: Math.max(0, run) };
      });
    }
    return outstandingTrend;
  }, [analyticsData]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Analytics' }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics</h1>
        <p className="text-sm text-muted mt-0.5">Deep insights into your business performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="YTD Credit" value={monthly.reduce((s, m) => s + m.credit, 0)} icon={FaChartBar} color="blue" />
        <StatCard title="YTD Collection" value={monthly.reduce((s, m) => s + m.collection, 0)} icon={FaChartLine} color="green" />
        <StatCard title="YTD Profit" value={monthly.reduce((s, m) => s + m.profit, 0)} icon={FaChartLine} color="amber" />
        <StatCard title="Current Outstanding" value={stats.pendingAmount || outstanding[outstanding.length - 1]?.amount || 0} icon={FaUsers} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Monthly Credit" subtitle="Credit given over months" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="credit" stroke="#2563EB" fill="url(#creditGrad)" strokeWidth={2} name="Credit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly Collection" subtitle="Payments received over months" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="collection" stroke="#10B981" fill="url(#collGrad)" strokeWidth={2} name="Collection" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Outstanding Trend" subtitle="Receivables over time" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={outstanding}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={2} name="Outstanding" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top Customers" subtitle="By outstanding balance" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCust} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#2563EB" name="Balance" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Top Products (demo)" subtitle="Static catalogue sample — wire inventory later" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
