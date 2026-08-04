from django.db import models
from django.conf import settings


class Transaction(models.Model):
    class Type(models.TextChoices):
        CREDIT = 'credit', 'Credit (Mall Diya)'
        PAYMENT = 'payment', 'Payment Received'
        RETURN = 'return', 'Return'
        DISCOUNT = 'discount', 'Discount'
        EXPENSE = 'expense', 'Expense'

    class PaymentMethod(models.TextChoices):
        CASH = 'Cash', 'Cash'
        UPI = 'UPI', 'UPI'
        BANK = 'Bank', 'Bank'
        CHEQUE = 'Cheque', 'Cheque'
        CREDIT = 'Credit', 'Credit'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions',
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
    )
    date = models.DateField()
    type = models.CharField(max_length=20, choices=Type.choices)
    item_description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    invoice = models.ForeignKey(
        'invoices.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_transactions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'type']),
            models.Index(fields=['customer', 'date']),
        ]

    def __str__(self):
        return f'{self.type} · {self.amount} · {self.date}'

    @property
    def customer_name(self):
        return self.customer.name if self.customer else ''

    @property
    def customer_id_str(self):
        return str(self.customer_id) if self.customer_id else None
