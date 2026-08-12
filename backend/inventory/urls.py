from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    BrandViewSet,
    SupplierViewSet,
    ProductViewSet,
    StockMovementViewSet,
    inventory_stats,
    products_bulk_import,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='inventory-category')
router.register('brands', BrandViewSet, basename='inventory-brand')
router.register('suppliers', SupplierViewSet, basename='inventory-supplier')
router.register('products', ProductViewSet, basename='inventory-product')
router.register('movements', StockMovementViewSet, basename='inventory-movement')
urlpatterns = [
    path('stats/', inventory_stats, name='inventory-stats'),
    path('products/import/', products_bulk_import, name='inventory-products-import'),
    path('', include(router.urls)),
]
