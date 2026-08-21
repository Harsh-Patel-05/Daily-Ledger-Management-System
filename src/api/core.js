import { api } from './client';

export function getDashboard() {
  return api.get('/dashboard/');
}

export function getLedger(customerId, params = {}) {
  const q = new URLSearchParams();
  if (customerId) q.set('customerId', customerId);
  if (params.date_from) q.set('date_from', params.date_from);
  if (params.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return api.get(`/ledger/${qs ? `?${qs}` : ''}`);
}

export function getCashBook(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get(`/cash-book/${q}`);
}

export function getDayBook(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get(`/day-book/${q}`);
}

export function getClosingBalance(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get(`/closing-balance/${q}`);
}

export function getReports(params = {}) {
  const q = new URLSearchParams(params);
  const qs = q.toString();
  return api.get(`/reports/${qs ? `?${qs}` : ''}`);
}

export function getAnalytics(months = 6) {
  return api.get(`/analytics/?months=${months}`);
}

export function healthCheck() {
  return api.get('/health/', { auth: false });
}
