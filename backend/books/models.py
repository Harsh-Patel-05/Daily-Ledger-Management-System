from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class CompanyOwnedQuerySet(models.QuerySet):
    def for_owner(self, owner):
        return self.filter(company__owner=owner)

    def for_company(self, company_id):
        if not company_id:
            return self
        return self.filter(company_id=company_id)


class AccountGroup(models.Model):
    NATURES = [
        ('Assets', 'Assets'),
        ('Liabilities', 'Liabilities'),
        ('Income', 'Income'),
        ('Expenses', 'Expenses'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='account_groups',
    )
    name = models.CharField(max_length=150)
    nature = models.CharField(max_length=20, choices=NATURES)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
    )
    is_primary = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['sort_order', 'name']
        unique_together = [('company', 'name', 'parent')]
        indexes = [models.Index(fields=['company', 'nature'])]

    def __str__(self):
        return self.name


class LedgerAccount(models.Model):
    class Side(models.TextChoices):
        DR = 'Dr', 'Debit'
        CR = 'Cr', 'Credit'

    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='ledger_accounts',
    )
    group = models.ForeignKey(
        AccountGroup,
        on_delete=models.CASCADE,
        related_name='ledgers',
    )
    name = models.CharField(max_length=150)
    short_name = models.CharField(max_length=50, blank=True)
    opening = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    side = models.CharField(max_length=2, choices=Side.choices, default=Side.DR)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]
        indexes = [models.Index(fields=['company', 'status'])]

    def __str__(self):
        return self.name

    @property
    def under_group(self):
        return self.group.name if self.group_id else ''

    @property
    def nature(self):
        return self.group.nature if self.group_id else ''


class BankAccount(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='bank_accounts'
    )
    name = models.CharField(max_length=150)
    account_number = models.CharField(max_length=40, blank=True)
    ifsc = models.CharField(max_length=20, blank=True)
    branch = models.CharField(max_length=120, blank=True)
    opening = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]

    def __str__(self):
        return self.name


class Transporter(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='transporters'
    )
    name = models.CharField(max_length=150)
    vehicle_no = models.CharField(max_length=40, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Unit(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='units'
    )
    name = models.CharField(max_length=40)
    formal_name = models.CharField(max_length=80, blank=True)
    decimal_places = models.PositiveSmallIntegerField(default=2)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]


class HsnCode(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='hsn_codes'
    )
    code = models.CharField(max_length=20)
    description = models.CharField(max_length=255, blank=True)
    type = models.CharField(max_length=10, default='HSN')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['code']
        unique_together = [('company', 'code')]


class Godown(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='godowns'
    )
    name = models.CharField(max_length=120)
    address = models.TextField(blank=True)
    in_charge = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]


class ItemGroup(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='item_groups'
    )
    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children'
    )
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]


