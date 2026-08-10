import { api, fetchAll } from './client';
import { toPk } from './ids';

function stripId(id) {
  return toPk(id) ?? id;
}

export function toCategoryPayload(data) {
  return {
    name: data.name,
    description: data.description || '',
    color: data.color || '#0ea5e9',
  };
}

export function toSupplierPayload(data) {
  return {
    name: data.name,
    contactPerson: data.contactPerson || '',
    mobile: data.mobile || '',
    email: data.email || '',
    address: data.address || '',
    gst: data.gst || '',
    notes: data.notes || '',
  };
}

export function toProductPayload(data, { includeStock = false } = {}) {
  const payload = {
    name: data.name,
    sku: data.sku || '',
    barcode: data.barcode || '',
    categoryId: data.categoryId ? stripId(data.categoryId) : null,
    supplierId: data.supplierId ? stripId(data.supplierId) : null,
    description: data.description || '',
    unit: data.unit || 'pcs',
    purchasePrice: Number(data.purchasePrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    taxRate: Number(data.taxRate) || 0,
    reorderLevel: Number(data.reorderLevel) || 0,
    reorderQty: Number(data.reorderQty) || 0,
    location: data.location || '',
    status: data.status || 'active',
    hsn: data.hsn || '',
  };
  if (includeStock) payload.stockQty = Number(data.stockQty) || 0;
  return payload;
}

export function listCategories() {
  return fetchAll('/inventory/categories/');
}

export function createCategory(data) {
  return api.post('/inventory/categories/', toCategoryPayload(data));
}

export function updateCategory(id, data) {
  return api.patch(`/inventory/categories/${stripId(id)}/`, toCategoryPayload(data));
}

export function deleteCategory(id) {
  return api.delete(`/inventory/categories/${stripId(id)}/`);
}

export function listSuppliers() {
  return fetchAll('/inventory/suppliers/');
}

export function createSupplier(data) {
  return api.post('/inventory/suppliers/', toSupplierPayload(data));
}

export function updateSupplier(id, data) {
  return api.patch(`/inventory/suppliers/${stripId(id)}/`, toSupplierPayload(data));
}

export function deleteSupplier(id) {
  return api.delete(`/inventory/suppliers/${stripId(id)}/`);
}

export function listProducts() {
  return fetchAll('/inventory/products/');
}

export function getProduct(id) {
  return api.get(`/inventory/products/${stripId(id)}/`);
}

export function createProduct(data) {
  return api.post('/inventory/products/', toProductPayload(data, { includeStock: true }));
}

export function updateProduct(id, data) {
  return api.patch(`/inventory/products/${stripId(id)}/`, toProductPayload(data));
}

export function deleteProduct(id) {
  return api.delete(`/inventory/products/${stripId(id)}/`);
}

export function listMovements(params = '') {
  return fetchAll(`/inventory/movements/${params ? `?${params}` : ''}`);
}

export function createMovement(data) {
  return api.post('/inventory/movements/', {
    productId: stripId(data.productId),
    type: data.type,
    quantity: data.quantity,
    newQty: data.newQty,
    reason: data.reason || '',
    reference: data.reference || '',
    date: data.date || undefined,
  });
}

export function getInventoryStats() {
  return api.get('/inventory/stats/');
}

export function toUnitPayload(data) {
  return {
    name: data.name,
    shortName: data.shortName || '',
    status: data.status || 'active',
  };
}

export function listUnits(params = '') {
  return fetchAll(`/inventory/units/${params ? `?${params}` : ''}`);
}

export function createUnit(data) {
  return api.post('/inventory/units/', toUnitPayload(data));
}

export function updateUnit(id, data) {
  return api.patch(`/inventory/units/${stripId(id)}/`, toUnitPayload(data));
}

export function deleteUnit(id) {
  return api.delete(`/inventory/units/${stripId(id)}/`);
}

