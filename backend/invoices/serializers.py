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
    gstType = serializers.CharField(source='gst_type', required=False)
    cgstAmount = serializers.DecimalField(
        source='cgst_amount', max_digits=12, decimal_places=2, required=False, read_only=True
    )
    sgstAmount = serializers.DecimalField(
        source='sgst_amount', max_digits=12, decimal_places=2, required=False, read_only=True
    )
    igstAmount = serializers.DecimalField(
        source='igst_amount', max_digits=12, decimal_places=2, required=False, read_only=True
    )
    placeOfSupply = serializers.CharField(
        source='place_of_supply', required=False, allow_blank=True
    )
    isInterstate = serializers.BooleanField(source='is_interstate', required=False)
    deliveryNote = serializers.CharField(source='delivery_note', required=False, allow_blank=True)
    referenceNo = serializers.CharField(source='reference_no', required=False, allow_blank=True)
    otherReferences = serializers.CharField(source='other_references', required=False, allow_blank=True)
    buyerOrderNo = serializers.CharField(source='buyer_order_no', required=False, allow_blank=True)
    buyerOrderDate = serializers.DateField(source='buyer_order_date', required=False, allow_null=True)
    dispatchDocNo = serializers.CharField(source='dispatch_doc_no', required=False, allow_blank=True)
    deliveryNoteDate = serializers.DateField(source='delivery_note_date', required=False, allow_null=True)
    dispatchedThrough = serializers.CharField(source='dispatched_through', required=False, allow_blank=True)
    destination = serializers.CharField(required=False, allow_blank=True)
    termsOfDelivery = serializers.CharField(source='terms_of_delivery', required=False, allow_blank=True)
    paymentTerms = serializers.CharField(source='payment_terms', required=False, allow_blank=True)

    class Meta:
        model = Invoice
        fields = (
            'id', 'customer', 'customerId', 'customer_id',
            'invoice_number', 'invoiceNumber', 'date', 'due_date', 'dueDate',
            'customer_name', 'customer_business', 'customer_address',
            'customer_gst', 'customer_mobile',
            'subtotal', 'discount', 'tax_rate', 'taxRate', 'tax_amount',
            'cgst_amount', 'cgstAmount', 'sgst_amount', 'sgstAmount',
            'igst_amount', 'igstAmount',
            'place_of_supply', 'placeOfSupply', 'is_interstate', 'isInterstate',
            'total', 'paid_amount', 'paidAmount', 'balance',
            'payment_method', 'paymentMethod', 'gst_type', 'gstType', 'status', 'format',
            'notes', 'terms',
            'delivery_note', 'deliveryNote', 'reference_no', 'referenceNo',
            'other_references', 'otherReferences',
            'buyer_order_no', 'buyerOrderNo', 'buyer_order_date', 'buyerOrderDate',
            'dispatch_doc_no', 'dispatchDocNo',
            'delivery_note_date', 'deliveryNoteDate',
            'dispatched_through', 'dispatchedThrough',
            'destination', 'terms_of_delivery', 'termsOfDelivery',
            'payment_terms', 'paymentTerms',
            'items', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'customer_name', 'customer_business', 'customer_address',
            'customer_gst', 'customer_mobile', 'subtotal', 'tax_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount',
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

            gst_type = validated.get('gst_type') or Invoice.GstType.GST
            if gst_type not in (Invoice.GstType.GST, Invoice.GstType.NON_GST):
                gst_type = Invoice.GstType.GST
            tax_rate = validated.get('tax_rate')
            if gst_type == Invoice.GstType.NON_GST:
                tax_rate = 0
            elif tax_rate is None:
                tax_rate = 18

            from companies.company_scope import get_active_company
            company = get_active_company(request)

            def _gst_code(gstin='', state_code=''):
                g = (gstin or '').strip().upper()
                if len(g) >= 2 and g[:2].isdigit():
                    return g[:2]
                sc = (state_code or '').strip()
                if sc.isdigit():
                    return sc.zfill(2)[:2]
                return ''

            def _norm_state(name=''):
                s = (name or '').strip().upper().replace('  ', ' ')
                if not s:
                    return ''
                if s in ('MP',) or 'MADHYA' in s:
                    return 'MADHYA PRADESH'
                if s in ('GJ',) or 'GUJARAT' in s:
                    return 'GUJARAT'
                return s

            company_gstin = (company.gstin if company else '') or ''
            company_code = _gst_code(company_gstin, '')
            party_code = _gst_code(
                customer.gst or '',
                getattr(customer, 'state_code', '') or '',
            )
            if company_code and party_code:
                interstate = company_code != party_code
            else:
                company_state = _norm_state(company.state if company else '')
                party_state = _norm_state(customer.state or '')
                interstate = bool(
                    company_state and party_state and company_state != party_state
                )
            if 'is_interstate' in validated:
                interstate = bool(validated.get('is_interstate'))
            place = (
                validated.get('place_of_supply')
                or (customer.state or '')
                or (company.state if company else '')
                or ''
            )

            dest = (
                validated.get('destination')
                or ''
            )
            if not dest:
                # derive from shipping / address city fragment
                ship = (getattr(customer, 'shipping_address', '') or '').strip()
                addr = (customer.address or '').strip()
                for raw in (ship, addr):
                    bits = [b.strip() for b in raw.split(',') if b.strip()]
                    for bit in reversed(bits):
                        if bit.upper() not in ('MP', 'GJ', 'MH', 'DL', 'INDIA') and not bit.isdigit() and len(bit) > 2:
                            dest = bit
                            break
                    if dest:
                        break

            invoice = Invoice.objects.create(
                owner=owner,
                company=company,
                customer=customer,
                invoice_number=invoice_number,
                date=validated['date'],
                due_date=validated.get('due_date'),
                customer_name=customer.name,
                customer_business=customer.business_name,
                customer_address=customer.address or customer.billing_address or '',
                customer_gst=customer.gst if gst_type == Invoice.GstType.GST else '',
                customer_mobile=customer.mobile,
                discount=validated.get('discount') or 0,
                tax_rate=tax_rate,
                gst_type=gst_type,
                place_of_supply=place,
                is_interstate=interstate,
                paid_amount=validated.get('paid_amount') or 0,
                payment_method=validated.get('payment_method') or Invoice.PaymentMethod.CREDIT,
                format=validated.get('format') or Invoice.Format.CLASSIC,
                notes=validated.get('notes', ''),
                terms=validated.get('terms', ''),
                delivery_note=validated.get('delivery_note') or '',
                reference_no=validated.get('reference_no') or '',
                other_references=validated.get('other_references') or '',
                buyer_order_no=validated.get('buyer_order_no') or '',
                buyer_order_date=validated.get('buyer_order_date'),
                dispatch_doc_no=validated.get('dispatch_doc_no') or '',
                delivery_note_date=validated.get('delivery_note_date'),
                dispatched_through=validated.get('dispatched_through') or '',
                destination=dest,
                terms_of_delivery=validated.get('terms_of_delivery') or '',
                payment_terms=validated.get('payment_terms') or '',
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
                        hsn=item.get('hsn', ''),
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

        for attr in (
            'date', 'due_date', 'discount', 'tax_rate', 'paid_amount',
            'payment_method', 'gst_type', 'format', 'notes', 'terms',
            'place_of_supply', 'is_interstate',
            'delivery_note', 'reference_no', 'other_references',
            'buyer_order_no', 'buyer_order_date', 'dispatch_doc_no',
            'delivery_note_date', 'dispatched_through', 'destination',
            'terms_of_delivery', 'payment_terms',
        ):
            if attr in validated:
                setattr(instance, attr, validated[attr])
        if instance.gst_type == Invoice.GstType.NON_GST:
            instance.tax_rate = 0
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
            'customerState': getattr(instance.customer, 'state', '') or instance.place_of_supply or '',
            'customerStateCode': getattr(instance.customer, 'state_code', '') or '',
            'customerPincode': getattr(instance.customer, 'pincode', '') or '',
            'customerShippingAddress': getattr(instance.customer, 'shipping_address', '') or '',
            'items': items,
            'subtotal': float(instance.subtotal),
            'discount': float(instance.discount),
            'taxRate': float(instance.tax_rate),
            'taxAmount': float(instance.tax_amount),
            'cgstAmount': float(instance.cgst_amount or 0),
            'sgstAmount': float(instance.sgst_amount or 0),
            'igstAmount': float(instance.igst_amount or 0),
            'placeOfSupply': instance.place_of_supply or '',
            'isInterstate': bool(instance.is_interstate),
            'total': float(instance.total),
            'paidAmount': float(instance.paid_amount),
            'balance': float(instance.balance),
            'paymentMethod': instance.payment_method,
            'paymentTerms': instance.payment_terms or '',
            'gstType': instance.gst_type,
            'status': instance.status,
            'format': instance.format,
            'notes': instance.notes or '',
            'terms': instance.terms or '',
            'deliveryNote': instance.delivery_note or '',
            'referenceNo': instance.reference_no or '',
            'otherReferences': instance.other_references or '',
            'buyerOrderNo': instance.buyer_order_no or '',
            'buyerOrderDate': instance.buyer_order_date.isoformat() if instance.buyer_order_date else None,
            'dispatchDocNo': instance.dispatch_doc_no or '',
            'deliveryNoteDate': instance.delivery_note_date.isoformat() if instance.delivery_note_date else None,
            'dispatchedThrough': instance.dispatched_through or '',
            'destination': instance.destination or '',
            'termsOfDelivery': instance.terms_of_delivery or '',
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
            'updatedAt': instance.updated_at.isoformat() if instance.updated_at else None,
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
