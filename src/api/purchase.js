import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toBillPayload(data) {
  return {
    billNo: data.billNo || '',
    date: data.date,
    supplierName: data.supplierName || '',
    supplierId: data.supplierId ? stripId(data.supplierId) : null,
    taxableAmount: Number(data.taxableAmount) || 0,
    gstAmount: Number(data.gstAmount) || 0,
    paid: Number(data.paid) || 0,
    gstType: data.gstType || '',
    productId: data.productId ? stripId(data.productId) : null,
    stockQty: Number(data.stockQty) || 0,
    notes: data.notes || '',
  };
}

export function toPaymentPayload(data) {
  return {
    date: data.date,
    supplierName: data.supplierName || '',
    billId: data.billId ? stripId(data.billId) : null,
    billNo: data.billNo || '',
    amount: Number(data.amount) || 0,
    mode: data.mode || '',
    notes: data.notes || '',
  };
}

export function toReturnPayload(data) {
  return {
    date: data.date,
    supplierName: data.supplierName || '',
    billId: data.billId ? stripId(data.billId) : null,
    billNo: data.billNo || '',
    amount: Number(data.amount) || 0,
    gstType: data.gstType || '',
    reason: data.reason || '',
  };
}

export function listBills(params = '') {
  return fetchAll(`/purchase/bills/${params ? `?${params}` : ''}`);
}

export function createBill(data) {
  return api.post('/purchase/bills/', toBillPayload(data));
}

export function updateBill(id, data) {
  return api.patch(`/purchase/bills/${stripId(id)}/`, toBillPayload(data));
}

export function deleteBill(id) {
  return api.delete(`/purchase/bills/${stripId(id)}/`);
}

export function listPayments(params = '') {
  return fetchAll(`/purchase/payments/${params ? `?${params}` : ''}`);
}

export function createPayment(data) {
  return api.post('/purchase/payments/', toPaymentPayload(data));
}

export function updatePayment(id, data) {
  return api.patch(`/purchase/payments/${stripId(id)}/`, toPaymentPayload(data));
}

export function deletePayment(id) {
  return api.delete(`/purchase/payments/${stripId(id)}/`);
}

export function listReturns(params = '') {
  return fetchAll(`/purchase/returns/${params ? `?${params}` : ''}`);
}

export function createReturn(data) {
  return api.post('/purchase/returns/', toReturnPayload(data));
}

export function updateReturn(id, data) {
  return api.patch(`/purchase/returns/${stripId(id)}/`, toReturnPayload(data));
}

export function deleteReturn(id) {
  return api.delete(`/purchase/returns/${stripId(id)}/`);
}
