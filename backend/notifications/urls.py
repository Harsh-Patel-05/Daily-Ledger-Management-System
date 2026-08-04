from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ActivityLogListView

router = DefaultRouter()
router.register('', NotificationViewSet, basename='notification')

urlpatterns = [
    path('activity/', ActivityLogListView.as_view(), name='activity_log'),
    path('', include(router.urls)),
]
