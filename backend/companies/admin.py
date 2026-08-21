from django.contrib import admin
from .models import Company, FiscalYear


class FiscalYearInline(admin.TabularInline):
    model = FiscalYear
    extra = 0


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_primary', 'parent', 'gstin', 'city', 'is_default', 'owner']
    list_filter = ['is_primary', 'registration_type']
    search_fields = ['name', 'gstin', 'alias']
    inlines = [FiscalYearInline]


@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ['label', 'company', 'is_active']
