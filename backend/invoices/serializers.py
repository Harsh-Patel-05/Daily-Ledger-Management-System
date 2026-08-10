from rest_framework import serializers
from accounts.ownership import data_owner
from customers.models import Customer
from .models import Invoice, InvoiceItem, SalesReturn


class InvoiceItemSerializer(serializers.ModelSerializer):
    productId = serializers.CharField(source='product_id', required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = InvoiceItem
        fields = ('id', 'product', 'productId', 'description', 'hsn', 'quantity', 'rate', 'amount', 'sort_order')
        read_only_fields = ('id', 'amount')
        extra_kwargs = {'product': {'required': False, 'allow_null': True}}


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)
    customerId = serializers.CharField(write_only=True, required=False)
    customer_id = serializers.CharField(write_only=True, required=False)
    invoiceNumber = serializers.CharField(source='invoice_number', required=False)
    dueDate = serializers.DateField(source='due_date', required=False, allow_null=True)
    taxRate = serializers.DecimalField(
        source='tax_rate', max_digits=5, decimal_places=2, required=False
    )
    paidAmount = serializers.DecimalField(
        source='paid_amount', max_digits=12, decimal_places=2, required=False
    )
    paymentMethod = serializers.CharField(source='payment_method', required=False)

    class Meta:
        model = Invoice
        fields = (
            'id', 'customer', 'customerId', 'customer_id',
            'invoice_number', 'invoiceNumber', 'date', 'due_date', 'dueDate',
            'customer_name', 'customer_business', 'customer_address',
            'customer_gst', 'customer_mobile',
            'subtotal', 'discount', 'tax_rate', 'taxRate', 'tax_amount',
            'total', 'paid_amount', 'paidAmount', 'balance',
            'payment_method', 'paymentMethod', 'status', 'format',
            'notes', 'terms', 'items', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'customer_name', 'customer_business', 'customer_address',
            'customer_gst', 'customer_mobile', 'subtotal', 'tax_amount',
            'total', 'balance', 'status', 'created_at', 'updated_at',
        )
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'due_date': {'required': False, 'allow_null': True},
            'invoice_number': {'required': False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            self.fields['customer'].queryset = Customer.objects.filter(
                owner=data_owner(request.user)
            )

    def _resolve_customer(self, raw_id):
        if not raw_id:
            raise serializers.ValidationError({'customerId': 'Customer is required'})
        pk = str(raw_id).replace('cust_', '')
        owner = data_owner(self.context['request'].user)
        try:
            return Customer.objects.get(pk=pk, owner=owner)
        except (Customer.DoesNotExist, ValueError):
            raise serializers.ValidationError({'customerId': 'Customer not found'})

    def create(self, validated):
        from django.db import transaction
        from django.core.exceptions import ValidationError as DjangoValidationError

        with transaction.atomic():
            request = self.context['request']
            owner = data_owner(request.user)
            raw = self.initial_data.get('customerId') or self.initial_data.get('customer_id')
            customer = self._resolve_customer(raw) if raw else validated.get('customer')
            if not customer:
                raise serializers.ValidationError({'customerId': 'Customer is required'})

            items_data = validated.pop('items', None)
            if items_data is None:
                items_data = self.initial_data.get('items') or []

            # Validate stock up-front so we never create a half invoice
            try:
                from inventory.services import plan_stock_deductions
                plan_stock_deductions(owner=owner, items=items_data)
            except DjangoValidationError as exc:
                msg = exc.messages[0] if getattr(exc, 'messages', None) else str(exc)
                raise serializers.ValidationError({'items': msg})

            prefix = 'INV'
            try:
                prefix = request.user.business.invoice_prefix or 'INV'
            except Exception:
                pass

            requested = validated.get('invoice_number')
            if requested and not Invoice.objects.filter(
                owner=owner, invoice_number=requested
            ).exists():
                invoice_number = requested
            else:
                invoice_number = Invoice.next_number(owner, prefix)

            invoice = Invoice.objects.create(
                owner=owner,
                customer=customer,
                invoice_number=invoice_number,
                date=validated['date'],
                due_date=validated.get('due_date'),
                customer_name=customer.name,
                customer_business=customer.business_name,
                customer_address=customer.address,
                customer_gst=customer.gst,
                customer_mobile=customer.mobile,
                discount=validated.get('discount') or 0,
                tax_rate=validated.get('tax_rate') if validated.get('tax_rate') is not None else 18,
                paid_amount=validated.get('paid_amount') or 0,
                payment_method=validated.get('payment_method') or Invoice.PaymentMethod.CREDIT,
                format=validated.get('format') or Invoice.Format.CLASSIC,
                notes=validated.get('notes', ''),
                terms=validated.get('terms', ''),
            )

            for idx, item in enumerate(items_data):
                if isinstance(item, dict):
                    product = None
                    raw_prod = item.get('productId') or item.get('product_id') or item.get('product')
                    if raw_prod not in (None, '', 'null'):
                        from inventory.models import Product
                        pk = str(getattr(raw_prod, 'pk', raw_prod)).replace('prod_', '')
                        try:
                            product = Product.objects.get(pk=pk, owner=owner)
                        except (Product.DoesNotExist, ValueError):
                            raise serializers.ValidationError({
                                'items': f'Product not found for line: {item.get("description") or pk}'
                            })
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        description=item.get('description') or item.get('itemDescription') or 'Item',
                        hsn=item.get('hsn', '') or (product.hsn if product else ''),
                        quantity=item.get('quantity') or 1,
                        rate=item.get('rate') or 0,
                        sort_order=item.get('sort_order', idx),
                    )

            invoice.recalculate_totals()

            try:
                from inventory.services import deduct_stock_for_invoice_items
                deduct_stock_for_invoice_items(
                    owner=owner,
                    items=items_data,
                    invoice_number=invoice.invoice_number,
                    date=invoice.date,
                )
            except DjangoValidationError as exc:
                msg = exc.messages[0] if getattr(exc, 'messages', None) else str(exc)
                raise serializers.ValidationError({'items': msg})

            if invoice.payment_method == Invoice.PaymentMethod.CREDIT and invoice.balance > 0:
                from transactions.models import Transaction
                Transaction.objects.create(
                    owner=owner,
                    customer=customer,
                    date=invoice.date,
                    type=Transaction.Type.CREDIT,
                    item_description=f'Invoice {invoice.invoice_number}',
                    quantity=1,
                    rate=invoice.balance,
                    amount=invoice.balance,
                    notes=f'Auto from invoice {invoice.invoice_number}',
                    payment_method=Transaction.PaymentMethod.CREDIT,
                    invoice=invoice,
                )
                customer.recalculate_balance()

            return invoice

    def update(self, instance, validated):
        items_data = validated.pop('items', None)
        if items_data is None and 'items' in self.initial_data:
            items_data = self.initial_data.get('items')

        for attr in ('date', 'due_date', 'discount', 'tax_rate', 'paid_amount',
                     'payment_method', 'format', 'notes', 'terms'):
            if attr in validated:
                setattr(instance, attr, validated[attr])
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for idx, item in enumerate(items_data):
                if isinstance(item, dict):
                    InvoiceItem.objects.create(
                        invoice=instance,
                        description=item.get('description') or 'Item',
                        hsn=item.get('hsn', ''),
                        quantity=item.get('quantity') or 1,
                        rate=item.get('rate') or 0,
                        sort_order=item.get('sort_order', idx),
                    )
            instance.recalculate_totals()

        return instance

    def to_representation(self, instance):
        items = [
            {
                'id': i.id,
                'productId': i.product_id or '',
                'description': i.description,
                'hsn': i.hsn,
                'quantity': float(i.quantity),
                'rate': float(i.rate),
                'amount': float(i.amount),
            }
            for i in instance.items.all()
        ]
        return {
            'id': instance.pk,
            'invoiceNumber': instance.invoice_number,
            'date': instance.date.isoformat() if instance.date else None,
            'dueDate': instance.due_date.isoformat() if instance.due_date else None,
            'customerId': instance.customer_id,
            'customerName': instance.customer_name,
            'customerBusiness': instance.customer_business,
            'customerAddress': instance.customer_address,
            'customerGst': instance.customer_gst,
            'customerMobile': instance.customer_mobile,
            'items': items,
            'subtotal': float(instance.subtotal),
            'discount': float(instance.discount),
            'taxRate': float(instance.tax_rate),
            'taxAmount': float(instance.tax_amount),
            'total': float(instance.total),
            'paidAmount': float(instance.paid_amount),
            'balance': float(instance.balance),
            'paymentMethod': instance.payment_method,
            'status': instance.status,
            'format': instance.format,
            'notes': instance.notes,
            'terms': instance.terms,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }


