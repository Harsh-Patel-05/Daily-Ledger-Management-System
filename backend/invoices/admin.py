from django.contrib import admin
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'customer_name', 'date', 'total', 'status', 'owner')
    list_filter = ('status', 'format', 'payment_method')
    search_fields = ('invoice_number', 'customer_name')
    inlines = [InvoiceItemInline]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('description', 'invoice', 'quantity', 'rate', 'amount')
