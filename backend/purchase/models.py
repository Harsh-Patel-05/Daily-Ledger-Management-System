from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


def compute_bill_status(balance, paid):
    balance = Decimal(str(balance or 0))
    paid = Decimal(str(paid or 0))
    if balance <= 0:
        return PurchaseBill.Status.PAID
    if paid > 0:
        return PurchaseBill.Status.PARTIAL
    return PurchaseBill.Status.UNPAID


class PurchaseBill(models.Model):
    class GstType(models.TextChoices):
        GST = 'GST', 'GST'
        NON_GST = 'Non-GST', 'Non-GST'

    class Status(models.TextChoices):
        UNPAID = 'unpaid', 'Unpaid'
        PARTIAL = 'partial', 'Partial'
        PAID = 'paid', 'Paid'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purchase_bills',
    )
    bill_no = models.CharField(max_length=50)
    date = models.DateField(default=timezone.localdate)
    supplier = models.ForeignKey(
        'inventory.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_bills',
    )
    supplier_name = models.CharField(max_length=200, blank=True)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_type = models.CharField(
        max_length=20, choices=GstType.choices, default=GstType.GST
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UNPAID
    )
    notes = models.TextField(blank=True)
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_bills',
    )
    stock_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'bill_no']),
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'status']),
        ]

    def __str__(self):
        return f'{self.bill_no} · {self.total}'

    def recompute_totals(self, save=False):
        taxable = Decimal(str(self.taxable_amount or 0))
        gst = Decimal(str(self.gst_amount or 0))
        paid = Decimal(str(self.paid or 0))
        if self.gst_type == self.GstType.GST:
            self.total = taxable + gst
        else:
            self.total = taxable
            self.gst_amount = Decimal('0')
        self.balance = max(Decimal('0'), self.total - paid)
        self.status = compute_bill_status(self.balance, paid)
        if save:
            self.save(
                update_fields=[
                    'total', 'gst_amount', 'balance', 'status', 'paid', 'updated_at',
                ]
            )


class PurchasePayment(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purchase_payments',
    )
    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    bill_no = models.CharField(max_length=50, blank=True)
    supplier_name = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    mode = models.CharField(max_length=30, default='Cash')
    date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'bill_no']),
        ]

    def __str__(self):
        return f'Payment {self.amount} · {self.bill_no or self.bill_id}'


class PurchaseReturn(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purchase_returns',
    )
    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='returns',
    )
    bill_no = models.CharField(max_length=50, blank=True)
    supplier_name = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_type = models.CharField(
        max_length=20,
        choices=PurchaseBill.GstType.choices,
        default=PurchaseBill.GstType.NON_GST,
    )
    reason = models.CharField(max_length=255, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'bill_no']),
        ]

    def __str__(self):
        return f'Return {self.amount} · {self.bill_no or self.bill_id}'
