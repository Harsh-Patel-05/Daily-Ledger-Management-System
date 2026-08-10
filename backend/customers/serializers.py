from rest_framework import serializers
from accounts.ownership import data_owner
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id', 'name', 'mobile', 'business_name', 'address', 'gst', 'email',
            'credit_limit', 'current_balance', 'status', 'photo', 'notes',
            'last_transaction', 'tags', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'current_balance', 'last_transaction', 'created_at', 'updated_at')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['businessName'] = data['business_name']
        data['creditLimit'] = float(data['credit_limit'] or 0)
        data['currentBalance'] = float(data['current_balance'] or 0)
        data['lastTransaction'] = data['last_transaction']
        data['createdAt'] = data['created_at'][:10] if data.get('created_at') else None
        if instance.photo:
            request = self.context.get('request')
            url = instance.photo.url
            data['photo'] = request.build_absolute_uri(url) if request else url
        return data

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)
