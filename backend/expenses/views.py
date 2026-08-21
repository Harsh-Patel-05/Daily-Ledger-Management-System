from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, assign_owner_company
from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters import rest_framework as filters
from notifications.models import ActivityLog
from .models import ExpenseCategory, Expense
from .serializers import ExpenseCategorySerializer, ExpenseSerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return scope_queryset(ExpenseCategory.objects.all(), self.request)

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        cat = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='expense',
            message=f'Expense category added: {cat.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.expenses.update(category=None)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='expense',
            message=f'Expense category deleted: {name}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Expense category created successfully',
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
                'message': 'Expense category updated successfully',
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
                'message': 'Expense category deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ExpenseFilter(filters.FilterSet):
    gstType = filters.CharFilter(field_name='gst_type')
    gst_type = filters.CharFilter(field_name='gst_type')
    category = filters.NumberFilter(field_name='category_id')
    categoryId = filters.NumberFilter(field_name='category_id')

    class Meta:
        model = Expense
        fields = ['gstType', 'gst_type', 'category', 'categoryId']


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    filterset_class = ExpenseFilter
    search_fields = ['category_name', 'notes', 'payment_mode']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return scope_queryset(
            Expense.objects.select_related('category').all(),
            self.request,
        )

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        expense = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='expense',
            message=f'Expense added: {expense.category_name or "Expense"} ({expense.amount})',
        )

    def perform_destroy(self, instance):
        owner = data_owner(self.request.user)
        label = instance.category_name or str(instance.pk)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='expense',
            message=f'Expense deleted: {label}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Expense created successfully',
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
                'message': 'Expense updated successfully',
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
                'message': 'Expense deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
