import { Link } from 'react-router-dom';
import {
  FaRupeeSign,
  FaHandHoldingUsd,
  FaUsers,
  FaExchangeAlt,
  FaCreditCard,
  FaClock,
  FaPlus,
  FaUserPlus,
  FaFileAlt,
  FaBook,
  FaFileInvoiceDollar,
  FaBoxes,
} from 'react-icons/fa';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useInventory } from '../context/InventoryContext';
import { useModal } from '../context/ModalContext';
import {
  monthlyTrendFromAnalytics,
  creditVsPaidFromReports,
} from '../utils/reportBuilders';
import StatCard from '../components/ui/StatCard';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { TRANSACTION_TYPES } from '../utils/helpers';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { stats, transactions, notifications, invoices, analyticsData, reportsData } = useApp();
  const { stats: invStats } = useInventory();
  const { openModal } = useModal();
  const recentTxs = transactions.slice(0, 6);
  const recentActivity = notifications.slice(0, 5);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid').slice(0, 5);
  const stockAlerts = [...(invStats?.outOfStockItems || []), ...(invStats?.lowStockItems || [])].slice(0, 5);

  const chartMonthly = useMemo(
    () => monthlyTrendFromAnalytics(analyticsData),
    [analyticsData]
  );

  const chartPie = useMemo(
    () => creditVsPaidFromReports(reportsData, stats),
    [reportsData, stats]
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">
            Live overview · Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px]">Ctrl+K</kbd> for quick actions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => openModal('recordPayment')}>
            <FaHandHoldingUsd size={12} /> Collect
          </Button>
          <Button size="sm" variant="outline" onClick={() => openModal('dueCollections')}>
            <FaClock size={12} /> Due
          </Button>
          <Link to="/invoices/create">
            <Button size="sm" variant="outline"><FaFileInvoiceDollar size={12} /> Create Invoice</Button>
          </Link>
          <Link to="/purchase/bills">
            <Button size="sm" variant="outline"><FaPlus size={12} /> Purchase Bill</Button>
          </Link>
          <Link to="/customers/add">
            <Button size="sm" variant="outline"><FaUserPlus size={12} /> Add Customer</Button>
          </Link>
        </div>
      </div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-tour="dashboard-stats">
        <StatCard title="Today's Sales" value={stats.todaySales} icon={FaRupeeSign} color="blue" />
        <StatCard title="Today's Collection" value={stats.todayCollection} icon={FaHandHoldingUsd} color="green" />
        <StatCard title="Pending Amount" value={stats.pendingAmount} icon={FaClock} color="amber" />
        <StatCard title="Invoice Due" value={stats.invoiceDue} icon={FaFileInvoiceDollar} color="red" />
        <StatCard title="Total Customers" value={String(stats.totalCustomers)} icon={FaUsers} color="blue" />
        <StatCard title="Transactions" value={String(stats.totalTransactions)} icon={FaExchangeAlt} color="slate" />
        <StatCard title="Unpaid Invoices" value={String(stats.unpaidInvoices)} icon={FaCreditCard} color="purple" />
        <StatCard title="Overdue Customers" value={String(stats.overdueCustomers)} icon={FaClock} color="amber" />
        <StatCard title="Stock Value" value={invStats.stockValueWithGst || invStats.stockValue || 0} icon={FaBoxes} color="green" />
        <StatCard title="Low / Out of Stock" value={String(invStats.lowStock + invStats.outOfStock)} icon={FaBoxes} color="red" />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly Collection" subtitle="Credit vs Collection trend" />
          <div className="h-72">
            {chartMonthly.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No transaction data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartMonthly}>
                  <defs>
                    <linearGradient id="gCredit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gColl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="credit" stroke="#2563EB" fill="url(#gCredit)" strokeWidth={2} name="Credit" />
                  <Area type="monotone" dataKey="collection" stroke="#10B981" fill="url(#gColl)" strokeWidth={2} name="Collection" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Credit vs Paid" subtitle="Current distribution" />
          <div className="h-72">
            {chartPie.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No summary data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPie}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/invoices/create', icon: FaFileInvoiceDollar, label: 'Invoice', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' },
              { to: '/inventory/products', icon: FaBoxes, label: 'Inventory', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' },
              { to: '/ledger/party', icon: FaBook, label: 'View Ledger', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' },
              { to: '/reports', icon: FaFileAlt, label: 'Reports', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 dark:border-slate-700 hover:soft-shadow hover:border-primary/20 transition-all"
              >
                <div className={`p-3 rounded-xl ${a.color}`}>
                  <a.icon size={18} />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Unpaid Invoices"
            action={<Link to="/sales/invoices" className="text-xs text-primary font-medium hover:underline">View all</Link>}
          />
          <div className="space-y-3">
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">All invoices paid</p>
            ) : (
              unpaidInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted truncate">{inv.customerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-amber-600">{formatCurrency(inv.balance)}</p>
                    <Badge variant={inv.status === 'overdue' ? 'danger' : 'warning'}>{inv.status}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Stock Alerts"
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openModal('quickStock')}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Adjust
                </button>
                <Link to="/inventory/low-stock" className="text-xs text-primary font-medium hover:underline">View all</Link>
              </div>
            }
          />
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {stockAlerts.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">All products healthy</p>
            ) : (
              stockAlerts.map((p) => (
                <Link
                  key={p.id}
                  to={`/inventory/${p.id}`}
                  className="flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-muted">Stock {formatNumber(p.stockQty)}</p>
                  </div>
                  <Badge variant={Number(p.stockQty) <= 0 ? 'danger' : 'warning'}>
                    {Number(p.stockQty) <= 0 ? 'Out' : `${formatNumber(p.stockQty)} left`}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Alerts"
            action={<Link to="/notifications" className="text-xs text-primary font-medium hover:underline">View all</Link>}
          />
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No alerts</p>
            ) : (
              recentActivity.map((n) => (
                <div key={n.id} className="flex gap-3 items-start">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{n.title}</p>
                    <p className="text-xs text-muted truncate">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader
            title="Recent Transactions"
            subtitle="Latest ledger entries"
            action={
              <Link to="/transactions">
                <Button variant="soft" size="sm">View All</Button>
              </Link>
            }
          />
          <div className="overflow-x-auto scrollbar-thin -mx-1 min-w-0">
            {recentTxs.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">No transactions yet</p>
            ) : (
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-slate-700">
                    {['Date', 'Customer', 'Type', 'Description', 'Method', 'Amount'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 dark:divide-slate-700/60">
                  {recentTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{tx.customerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={tx.type === 'payment' ? 'success' : tx.type === 'credit' ? 'primary' : tx.type === 'expense' ? 'danger' : 'warning'}>
                          {TRANSACTION_TYPES[tx.type]?.label || tx.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{tx.itemDescription}</td>
                      <td className="px-4 py-3 text-sm text-muted">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
