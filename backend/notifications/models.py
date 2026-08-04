from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        PAYMENT_REMINDER = 'payment_reminder', 'Payment Reminder'
        OVERDUE = 'overdue', 'Overdue'
        PENDING_BILL = 'pending_bill', 'Pending Bill'
        UPCOMING_DUE = 'upcoming_due', 'Upcoming Due'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ActivityLog(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_logs',
    )
    type = models.CharField(max_length=50, default='info')
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message
