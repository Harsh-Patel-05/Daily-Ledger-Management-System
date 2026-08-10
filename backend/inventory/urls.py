from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    SupplierViewSet,
    ProductViewSet,
    StockMovementViewSet,
    inventory_stats,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='inventory-category')
router.register('suppliers', SupplierViewSet, basename='inventory-supplier')
router.register('products', ProductViewSet, basename='inventory-product')
router.register('movements', StockMovementViewSet, basename='inventory-movement')
urlpatterns = [
    path('stats/', inventory_stats, name='inventory-stats'),
    path('', include(router.urls)),
]
