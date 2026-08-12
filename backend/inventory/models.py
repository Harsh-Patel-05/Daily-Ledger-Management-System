from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone


class Category(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inventory_categories',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default='#0ea5e9')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = [('owner', 'name')]
        indexes = [models.Index(fields=['owner', 'name'])]
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Brand(models.Model):
    """Company / manufacturer master for products."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inventory_brands',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default='#6366f1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = [('owner', 'name')]
        indexes = [models.Index(fields=['owner', 'name'])]

    def __str__(self):
        return self.name


class Supplier(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inventory_suppliers',
    )
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150, blank=True)
    mobile = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gst = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['owner', 'name'])]

    def __str__(self):
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        DISCONTINUED = 'discontinued', 'Discontinued'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
    )
    name = models.CharField(max_length=200)
    brand = models.ForeignKey(
        'Brand',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    description = models.TextField(blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_price_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchased_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['owner', 'name']),
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['owner', 'purchase_date']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        """Soft low-stock signal when current stock is positive but low (<= 10)."""
        qty = Decimal(self.stock_qty or 0)
        return qty > 0 and qty <= Decimal('10')

    @property
    def is_out_of_stock(self):
        return Decimal(self.stock_qty or 0) <= 0


class StockMovement(models.Model):
    class Type(models.TextChoices):
        IN = 'in', 'Stock In'
        OUT = 'out', 'Stock Out'
        ADJUST = 'adjust', 'Adjustment'
        RETURN = 'return', 'Return'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stock_movements',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='movements',
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previous_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=100, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'product']),
            models.Index(fields=['owner', 'reference']),
        ]

    def __str__(self):
        return f'{self.type} {self.quantity} · {self.product_id}'


@transaction.atomic
def apply_stock_movement(
    *,
    owner,
    product,
    movement_type,
    quantity=None,
    new_qty=None,
    reason='',
    reference='',
    date=None,
):
    """Apply one stock movement with validation. Locks product row."""
    product = Product.objects.select_for_update().get(pk=product.pk, owner=owner)
    previous = Decimal(product.stock_qty or 0)

    if movement_type in (StockMovement.Type.IN, StockMovement.Type.RETURN):
        qty = Decimal(quantity or 0)
        if qty <= 0:
            raise ValidationError('Quantity must be greater than 0')
        result = previous + qty
    elif movement_type == StockMovement.Type.OUT:
        qty = Decimal(quantity or 0)
        if qty <= 0:
            raise ValidationError('Quantity must be greater than 0')
        if qty > previous:
            raise ValidationError(f'Insufficient stock for {product.name}')
        result = previous - qty
    elif movement_type == StockMovement.Type.ADJUST:
        if new_qty is None:
            raise ValidationError('newQty is required for adjustment')
        result = Decimal(new_qty)
        if result < 0:
            raise ValidationError('Adjusted quantity cannot be negative')
        qty = abs(result - previous)
    else:
        raise ValidationError('Invalid movement type')

    movement = StockMovement.objects.create(
        owner=owner,
        product=product,
        type=movement_type,
        quantity=qty,
        previous_qty=previous,
        new_qty=result,
        reason=(reason or '')[:255],
        reference=(reference or '')[:100],
        date=date or timezone.localdate(),
    )
    product.stock_qty = result
    product.save(update_fields=['stock_qty', 'updated_at'])
    return movement
