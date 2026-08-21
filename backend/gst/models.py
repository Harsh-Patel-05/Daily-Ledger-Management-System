from django.conf import settings
from django.db import models
from django.utils import timezone


class EInvoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'Draft', 'Draft'
        GENERATED = 'Generated', 'Generated'
        CANCELLED = 'Cancelled', 'Cancelled'

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='e_invoices'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='e_invoices'
    )
    invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='e_invoices',
    )
    invoice_number = models.CharField(max_length=50)
    invoice_date = models.DateField(default=timezone.localdate)
    buyer_gstin = models.CharField(max_length=15, blank=True)
    buyer_name = models.CharField(max_length=200, blank=True)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    irn = models.CharField(max_length=64, blank=True)
    ack_no = models.CharField(max_length=40, blank=True)
    ack_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'IRN · {self.invoice_number}'


class EWayBill(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'Draft', 'Draft'
        ACTIVE = 'Active', 'Active'
        CANCELLED = 'Cancelled', 'Cancelled'
        EXPIRED = 'Expired', 'Expired'

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='e_way_bills'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='e_way_bills'
    )
    invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='e_way_bills',
    )
    document_number = models.CharField(max_length=50)
    document_date = models.DateField(default=timezone.localdate)
    from_place = models.CharField(max_length=120, blank=True)
    to_place = models.CharField(max_length=120, blank=True)
    transporter_name = models.CharField(max_length=200, blank=True)
    vehicle_no = models.CharField(max_length=20, blank=True)
    distance_km = models.PositiveIntegerField(default=0)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    ewb_number = models.CharField(max_length=20, blank=True)
    valid_upto = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-document_date', '-created_at']
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return f'EWB · {self.document_number}'
