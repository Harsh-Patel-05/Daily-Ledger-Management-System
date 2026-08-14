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

export function toBrandPayload(data) {
  return {
    name: data.name,
    description: data.description || '',
    color: data.color || '#6366f1',
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
    brandId: data.brandId ? stripId(data.brandId) : null,
    categoryId: data.categoryId ? stripId(data.categoryId) : null,
    supplierId: data.supplierId ? stripId(data.supplierId) : null,
    description: data.description || '',
    purchaseDate: data.purchaseDate || null,
    purchasePrice: Number(data.purchasePrice) || 0,
    purchasePriceWithGst: Number(data.purchasePriceWithGst) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    sellingPriceWithGst: Number(data.sellingPriceWithGst) || 0,
    taxRate: Number(data.taxRate) || 0,
    purchasedQuantity: Number(data.purchasedQuantity) || 0,
    status: data.status || 'active',
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

export function listBrands() {
  return fetchAll('/inventory/brands/');
}

export function createBrand(data) {
  return api.post('/inventory/brands/', toBrandPayload(data));
}

export function updateBrand(id, data) {
  return api.patch(`/inventory/brands/${stripId(id)}/`, toBrandPayload(data));
}

export function deleteBrand(id) {
  return api.delete(`/inventory/brands/${stripId(id)}/`);
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

/** Bulk import products from CSV or Excel (.xlsx). */
export function importProducts(file, { updateExisting = true } = {}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('updateExisting', updateExisting ? 'true' : 'false');
  return api.upload('/inventory/products/import/', fd, { method: 'POST' });
}
