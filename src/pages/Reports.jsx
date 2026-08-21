import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaUsers, FaExclamationTriangle, FaTrophy, FaHandHoldingUsd } from 'react-icons/fa';
import { useCompanies } from '../context/CompaniesContext';
import { getReports, getAnalytics, getDayBook } from '../api/core';
import {
  monthlyTrendFromAnalytics,
  topCustomersFromAnalytics,
} from '../utils/reportBuilders';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Breadcrumbs, Card, CardHeader, Badge, StatCard, Loader } from '../components/ui';

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
  const { activeCompany } = useCompanies();
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dayRows, setDayRows] = useState([]);
  const [outstandingRows, setOutstandingRows] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = formatDate(today);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getReports({ type: 'summary' }).catch(() => null),
      getAnalytics(6).catch(() => null),
      getDayBook(today).catch(() => null),
      getReports({ type: 'outstanding' }).catch(() => null),
    ])
      .then(([rep, ana, day, out]) => {
        if (cancelled) return;
        setReportsData(rep);
        setAnalyticsData(ana);
        setDayRows(day?.rows || []);
        setOutstandingRows(out?.rows || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeCompany?.id, today]);

  const monthly = useMemo(
    () => monthlyTrendFromAnalytics(analyticsData),
    [analyticsData]
  );

  const topCust = useMemo(
    () => topCustomersFromAnalytics(analyticsData, []),
    [analyticsData]
  );

  const weekly = useMemo(() => {
    const daily = reportsData?.daily || [];
    return daily.slice(-7).map((d) => ({
      day: d.day,
      credit: Number(d.credit) || 0,
      payment: Number(d.payment) || 0,
    }));
  }, [reportsData]);

  const collectionTotal = monthly.reduce((s, m) => s + m.collection, 0);
  const creditTotal = monthly.reduce((s, m) => s + m.credit, 0);
  const avgCollection = monthly.length ? Math.round(collectionTotal / monthly.length) : 0;
  const summary = reportsData?.summary || {};
  const outstandingTotal = outstandingRows.reduce((s, c) => s + (Number(c.currentBalance) || 0), 0);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Reports' }, { label: 'Classic' }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
        <p className="text-sm text-muted mt-0.5">Live from backend · business insights</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard title="Today Credit" value={summary.credit || 0} color="blue" />
            <StatCard title="Today Collection" value={summary.payment || 0} color="green" />
            <StatCard title="Entries" value={`${dayRows.length}`} color="amber" />
          </div>
          <Card>
            <CardHeader title={`Day book · ${todayLabel}`} />
            {dayRows.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">No entries today</p>
            ) : (
              <div className="space-y-2">
                {dayRows.slice(0, 30).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm border-b border-border/60 py-2">
                    <span>{r.ref} · {r.note || r.type}</span>
                    <span className="font-semibold">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'weekly' && (
        <Card>
          <CardHeader title="Last 7 days (API)" />
          <div className="h-72">
            {weekly.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="credit" fill="#2563EB" name="Credit" />
                  <Bar dataKey="payment" fill="#10B981" name="Payment" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'monthly' && (
        <Card>
          <CardHeader title="Monthly trend (Analytics API)" />
          <div className="h-72">
            {monthly.length === 0 ? (
              <p className="text-sm text-muted text-center py-24">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="credit" fill="#2563EB" name="Credit" />
                  <Bar dataKey="collection" fill="#10B981" name="Collection" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          <StatCard title="Total Due" value={outstandingTotal} color="red" />
          <Card>
            <CardHeader title="Outstanding parties" />
            {outstandingRows.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">No dues</p>
            ) : (
              outstandingRows.map((c) => (
                <div key={c.id} className="flex justify-between py-2 border-b border-border/50 text-sm">
                  <span>{c.name}</span>
                  <Badge variant="warning">{formatCurrency(c.currentBalance)}</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {(activeTab === 'top' || activeTab === 'customer') && (
        <Card>
          <CardHeader title="Top customers (Analytics API)" />
          {topCust.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">No data</p>
          ) : (
            topCust.map((c, i) => (
              <div key={c.name || i} className="flex justify-between py-2 border-b border-border/50 text-sm">
                <span>{c.name}</span>
                <span className="font-semibold">{formatCurrency(c.amount || c.total)}</span>
              </div>
            ))
          )}
        </Card>
      )}

      {activeTab === 'collection' && (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard title="YTD Collection" value={collectionTotal} color="green" />
          <StatCard title="YTD Credit" value={creditTotal} color="blue" />
          <StatCard title="Avg / Month" value={avgCollection} color="amber" />
        </div>
      )}
    </div>
  );
}
