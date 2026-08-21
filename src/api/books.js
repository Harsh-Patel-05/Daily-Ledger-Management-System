import { api, fetchAll } from './client';

const base = '/books';

export function listAccountGroups() {
  return fetchAll(`${base}/account-groups/`);
}

export function seedChartOfAccounts() {
  return api.post(`${base}/account-groups/seed/`);
}

export function addAccountSubgroup(groupId, name) {
  return api.post(`${base}/account-groups/${groupId}/add_subgroup/`, { name });
}

export function updateAccountGroup(id, data) {
  return api.patch(`${base}/account-groups/${id}/`, data);
}

export function deleteAccountGroup(id) {
  return api.delete(`${base}/account-groups/${id}/`);
}

export function listLedgers(params = '') {
  return fetchAll(`${base}/ledgers/${params ? `?${params}` : ''}`);
}

export function createLedger(data) {
  return api.post(`${base}/ledgers/`, data);
}

export function updateLedger(id, data) {
  return api.patch(`${base}/ledgers/${id}/`, data);
}

export function deleteLedger(id) {
  return api.delete(`${base}/ledgers/${id}/`);
}

export function listVouchers(docType) {
  const q = docType ? `?doc_type=${encodeURIComponent(docType)}` : '';
  return fetchAll(`${base}/vouchers/${q}`);
}

export function createVoucher(data) {
  return api.post(`${base}/vouchers/`, data);
}

export function updateVoucher(id, data) {
  return api.patch(`${base}/vouchers/${id}/`, data);
}

export function deleteVoucher(id) {
  return api.delete(`${base}/vouchers/${id}/`);
}

export function convertVoucher(id, target) {
  return api.post(`${base}/vouchers/${id}/convert/`, { target });
}

export function getVoucher(id) {
  return api.get(`${base}/vouchers/${id}/`);
}

export function mapVoucherRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    docType: row.docType || row.doc_type,
    number: row.number,
    date: row.date,
    party: row.party || '',
    customerId: row.customerId ?? row.customer_id ?? row.customer ?? null,
    supplierId: row.supplierId ?? row.supplier_id ?? row.supplier ?? null,
    amount: Number(row.amount) || 0,
    taxableAmount: Number(row.taxableAmount ?? row.taxable_amount) || 0,
    discount: Number(row.discount) || 0,
    taxRate: Number(row.taxRate ?? row.tax_rate) || 18,
    taxAmount: Number(row.taxAmount ?? row.tax_amount) || 0,
    cgstAmount: Number(row.cgstAmount ?? row.cgst_amount) || 0,
    sgstAmount: Number(row.sgstAmount ?? row.sgst_amount) || 0,
    igstAmount: Number(row.igstAmount ?? row.igst_amount) || 0,
    gstType: row.gstType || row.gst_type || 'GST',
    placeOfSupply: row.placeOfSupply || row.place_of_supply || '',
    isInterstate: Boolean(row.isInterstate ?? row.is_interstate),
    status: row.status || 'Open',
    notes: row.notes || '',
    terms: row.terms || '',
    relatedInvoiceId: row.relatedInvoiceId ?? row.related_invoice_id,
    relatedBillId: row.relatedBillId ?? row.related_bill_id,
    items: (row.items || row.lines || []).map((l, i) => ({
      id: l.id || `tmp-${i}`,
      productId: l.productId ?? l.product_id ?? l.product ?? '',
      description: l.description || '',
      hsn: l.hsn || '',
      quantity: Number(l.quantity) || 1,
      rate: Number(l.rate) || 0,
      amount: Number(l.amount) || 0,
      taxRate: Number(l.taxRate ?? l.tax_rate) || 18,
    })),
  };
}

export function toVoucherPayload(docType, data) {
  return {
    doc_type: docType,
    number: data.number,
    date: data.date,
    party: data.party || '',
    customer_id: data.customerId || null,
    supplier_id: data.supplierId || null,
    amount: Number(data.amount) || 0,
    taxable_amount: Number(data.taxableAmount) || 0,
    discount: Number(data.discount) || 0,
    tax_rate: data.gstType === 'Non-GST' ? 0 : Number(data.taxRate) || 18,
    tax_amount: Number(data.taxAmount) || 0,
    cgst_amount: Number(data.cgstAmount) || 0,
    sgst_amount: Number(data.sgstAmount) || 0,
    igst_amount: Number(data.igstAmount) || 0,
    gst_type: data.gstType || 'GST',
    place_of_supply: data.placeOfSupply || '',
    is_interstate: Boolean(data.isInterstate),
    status: data.status || 'Open',
    notes: data.notes || '',
    terms: data.terms || '',
    items: (data.items || []).map((l, i) => ({
      product_id: l.productId || null,
      description: l.description || '',
      hsn: l.hsn || '',
      quantity: Number(l.quantity) || 1,
      rate: Number(l.rate) || 0,
      tax_rate: data.gstType === 'Non-GST' ? 0 : Number(l.taxRate ?? data.taxRate) || 18,
      sort_order: i,
    })),
  };
}

/** Generic CRUD helpers for books resources */
export function booksList(resource, query = '') {
  const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  return fetchAll(`${base}/${resource}/${q}`);
}

export function booksCreate(resource, data) {
  return api.post(`${base}/${resource}/`, data);
}

export function booksUpdate(resource, id, data) {
  return api.patch(`${base}/${resource}/${id}/`, data);
}

export function booksDelete(resource, id) {
  return api.delete(`${base}/${resource}/${id}/`);
}

export function getTrialBalance(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get(`${base}/reports/trial-balance/${q ? `?${q}` : ''}`);
}

export function getBalanceSheet(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get(`${base}/reports/balance-sheet/${q ? `?${q}` : ''}`);
}

export function getProfitLoss(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api.get(`${base}/reports/profit-loss/${q ? `?${q}` : ''}`);
}

export function getSalesRegister() {
  return api.get(`${base}/reports/sales-register/`);
}

export function getPurchaseRegister() {
  return api.get(`${base}/reports/purchase-register/`);
}
