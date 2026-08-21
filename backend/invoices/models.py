from django.db import models
from django.conf import settings
from django.db.models import Max
import re


class Invoice(models.Model):
    class Status(models.TextChoices):
        UNPAID = 'unpaid', 'Unpaid'
        PARTIAL = 'partial', 'Partial'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    class Format(models.TextChoices):
        CLASSIC = 'classic', 'Classic GST'
        MODERN = 'modern', 'Modern Pro'
        COMPACT = 'compact', 'Compact'
        TRADITIONAL = 'traditional', 'Traditional Roj Mel'
        THERMAL = 'thermal', 'Thermal / Receipt'

    class PaymentMethod(models.TextChoices):
        CREDIT = 'Credit', 'Credit'
        CASH = 'Cash', 'Cash'
        UPI = 'UPI', 'UPI'
        BANK = 'Bank', 'Bank'
        CHEQUE = 'Cheque', 'Cheque'

    class GstType(models.TextChoices):
        GST = 'GST', 'GST'
        NON_GST = 'Non-GST', 'Non-GST'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='invoices',
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='invoices',
    )
    invoice_number = models.CharField(max_length=50)
    date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    # Snapshot fields (keep invoice stable if customer changes)
    customer_name = models.CharField(max_length=150)
    customer_business = models.CharField(max_length=200, blank=True)
    customer_address = models.TextField(blank=True)
    customer_gst = models.CharField(max_length=20, blank=True)
    customer_mobile = models.CharField(max_length=15, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    place_of_supply = models.CharField(max_length=80, blank=True)
    is_interstate = models.BooleanField(default=False)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CREDIT
    )
    gst_type = models.CharField(
        max_length=20, choices=GstType.choices, default=GstType.GST
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)
    format = models.CharField(max_length=20, choices=Format.choices, default=Format.CLASSIC)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    # Tally-style invoice header meta (all optional / dynamic from form)
    delivery_note = models.CharField(max_length=100, blank=True, default='')
    reference_no = models.CharField(max_length=100, blank=True, default='')
    other_references = models.CharField(max_length=150, blank=True, default='')
    buyer_order_no = models.CharField(max_length=100, blank=True, default='')
    buyer_order_date = models.DateField(null=True, blank=True)
    dispatch_doc_no = models.CharField(max_length=100, blank=True, default='')
    delivery_note_date = models.DateField(null=True, blank=True)
    dispatched_through = models.CharField(max_length=100, blank=True, default='')
    destination = models.CharField(max_length=150, blank=True, default='')
    terms_of_delivery = models.CharField(max_length=200, blank=True, default='')
    payment_terms = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('owner', 'invoice_number')]
        indexes = [
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['owner', 'date']),
        ]

    def __str__(self):
        return self.invoice_number

    def recalculate_totals(self):
        from decimal import Decimal
        items = self.items.all()
        self.subtotal = sum((i.amount for i in items), start=Decimal('0')) or Decimal('0')
        after_discount = max(Decimal('0'), Decimal(self.subtotal) - Decimal(self.discount or 0))
        if self.gst_type == self.GstType.NON_GST:
            self.tax_rate = 0
            self.tax_amount = Decimal('0')
            self.cgst_amount = self.sgst_amount = self.igst_amount = Decimal('0')
            self.total = after_discount
        else:
            tax = (after_discount * Decimal(self.tax_rate or 0) / Decimal('100')).quantize(Decimal('0.01'))
            self.tax_amount = tax
            if self.is_interstate:
                self.igst_amount = tax
                self.cgst_amount = self.sgst_amount = Decimal('0')
            else:
                half = (tax / Decimal('2')).quantize(Decimal('0.01'))
                self.cgst_amount = half
                self.sgst_amount = tax - half
                self.igst_amount = Decimal('0')
            self.total = after_discount + tax
        self.balance = max(Decimal('0'), Decimal(self.total) - Decimal(self.paid_amount or 0))
        if self.paid_amount >= self.total and self.total > 0:
            self.status = self.Status.PAID
        elif self.paid_amount > 0:
            self.status = self.Status.PARTIAL
        elif self.status != self.Status.OVERDUE:
            self.status = self.Status.UNPAID
        self.save()

    @classmethod
    def next_number(cls, owner, prefix='INV'):
        from datetime import date
        year = date.today().year
        pattern = re.compile(rf'^{re.escape(prefix)}-{year}-(\d+)$')
        existing = cls.objects.filter(owner=owner, invoice_number__startswith=f'{prefix}-{year}-')
        max_n = 0
        for inv in existing:
            m = pattern.match(inv.invoice_number)
            if m:
                max_n = max(max_n, int(m.group(1)))
        return f'{prefix}-{year}-{str(max_n + 1).zfill(4)}'


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
    )
    description = models.CharField(max_length=255)
    hsn = models.CharField(max_length=20, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.description

    def save(self, *args, **kwargs):
        self.amount = (self.quantity or 0) * (self.rate or 0)
        super().save(*args, **kwargs)


class SalesReturn(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sales_returns',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sales_returns',
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='sales_returns',
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_returns',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date = models.DateField()
    reason = models.TextField(blank=True)
    gst_applicable = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'customer']),
        ]

    def __str__(self):
        return f'Return · {self.amount} · {self.date}'
