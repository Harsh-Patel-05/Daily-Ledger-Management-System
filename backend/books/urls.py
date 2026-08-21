from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('account-groups', views.AccountGroupViewSet, basename='account-group')
router.register('ledgers', views.LedgerAccountViewSet, basename='ledger')
router.register('banks', views.BankAccountViewSet, basename='bank')
router.register('transporters', views.TransporterViewSet, basename='transporter')
router.register('units', views.UnitViewSet, basename='unit')
router.register('hsn', views.HsnCodeViewSet, basename='hsn')
router.register('godowns', views.GodownViewSet, basename='godown')
router.register('item-groups', views.ItemGroupViewSet, basename='item-group')
router.register('vouchers', views.VoucherViewSet, basename='voucher')
router.register('journals', views.JournalEntryViewSet, basename='journal')
router.register('contra', views.ContraEntryViewSet, basename='contra')
router.register('bank-reconciliation', views.BankReconciliationViewSet, basename='bank-rec')
router.register('stock-journals', views.StockJournalViewSet, basename='stock-journal')
router.register('series', views.DocumentSeriesViewSet, basename='series')
router.register('print-templates', views.PrintTemplateViewSet, basename='print-template')

urlpatterns = [
    path('reports/trial-balance/', views.trial_balance),
    path('reports/balance-sheet/', views.balance_sheet),
    path('reports/profit-loss/', views.profit_loss),
    path('reports/sales-register/', views.sales_register),
    path('reports/purchase-register/', views.purchase_register),
    path('', include(router.urls)),
]
