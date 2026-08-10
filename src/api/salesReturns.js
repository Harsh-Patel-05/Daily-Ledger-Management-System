import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toSalesReturnPayload(data) {
  return {
    customerId: data.customerId ? stripId(data.customerId) : null,
    invoiceId: data.invoiceId ? stripId(data.invoiceId) : null,
    amount: Number(data.amount) || 0,
    date: data.date,
    reason: data.reason || '',
    gstApplicable: Boolean(data.gstApplicable),
  };
}

export function listSalesReturns(params = '') {
  return fetchAll(`/invoices/returns/${params ? `?${params}` : ''}`);
}

export function createSalesReturn(data) {
  return api.post('/invoices/returns/', toSalesReturnPayload(data));
}

export function updateSalesReturn(id, data) {
  return api.patch(`/invoices/returns/${stripId(id)}/`, toSalesReturnPayload(data));
}

export function deleteSalesReturn(id) {
  return api.delete(`/invoices/returns/${stripId(id)}/`);
}
