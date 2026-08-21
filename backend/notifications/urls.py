from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ActivityLogViewSet

router = DefaultRouter()
router.register('activity', ActivityLogViewSet, basename='activity')
router.register('', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
