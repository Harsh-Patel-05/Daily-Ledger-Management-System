from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('date', 'type', 'customer', 'amount', 'payment_method', 'owner')
    list_filter = ('type', 'payment_method')
    search_fields = ('item_description', 'customer__name')
