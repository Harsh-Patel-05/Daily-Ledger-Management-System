from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters import rest_framework as filters
from accounts.ownership import data_owner
from notifications.models import ActivityLog
from .models import Category, Brand, Supplier, Product, StockMovement
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    SupplierSerializer,
    ProductSerializer,
    StockMovementSerializer,
)
from .bulk_import import parse_upload, import_product_rows


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


class BrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Brand.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        brand = serializer.save(owner=owner)
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Brand added: {brand.name}',
        )

    def perform_destroy(self, instance):
        if instance.products.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Brand is used by products. Reassign them first.')
        name = instance.name
        owner = data_owner(self.request.user)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Brand deleted: {name}',
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
    brand = filters.NumberFilter(field_name='brand_id')
    brandId = filters.NumberFilter(field_name='brand_id')
    supplier = filters.NumberFilter(field_name='supplier_id')
    supplierId = filters.NumberFilter(field_name='supplier_id')
    stock = filters.CharFilter(method='filter_stock')

    class Meta:
        model = Product
        fields = ['status', 'category', 'categoryId', 'supplier', 'supplierId']

    def filter_stock(self, queryset, name, value):
        if value == 'low':
            return queryset.filter(stock_qty__gt=0, stock_qty__lte=10).exclude(
                status=Product.Status.DISCONTINUED
            )
        if value == 'out':
            return queryset.filter(stock_qty__lte=0).exclude(status=Product.Status.DISCONTINUED)
        if value == 'ok':
            return queryset.filter(stock_qty__gt=10)
        return queryset


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    search_fields = ['name', 'brand__name', 'description']
    ordering_fields = ['name', 'stock_qty', 'selling_price', 'purchase_price', 'created_at', 'updated_at']
    ordering = ['name']

    def get_queryset(self):
        return Product.objects.filter(owner=data_owner(self.request.user)).select_related(
            'category', 'brand', 'supplier'
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
    search_fields = ['reason', 'reference', 'product__name', 'product__brand__name']
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
    low = products.filter(stock_qty__gt=0, stock_qty__lte=10).exclude(
        status=Product.Status.DISCONTINUED
    )
    out = products.filter(stock_qty__lte=0).exclude(status=Product.Status.DISCONTINUED)

    stock_value_without_gst = Decimal('0')
    stock_value_with_gst = Decimal('0')
    retail_value_without_gst = Decimal('0')
    retail_value_with_gst = Decimal('0')
    for p in products.only(
        'stock_qty',
        'purchase_price',
        'purchase_price_with_gst',
        'selling_price',
        'selling_price_with_gst',
    ):
        qty = Decimal(p.stock_qty or 0)
        stock_value_without_gst += qty * Decimal(p.purchase_price or 0)
        stock_value_with_gst += qty * Decimal(p.purchase_price_with_gst or 0)
        retail_value_without_gst += qty * Decimal(p.selling_price or 0)
        retail_value_with_gst += qty * Decimal(p.selling_price_with_gst or 0)

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
        'brands': Brand.objects.filter(owner=owner).count(),
        'suppliers': Supplier.objects.filter(owner=owner).count(),
        'lowStock': low.count(),
        'outOfStock': out.count(),
        'stockValueWithoutGst': float(stock_value_without_gst),
        'stockValueWithGst': float(stock_value_with_gst),
        # Prefer with-GST; fall back to without when with-GST is empty
        'stockValue': float(stock_value_with_gst or stock_value_without_gst),
        'retailValueWithoutGst': float(retail_value_without_gst),
        'retailValueWithGst': float(retail_value_with_gst),
        'retailValue': float(retail_value_with_gst or retail_value_without_gst),
        'lowStockItems': low_items,
        'outOfStockItems': out_items,
        'recentMovements': recent,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def products_bulk_import(request):
    """Upload CSV or Excel (.xlsx) to create/update products."""
    upload = request.FILES.get('file')
    if not upload:
        return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

    update_raw = str(request.data.get('updateExisting', 'true')).strip().lower()
    update_existing = update_raw not in ('0', 'false', 'no', 'skip')

    data = upload.read()
    if not data:
        return Response({'detail': 'Empty file'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows, parse_meta = parse_upload(upload.name, data)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {'detail': f'Could not read file: {exc}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not rows:
        return Response({'detail': 'No product rows found'}, status=status.HTTP_400_BAD_REQUEST)

    owner = data_owner(request.user)
    result = import_product_rows(owner, rows, update_existing=update_existing)
    result.update(parse_meta)
    ActivityLog.objects.create(
        owner=owner,
        type='inventory',
        message=(
            f'Bulk import: +{result["created"]} created, '
            f'{result["updated"]} updated, {result["skipped"]} skipped '
            f'({parse_meta.get("duplicatesCollapsed", 0)} duplicate names merged)'
        ),
    )
    return Response(result)
