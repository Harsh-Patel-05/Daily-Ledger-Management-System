export const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'];

export const STOCK_MOVEMENT_TYPES = {
  in: { label: 'Stock In', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  out: { label: 'Stock Out', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
  adjust: { label: 'Adjustment', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  return: { label: 'Return', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
};

export const emptyProduct = {
  name: '',
  sku: '',
  barcode: '',
  brandId: '',
  categoryId: '',
  itemGroupId: '',
  supplierId: '',
  unitId: '',
  godownId: '',
  alternateUnits: [],
  description: '',
  purchaseDate: '',
  purchasePrice: 0,
  purchasePriceWithGst: 0,
  sellingPrice: 0,
  sellingPriceWithGst: 0,
  taxRate: 18,
  stockQty: 0,
  purchasedQuantity: 0,
  reorderLevel: 0,
  status: 'active',
  image: null,
};
