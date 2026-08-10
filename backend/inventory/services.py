"""Helpers for deducting inventory stock from invoice line items."""
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import Product, StockMovement, apply_stock_movement


def _product_pk(raw):
    if raw in (None, '', 'null'):
        return None
    return str(getattr(raw, 'pk', raw)).replace('prod_', '')


def plan_stock_deductions(*, owner, items):
    """Validate and return list of (product, qty) for invoice lines with productId."""
    planned = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        raw = item.get('productId') or item.get('product_id') or item.get('product')
        pk = _product_pk(raw)
        if not pk:
            continue
        qty = Decimal(str(item.get('quantity') or 0))
        if qty <= 0:
            continue
        try:
            product = Product.objects.select_for_update().get(pk=pk, owner=owner)
        except (Product.DoesNotExist, ValueError):
            raise ValidationError(f'Product not found for line: {item.get("description") or pk}')
        if qty > Decimal(product.stock_qty or 0):
            raise ValidationError(
                f'Insufficient stock for {product.name}: need {qty}, have {product.stock_qty}'
            )
        planned.append((product, qty))
    return planned


@transaction.atomic
def deduct_stock_for_invoice_items(*, owner, items, invoice_number, date=None):
    """
    Deduct stock for invoice lines that include productId.
    Raises ValidationError if stock is insufficient.
    Skips if stock already deducted for this invoice reference.
    """
    if invoice_number and StockMovement.objects.filter(
        owner=owner,
        reference=invoice_number,
        type=StockMovement.Type.OUT,
    ).exists():
        return []

    planned = plan_stock_deductions(owner=owner, items=items)
    created = []
    for product, qty in planned:
        movement = apply_stock_movement(
            owner=owner,
            product=product,
            movement_type=StockMovement.Type.OUT,
            quantity=qty,
            reason='Sale / invoice',
            reference=invoice_number or '',
            date=date,
        )
        created.append(movement)
    return created
