from rest_framework import serializers
from .models import Notification, ActivityLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'type', 'title', 'message', 'customer', 'amount',
            'is_read', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'type': instance.type,
            'title': instance.title,
            'message': instance.message,
            'customerId': instance.customer_id,
            'customerName': instance.customer.name if instance.customer else None,
            'amount': float(instance.amount) if instance.amount is not None else None,
            'isRead': instance.is_read,
            'read': instance.is_read,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ('id', 'type', 'message', 'created_at')
        read_only_fields = fields

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'type': instance.type,
            'message': instance.message,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }
