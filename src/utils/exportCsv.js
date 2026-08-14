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
    Name: 'INDOLEX 2.5 SQ MM 90 MTR',
    Brand: 'Indolex',
    Category: 'Wires & Cables',
    Stock: 9,
    PurchasedQuantity: 9,
    PurchaseDate: '2026-02-14',
    PurchaseWithoutGst: 2440.32,
    PurchaseWithGst: 0,
    SellingWithoutGst: 2800,
    SellingWithGst: 0,
    GstRate: 18,
    Status: 'active',
  },
  {
    Name: 'FUTURE 18M METAL BOX',
    Brand: 'Future',
    Category: 'Boxes & Enclosures',
    Stock: 20,
    PurchasedQuantity: 20,
    PurchaseDate: '2026-02-14',
    PurchaseWithoutGst: 150,
    PurchaseWithGst: 0,
    SellingWithoutGst: 180,
    SellingWithGst: 0,
    GstRate: 18,
    Status: 'active',
  },
];

export function downloadProductImportSample(filename = 'product-import-sample.csv') {
  exportToCsv(PRODUCT_IMPORT_SAMPLE_ROWS, filename);
}
