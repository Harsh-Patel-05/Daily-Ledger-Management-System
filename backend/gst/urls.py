from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('e-invoices', views.EInvoiceViewSet, basename='e-invoice')
router.register('e-way-bills', views.EWayBillViewSet, basename='e-way-bill')

urlpatterns = [
    path('gstr-1/', views.gstr1),
    path('gstr-3b/', views.gstr3b),
    path('tax-summary/', views.tax_summary),
    path('hsn-summary/', views.hsn_summary),
    path('', include(router.urls)),
]
