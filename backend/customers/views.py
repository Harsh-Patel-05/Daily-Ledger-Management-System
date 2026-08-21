from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, assign_owner_company
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
        return scope_queryset(Customer.objects.all(), self.request)

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        customer = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='customer',
            message=f'Customer added: {customer.name}',
        )

    def perform_update(self, serializer):
        customer = serializer.save()
        ActivityLog.objects.create(
            owner=data_owner(self.request.user),
            type='customer',
            message=f'Customer updated: {customer.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Customer created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Customer updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Customer deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
