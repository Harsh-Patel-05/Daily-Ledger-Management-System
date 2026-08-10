from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, MeView,
    ForgotPasswordView, VerifyOTPView, ResetPasswordView, ChangePasswordView,
    ProfileView, SettingsView,
    StaffUserViewSet, ShopRoleViewSet, ShopPermissionViewSet,
)

router = DefaultRouter()
router.register('users', StaffUserViewSet, basename='staff-user')
router.register('roles', ShopRoleViewSet, basename='shop-role')
router.register('permissions', ShopPermissionViewSet, basename='shop-permission')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('settings/', SettingsView.as_view(), name='settings'),
    path('', include(router.urls)),
]
