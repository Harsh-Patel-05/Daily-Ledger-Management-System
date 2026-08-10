from decimal import Decimal
from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters import rest_framework as filters
from accounts.ownership import data_owner
from notifications.models import ActivityLog
from .models import Category, Unit, Supplier, Product, StockMovement
from .serializers import (
    CategorySerializer,
    UnitSerializer,
    SupplierSerializer,
    ProductSerializer,
    StockMovementSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Category.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        cat = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Category added: {cat.name}',
        )

    def perform_destroy(self, instance):
        if instance.products.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Category is used by products. Reassign them first.')
        name = instance.name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Category deleted: {name}',
        )


class UnitViewSet(viewsets.ModelViewSet):
    serializer_class = UnitSerializer
    search_fields = ['name', 'short_name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Unit.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        unit = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Unit added: {unit.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Unit deleted: {name}',
        )


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    search_fields = ['name', 'contact_person', 'mobile', 'email', 'gst']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Supplier.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        sup = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Supplier added: {sup.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.products.update(supplier=None)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Supplier deleted: {name}',
        )


class ProductFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    category = filters.NumberFilter(field_name='category_id')
    categoryId = filters.NumberFilter(field_name='category_id')
    supplier = filters.NumberFilter(field_name='supplier_id')
    supplierId = filters.NumberFilter(field_name='supplier_id')
    stock = filters.CharFilter(method='filter_stock')

    class Meta:
        model = Product
        fields = ['status', 'category', 'categoryId', 'supplier', 'supplierId']

    def filter_stock(self, queryset, name, value):
        if value == 'low':
            return queryset.filter(stock_qty__gt=0, stock_qty__lte=F('reorder_level')).exclude(
                status=Product.Status.DISCONTINUED
            )
        if value == 'out':
            return queryset.filter(stock_qty__lte=0).exclude(status=Product.Status.DISCONTINUED)
        if value == 'ok':
            return queryset.filter(stock_qty__gt=F('reorder_level'))
        return queryset


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'barcode', 'hsn', 'location', 'description']
    ordering_fields = ['name', 'stock_qty', 'selling_price', 'purchase_price', 'created_at', 'updated_at']
    ordering = ['name']

    def get_queryset(self):
        return Product.objects.filter(owner=data_owner(self.request.user)).select_related(
            'category', 'supplier'
        )

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('prod_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('prod_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        product = serializer.save()
        ActivityLog.objects.create(
            owner=data_owner(self.request.user),
            type='inventory',
            message=f'Product added: {product.name}',
        )

    def perform_update(self, serializer):
        product = serializer.save()
        ActivityLog.objects.create(
            owner=data_owner(self.request.user),
            type='inventory',
            message=f'Product updated: {product.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Product deleted: {name}',
        )


class StockMovementFilter(filters.FilterSet):
    type = filters.CharFilter(field_name='type')
    product = filters.NumberFilter(field_name='product_id')
    productId = filters.NumberFilter(field_name='product_id')
    reference = filters.CharFilter(field_name='reference', lookup_expr='icontains')

    class Meta:
        model = StockMovement
        fields = ['type', 'product', 'productId', 'reference']


class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer
    filterset_class = StockMovementFilter
    http_method_names = ['get', 'post', 'head', 'options']
    search_fields = ['reason', 'reference', 'product__name', 'product__sku']
    ordering_fields = ['date', 'created_at', 'quantity']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        return StockMovement.objects.filter(owner=data_owner(self.request.user)).select_related(
            'product'
        )

    def perform_create(self, serializer):
        movement = serializer.save()
        ActivityLog.objects.create(
            owner=data_owner(self.request.user),
            type='inventory',
            message=f'Stock {movement.type}: {movement.product.name} ({movement.quantity})',
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_stats(request):
    owner = data_owner(request.user)
    products = Product.objects.filter(owner=owner)
    active = products.filter(status=Product.Status.ACTIVE)
    low = products.filter(stock_qty__gt=0, stock_qty__lte=F('reorder_level')).exclude(
        status=Product.Status.DISCONTINUED
    )
    out = products.filter(stock_qty__lte=0).exclude(status=Product.Status.DISCONTINUED)

    stock_value = Decimal('0')
    retail_value = Decimal('0')
    for p in products.only('stock_qty', 'purchase_price', 'selling_price'):
        qty = Decimal(p.stock_qty or 0)
        stock_value += qty * Decimal(p.purchase_price or 0)
        retail_value += qty * Decimal(p.selling_price or 0)

    low_items = ProductSerializer(low[:20], many=True, context={'request': request}).data
    out_items = ProductSerializer(out[:20], many=True, context={'request': request}).data
    recent = StockMovementSerializer(
        StockMovement.objects.filter(owner=owner).select_related('product')[:8],
        many=True,
        context={'request': request},
    ).data

    return Response({
        'totalProducts': products.count(),
        'activeProducts': active.count(),
        'categories': Category.objects.filter(owner=owner).count(),
        'suppliers': Supplier.objects.filter(owner=owner).count(),
        'lowStock': low.count(),
        'outOfStock': out.count(),
        'stockValue': float(stock_value),
        'retailValue': float(retail_value),
        'lowStockItems': low_items,
        'outOfStockItems': out_items,
        'recentMovements': recent,
    })
