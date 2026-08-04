from django.urls import path
from .views import DashboardView, LedgerView, ReportsView, AnalyticsView, HealthView

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('ledger/', LedgerView.as_view(), name='ledger'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
]
