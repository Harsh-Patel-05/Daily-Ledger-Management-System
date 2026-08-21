from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, assign_owner_company
from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters import rest_framework as filters
from notifications.models import ActivityLog
from .models import PurchaseBill, PurchasePayment, PurchaseReturn
from .serializers import (
    PurchaseBillSerializer,
    PurchasePaymentSerializer,
    PurchaseReturnSerializer,
)


class PurchaseBillFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    gstType = filters.CharFilter(field_name='gst_type')
    gst_type = filters.CharFilter(field_name='gst_type')

    class Meta:
        model = PurchaseBill
        fields = ['status', 'gstType', 'gst_type']


class PurchaseBillViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseBillSerializer
    filterset_class = PurchaseBillFilter
    search_fields = ['bill_no', 'supplier_name', 'notes', 'gst_type', 'status']
    ordering_fields = ['date', 'total', 'balance', 'created_at', 'bill_no']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return scope_queryset(
            PurchaseBill.objects.select_related('supplier', 'product').all(),
            self.request,
        )

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        bill = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='purchase',
            message=f'Purchase bill added: {bill.bill_no}',
        )

    def perform_destroy(self, instance):
        bill_no = instance.bill_no
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='purchase',
            message=f'Purchase bill deleted: {bill_no}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Purchase bill created successfully',
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
                'message': 'Purchase bill updated successfully',
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
                'message': 'Purchase bill deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class PurchasePaymentFilter(filters.FilterSet):
    bill = filters.NumberFilter(field_name='bill_id')
    billId = filters.NumberFilter(field_name='bill_id')

    class Meta:
        model = PurchasePayment
        fields = ['bill', 'billId']


class PurchasePaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PurchasePaymentSerializer
    filterset_class = PurchasePaymentFilter
    search_fields = ['bill_no', 'supplier_name', 'mode', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return scope_queryset(
            PurchasePayment.objects.select_related('bill').all(),
            self.request,
        )

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        payment = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='purchase',
            message=f'Purchase payment: {payment.amount} ({payment.bill_no or "—"})',
        )

    def perform_destroy(self, instance):
        owner = data_owner(self.request.user)
        label = instance.bill_no or str(instance.pk)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='purchase',
            message=f'Purchase payment deleted: {label}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Purchase payment created successfully',
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
                'message': 'Purchase payment updated successfully',
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
                'message': 'Purchase payment deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class PurchaseReturnFilter(filters.FilterSet):
    bill = filters.NumberFilter(field_name='bill_id')
    billId = filters.NumberFilter(field_name='bill_id')
    gstType = filters.CharFilter(field_name='gst_type')

    class Meta:
        model = PurchaseReturn
        fields = ['bill', 'billId', 'gstType']


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseReturnSerializer
    filterset_class = PurchaseReturnFilter
    search_fields = ['bill_no', 'supplier_name', 'reason', 'gst_type']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return scope_queryset(
            PurchaseReturn.objects.select_related('bill').all(),
            self.request,
        )

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        ret = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='purchase',
            message=f'Purchase return: {ret.amount} ({ret.bill_no or "—"})',
        )

    def perform_destroy(self, instance):
        owner = data_owner(self.request.user)
        label = instance.bill_no or str(instance.pk)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='purchase',
            message=f'Purchase return deleted: {label}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Purchase return created successfully',
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
                'message': 'Purchase return updated successfully',
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
                'message': 'Purchase return deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