class Voucher(models.Model):
    """Sales / purchase documents that link parties, invoices, and stock flow."""

    class DocType(models.TextChoices):
        QUOTATION = 'quotation', 'Quotation'
        PROFORMA = 'proforma', 'Proforma Invoice'
        SALES_ORDER = 'sales_order', 'Sales Order'
        DELIVERY_CHALLAN = 'delivery_challan', 'Delivery Challan'
        CREDIT_NOTE = 'credit_note', 'Credit Note'
        PURCHASE_ORDER = 'purchase_order', 'Purchase Order'
        GRN = 'grn', 'Goods Receipt'
        DEBIT_NOTE = 'debit_note', 'Debit Note'

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='vouchers'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vouchers'
    )
    doc_type = models.CharField(max_length=30, choices=DocType.choices, db_index=True)
    number = models.CharField(max_length=50)
    date = models.DateField(default=timezone.localdate)
    party = models.CharField(max_length=200, blank=True)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vouchers',
    )
    supplier = models.ForeignKey(
        'inventory.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vouchers',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=6, decimal_places=2, default=18)
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    gst_type = models.CharField(max_length=20, default='GST')
    place_of_supply = models.CharField(max_length=80, blank=True)
    is_interstate = models.BooleanField(default=False)
    status = models.CharField(max_length=40, default='Open')
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    related_voucher = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
    )
    related_invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_vouchers',
    )
    related_bill = models.ForeignKey(
        'purchase.PurchaseBill',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_vouchers',
    )
    fiscal_year = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('company', 'doc_type', 'number')]
        indexes = [
            models.Index(fields=['company', 'doc_type', 'date']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f'{self.doc_type}:{self.number}'

    def recalculate(self, save=True):
        from decimal import Decimal
        lines = list(self.lines.all())
        subtotal = sum((Decimal(l.amount or 0) for l in lines), Decimal('0'))
        if not lines:
            subtotal = Decimal(self.taxable_amount or self.amount or 0)
        discount = Decimal(self.discount or 0)
        taxable = max(Decimal('0'), subtotal - discount)
        gst = (self.gst_type or 'GST').upper() != 'NON-GST'
        rate = Decimal(self.tax_rate or 0) if gst else Decimal('0')
        tax = (taxable * rate / Decimal('100')).quantize(Decimal('0.01'))
        if not gst:
            self.cgst_amount = self.sgst_amount = self.igst_amount = Decimal('0')
        elif self.is_interstate:
            self.igst_amount = tax
            self.cgst_amount = self.sgst_amount = Decimal('0')
        else:
            half = (tax / Decimal('2')).quantize(Decimal('0.01'))
            self.cgst_amount = half
            self.sgst_amount = tax - half
            self.igst_amount = Decimal('0')
        self.taxable_amount = taxable
        self.tax_amount = tax
        self.amount = taxable + tax
        if save:
            self.save(
                update_fields=[
                    'taxable_amount', 'tax_amount', 'amount',
                    'cgst_amount', 'sgst_amount', 'igst_amount', 'updated_at',
                ]
            )
        return self


class VoucherLine(models.Model):
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voucher_lines',
    )
    description = models.CharField(max_length=255)
    hsn = models.CharField(max_length=20, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=6, decimal_places=2, default=18)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.description

    def save(self, *args, **kwargs):
        from decimal import Decimal
        self.amount = (Decimal(self.quantity or 0) * Decimal(self.rate or 0)).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


class JournalEntry(models.Model):
    class Kind(models.TextChoices):
        JOURNAL = 'journal', 'Journal'
        GST = 'gst', 'GST Journal'

    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='journal_entries'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='journal_entries'
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.JOURNAL)
    number = models.CharField(max_length=50)
    date = models.DateField(default=timezone.localdate)
    debit_account = models.CharField(max_length=150, blank=True)
    credit_account = models.CharField(max_length=150, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    type = models.CharField(max_length=60, blank=True)  # GST journal type
    narration = models.TextField(blank=True)
    debit_ledger = models.ForeignKey(
        LedgerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='debit_journals',
    )
    credit_ledger = models.ForeignKey(
        LedgerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='credit_journals',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('company', 'kind', 'number')]


class ContraEntry(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='contra_entries'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contra_entries'
    )
    number = models.CharField(max_length=50)
    date = models.DateField(default=timezone.localdate)
    from_account = models.CharField(max_length=150)
    to_account = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    narration = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('company', 'number')]


class BankReconciliation(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='bank_reconciliations'
    )
    statement_date = models.DateField(default=timezone.localdate)
    bank = models.CharField(max_length=150)
    bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reconciliations',
    )
    book_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    bank_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    difference = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=40, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['-statement_date', '-created_at']

    def save(self, *args, **kwargs):
        self.difference = Decimal(str(self.book_balance or 0)) - Decimal(
            str(self.bank_balance or 0)
        )
        super().save(*args, **kwargs)


class StockJournal(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='stock_journals'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stock_journals'
    )
    number = models.CharField(max_length=50)
    date = models.DateField(default=timezone.localdate)
    item = models.CharField(max_length=200, blank=True)
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_journals',
    )
    from_godown = models.CharField(max_length=120, blank=True)
    to_godown = models.CharField(max_length=120, blank=True)
    source_godown = models.ForeignKey(
        'books.Godown',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_out_journals',
    )
    destination_godown = models.ForeignKey(
        'books.Godown',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_in_journals',
    )
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    narration = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('company', 'number')]


class DocumentSeries(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='document_series'
    )
    document = models.CharField(max_length=80)
    prefix = models.CharField(max_length=30)
    next_number = models.PositiveIntegerField(default=1)
    fy = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['document']
        unique_together = [('company', 'document', 'fy')]


class PrintTemplate(models.Model):
    company = models.ForeignKey(
        'companies.Company', on_delete=models.CASCADE, related_name='print_templates'
    )
    name = models.CharField(max_length=120)
    document = models.CharField(max_length=80)
    paper = models.CharField(max_length=20, default='A4')
    copies = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    objects = CompanyOwnedQuerySet.as_manager()

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]
