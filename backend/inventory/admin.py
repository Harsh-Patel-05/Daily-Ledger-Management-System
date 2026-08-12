from django.contrib import admin
from .models import Category, Brand, Supplier, Product, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color', 'created_at')
    list_filter = ('owner',)
    search_fields = ('name',)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
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
    list_display = ('name', 'brand', 'owner', 'stock_qty', 'selling_price', 'tax_rate', 'status')
    list_filter = ('status', 'owner', 'category', 'brand')
    search_fields = ('name', 'description', 'brand__name')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('product', 'type', 'quantity', 'previous_qty', 'new_qty', 'date', 'owner')
    list_filter = ('type', 'owner', 'date')
    search_fields = ('product__name', 'reference', 'reason')
