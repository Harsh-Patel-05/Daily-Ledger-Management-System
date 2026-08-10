from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardView, LedgerView, ReportsView, AnalyticsView, HealthView
from .ledger_views import OpeningBalanceViewSet

opening_balances_router = DefaultRouter()
opening_balances_router.register(r'', OpeningBalanceViewSet, basename='opening-balance')

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('ledger/', LedgerView.as_view(), name='ledger'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('opening-balances/', include(opening_balances_router.urls)),
]
