from django.contrib import admin
from .models import Category, Unit, Supplier, Product, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name',)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'status', 'owner', 'created_at')
    list_filter = ('status', 'owner')
    search_fields = ('name', 'short_name')


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'mobile', 'gst', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name', 'mobile', 'gst')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'owner', 'stock_qty', 'selling_price', 'status')
    list_filter = ('status', 'owner', 'category')
    search_fields = ('name', 'sku', 'barcode', 'hsn')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('product', 'type', 'quantity', 'previous_qty', 'new_qty', 'date', 'owner')
    list_filter = ('type', 'owner', 'date')
    search_fields = ('product__name', 'reference', 'reason')
