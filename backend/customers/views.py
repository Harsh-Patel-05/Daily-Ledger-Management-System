from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from .models import Customer
from .serializers import CustomerSerializer
from notifications.models import ActivityLog


class CustomerFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    min_balance = filters.NumberFilter(field_name='current_balance', lookup_expr='gte')
    max_balance = filters.NumberFilter(field_name='current_balance', lookup_expr='lte')

    class Meta:
        model = Customer
        fields = ['status']


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    filterset_class = CustomerFilter
    search_fields = ['name', 'mobile', 'business_name', 'gst', 'email']
    ordering_fields = ['name', 'current_balance', 'last_transaction', 'created_at', 'credit_limit']
    ordering = ['name']

    def get_queryset(self):
        return Customer.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        customer = serializer.save(owner=self.request.user)
        ActivityLog.objects.create(
            owner=self.request.user,
            type='customer',
            message=f'Customer added: {customer.name}',
        )

    def perform_update(self, serializer):
        customer = serializer.save()
        ActivityLog.objects.create(
            owner=self.request.user,
            type='customer',
            message=f'Customer updated: {customer.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        ActivityLog.objects.create(
            owner=self.request.user,
            type='customer',
            message=f'Customer deleted: {name}',
        )

    def retrieve(self, request, *args, **kwargs):
        # support cust_123 style ids from frontend
        return super().retrieve(request, *args, **kwargs)

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('cust_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('cust_', ''))
            except ValueError:
                pass
        return super().get_object()

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        customer = self.get_object()
        customer.recalculate_balance()
        return Response(CustomerSerializer(customer, context={'request': request}).data)
