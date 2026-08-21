from django.conf import settings
from django.db import models


class OpeningBalance(models.Model):
    class PartyType(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        SUPPLIER = 'supplier', 'Supplier'
        BANK = 'bank', 'Bank'
        CASH = 'cash', 'Cash'
        OTHER = 'other', 'Other'

    class BalanceType(models.TextChoices):
        DEBIT = 'debit', 'Debit'
        CREDIT = 'credit', 'Credit'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='opening_balances',
    )
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='opening_balances',
    )
    party_type = models.CharField(max_length=20, choices=PartyType.choices)
    party_name = models.CharField(max_length=200)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='opening_balances',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    type = models.CharField(max_length=10, choices=BalanceType.choices)
    as_of = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-as_of', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'as_of']),
            models.Index(fields=['owner', 'party_type']),
        ]

    def __str__(self):
        return f'{self.party_name} · {self.type} {self.amount}'
