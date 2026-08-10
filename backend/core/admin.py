from django.contrib import admin
from .models import OpeningBalance


@admin.register(OpeningBalance)
class OpeningBalanceAdmin(admin.ModelAdmin):
    list_display = ('party_name', 'party_type', 'type', 'amount', 'as_of', 'owner')
    list_filter = ('party_type', 'type', 'owner')
    search_fields = ('party_name',)
