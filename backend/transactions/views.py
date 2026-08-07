from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Sum
from .models import Transaction
from .serializers import TransactionSerializer
from customers.models import Customer
from notifications.models import ActivityLog
from notifications.services import notify_credit_transaction


class TransactionFilter(filters.FilterSet):
    type = filters.CharFilter(field_name='type')
    customer = filters.NumberFilter(field_name='customer_id')
    customer_id = filters.CharFilter(method='filter_customer')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')
    min_amount = filters.NumberFilter(field_name='amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='amount', lookup_expr='lte')

    class Meta:
        model = Transaction
        fields = ['type']

    def filter_customer(self, queryset, name, value):
        if value.startswith('cust_'):
            value = value.replace('cust_', '')
        return queryset.filter(customer_id=value)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    search_fields = ['item_description', 'notes', 'customer__name', 'payment_method']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return Transaction.objects.filter(owner=self.request.user).select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('txn_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('txn_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        tx = serializer.save()
        ActivityLog.objects.create(
            owner=self.request.user,
            type='transaction',
            message=f'Transaction: {tx.type} ₹{tx.amount}',
        )
        notify_credit_transaction(self.request.user, tx)

    def perform_destroy(self, instance):
        customer = instance.customer
        instance.delete()
        if customer:
            customer.recalculate_balance()

    @action(detail=False, methods=['post'], url_path='record-payment')
    def record_payment(self, request):
        """Record a payment against a customer (and optional invoice)."""
        customer_raw = request.data.get('customerId') or request.data.get('customer_id')
        amount = request.data.get('amount')
        method = request.data.get('method') or request.data.get('paymentMethod') or 'Cash'
        date = request.data.get('date')
        notes = request.data.get('notes', '')
        invoice_id = request.data.get('invoiceId') or request.data.get('invoice_id')

        if not customer_raw or not amount:
            return Response({'detail': 'customerId and amount required'}, status=status.HTTP_400_BAD_REQUEST)

        pk = str(customer_raw).replace('cust_', '')
        try:
            customer = Customer.objects.get(pk=pk, owner=request.user)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

        from datetime import date as date_cls
        from invoices.models import Invoice

        tx = Transaction.objects.create(
            owner=request.user,
            customer=customer,
            date=date or date_cls.today(),
            type=Transaction.Type.PAYMENT,
            item_description='Payment received' if not invoice_id else 'Payment against invoice',
            quantity=1,
            rate=amount,
            amount=amount,
            notes=notes,
            payment_method=method,
        )

        if invoice_id:
            inv_pk = str(invoice_id).replace('inv_', '')
            try:
                invoice = Invoice.objects.get(pk=inv_pk, owner=request.user)
                invoice.paid_amount = (invoice.paid_amount or 0) + float(amount)
                invoice.recalculate_totals()
                tx.invoice = invoice
                tx.save(update_fields=['invoice'])
            except Invoice.DoesNotExist:
                pass

        customer.recalculate_balance()
        ActivityLog.objects.create(
            owner=request.user,
            type='payment',
            message=f'Payment recorded: ₹{amount}',
        )
        return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        credit = qs.filter(type='credit').aggregate(t=Sum('amount'))['t'] or 0
        payment = qs.filter(type='payment').aggregate(t=Sum('amount'))['t'] or 0
        return Response({
            'count': qs.count(),
            'credit': float(credit),
            'payment': float(payment),
        })
