import { api, fetchAll } from './client';
import { toPk } from './ids';

export function listTransactions(params = '') {
  return fetchAll(`/transactions/${params ? `?${params}` : ''}`);
}

export function createTransaction(data) {
  const description = data.itemDescription || data.item_description || data.type;
  return api.post('/transactions/', {
    customerId: toPk(data.customerId),
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
  });
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
