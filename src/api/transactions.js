import { api, fetchAll } from './client';
import { toPk } from './ids';

export function listTransactions(params = '') {
  return fetchAll(`/transactions/${params ? `?${params}` : ''}`);
}

export function createTransaction(data) {
  const description = data.itemDescription || data.item_description || data.type;
  const customerPk = toPk(data.customerId);
  const payload = {
    date: data.date,
    type: data.type,
    itemDescription: description,
    item_description: description,
    quantity: data.quantity ?? 1,
    rate: data.rate ?? data.amount,
    amount: data.amount,
    notes: data.notes || '',
    paymentMethod: data.paymentMethod || 'Cash',
    payment_method: data.paymentMethod || 'Cash',
  };
  // Expense can be without customer; omit field so backend accepts null
  if (customerPk != null) {
    payload.customerId = customerPk;
  } else if (data.type === 'expense') {
    payload.customerId = null;
  }
  return api.post('/transactions/', payload);
}

export function deleteTransaction(id) {
  return api.delete(`/transactions/${toPk(id) ?? id}/`);
}

export function recordPayment(payload) {
  return api.post('/transactions/record-payment/', {
    customerId: toPk(payload.customerId),
    amount: payload.amount,
    method: payload.method || payload.paymentMethod || 'Cash',
    date: payload.date,
    notes: payload.notes || '',
    invoiceId: payload.invoiceId ? toPk(payload.invoiceId) : null,
  });
}

/** GET /transactions/summary/?date=YYYY-MM-DD */
export function getTransactionSummary(params = {}) {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.date_from) q.set('date_from', params.date_from);
  if (params.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return api.get(`/transactions/summary/${qs ? `?${qs}` : ''}`);
}

/** POST /transactions/day-close/ — persist Roj Mel closing + return summary */
export function dayClose(payload = {}) {
  return api.post('/transactions/day-close/', {
    date: payload.date || new Date().toISOString().split('T')[0],
    message: payload.message || '',
  });
}
