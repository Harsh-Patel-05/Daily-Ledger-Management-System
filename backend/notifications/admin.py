from django.contrib import admin
from .models import Notification, ActivityLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'is_read', 'owner', 'created_at')
    list_filter = ('type', 'is_read')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('message', 'type', 'owner', 'created_at')
    list_filter = ('type',)
