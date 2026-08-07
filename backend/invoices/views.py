from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from .models import Invoice
from .serializers import InvoiceSerializer
from notifications.models import ActivityLog
from notifications.services import notify_invoice_created


class InvoiceFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    format = filters.CharFilter(field_name='format')
    customer_id = filters.CharFilter(method='filter_customer')
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Invoice
        fields = ['status', 'format']

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
        return Invoice.objects.filter(owner=self.request.user).prefetch_related('items').select_related('customer')

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('inv_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('inv_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        invoice = serializer.save()
        ActivityLog.objects.create(
            owner=self.request.user,
            type='invoice',
            message=f'Invoice created: {invoice.invoice_number}',
        )
        notify_invoice_created(self.request.user, invoice)

    def perform_destroy(self, instance):
        customer = instance.customer
        number = instance.invoice_number
        instance.delete()
        if customer:
            customer.recalculate_balance()
        ActivityLog.objects.create(
            owner=self.request.user,
            type='invoice',
            message=f'Invoice deleted: {number}',
        )

    @action(detail=False, methods=['get'], url_path='next-number')
    def next_number(self, request):
        prefix = 'INV'
        try:
            prefix = request.user.business.invoice_prefix or 'INV'
        except Exception:
            pass
        return Response({'invoiceNumber': Invoice.next_number(request.user, prefix)})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        from datetime import date
        from .models import InvoiceItem

        prefix = 'INV'
        try:
            prefix = request.user.business.invoice_prefix or 'INV'
        except Exception:
            pass

        clone = Invoice.objects.create(
            owner=request.user,
            customer=original.customer,
            invoice_number=Invoice.next_number(request.user, prefix),
            date=date.today(),
            due_date=original.due_date,
            customer_name=original.customer_name,
            customer_business=original.customer_business,
            customer_address=original.customer_address,
            customer_gst=original.customer_gst,
            customer_mobile=original.customer_mobile,
            discount=original.discount,
            tax_rate=original.tax_rate,
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
        invoice = self.get_object()
        invoice.paid_amount = invoice.total
        invoice.recalculate_totals()
        return Response(InvoiceSerializer(invoice, context={'request': request}).data)
