import { api, fetchAll } from './client';
import { toPk } from './ids';

export { toPk };

export function listInvoices(params = '') {
  return fetchAll(`/invoices/${params ? `?${params}` : ''}`);
}

export function getInvoice(id) {
  return api.get(`/invoices/${toPk(id) ?? id}/`);
}

export function nextInvoiceNumber() {
  return api.get('/invoices/next-number/');
}

export function createInvoice(data) {
  const payload = {
    customerId: toPk(data.customerId),
    date: data.date,
    dueDate: data.dueDate || null,
    discount: data.discount || 0,
    taxRate: data.taxRate ?? (data.gstType === 'Non-GST' ? 0 : 18),
    gstType: data.gstType || (Number(data.taxRate) === 0 ? 'Non-GST' : 'GST'),
    paidAmount: data.paidAmount || 0,
    paymentMethod: data.paymentMethod || 'Credit',
    format: data.format || 'classic',
    notes: data.notes || '',
    terms: data.terms || '',
    items: (data.items || []).map((item, i) => ({
      productId: item.productId ? (toPk(item.productId) ?? item.productId) : null,
      description: item.description,
      hsn: item.hsn || '',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      sort_order: i,
    })),
  };
  if (data.invoiceNumber) payload.invoiceNumber = data.invoiceNumber;
  return api.post('/invoices/', payload);
}

export function updateInvoice(id, data) {
  const payload = { ...data };
  if (data.customerId != null) payload.customerId = toPk(data.customerId);
  if (data.items) {
    payload.items = data.items.map((item, i) => ({
      productId: item.productId ? (toPk(item.productId) ?? item.productId) : null,
      description: item.description,
      hsn: item.hsn || '',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      sort_order: i,
    }));
  }
  if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
  if (data.taxRate !== undefined) payload.taxRate = data.taxRate;
  if (data.gstType !== undefined) payload.gstType = data.gstType;
  if (data.paidAmount !== undefined) payload.paidAmount = data.paidAmount;
  if (data.paymentMethod !== undefined) payload.paymentMethod = data.paymentMethod;
  return api.patch(`/invoices/${toPk(id) ?? id}/`, payload);
}

export function deleteInvoice(id) {
  return api.delete(`/invoices/${toPk(id) ?? id}/`);
}

export function duplicateInvoice(id) {
  return api.post(`/invoices/${toPk(id) ?? id}/duplicate/`);
}

export function markInvoicePaid(id, extra = {}) {
  const body = {};
  if (extra.method || extra.paymentMethod) body.method = extra.method || extra.paymentMethod;
  if (extra.notes) body.notes = extra.notes;
  return api.post(`/invoices/${toPk(id) ?? id}/mark-paid/`, body);
}
