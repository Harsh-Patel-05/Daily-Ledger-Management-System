from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, SalesReturnViewSet

router = DefaultRouter()
router.register('', InvoiceViewSet, basename='invoice')

returns_router = DefaultRouter()
returns_router.register(r'', SalesReturnViewSet, basename='sales-return')

urlpatterns = [
    path('returns/', include(returns_router.urls)),
    path('', include(router.urls)),
]
