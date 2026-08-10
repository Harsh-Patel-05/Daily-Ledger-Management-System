from accounts.ownership import data_owner
from rest_framework import viewsets
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
        return PurchaseBill.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('supplier', 'product')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        bill = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
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
        return PurchasePayment.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('bill')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        payment = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
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
        return PurchaseReturn.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('bill')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        ret = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
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
