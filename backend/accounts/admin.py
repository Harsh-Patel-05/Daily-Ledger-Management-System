from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, BusinessProfile, BusinessSettings, PasswordOTP, ShopRole, ShopPermission


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('email',)
    list_display = ('email', 'first_name', 'role', 'shop_name', 'business_owner', 'is_staff')
    search_fields = ('email', 'first_name', 'mobile')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {
            'fields': (
                'first_name', 'last_name', 'mobile', 'role', 'shop_name',
                'business_owner', 'is_active_staff',
            ),
        }),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'password1', 'password2', 'role'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
    raw_id_fields = ('business_owner',)


admin.site.register(BusinessProfile)
admin.site.register(BusinessSettings)
admin.site.register(PasswordOTP)
admin.site.register(ShopRole)
admin.site.register(ShopPermission)
