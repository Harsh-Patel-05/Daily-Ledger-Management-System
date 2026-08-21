from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters import rest_framework as filters
from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, assign_owner_company
from notifications.models import ActivityLog
from .models import Category, Brand, Supplier, Product, StockMovement, GodownStock
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    SupplierSerializer,
    ProductSerializer,
    StockMovementSerializer,
    GodownStockSerializer,
)
from .bulk_import import parse_upload, import_product_rows


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return scope_queryset(Category.objects.all(), self.request)

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        cat = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Category created successfully',
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
                'message': 'Category updated successfully',
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
                'message': 'Category deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class BrandViewSet(viewsets.ModelViewSet):
    serializer_class = BrandSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return scope_queryset(Brand.objects.all(), self.request)

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        brand = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Brand created successfully',
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
                'message': 'Brand updated successfully',
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
                'message': 'Brand deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    search_fields = ['name', 'contact_person', 'mobile', 'email', 'gst']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return scope_queryset(Supplier.objects.all(), self.request)

    def perform_create(self, serializer):
        kwargs = assign_owner_company(self.request)
        sup = serializer.save(**kwargs)
        ActivityLog.objects.create(
            owner=kwargs['owner'],
            type='inventory',
            message=f'Vendor added: {sup.name}',
        )

    def perform_destroy(self, instance):
        name = instance.name
        owner = data_owner(self.request.user)
        instance.products.update(supplier=None)
        instance.delete()
        ActivityLog.objects.create(
            owner=owner,
            type='inventory',
            message=f'Vendor deleted: {name}',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Vendor created successfully',
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
                'message': 'Vendor updated successfully',
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
                'message': 'Vendor deleted successfully',
            },
            status=status.HTTP_200_OK,
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
    search_fields = ['name', 'brand__name', 'description', 'sku', 'barcode']
    ordering_fields = ['name', 'stock_qty', 'selling_price', 'purchase_price', 'created_at', 'updated_at']
    ordering = ['name']

    def get_queryset(self):
        qs = scope_queryset(
            Product.objects.select_related('category', 'brand', 'supplier', 'unit').prefetch_related(
                'alternate_units__unit', 'godown_stocks__godown'
            ).all(),
            self.request,
        )
        barcode = self.request.query_params.get('barcode')
        if barcode:
            qs = qs.filter(barcode__iexact=barcode.strip())
        sku = self.request.query_params.get('sku')
        if sku:
            qs = qs.filter(sku__iexact=sku.strip())
        return qs

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if isinstance(lookup, str) and lookup.startswith('prod_'):
            try:
                self.kwargs[self.lookup_field] = int(lookup.replace('prod_', ''))
            except ValueError:
                pass
        return super().get_object()

    def perform_create(self, serializer):
        product = serializer.save(**assign_owner_company(self.request))
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Product created successfully',
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
                'message': 'Product updated successfully',
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
                'message': 'Product deleted successfully',
            },
            status=status.HTTP_200_OK,
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
        return scope_queryset(
            StockMovement.objects.select_related('product').all(),
            self.request,
        )

    def perform_create(self, serializer):
        movement = serializer.save(**assign_owner_company(self.request))
        ActivityLog.objects.create(
            owner=data_owner(self.request.user),
            type='inventory',
            message=f'Stock {movement.type}: {movement.product.name} ({movement.quantity})',
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Stock movement created successfully',
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
                'message': 'Stock movement updated successfully',
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
                'message': 'Stock movement deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_stats(request):
    products = scope_queryset(Product.objects.all(), request)
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
        scope_queryset(StockMovement.objects.select_related('product').all(), request)[:8],
        many=True,
        context={'request': request},
    ).data

    return Response({
        'totalProducts': products.count(),
        'activeProducts': active.count(),
        'categories': scope_queryset(Category.objects.all(), request).count(),
        'brands': scope_queryset(Brand.objects.all(), request).count(),
        'suppliers': scope_queryset(Supplier.objects.all(), request).count(),
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
        return Response(
            {
                'success': False,
                'message': 'file is required',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    update_raw = str(request.data.get('updateExisting', 'true')).strip().lower()
    update_existing = update_raw not in ('0', 'false', 'no', 'skip')

    data = upload.read()
    if not data:
        return Response(
            {
                'success': False,
                'message': 'Empty file',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rows, parse_meta = parse_upload(upload.name, data)
    except ValueError as exc:
        return Response(
            {
                'success': False,
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:  # noqa: BLE001
        return Response(
            {
                'success': False,
                'message': f'Could not read file: {exc}',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not rows:
        return Response(
            {
                'success': False,
                'message': 'No product rows found',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

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
    return Response(
        {
            'success': True,
            'message': 'Products imported successfully',
            'data': result,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def barcode_lookup(request):
    """Find product by barcode or SKU (exact, company-scoped)."""
    code = (request.query_params.get('code') or request.query_params.get('barcode') or '').strip()
    if not code:
        return Response({'detail': 'code is required'}, status=status.HTTP_400_BAD_REQUEST)
    qs = scope_queryset(Product.objects.select_related('unit', 'brand', 'category'), request)
    product = qs.filter(barcode__iexact=code).first()
    if not product:
        product = qs.filter(sku__iexact=code).first()
    if not product:
        from .models import ProductAlternateUnit
        alt = (
            ProductAlternateUnit.objects.filter(barcode__iexact=code, product__in=qs)
            .select_related('product', 'product__unit')
            .first()
        )
        if alt:
            product = alt.product
            data = ProductSerializer(product, context={'request': request}).data
            data['matchedUnitId'] = alt.unit_id
            data['matchedConversionFactor'] = float(alt.conversion_factor or 1)
            return Response(data)
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProductSerializer(product, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def godown_stock_list(request):
    """Per-godown stock balances for active company."""
    from companies.company_scope import get_active_company
    company = get_active_company(request, required=True)
    qs = GodownStock.objects.filter(company=company).select_related('product', 'godown')
    product_id = request.query_params.get('product') or request.query_params.get('productId')
    godown_id = request.query_params.get('godown') or request.query_params.get('godownId')
    if product_id:
        qs = qs.filter(product_id=product_id)
    if godown_id:
        qs = qs.filter(godown_id=godown_id)
    return Response(GodownStockSerializer(qs[:500], many=True).data)
