from rest_framework import serializers
from customers.models import Customer
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    customerId = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Transaction
        fields = (
            'id', 'customer', 'customerId', 'date', 'type',
            'item_description', 'quantity', 'rate', 'amount',
            'notes', 'payment_method', 'invoice',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'invoice')
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'item_description': {'required': False, 'allow_blank': True},
            'payment_method': {'required': False, 'allow_blank': True},
            'notes': {'required': False, 'allow_blank': True},
            'quantity': {'required': False},
            'rate': {'required': False},
        }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        aliases = {
            'itemDescription': 'item_description',
            'paymentMethod': 'payment_method',
            'customer_id': 'customerId',
        }
        for camel, snake in aliases.items():
            if camel in data and snake not in data:
                data[snake] = data[camel]
        return super().to_internal_value(data)

    def _resolve_customer(self, raw_id):
        if not raw_id:
            return None
        pk = raw_id
        if isinstance(raw_id, str) and raw_id.startswith('cust_'):
            pk = raw_id.replace('cust_', '')
        try:
            return Customer.objects.get(pk=pk, owner=self.context['request'].user)
        except (Customer.DoesNotExist, ValueError):
            raise serializers.ValidationError({'customerId': 'Customer not found'})

    def create(self, validated):
        request = self.context['request']
        raw = self.initial_data.get('customerId') or self.initial_data.get('customer_id')
        customer = self._resolve_customer(raw) if raw else validated.get('customer')
        if validated.get('type') != Transaction.Type.EXPENSE and not customer:
            raise serializers.ValidationError({'customerId': 'Customer is required'})
        validated.pop('customer', None)
        validated.pop('customerId', None)
        tx = Transaction.objects.create(
            owner=request.user,
            customer=customer,
            date=validated['date'],
            type=validated['type'],
            item_description=(validated.get('item_description') or '').strip() or validated['type'],
            quantity=validated.get('quantity') or 1,
            rate=validated.get('rate') or validated.get('amount') or 0,
            amount=validated['amount'],
            notes=validated.get('notes', ''),
            payment_method=validated.get('payment_method') or 'Cash',
        )
        if customer:
            customer.recalculate_balance()
        return tx

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'date': instance.date.isoformat() if instance.date else None,
            'customerId': instance.customer_id,
            'customerName': instance.customer_name,
            'type': instance.type,
            'itemDescription': instance.item_description,
            'quantity': float(instance.quantity),
            'rate': float(instance.rate),
            'amount': float(instance.amount),
            'notes': instance.notes,
            'paymentMethod': instance.payment_method,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }
