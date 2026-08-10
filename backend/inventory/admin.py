from django.contrib import admin
from .models import Category, Supplier, Product, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name',)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'mobile', 'gst', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name', 'mobile', 'gst')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'owner', 'stock_qty', 'selling_price', 'tax_rate', 'status')
    list_filter = ('status', 'owner', 'category')
    search_fields = ('name', 'sku', 'barcode', 'hsn')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('product', 'type', 'quantity', 'previous_qty', 'new_qty', 'date', 'owner')
    list_filter = ('type', 'owner', 'date')
    search_fields = ('product__name', 'reference', 'reason')
