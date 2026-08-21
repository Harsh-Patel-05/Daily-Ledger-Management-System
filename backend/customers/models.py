from django.db import models
from django.conf import settings


class CustomerGroup(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_groups',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='customer_groups',
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = [('owner', 'name')]

    def __str__(self):
        return self.name


class Customer(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        OVERDUE = 'overdue', 'Overdue'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customers',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='customers',
    )
    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=15)
    business_name = models.CharField(max_length=200)
    address = models.TextField(blank=True, default='')
    billing_address = models.TextField(blank=True, default='')
    shipping_address = models.TextField(blank=True, default='')
    gst = models.CharField(max_length=20, blank=True, default='')
    pan = models.CharField(max_length=10, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    state_code = models.CharField(max_length=2, blank=True, default='')
    pincode = models.CharField(max_length=6, blank=True, default='')
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_days = models.PositiveIntegerField(default=0)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    group = models.ForeignKey(
        CustomerGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customers',
    )
    photo = models.ImageField(upload_to='customers/', blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    last_transaction = models.DateField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['owner', 'name']),
            models.Index(fields=['owner', 'mobile']),
            models.Index(fields=['owner', 'status']),
            models.Index(fields=['company', 'name']),
        ]

    def __str__(self):
        return f'{self.name} ({self.business_name})'

    def save(self, *args, **kwargs):
        # Keep billing/shipping filled for DB NOT NULL columns
        if not self.billing_address:
            self.billing_address = self.address or ''
        if not self.shipping_address:
            self.shipping_address = self.address or self.billing_address or ''
        super().save(*args, **kwargs)

    def recalculate_balance(self):
        from transactions.models import Transaction
        credit = Transaction.objects.filter(
            customer=self, type=Transaction.Type.CREDIT
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        reductions = Transaction.objects.filter(
            customer=self,
            type__in=[
                Transaction.Type.PAYMENT,
                Transaction.Type.RETURN,
                Transaction.Type.DISCOUNT,
            ],
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        self.current_balance = max(0, credit - reductions)
        last = Transaction.objects.filter(customer=self).order_by('-date', '-created_at').first()
        self.last_transaction = last.date if last else None
        if self.status != self.Status.INACTIVE:
            if self.credit_limit and self.current_balance > self.credit_limit:
                self.status = self.Status.OVERDUE
            elif self.current_balance == 0:
                self.status = self.Status.ACTIVE
        self.save(update_fields=['current_balance', 'last_transaction', 'status', 'updated_at'])
