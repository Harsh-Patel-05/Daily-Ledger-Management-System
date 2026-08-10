from django.contrib import admin
from .models import ExpenseCategory, Expense


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'owner', 'created_at')
    list_filter = ('status', 'owner')
    search_fields = ('name', 'description')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        'category_name', 'date', 'amount', 'payment_mode', 'gst_type', 'owner',
    )
    list_filter = ('gst_type', 'payment_mode', 'owner', 'date')
    search_fields = ('category_name', 'notes')
