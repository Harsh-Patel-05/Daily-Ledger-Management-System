from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/', include('accounts.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/invoices/', include('invoices.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/purchase/', include('purchase.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/', include('core.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
