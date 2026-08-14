from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from accounts.ownership import data_owner
from .models import Invoice, SalesReturn
from .serializers import InvoiceSerializer, SalesReturnSerializer
from notifications.models import ActivityLog
from notifications.services import notify_invoice_created


class InvoiceFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    format = filters.CharFilter(field_name='format')
    gstType = filters.CharFilter(field_name='gst_type')
    gst_type = filters.CharFilter(field_name='gst_type')
    customer_id = filters.CharFilter(method='filter_customer')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Invoice
        fields = ['status', 'format', 'gstType', 'gst_type']

    def filter_customer(self, queryset, name, value):
        if str(value).startswith('cust_'):
            value = str(value).replace('cust_', '')
        return queryset.filter(customer_id=value)


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    search_fields = ['invoice_number', 'customer_name', 'customer_business', 'notes']
    ordering_fields = ['date', 'total', 'balance', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return Invoice.objects.filter(
            owner=data_owner(self.request.user)
        ).prefetch_related('items').select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('inv_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('inv_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        invoice = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
            type='invoice',
            message=f'Invoice created: {invoice.invoice_number}',
        )
        notify_invoice_created(owner, invoice)

    def perform_destroy(self, instance):
        from transactions.models import Transaction

        customer = instance.customer
        number = instance.invoice_number
        owner = data_owner(self.request.user)
        # Remove ledger rows created for this invoice so balance stays correct
        Transaction.objects.filter(owner=owner, invoice=instance).delete()
        instance.delete()
        if customer:
            customer.recalculate_balance()
        ActivityLog.objects.create(
            owner=owner,
            type='invoice',
            message=f'Invoice deleted: {number}',
        )

    @action(detail=False, methods=['get'], url_path='next-number')
    def next_number(self, request):
        prefix = 'INV'
        owner = data_owner(request.user)
        try:
            prefix = request.user.business.invoice_prefix or 'INV'
        except Exception:
            pass
        return Response({'invoiceNumber': Invoice.next_number(owner, prefix)})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        from datetime import date
        from .models import InvoiceItem

        owner = data_owner(request.user)
        prefix = 'INV'
        try:
            prefix = request.user.business.invoice_prefix or 'INV'
        except Exception:
            pass

        clone = Invoice.objects.create(
            owner=owner,
            customer=original.customer,
            invoice_number=Invoice.next_number(owner, prefix),
            date=date.today(),
            due_date=original.due_date,
            customer_name=original.customer_name,
            customer_business=original.customer_business,
            customer_address=original.customer_address,
            customer_gst=original.customer_gst,
            customer_mobile=original.customer_mobile,
            discount=original.discount,
            tax_rate=original.tax_rate,
            gst_type=original.gst_type,
            paid_amount=0,
            payment_method=original.payment_method,
            format=original.format,
            notes=original.notes,
            terms=original.terms,
        )
        for item in original.items.all():
            InvoiceItem.objects.create(
                invoice=clone,
                description=item.description,
                hsn=item.hsn,
                quantity=item.quantity,
                rate=item.rate,
                sort_order=item.sort_order,
            )
        clone.recalculate_totals()
        return Response(InvoiceSerializer(clone, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """Mark invoice fully paid and sync a payment transaction to the ledger."""
        from datetime import date as date_cls
        from decimal import Decimal
        from transactions.models import Transaction

        invoice = self.get_object()
        owner = data_owner(request.user)
        remaining = Decimal(str(invoice.balance or 0))
        method = (
            request.data.get('method')
            or request.data.get('paymentMethod')
            or invoice.payment_method
            or 'Cash'
        )
        if method == 'Credit':
            method = 'Cash'

        if remaining > 0:
            Transaction.objects.create(
                owner=owner,
                customer=invoice.customer,
                date=date_cls.today(),
                type=Transaction.Type.PAYMENT,
                item_description=f'Payment against {invoice.invoice_number}',
                quantity=1,
                rate=remaining,
                amount=remaining,
                notes=request.data.get('notes') or f'Marked paid — {invoice.invoice_number}',
                payment_method=method,
                invoice=invoice,
            )
            invoice.paid_amount = invoice.total
            invoice.recalculate_totals()
            if invoice.customer:
                invoice.customer.recalculate_balance()
            ActivityLog.objects.create(
                owner=owner,
                type='payment',
                message=f'Invoice marked paid: {invoice.invoice_number} · ₹{remaining}',
            )
        else:
            invoice.paid_amount = invoice.total
            invoice.recalculate_totals()

        return Response(InvoiceSerializer(invoice, context={'request': request}).data)


class SalesReturnViewSet(viewsets.ModelViewSet):
    serializer_class = SalesReturnSerializer
    search_fields = ['reason', 'customer__name', 'invoice__invoice_number']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    http_method_names = ['get', 'post', 'head', 'options', 'delete']

    def get_queryset(self):
        return SalesReturn.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('customer', 'invoice')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        sales_return = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
            type='return',
            message=f'Sales return: {sales_return.customer.name} · ₹{sales_return.amount}',
        )

    def perform_destroy(self, instance):
        from transactions.models import Transaction

        owner = data_owner(self.request.user)
        customer = instance.customer
        amount = instance.amount
        name = customer.name if customer else ''
        # Best-effort: remove matching return transaction for this invoice/date/amount
        qs = Transaction.objects.filter(
            owner=owner,
            customer=customer,
            type=Transaction.Type.RETURN,
            date=instance.date,
            amount=instance.amount,
        )
        if instance.invoice_id:
            qs = qs.filter(invoice_id=instance.invoice_id)
        tx = qs.first()
        if tx:
            tx.delete()
        instance.delete()
        if customer:
            customer.recalculate_balance()
        ActivityLog.objects.create(
            owner=owner,
            type='return',
            message=f'Sales return deleted: {name} · ₹{amount}',
        )
