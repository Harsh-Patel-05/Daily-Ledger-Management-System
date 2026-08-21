from django.contrib import admin
from .models import EInvoice, EWayBill


@admin.register(EInvoice)
class EInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'buyer_name', 'total', 'status', 'irn', 'company']
    list_filter = ['status']


@admin.register(EWayBill)
class EWayBillAdmin(admin.ModelAdmin):
    list_display = ['document_number', 'ewb_number', 'vehicle_no', 'status', 'company']
    list_filter = ['status']
