from rest_framework import serializers
from customers.models import Customer
from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ('id', 'description', 'hsn', 'quantity', 'rate', 'amount', 'sort_order')
        read_only_fields = ('id', 'amount')


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
            self.fields['customer'].queryset = Customer.objects.filter(owner=request.user)

    def _resolve_customer(self, raw_id):
        if not raw_id:
            raise serializers.ValidationError({'customerId': 'Customer is required'})
        pk = str(raw_id).replace('cust_', '')
        try:
            return Customer.objects.get(pk=pk, owner=self.context['request'].user)
        except (Customer.DoesNotExist, ValueError):
            raise serializers.ValidationError({'customerId': 'Customer not found'})

    def create(self, validated):
        request = self.context['request']
        raw = self.initial_data.get('customerId') or self.initial_data.get('customer_id')
        customer = self._resolve_customer(raw) if raw else validated.get('customer')
        if not customer:
            raise serializers.ValidationError({'customerId': 'Customer is required'})

        items_data = validated.pop('items', None)
        if items_data is None:
            items_data = self.initial_data.get('items') or []

        prefix = 'INV'
        try:
            prefix = request.user.business.invoice_prefix or 'INV'
        except Exception:
            pass

        requested = validated.get('invoice_number')
        if requested and not Invoice.objects.filter(
            owner=request.user, invoice_number=requested
        ).exists():
            invoice_number = requested
        else:
            invoice_number = Invoice.next_number(request.user, prefix)

        invoice = Invoice.objects.create(
            owner=request.user,
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
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=item.get('description') or item.get('itemDescription') or 'Item',
                    hsn=item.get('hsn', ''),
                    quantity=item.get('quantity') or 1,
                    rate=item.get('rate') or 0,
                    sort_order=item.get('sort_order', idx),
                )

        invoice.recalculate_totals()

        # Sync credit sale to ledger when payment method is Credit
        if invoice.payment_method == Invoice.PaymentMethod.CREDIT and invoice.balance > 0:
            from transactions.models import Transaction
            Transaction.objects.create(
                owner=request.user,
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
