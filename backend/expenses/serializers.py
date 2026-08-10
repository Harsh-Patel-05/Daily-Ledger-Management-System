from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework import serializers
from accounts.ownership import data_owner
from transactions.models import Transaction
from .models import ExpenseCategory, Expense


def _dec(value, default='0'):
    try:
        return Decimal(str(value if value is not None else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ('id', 'name', 'description', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'status': {'required': False},
        }

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Category name is required')
        owner = data_owner(self.context['request'].user)
        qs = ExpenseCategory.objects.filter(owner=owner, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Category with this name already exists')
        return value

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['createdAt'] = instance.created_at.isoformat() if instance.created_at else None
        return data


class ExpenseSerializer(serializers.ModelSerializer):
    categoryName = serializers.CharField(source='category_name', required=False, allow_blank=True)
    paymentMode = serializers.CharField(source='payment_mode', required=False)
    gstType = serializers.CharField(source='gst_type', required=False)
    categoryId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Expense
        fields = (
            'id', 'category', 'categoryId', 'category_name', 'categoryName',
            'date', 'amount', 'payment_mode', 'paymentMode',
            'notes', 'gst_type', 'gstType', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'category': {'required': False, 'allow_null': True},
            'category_name': {'required': False, 'allow_blank': True},
            'payment_mode': {'required': False},
            'notes': {'required': False, 'allow_blank': True},
            'gst_type': {'required': False},
            'amount': {'required': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['category'].queryset = ExpenseCategory.objects.filter(owner=owner)

    def _resolve_category(self, raw):
        if raw in (None, '', 'null'):
            return None
        pk = str(raw).replace('expcat_', '').replace('cat_', '')
        owner = data_owner(self.context['request'].user)
        try:
            return ExpenseCategory.objects.get(pk=pk, owner=owner)
        except (ExpenseCategory.DoesNotExist, ValueError):
            raise serializers.ValidationError({'categoryId': 'Category not found'})

    def validate(self, attrs):
        raw = self.initial_data.get('categoryId', self.initial_data.get('category_id'))
        if 'categoryId' in self.initial_data or 'category_id' in self.initial_data:
            attrs['category'] = self._resolve_category(raw)

        category = attrs.get('category')
        if category and not attrs.get('category_name'):
            attrs['category_name'] = category.name

        # Resolve category by name when only categoryName provided
        name = (attrs.get('category_name') or self.initial_data.get('categoryName') or '').strip()
        if name and not category:
            owner = data_owner(self.context['request'].user)
            category = ExpenseCategory.objects.filter(owner=owner, name__iexact=name).first()
            if category:
                attrs['category'] = category
            attrs['category_name'] = name

        return attrs

    @transaction.atomic
    def create(self, validated):
        owner = data_owner(self.context['request'].user)
        validated['owner'] = owner
        amount = _dec(validated.get('amount'))
        if amount <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than 0'})
        validated['amount'] = amount

        if not validated.get('payment_mode'):
            validated['payment_mode'] = (
                self.initial_data.get('paymentMode')
                or self.initial_data.get('payment_mode')
                or 'Cash'
            )
        if not validated.get('gst_type'):
            validated['gst_type'] = (
                self.initial_data.get('gstType')
                or self.initial_data.get('gst_type')
                or Expense.GstType.NON_GST
            )

        expense = super().create(validated)

        description = (
            expense.category_name
            or (expense.category.name if expense.category_id else '')
            or (expense.notes or '')[:255]
            or 'Expense'
        )
        if expense.notes and expense.category_name:
            description = f'{expense.category_name}: {expense.notes}'[:255]

        Transaction.objects.create(
            owner=owner,
            customer=None,
            date=expense.date,
            type=Transaction.Type.EXPENSE,
            item_description=description,
            quantity=1,
            rate=amount,
            amount=amount,
            notes=expense.notes or '',
            payment_method=expense.payment_mode or 'Cash',
        )
        return expense

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'categoryId': instance.category_id or '',
            'categoryName': instance.category_name or (
                instance.category.name if instance.category_id else ''
            ),
            'date': instance.date.isoformat() if instance.date else None,
            'amount': float(instance.amount or 0),
            'paymentMode': instance.payment_mode,
            'notes': instance.notes,
            'gstType': instance.gst_type,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
            'updatedAt': instance.updated_at.isoformat() if instance.updated_at else None,
        }
