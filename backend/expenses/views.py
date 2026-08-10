from accounts.ownership import data_owner
from rest_framework import viewsets
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
        return ExpenseCategory.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        cat = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
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
        return Expense.objects.filter(
            owner=data_owner(self.request.user)
        ).select_related('category')

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        expense = serializer.save()
        ActivityLog.objects.create(
            owner=owner,
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
