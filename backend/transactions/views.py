from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Sum
from accounts.ownership import data_owner
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
        return Transaction.objects.filter(owner=data_owner(self.request.user)).select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('txn_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('txn_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        tx = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
            type='transaction',
            message=f'Transaction: {tx.type} ₹{tx.amount}',
        )
        notify_credit_transaction(owner, tx)

    def perform_destroy(self, instance):
        customer = instance.customer
        instance.delete()
        if customer:
            customer.recalculate_balance()

    @action(detail=False, methods=['post'], url_path='record-payment')
    def record_payment(self, request):
        """Record a payment against a customer (and optional invoice)."""
        owner = data_owner(request.user)
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
            customer = Customer.objects.get(pk=pk, owner=owner)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

        from datetime import date as date_cls
        from invoices.models import Invoice

        tx = Transaction.objects.create(
            owner=owner,
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
                invoice = Invoice.objects.get(pk=inv_pk, owner=owner)
                invoice.paid_amount = (invoice.paid_amount or 0) + float(amount)
                invoice.recalculate_totals()
                tx.invoice = invoice
                tx.save(update_fields=['invoice'])
            except Invoice.DoesNotExist:
                pass

        customer.recalculate_balance()
        ActivityLog.objects.create(
            owner=owner,
            type='payment',
            message=f'Payment recorded: ₹{amount}',
        )
        return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Day / period summary for Roj Mel (credit, collection, expense, by method)."""
        qs = self.filter_queryset(self.get_queryset())
        date = request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)

        by_type = {}
        for t in Transaction.Type.values:
            by_type[t] = float(qs.filter(type=t).aggregate(s=Sum('amount'))['s'] or 0)

        by_method = {}
        payments = qs.filter(type=Transaction.Type.PAYMENT)
        for m in Transaction.PaymentMethod.values:
            by_method[m] = float(payments.filter(payment_method=m).aggregate(s=Sum('amount'))['s'] or 0)

        return Response({
            'date': date,
            'count': qs.count(),
            'credit': by_type.get('credit', 0),
            'payment': by_type.get('payment', 0),
            'return': by_type.get('return', 0),
            'discount': by_type.get('discount', 0),
            'expense': by_type.get('expense', 0),
            'byType': by_type,
            'byMethod': by_method,
            'net': by_type.get('payment', 0) - by_type.get('expense', 0),
        })

    @action(detail=False, methods=['post'], url_path='day-close')
    def day_close(self, request):
        """Persist day-closing note + return today's ledger summary."""
        from datetime import date as date_cls

        owner = data_owner(request.user)
        date_str = request.data.get('date') or date_cls.today().isoformat()
        qs = self.get_queryset().filter(date=date_str)

        by_type = {}
        for t in Transaction.Type.values:
            by_type[t] = float(qs.filter(type=t).aggregate(s=Sum('amount'))['s'] or 0)

        by_method = {}
        payments = qs.filter(type=Transaction.Type.PAYMENT)
        for m in Transaction.PaymentMethod.values:
            by_method[m] = float(payments.filter(payment_method=m).aggregate(s=Sum('amount'))['s'] or 0)

        net = by_type.get('payment', 0) - by_type.get('expense', 0)
        note = (
            request.data.get('message')
            or (
                f'Day closing {date_str} · Collection ₹{by_type.get("payment", 0):.0f} · '
                f'Credit ₹{by_type.get("credit", 0):.0f} · Expense ₹{by_type.get("expense", 0):.0f}'
            )
        )
        activity = ActivityLog.objects.create(
            owner=owner,
            type='day_close',
            message=note[:255],
        )

        return Response({
            'date': date_str,
            'count': qs.count(),
            'byType': by_type,
            'byMethod': by_method,
            'credit': by_type.get('credit', 0),
            'payment': by_type.get('payment', 0),
            'expense': by_type.get('expense', 0),
            'return': by_type.get('return', 0),
            'discount': by_type.get('discount', 0),
            'net': net,
            'activity': {
                'id': activity.pk,
                'type': activity.type,
                'message': activity.message,
                'createdAt': activity.created_at.isoformat(),
            },
        }, status=status.HTTP_201_CREATED)
