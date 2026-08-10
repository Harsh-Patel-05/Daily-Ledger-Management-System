from rest_framework import serializers
from accounts.ownership import data_owner
from customers.models import Customer
from .models import OpeningBalance


class EmptySerializer(serializers.Serializer):
    pass


class OpeningBalanceSerializer(serializers.ModelSerializer):
    partyType = serializers.CharField(source='party_type')
    partyName = serializers.CharField(source='party_name')
    customerId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    asOf = serializers.DateField(source='as_of')

    class Meta:
        model = OpeningBalance
        fields = (
            'id', 'party_type', 'partyType', 'party_name', 'partyName',
            'customer', 'customerId', 'amount', 'type', 'as_of', 'asOf',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'party_type': {'required': False},
            'party_name': {'required': False},
            'as_of': {'required': False},
            'customer': {'required': False, 'allow_null': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            self.fields['customer'].queryset = Customer.objects.filter(
                owner=data_owner(request.user)
            )

    def validate(self, attrs):
        request = self.context['request']
        owner = data_owner(request.user)

        raw_customer = self.initial_data.get('customerId', self.initial_data.get('customer_id'))
        if 'customerId' in self.initial_data or 'customer_id' in self.initial_data:
            if raw_customer in (None, '', 'null'):
                attrs['customer'] = None
            else:
                pk = str(raw_customer).replace('cust_', '')
                try:
                    attrs['customer'] = Customer.objects.get(pk=pk, owner=owner)
                except (Customer.DoesNotExist, ValueError):
                    raise serializers.ValidationError({'customerId': 'Customer not found'})

        party_type = attrs.get('party_type', getattr(self.instance, 'party_type', None))
        if party_type and party_type not in dict(OpeningBalance.PartyType.choices):
            raise serializers.ValidationError({'partyType': 'Invalid party type'})

        bal_type = attrs.get('type', getattr(self.instance, 'type', None))
        if bal_type and bal_type not in dict(OpeningBalance.BalanceType.choices):
            raise serializers.ValidationError({'type': 'Must be debit or credit'})

        amount = attrs.get('amount')
        if amount is not None and amount < 0:
            raise serializers.ValidationError({'amount': 'Amount cannot be negative'})

        party_name = attrs.get('party_name')
        if party_name is not None:
            attrs['party_name'] = (party_name or '').strip()
            if not attrs['party_name'] and attrs.get('customer'):
                attrs['party_name'] = attrs['customer'].name
            if not attrs['party_name'] and not self.instance:
                raise serializers.ValidationError({'partyName': 'Party name is required'})

        return attrs

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        if not validated.get('party_name') and validated.get('customer'):
            validated['party_name'] = validated['customer'].name
        return super().create(validated)

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'partyType': instance.party_type,
            'partyName': instance.party_name,
            'customerId': instance.customer_id or '',
            'amount': float(instance.amount or 0),
            'type': instance.type,
            'asOf': instance.as_of.isoformat() if instance.as_of else None,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
            'updatedAt': instance.updated_at.isoformat() if instance.updated_at else None,
        }
