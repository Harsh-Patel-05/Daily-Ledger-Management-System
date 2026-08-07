from django.db import models
from django.conf import settings


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
    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=15)
    business_name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    gst = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    photo = models.ImageField(upload_to='customers/', blank=True, null=True)
    notes = models.TextField(blank=True)
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
        ]

    def __str__(self):
        return f'{self.name} ({self.business_name})'

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