class SalesReturnSerializer(serializers.ModelSerializer):
    customerId = serializers.CharField(write_only=True, required=False)
    invoiceId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    gstApplicable = serializers.BooleanField(source='gst_applicable', required=False)

    class Meta:
        model = SalesReturn
        fields = (
            'id', 'customer', 'customerId', 'invoice', 'invoiceId',
            'amount', 'date', 'reason', 'gst_applicable', 'gstApplicable', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
        extra_kwargs = {
            'customer': {'required': False},
            'invoice': {'required': False, 'allow_null': True},
            'gst_applicable': {'required': False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['customer'].queryset = Customer.objects.filter(owner=owner)
            self.fields['invoice'].queryset = Invoice.objects.filter(owner=owner)

    def validate(self, attrs):
        request = self.context['request']
        owner = data_owner(request.user)

        raw_customer = (
            self.initial_data.get('customerId')
            or self.initial_data.get('customer_id')
            or attrs.get('customer')
        )
        if not raw_customer and not self.instance:
            raise serializers.ValidationError({'customerId': 'Customer is required'})
        if raw_customer:
            pk = str(getattr(raw_customer, 'pk', raw_customer)).replace('cust_', '')
            try:
                attrs['customer'] = Customer.objects.get(pk=pk, owner=owner)
            except (Customer.DoesNotExist, ValueError):
                raise serializers.ValidationError({'customerId': 'Customer not found'})

        raw_invoice = self.initial_data.get('invoiceId', self.initial_data.get('invoice_id'))
        if 'invoiceId' in self.initial_data or 'invoice_id' in self.initial_data:
            if raw_invoice in (None, '', 'null'):
                attrs['invoice'] = None
            else:
                pk = str(raw_invoice).replace('inv_', '')
                try:
                    attrs['invoice'] = Invoice.objects.get(pk=pk, owner=owner)
                except (Invoice.DoesNotExist, ValueError):
                    raise serializers.ValidationError({'invoiceId': 'Invoice not found'})

        amount = attrs.get('amount')
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than 0'})

        return attrs

    def create(self, validated):
        from django.db import transaction
        from transactions.models import Transaction

        request = self.context['request']
        owner = data_owner(request.user)
        with transaction.atomic():
            sales_return = SalesReturn.objects.create(
                owner=owner,
                customer=validated['customer'],
                invoice=validated.get('invoice'),
                amount=validated['amount'],
                date=validated['date'],
                reason=validated.get('reason', ''),
                gst_applicable=validated.get('gst_applicable', False),
            )
            inv = sales_return.invoice
            desc = f'Sales return'
            if inv:
                desc = f'Sales return against {inv.invoice_number}'
            elif sales_return.reason:
                desc = f'Sales return: {sales_return.reason[:80]}'

            Transaction.objects.create(
                owner=owner,
                customer=sales_return.customer,
                date=sales_return.date,
                type=Transaction.Type.RETURN,
                item_description=desc,
                quantity=1,
                rate=sales_return.amount,
                amount=sales_return.amount,
                notes=sales_return.reason or 'Sales return',
                payment_method=Transaction.PaymentMethod.CREDIT,
                invoice=inv,
            )
            sales_return.customer.recalculate_balance()
            return sales_return

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'customerId': instance.customer_id,
            'customerName': instance.customer.name if instance.customer_id else '',
            'invoiceId': instance.invoice_id or '',
            'invoiceNumber': instance.invoice.invoice_number if instance.invoice_id else '',
            'amount': float(instance.amount or 0),
            'date': instance.date.isoformat() if instance.date else None,
            'reason': instance.reason,
            'gstApplicable': instance.gst_applicable,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }
