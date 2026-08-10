from django.conf import settings
from django.db import models
from django.utils import timezone


class ExpenseCategory(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_categories',
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = [('owner', 'name')]
        indexes = [models.Index(fields=['owner', 'name'])]
        verbose_name_plural = 'expense categories'

    def __str__(self):
        return self.name


class Expense(models.Model):
    class GstType(models.TextChoices):
        GST = 'GST', 'GST'
        NON_GST = 'Non-GST', 'Non-GST'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses',
    )
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
    )
    category_name = models.CharField(max_length=120, blank=True)
    date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_mode = models.CharField(max_length=30, default='Cash')
    notes = models.TextField(blank=True)
    gst_type = models.CharField(
        max_length=20, choices=GstType.choices, default=GstType.NON_GST
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'date']),
            models.Index(fields=['owner', 'category_name']),
        ]

    def __str__(self):
        return f'{self.category_name or "Expense"} · {self.amount}'
