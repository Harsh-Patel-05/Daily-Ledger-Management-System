from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardViewSet,
    LedgerViewSet,
    ReportsViewSet,
    AnalyticsViewSet,
    HealthViewSet,
    CashBookViewSet,
    DayBookViewSet,
    ClosingBalanceViewSet,
)
from .ledger_views import OpeningBalanceViewSet

opening_balances_router = DefaultRouter()
opening_balances_router.register(r'', OpeningBalanceViewSet, basename='opening-balance')

urlpatterns = [
    path('health/', HealthViewSet.as_view({'get': 'list'}), name='health'),
    path('dashboard/', DashboardViewSet.as_view({'get': 'list'}), name='dashboard'),
    path('ledger/', LedgerViewSet.as_view({'get': 'list'}), name='ledger'),
    path('cash-book/', CashBookViewSet.as_view({'get': 'list'}), name='cash-book'),
    path('day-book/', DayBookViewSet.as_view({'get': 'list'}), name='day-book'),
    path('closing-balance/', ClosingBalanceViewSet.as_view({'get': 'list'}), name='closing-balance'),
    path('reports/', ReportsViewSet.as_view({'get': 'list'}), name='reports'),
    path('analytics/', AnalyticsViewSet.as_view({'get': 'list'}), name='analytics'),
    path('opening-balances/', include(opening_balances_router.urls)),
]
