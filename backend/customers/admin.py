from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_name', 'mobile', 'current_balance', 'status', 'owner')
    list_filter = ('status',)
    search_fields = ('name', 'mobile', 'business_name', 'gst')
