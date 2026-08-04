export const monthlyCollection = [
  { month: 'Jan', credit: 185000, collection: 162000, profit: 28000 },
  { month: 'Feb', credit: 210000, collection: 195000, profit: 32000 },
  { month: 'Mar', credit: 245000, collection: 220000, profit: 38000 },
  { month: 'Apr', credit: 198000, collection: 205000, profit: 35000 },
  { month: 'May', credit: 267000, collection: 240000, profit: 42000 },
  { month: 'Jun', credit: 289000, collection: 275000, profit: 48000 },
  { month: 'Jul', credit: 312000, collection: 290000, profit: 51000 },
  { month: 'Aug', credit: 145000, collection: 98000, profit: 22000 },
];

export const creditVsPaid = [
  { name: 'Credit', value: 425000, color: '#2563EB' },
  { name: 'Paid', value: 312000, color: '#10B981' },
  { name: 'Pending', value: 113000, color: '#F59E0B' },
];

export const outstandingTrend = [
  { month: 'Jan', amount: 95000 },
  { month: 'Feb', amount: 110000 },
  { month: 'Mar', amount: 135000 },
  { month: 'Apr', amount: 128000 },
  { month: 'May', amount: 155000 },
  { month: 'Jun', amount: 169000 },
  { month: 'Jul', amount: 191000 },
  { month: 'Aug', amount: 178000 },
];

export const topCustomers = [
  { name: 'Vikram Singh', amount: 87500, transactions: 28 },
  { name: 'Manoj Tiwari', amount: 125000, transactions: 22 },
  { name: 'Deepak Malhotra', amount: 67800, transactions: 31 },
  { name: 'Fatima Sheikh', amount: 52300, transactions: 19 },
  { name: 'Amit Patel', amount: 45600, transactions: 24 },
];

export const topProducts = [
  { name: 'Rice Basmati 25kg', sold: 145, revenue: 130500 },
  { name: 'Wheat Flour 50kg', sold: 120, revenue: 102000 },
  { name: 'Cooking Oil 15L', sold: 98, revenue: 117600 },
  { name: 'Cement Bag 50kg', sold: 210, revenue: 84000 },
  { name: 'Textile Roll Cotton', sold: 65, revenue: 162500 },
  { name: 'LED Bulbs Pack', sold: 180, revenue: 147600 },
];

export const mostActiveCustomers = [
  { name: 'Deepak Malhotra', count: 31 },
  { name: 'Vikram Singh', count: 28 },
  { name: 'Amit Patel', count: 24 },
  { name: 'Manoj Tiwari', count: 22 },
  { name: 'Fatima Sheikh', count: 19 },
  { name: 'Rajesh Kumar', count: 18 },
];

export const weeklyReport = [
  { day: 'Mon', sales: 42000, collection: 35000 },
  { day: 'Tue', sales: 38000, collection: 41000 },
  { day: 'Wed', sales: 51000, collection: 28000 },
  { day: 'Thu', sales: 45000, collection: 52000 },
  { day: 'Fri', sales: 58000, collection: 48000 },
  { day: 'Sat', sales: 72000, collection: 65000 },
  { day: 'Sun', sales: 25000, collection: 18000 },
];

export default {
  monthlyCollection,
  creditVsPaid,
  outstandingTrend,
  topCustomers,
  topProducts,
  mostActiveCustomers,
  weeklyReport,
};
