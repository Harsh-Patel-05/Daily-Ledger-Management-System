import { api, fetchAll } from './client';
import { toPk } from './ids';

export function toCustomerPayload(data) {
  return {
    name: data.name,
    mobile: data.mobile,
    business_name: data.businessName ?? data.business_name ?? '',
    address: data.address || '',
    gst: data.gst || '',
    email: data.email || '',
    credit_limit: Number(data.creditLimit ?? data.credit_limit ?? 0) || 0,
    status: data.status || 'active',
    notes: data.notes || '',
    tags: data.tags || [],
  };
}

export function listCustomers(params = '') {
  return fetchAll(`/customers/${params ? `?${params}` : ''}`);
}

export function getCustomer(id) {
  return api.get(`/customers/${toPk(id) ?? id}/`);
}

export function createCustomer(data) {
  return api.post('/customers/', toCustomerPayload(data));
}

export function updateCustomer(id, data) {
  return api.patch(`/customers/${toPk(id) ?? id}/`, toCustomerPayload(data));
}

export function deleteCustomer(id) {
  return api.delete(`/customers/${toPk(id) ?? id}/`);
}
