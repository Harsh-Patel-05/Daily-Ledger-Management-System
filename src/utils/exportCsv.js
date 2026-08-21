import { downloadBlob } from './storage';

export function exportToCsv(rows = [], filename = 'export.csv') {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const str = val == null ? '' : String(val);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function customersToCsvRows(customers = []) {
  return customers.map((c) => ({
    Name: c.name,
    Business: c.businessName,
    Mobile: c.mobile,
    Email: c.email || '',
    GST: c.gst || '',
    Address: c.address || '',
    Balance: c.currentBalance,
    CreditLimit: c.creditLimit,
    Status: c.status,
    LastTransaction: c.lastTransaction || '',
  }));
}

export function transactionsToCsvRows(transactions = []) {
  return transactions.map((t) => ({
    Date: t.date,
    Customer: t.customerName,
    Type: t.type,
    Description: t.itemDescription,
    Qty: t.quantity,
    Rate: t.rate,
    Amount: t.amount,
    Method: t.paymentMethod,
    Notes: t.notes || '',
  }));
}

export function invoicesToCsvRows(invoices = []) {
  return invoices.map((i) => ({
    InvoiceNumber: i.invoiceNumber,
    Type: i.gstType || (Number(i.taxAmount) > 0 ? 'GST' : 'Non-GST'),
    Date: i.date,
    Customer: i.customerName,
    Subtotal: i.subtotal,
    Tax: i.taxAmount,
    Total: i.total,
    Paid: i.paidAmount,
    Balance: i.balance,
    Status: i.status,
    Method: i.paymentMethod,
  }));
}

/** Template rows matching product Export / Import columns. */
export const PRODUCT_IMPORT_SAMPLE_ROWS = [
  {
    Name: 'Sample Product A',
    Brand: '',
    Category: '',
    Stock: 0,
    PurchasedQuantity: 0,
    PurchaseDate: '',
    PurchaseWithoutGst: 0,
    PurchaseWithGst: 0,
    SellingWithoutGst: 0,
    SellingWithGst: 0,
    GstRate: 18,
    Status: 'active',
  },
  {
    Name: 'Sample Product B',
    Brand: '',
    Category: '',
    Stock: 0,
    PurchasedQuantity: 0,
    PurchaseDate: '',
    PurchaseWithoutGst: 0,
    PurchaseWithGst: 0,
    SellingWithoutGst: 0,
    SellingWithGst: 0,
    GstRate: 18,
    Status: 'active',
  },
];

export function downloadProductImportSample(filename = 'product-import-sample.csv') {
  exportToCsv(PRODUCT_IMPORT_SAMPLE_ROWS, filename);
}
