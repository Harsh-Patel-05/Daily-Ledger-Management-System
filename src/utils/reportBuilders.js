/** Build chart/report series from live API data (no static samples). */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthlyTrendFromAnalytics(analyticsData) {
  if (!analyticsData?.monthlyTrend?.length) return [];
  return analyticsData.monthlyTrend.map((m) => {
    const credit = Number(m.credit) || 0;
    const collection = Number(m.payment) || 0;
    const expense = Number(m.expense) || 0;
    const raw = m.month || '';
    const label = raw.length >= 7 ? raw.slice(5) : raw;
    return {
      month: label,
      monthKey: raw,
      credit,
      collection,
      payment: collection,
      expense,
      profit: Math.max(0, collection - expense),
    };
  });
}

export function creditVsPaidFromReports(reportsData, stats) {
  const credit = Number(reportsData?.summary?.credit ?? 0);
  const paid = Number(reportsData?.summary?.payment ?? 0);
  const pending = Number(
    stats?.pendingAmount ?? Math.max(0, credit - paid)
  );
  if (!credit && !paid && !pending) return [];
  return [
    { name: 'Credit', value: credit, color: '#2563EB' },
    { name: 'Paid', value: paid, color: '#10B981' },
    { name: 'Pending', value: pending, color: '#F59E0B' },
  ];
}

export function outstandingTrendFromMonthly(monthly) {
  let run = 0;
  return (monthly || []).map((m) => {
    run += (Number(m.credit) || 0) - (Number(m.collection) || 0);
    return { month: m.month, amount: Math.max(0, run) };
  });
}

export function topCustomersFromAnalytics(analyticsData, customers = []) {
  if (analyticsData?.topCustomers?.length) {
    return analyticsData.topCustomers.map((c) => ({
      name: c.name,
      amount: Number(c.amount) || 0,
      transactions: c.transactions || 0,
    }));
  }
  return [...customers]
    .filter((c) => Number(c.currentBalance) > 0)
    .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      amount: Number(c.currentBalance) || 0,
      transactions: 0,
    }));
}

export function topProductsFromInvoices(invoices = []) {
  const map = {};
  for (const inv of invoices) {
    for (const item of inv.items || []) {
      const name = (item.description || 'Item').trim() || 'Item';
      if (!map[name]) map[name] = { name, sold: 0, revenue: 0 };
      map[name].sold += Number(item.quantity) || 0;
      map[name].revenue += Number(item.amount) || 0;
    }
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

/** Last 7 days sales (credit) vs collection (payment). */
export function weeklyReportFromTransactions(transactions = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDate = {};

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    byDate[key] = {
      day: DAY_LABELS[d.getDay()],
      date: key,
      sales: 0,
      collection: 0,
    };
  }

  for (const t of transactions) {
    const row = byDate[t.date];
    if (!row) continue;
    const amt = Number(t.amount) || 0;
    if (t.type === 'credit') row.sales += amt;
    if (t.type === 'payment') row.collection += amt;
  }

  return Object.values(byDate);
}
