/** Helpers to connect inventory products with invoice line items. */

export function applyProductToLine(item, product) {
  if (!product) {
    return { ...item, productId: '' };
  }
  const qty = Number(item.quantity) || 1;
  const rate = Number(product.sellingPrice) || 0;
  return {
    ...item,
    productId: product.id,
    description: product.name,
    hsn: product.hsn || item.hsn || '',
    rate,
    amount: qty * rate,
  };
}

export function stockIssuesForItems(items = [], getProduct) {
  const issues = [];
  for (const item of items) {
    if (!item.productId) continue;
    const product = getProduct(item.productId);
    if (!product) {
      issues.push(`Product missing for "${item.description || 'line item'}"`);
      continue;
    }
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;
    if (qty > Number(product.stockQty || 0)) {
      issues.push(
        `${product.name}: need ${qty}, only ${product.stockQty} in stock`
      );
    }
  }
  return issues;
}

/**
 * Deduct inventory for invoice lines that reference a productId.
 * Uses InventoryContext.recordStockMovements (batch-safe).
 */
export function deductStockForInvoice(items, invoiceNumber, recordStockMovements) {
  const movements = (items || [])
    .filter((i) => i.productId && Number(i.quantity) > 0)
    .map((i) => ({
      productId: i.productId,
      type: 'out',
      quantity: Number(i.quantity) || 0,
      reason: 'Sale / invoice',
      reference: invoiceNumber || '',
    }));

  if (!movements.length) return [];
  return recordStockMovements(movements);
}
