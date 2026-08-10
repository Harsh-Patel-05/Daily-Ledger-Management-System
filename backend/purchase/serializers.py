from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from accounts.ownership import data_owner
from inventory.models import Product, Supplier, StockMovement, apply_stock_movement
from .models import PurchaseBill, PurchasePayment, PurchaseReturn, compute_bill_status


def _dec(value, default='0'):
    try:
        return Decimal(str(value if value is not None else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


class PurchaseBillSerializer(serializers.ModelSerializer):
    billNo = serializers.CharField(source='bill_no', required=False)
    supplierName = serializers.CharField(source='supplier_name', required=False, allow_blank=True)
    taxableAmount = serializers.DecimalField(
        source='taxable_amount', max_digits=12, decimal_places=2, required=False
    )
    gstAmount = serializers.DecimalField(
        source='gst_amount', max_digits=12, decimal_places=2, required=False
    )
    gstType = serializers.CharField(source='gst_type', required=False)
    stockQty = serializers.DecimalField(
        source='stock_qty', max_digits=12, decimal_places=2, required=False
    )
    productId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    supplierId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = PurchaseBill
        fields = (
            'id', 'bill_no', 'billNo', 'date', 'supplier', 'supplierId',
            'supplier_name', 'supplierName', 'taxable_amount', 'taxableAmount',
            'gst_amount', 'gstAmount', 'total', 'paid', 'balance',
            'gst_type', 'gstType', 'status', 'notes',
            'product', 'productId', 'stock_qty', 'stockQty',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'total', 'balance', 'status', 'created_at', 'updated_at',
        )
        extra_kwargs = {
            'bill_no': {'required': False},
            'supplier': {'required': False, 'allow_null': True},
            'product': {'required': False, 'allow_null': True},
            'taxable_amount': {'required': False},
            'gst_amount': {'required': False},
            'paid': {'required': False},
            'stock_qty': {'required': False},
            'notes': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['supplier'].queryset = Supplier.objects.filter(owner=owner)
            self.fields['product'].queryset = Product.objects.filter(owner=owner)

    def _resolve_fk(self, model, raw, field_name):
        if raw in (None, '', 'null'):
            return None
        pk = str(raw).replace('sup_', '').replace('prod_', '')
        owner = data_owner(self.context['request'].user)
        try:
            return model.objects.get(pk=pk, owner=owner)
        except (model.DoesNotExist, ValueError):
            raise serializers.ValidationError({field_name: 'Not found'})

    def validate(self, attrs):
        raw_sup = self.initial_data.get('supplierId', self.initial_data.get('supplier_id'))
        if 'supplierId' in self.initial_data or 'supplier_id' in self.initial_data:
            attrs['supplier'] = self._resolve_fk(Supplier, raw_sup, 'supplierId')

        raw_prod = self.initial_data.get('productId', self.initial_data.get('product_id'))
        if 'productId' in self.initial_data or 'product_id' in self.initial_data:
            attrs['product'] = self._resolve_fk(Product, raw_prod, 'productId')

        bill_no = (attrs.get('bill_no') or self.initial_data.get('billNo') or '').strip()
        if not self.instance and not bill_no:
            raise serializers.ValidationError({'billNo': 'Bill number is required'})
        if bill_no:
            attrs['bill_no'] = bill_no

        return attrs

    @transaction.atomic
    def create(self, validated):
        request = self.context['request']
        owner = data_owner(request.user)
        validated['owner'] = owner

        taxable = _dec(validated.get('taxable_amount', self.initial_data.get('taxableAmount')))
        gst = _dec(validated.get('gst_amount', self.initial_data.get('gstAmount')))
        paid = _dec(validated.get('paid', self.initial_data.get('paid')))
        gst_type = validated.get('gst_type') or self.initial_data.get('gstType') or PurchaseBill.GstType.GST
        stock_qty = _dec(validated.get('stock_qty', self.initial_data.get('stockQty')))

        validated['taxable_amount'] = taxable
        validated['gst_amount'] = gst if gst_type == PurchaseBill.GstType.GST else Decimal('0')
        validated['paid'] = paid
        validated['gst_type'] = gst_type
        validated['stock_qty'] = stock_qty
        validated['total'] = taxable + validated['gst_amount'] if gst_type == PurchaseBill.GstType.GST else taxable
        validated['balance'] = max(Decimal('0'), validated['total'] - paid)
        validated['status'] = compute_bill_status(validated['balance'], paid)

        if not validated.get('supplier_name') and validated.get('supplier'):
            validated['supplier_name'] = validated['supplier'].name

        bill = super().create(validated)

        product = bill.product
        if product and stock_qty > 0:
            apply_stock_movement(
                owner=owner,
                product=product,
                movement_type=StockMovement.Type.IN,
                quantity=stock_qty,
                reason=f'Purchase bill {bill.bill_no}',
                reference=bill.bill_no,
                date=bill.date or timezone.localdate(),
            )

        return bill

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['billNo'] = instance.bill_no
        data['supplierId'] = instance.supplier_id or ''
        data['supplierName'] = instance.supplier_name or (
            instance.supplier.name if instance.supplier_id else ''
        )
        data['taxableAmount'] = float(instance.taxable_amount or 0)
        data['gstAmount'] = float(instance.gst_amount or 0)
        data['total'] = float(instance.total or 0)
        data['paid'] = float(instance.paid or 0)
        data['balance'] = float(instance.balance or 0)
        data['gstType'] = instance.gst_type
        data['productId'] = instance.product_id or ''
        data['stockQty'] = float(instance.stock_qty or 0)
        data['createdAt'] = instance.created_at.isoformat() if instance.created_at else None
        data['updatedAt'] = instance.updated_at.isoformat() if instance.updated_at else None
        return data


class PurchasePaymentSerializer(serializers.ModelSerializer):
    billNo = serializers.CharField(source='bill_no', required=False, allow_blank=True)
    supplierName = serializers.CharField(source='supplier_name', required=False, allow_blank=True)
    billId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    paymentMode = serializers.CharField(source='mode', required=False)
    mode = serializers.CharField(required=False)

    class Meta:
        model = PurchasePayment
        fields = (
            'id', 'bill', 'billId', 'bill_no', 'billNo',
            'supplier_name', 'supplierName', 'amount', 'mode', 'paymentMode',
            'date', 'notes', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'bill': {'required': False, 'allow_null': True},
            'bill_no': {'required': False, 'allow_blank': True},
            'amount': {'required': True},
            'notes': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['bill'].queryset = PurchaseBill.objects.filter(owner=owner)

    def _resolve_bill(self, owner, attrs):
        bill = attrs.get('bill')
        raw = (
            self.initial_data.get('billId')
            or self.initial_data.get('bill_id')
            or self.initial_data.get('bill')
        )
        if raw and not isinstance(raw, PurchaseBill):
            pk = str(raw).replace('pb_', '').replace('bill_', '')
            try:
                bill = PurchaseBill.objects.get(pk=pk, owner=owner)
            except (PurchaseBill.DoesNotExist, ValueError):
                raise serializers.ValidationError({'billId': 'Bill not found'})
        if not bill:
            bill_no = (
                attrs.get('bill_no')
                or self.initial_data.get('billNo')
                or self.initial_data.get('bill_no')
                or ''
            ).strip()
            if bill_no:
                bill = PurchaseBill.objects.filter(owner=owner, bill_no=bill_no).first()
                if bill:
                    attrs['bill_no'] = bill_no
        return bill

    @transaction.atomic
    def create(self, validated):
        owner = data_owner(self.context['request'].user)
        validated['owner'] = owner
        amount = _dec(validated.get('amount'))
        if amount <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than 0'})
        validated['amount'] = amount

        if not validated.get('mode'):
            validated['mode'] = (
                self.initial_data.get('paymentMode')
                or self.initial_data.get('mode')
                or 'Cash'
            )

        bill = self._resolve_bill(owner, validated)
        validated['bill'] = bill
        if bill:
            validated.setdefault('bill_no', bill.bill_no)
            validated.setdefault('supplier_name', bill.supplier_name)

        payment = super().create(validated)

        if bill:
            bill = PurchaseBill.objects.select_for_update().get(pk=bill.pk)
            bill.paid = Decimal(str(bill.paid or 0)) + amount
            bill.balance = max(Decimal('0'), Decimal(str(bill.total or 0)) - bill.paid)
            bill.status = compute_bill_status(bill.balance, bill.paid)
            bill.save(update_fields=['paid', 'balance', 'status', 'updated_at'])

        return payment

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'billId': instance.bill_id or '',
            'billNo': instance.bill_no or (instance.bill.bill_no if instance.bill_id else ''),
            'supplierName': instance.supplier_name,
            'amount': float(instance.amount or 0),
            'mode': instance.mode,
            'paymentMode': instance.mode,
            'date': instance.date.isoformat() if instance.date else None,
            'notes': instance.notes,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }


class PurchaseReturnSerializer(serializers.ModelSerializer):
    billNo = serializers.CharField(source='bill_no', required=False, allow_blank=True)
    supplierName = serializers.CharField(source='supplier_name', required=False, allow_blank=True)
    billId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    gstType = serializers.CharField(source='gst_type', required=False)

    class Meta:
        model = PurchaseReturn
        fields = (
            'id', 'bill', 'billId', 'bill_no', 'billNo',
            'supplier_name', 'supplierName', 'amount',
            'gst_type', 'gstType', 'reason', 'date', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'bill': {'required': False, 'allow_null': True},
            'bill_no': {'required': False, 'allow_blank': True},
            'amount': {'required': True},
            'reason': {'required': False, 'allow_blank': True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['bill'].queryset = PurchaseBill.objects.filter(owner=owner)

    def _resolve_bill(self, owner, attrs):
        bill = attrs.get('bill')
        raw = (
            self.initial_data.get('billId')
            or self.initial_data.get('bill_id')
            or self.initial_data.get('bill')
        )
        if raw and not isinstance(raw, PurchaseBill):
            pk = str(raw).replace('pb_', '').replace('bill_', '')
            try:
                bill = PurchaseBill.objects.get(pk=pk, owner=owner)
            except (PurchaseBill.DoesNotExist, ValueError):
                raise serializers.ValidationError({'billId': 'Bill not found'})
        if not bill:
            bill_no = (
                attrs.get('bill_no')
                or self.initial_data.get('billNo')
                or self.initial_data.get('bill_no')
                or ''
            ).strip()
            if bill_no:
                bill = PurchaseBill.objects.filter(owner=owner, bill_no=bill_no).first()
                if bill:
                    attrs['bill_no'] = bill_no
        return bill

    @transaction.atomic
    def create(self, validated):
        owner = data_owner(self.context['request'].user)
        validated['owner'] = owner
        amount = _dec(validated.get('amount'))
        if amount <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than 0'})
        validated['amount'] = amount

        bill = self._resolve_bill(owner, validated)
        validated['bill'] = bill
        if bill:
            validated.setdefault('bill_no', bill.bill_no)
            validated.setdefault('supplier_name', bill.supplier_name)
            validated.setdefault('gst_type', bill.gst_type)

        ret = super().create(validated)

        if bill:
            bill = PurchaseBill.objects.select_for_update().get(pk=bill.pk)
            reduction = min(Decimal(str(bill.balance or 0)), amount)
            bill.balance = Decimal(str(bill.balance or 0)) - reduction
            # Keep paid + balance aligned with total after return credit
            bill.paid = max(Decimal('0'), Decimal(str(bill.total or 0)) - bill.balance)
            bill.status = compute_bill_status(bill.balance, bill.paid)
            bill.save(update_fields=['balance', 'paid', 'status', 'updated_at'])

        return ret

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'billId': instance.bill_id or '',
            'billNo': instance.bill_no or (instance.bill.bill_no if instance.bill_id else ''),
            'supplierName': instance.supplier_name,
            'amount': float(instance.amount or 0),
            'gstType': instance.gst_type,
            'reason': instance.reason,
            'date': instance.date.isoformat() if instance.date else None,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }
