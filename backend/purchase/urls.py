from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PurchaseBillViewSet,
    PurchasePaymentViewSet,
    PurchaseReturnViewSet,
)

router = DefaultRouter()
router.register('bills', PurchaseBillViewSet, basename='purchase-bill')
router.register('payments', PurchasePaymentViewSet, basename='purchase-payment')
router.register('returns', PurchaseReturnViewSet, basename='purchase-return')

urlpatterns = [
    path('', include(router.urls)),
]
