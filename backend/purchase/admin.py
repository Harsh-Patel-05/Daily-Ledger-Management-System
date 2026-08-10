from django.contrib import admin
from .models import PurchaseBill, PurchasePayment, PurchaseReturn


@admin.register(PurchaseBill)
class PurchaseBillAdmin(admin.ModelAdmin):
    list_display = (
        'bill_no', 'supplier_name', 'date', 'total', 'paid', 'balance', 'status', 'owner',
    )
    list_filter = ('status', 'gst_type', 'owner')
    search_fields = ('bill_no', 'supplier_name')


@admin.register(PurchasePayment)
class PurchasePaymentAdmin(admin.ModelAdmin):
    list_display = ('bill_no', 'supplier_name', 'amount', 'mode', 'date', 'owner')
    list_filter = ('mode', 'owner', 'date')
    search_fields = ('bill_no', 'supplier_name')


@admin.register(PurchaseReturn)
class PurchaseReturnAdmin(admin.ModelAdmin):
    list_display = ('bill_no', 'supplier_name', 'amount', 'gst_type', 'date', 'owner')
    list_filter = ('gst_type', 'owner', 'date')
    search_fields = ('bill_no', 'supplier_name', 'reason')
