from rest_framework import status, viewsets
from rest_framework.response import Response
from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, assign_owner_company
from notifications.models import ActivityLog
from .models import OpeningBalance
from .serializers import OpeningBalanceSerializer


class OpeningBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = OpeningBalanceSerializer
    search_fields = ['party_name', 'party_type']
    ordering_fields = ['as_of', 'amount', 'created_at']
    ordering = ['-as_of', '-created_at']

    def get_queryset(self):
        return scope_queryset(
            OpeningBalance.objects.select_related('customer').all(),
            self.request,
        )

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        ob = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='ledger',
            message=f'Opening balance: {ob.party_name} · {ob.type} ₹{ob.amount}',
        )

    def perform_destroy(self, instance):
        name = instance.party_name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='ledger',
            message=f'Opening balance deleted: {name}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Opening balance added successfully',
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
                'message': 'Opening balance updated successfully',
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
                'message': 'Opening balance deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
