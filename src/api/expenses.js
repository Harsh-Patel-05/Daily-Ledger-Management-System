import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toCategoryPayload(data) {
  return {
    name: data.name,
    description: data.description || '',
    status: data.status || 'active',
  };
}

export function toExpensePayload(data) {
  return {
    categoryName: data.categoryName || '',
    categoryId: data.categoryId ? stripId(data.categoryId) : null,
    date: data.date,
    amount: Number(data.amount) || 0,
    paymentMode: data.paymentMode || '',
    notes: data.notes || '',
    gstType: data.gstType || '',
  };
}

export function listCategories(params = '') {
  return fetchAll(`/expenses/categories/${params ? `?${params}` : ''}`);
}

export function createCategory(data) {
  return api.post('/expenses/categories/', toCategoryPayload(data));
}

export function updateCategory(id, data) {
  return api.patch(`/expenses/categories/${stripId(id)}/`, toCategoryPayload(data));
}

export function deleteCategory(id) {
  return api.delete(`/expenses/categories/${stripId(id)}/`);
}

export function listExpenses(params = '') {
  return fetchAll(`/expenses/${params ? `?${params}` : ''}`);
}

export function createExpense(data) {
  return api.post('/expenses/', toExpensePayload(data));
}

export function updateExpense(id, data) {
  return api.patch(`/expenses/${stripId(id)}/`, toExpensePayload(data));
}

export function deleteExpense(id) {
  return api.delete(`/expenses/${stripId(id)}/`);
}
