import { api, fetchAll } from './client';

const base = '/gst';

export function getGstr1({ month, year } = {}) {
  const q = new URLSearchParams();
  if (month) q.set('month', month);
  if (year) q.set('year', year);
  const qs = q.toString();
  return api.get(`${base}/gstr-1/${qs ? `?${qs}` : ''}`);
}

export function getGstr3b({ month, year } = {}) {
  const q = new URLSearchParams();
  if (month) q.set('month', month);
  if (year) q.set('year', year);
  const qs = q.toString();
  return api.get(`${base}/gstr-3b/${qs ? `?${qs}` : ''}`);
}

export function getTaxSummary({ month, year } = {}) {
  const q = new URLSearchParams();
  if (month) q.set('month', month);
  if (year) q.set('year', year);
  const qs = q.toString();
  return api.get(`${base}/tax-summary/${qs ? `?${qs}` : ''}`);
}

export function getHsnSummary({ month, year } = {}) {
  const q = new URLSearchParams();
  if (month) q.set('month', month);
  if (year) q.set('year', year);
  const qs = q.toString();
  return api.get(`${base}/hsn-summary/${qs ? `?${qs}` : ''}`);
}

export function listEInvoices() {
  return fetchAll(`${base}/e-invoices/`);
}

export function createEInvoice(data) {
  return api.post(`${base}/e-invoices/`, {
    invoice_id: data.invoiceId || null,
    invoice_number: data.invoiceNumber,
    invoice_date: data.invoiceDate,
    buyer_gstin: data.buyerGstin || '',
    buyer_name: data.buyerName || '',
    taxable_amount: Number(data.taxableAmount) || 0,
    tax_amount: Number(data.taxAmount) || 0,
    total: Number(data.total) || 0,
    notes: data.notes || '',
    status: data.status || 'Draft',
  });
}

export function generateIrn(id) {
  return api.post(`${base}/e-invoices/${id}/generate_irn/`);
}

export function cancelEInvoice(id) {
  return api.post(`${base}/e-invoices/${id}/cancel/`);
}

export function deleteEInvoice(id) {
  return api.delete(`${base}/e-invoices/${id}/`);
}

export function listEWayBills() {
  return fetchAll(`${base}/e-way-bills/`);
}

export function createEWayBill(data) {
  return api.post(`${base}/e-way-bills/`, {
    invoice_id: data.invoiceId || null,
    document_number: data.documentNumber,
    document_date: data.documentDate,
    from_place: data.fromPlace || '',
    to_place: data.toPlace || '',
    transporter_name: data.transporterName || '',
    vehicle_no: data.vehicleNo || '',
    distance_km: Number(data.distanceKm) || 0,
    taxable_amount: Number(data.taxableAmount) || 0,
    notes: data.notes || '',
    status: data.status || 'Draft',
  });
}

export function generateEWay(id) {
  return api.post(`${base}/e-way-bills/${id}/generate/`);
}

export function cancelEWay(id) {
  return api.post(`${base}/e-way-bills/${id}/cancel/`);
}

export function deleteEWay(id) {
  return api.delete(`${base}/e-way-bills/${id}/`);
}
