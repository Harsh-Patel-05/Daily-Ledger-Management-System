import { customers } from './customers';

const types = ['credit', 'payment', 'return', 'discount', 'expense'];
const methods = ['Cash', 'UPI', 'Bank', 'Cheque'];
const items = [
  'Rice Basmati 25kg',
  'Wheat Flour 50kg',
  'Cooking Oil 15L',
  'Sugar 10kg',
  'Tea Leaves 5kg',
  'Dal Moong 10kg',
  'Soap Carton',
  'Detergent Pack',
  'Biscuits Assorted',
  'Spices Mix Box',
  'Cement Bag 50kg',
  'Paint Bucket 20L',
  'Electrical Wire Roll',
  'LED Bulbs Pack',
  'Notebook Dozen',
  'Medical Supplies Kit',
  'Auto Filter Set',
  'Textile Roll Cotton',
  'Cosmetics Assortment',
  'Dairy Products Case',
];

const generateTransactions = () => {
  const txs = [];
  let id = 1;

  for (let i = 0; i < 100; i++) {
    const customer = customers[i % customers.length];
    const type = types[i % types.length === 4 && i % 7 !== 0 ? 0 : i % 5];
    const dayOffset = Math.floor(i / 2);
    const date = new Date(2026, 6, 1);
    date.setDate(date.getDate() + (dayOffset % 35));

    const qty = type === 'expense' ? 1 : Math.floor(Math.random() * 20) + 1;
    const rate = type === 'expense'
      ? Math.floor(Math.random() * 5000) + 500
      : Math.floor(Math.random() * 800) + 50;
    let amount = qty * rate;

    if (type === 'discount') amount = Math.floor(Math.random() * 500) + 50;
    if (type === 'payment') amount = Math.floor(Math.random() * 15000) + 500;
    if (type === 'return') amount = Math.floor(Math.random() * 3000) + 200;

    txs.push({
      id: `txn_${String(id).padStart(3, '0')}`,
      date: date.toISOString().split('T')[0],
      customerId: customer.id,
      customerName: customer.name,
      type: type === 'expense' && i % 10 !== 0 ? 'credit' : type,
      itemDescription: type === 'payment' ? 'Payment received' : type === 'expense' ? 'Shop expense' : items[i % items.length],
      quantity: type === 'payment' || type === 'discount' ? 1 : qty,
      rate: type === 'payment' || type === 'discount' ? amount : rate,
      amount,
      notes: i % 4 === 0 ? 'Regular order' : i % 5 === 0 ? 'Urgent delivery' : '',
      paymentMethod: methods[i % methods.length],
      createdAt: date.toISOString(),
    });
    id++;
  }

  // Ensure today (2026-08-03 area) has some transactions for dashboard
  const todayItems = [
    { customerId: 'cust_001', type: 'credit', amount: 4500, item: 'Rice Basmati 25kg', qty: 5, rate: 900 },
    { customerId: 'cust_005', type: 'payment', amount: 15000, item: 'Payment received', qty: 1, rate: 15000 },
    { customerId: 'cust_011', type: 'credit', amount: 8200, item: 'LED Bulbs Pack', qty: 10, rate: 820 },
    { customerId: 'cust_020', type: 'credit', amount: 12500, item: 'Textile Roll Cotton', qty: 5, rate: 2500 },
    { customerId: 'cust_002', type: 'payment', amount: 5000, item: 'Payment received', qty: 1, rate: 5000 },
    { customerId: 'cust_007', type: 'return', amount: 1200, item: 'Soap Carton', qty: 2, rate: 600 },
    { customerId: 'cust_003', type: 'discount', amount: 350, item: 'Discount applied', qty: 1, rate: 350 },
    { customerId: 'cust_013', type: 'credit', amount: 6800, item: 'Wheat Flour 50kg', qty: 8, rate: 850 },
  ];

  todayItems.forEach((t, idx) => {
    const cust = customers.find((c) => c.id === t.customerId);
    txs.push({
      id: `txn_${String(id).padStart(3, '0')}`,
      date: '2026-08-03',
      customerId: t.customerId,
      customerName: cust?.name || '',
      type: t.type,
      itemDescription: t.item,
      quantity: t.qty,
      rate: t.rate,
      amount: t.amount,
      notes: '',
      paymentMethod: methods[idx % methods.length],
      createdAt: '2026-08-03T10:00:00.000Z',
    });
    id++;
  });

  return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const transactions = generateTransactions();

export default transactions;
