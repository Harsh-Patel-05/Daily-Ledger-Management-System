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
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
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
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
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
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inventory_suppliers',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='inventory_suppliers',
    )
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150, blank=True, default='')
    mobile = models.CharField(max_length=15, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    gst = models.CharField(max_length=20, blank=True, default='')
    pan = models.CharField(max_length=10, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    state_code = models.CharField(max_length=2, blank=True, default='')
    pincode = models.CharField(max_length=6, blank=True, default='')
    credit_days = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True, default='')
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
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='products',
    )
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=80, blank=True, default='')
    barcode = models.CharField(max_length=80, blank=True, default='')
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
    item_group = models.ForeignKey(
        'books.ItemGroup',
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
    description = models.TextField(blank=True, default='')
    unit = models.ForeignKey(
        'books.Unit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_price_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price_with_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchased_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    track_batch = models.BooleanField(default=False)
    track_expiry = models.BooleanField(default=False)
    track_serial = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['owner', 'name']),
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['owner', 'purchase_date']),
            models.Index(fields=['company', 'barcode']),
            models.Index(fields=['company', 'sku']),
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
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='stock_movements',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='movements',
    )
    godown = models.ForeignKey(
        'books.Godown',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements',
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previous_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reason = models.CharField(max_length=255, blank=True, default='')
    reference = models.CharField(max_length=100, blank=True, default='')
    batch_no = models.CharField(max_length=80, blank=True, default='')
    expiry_date = models.DateField(null=True, blank=True)
    serial_numbers = models.TextField(blank=True, default='')
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
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


class ProductAlternateUnit(models.Model):
    """Alternate UOM for a product. conversion_factor = base units per 1 alternate unit."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='alternate_units',
    )
    unit = models.ForeignKey(
        'books.Unit',
        on_delete=models.CASCADE,
        related_name='product_alternates',
    )
    conversion_factor = models.DecimalField(max_digits=14, decimal_places=6, default=1)
    barcode = models.CharField(max_length=80, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['unit__name']
        unique_together = [('product', 'unit')]

    def __str__(self):
        return f'{self.product_id} · {self.unit_id} × {self.conversion_factor}'

    def to_base(self, qty):
        return Decimal(qty or 0) * Decimal(self.conversion_factor or 1)

    def from_base(self, base_qty):
        factor = Decimal(self.conversion_factor or 1)
        if factor == 0:
            return Decimal('0')
        return Decimal(base_qty or 0) / factor


class GodownStock(models.Model):
    """Per-godown quantity in base unit. Product.stock_qty is the sum across godowns."""

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='godown_stocks',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='godown_stocks',
    )
    godown = models.ForeignKey(
        'books.Godown',
        on_delete=models.CASCADE,
        related_name='stocks',
    )
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_godown_balance'
        ordering = ['godown__name']
        unique_together = [('product', 'godown')]
        indexes = [
            models.Index(fields=['company', 'product']),
            models.Index(fields=['company', 'godown']),
        ]

    def __str__(self):
        return f'{self.product_id} @ {self.godown_id}: {self.qty}'


def get_default_godown(company):
    """Prefer Main Godown; otherwise first active godown for the company."""
    from books.models import Godown

    if not company:
        return None
    g = Godown.objects.filter(company=company, name__iexact='Main Godown').first()
    if g:
        return g
    return Godown.objects.filter(company=company, status='Active').order_by('id').first()


def sync_product_stock_qty(product):
    total = GodownStock.objects.filter(product=product).aggregate(t=models.Sum('qty'))['t']
    product.stock_qty = Decimal(total or 0)
    product.save(update_fields=['stock_qty', 'updated_at'])
    return product.stock_qty


def get_or_create_godown_stock(product, godown, company=None):
    company = company or product.company or godown.company
    row, _ = GodownStock.objects.select_for_update().get_or_create(
        product=product,
        godown=godown,
        defaults={'company': company, 'qty': Decimal('0')},
    )
    if row.company_id is None and company:
        row.company = company
        row.save(update_fields=['company'])
    return row


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
    company=None,
    godown=None,
):
    """Apply one stock movement at a godown; sync Product.stock_qty as sum."""
    product = Product.objects.select_for_update().get(pk=product.pk, owner=owner)
    company = company or getattr(product, 'company', None)
    if godown is None:
        godown = get_default_godown(company)
    if godown is None:
        raise ValidationError('No godown found. Create a godown first.')

    gs = get_or_create_godown_stock(product, godown, company)
    previous = Decimal(gs.qty or 0)

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
            raise ValidationError(
                f'Insufficient stock for {product.name} at {godown.name} (available: {previous})'
            )
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

    gs.qty = result
    gs.save(update_fields=['qty', 'updated_at'])
    product_total = sync_product_stock_qty(product)

    movement = StockMovement.objects.create(
        owner=owner,
        company=company,
        product=product,
        godown=godown,
        type=movement_type,
        quantity=qty,
        previous_qty=previous,
        new_qty=result,
        reason=(reason or '')[:255],
        reference=(reference or '')[:100],
        date=date or timezone.localdate(),
    )
    # previous/new on movement are godown-level; product total is on product.stock_qty
    movement._product_stock_qty = product_total  # noqa: SLF001
    return movement


@transaction.atomic
def transfer_godown_stock(*, owner, product, from_godown, to_godown, quantity, company=None, reference=''):
    """Move qty from one godown to another (base unit). Product total unchanged."""
    qty = Decimal(quantity or 0)
    if qty <= 0:
        raise ValidationError('Quantity must be greater than 0')
    if not from_godown or not to_godown:
        raise ValidationError('From and To godown are required')
    if from_godown.pk == to_godown.pk:
        raise ValidationError('From and To godown must be different')

    product = Product.objects.select_for_update().get(pk=product.pk, owner=owner)
    company = company or product.company
    src = get_or_create_godown_stock(product, from_godown, company)
    if Decimal(src.qty or 0) < qty:
        raise ValidationError(
            f'Insufficient stock at {from_godown.name} (available: {src.qty})'
        )
    dst = get_or_create_godown_stock(product, to_godown, company)
    src.qty = Decimal(src.qty or 0) - qty
    dst.qty = Decimal(dst.qty or 0) + qty
    src.save(update_fields=['qty', 'updated_at'])
    dst.save(update_fields=['qty', 'updated_at'])
    sync_product_stock_qty(product)
    return src, dst
