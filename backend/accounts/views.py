import random
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import BusinessProfile, BusinessSettings, PasswordOTP, ShopRole, ShopPermission
from .ownership import data_owner, is_shop_owner
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ForgotPasswordSerializer, OTPVerifySerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, BusinessProfileSerializer, BusinessSettingsSerializer,
    StaffUserSerializer, ShopRoleSerializer, ShopPermissionSerializer,
)

User = get_user_model()


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data,
    }


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        payload = tokens_for_user(user)
        return Response(
            {
                'success': True,
                'message': 'Account created successfully',
                'data': payload,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=ser.validated_data['email'],
            password=ser.validated_data['password'],
        )
        if not user:
            return Response(
                {
                    'success': False,
                    'message': 'Invalid email or password',
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if getattr(user, 'business_owner_id', None) and not getattr(user, 'is_active_staff', True):
            return Response(
                {
                    'success': False,
                    'message': 'Staff account is deactivated',
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        payload = tokens_for_user(user)
        return Response(
            {
                'success': True,
                'message': 'Login successful',
                'data': payload,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = ForgotPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email'].lower()
        otp = ''.join(str(random.randint(0, 9)) for _ in range(settings.OTP_LENGTH))
        PasswordOTP.objects.create(email=email, otp=otp)
        # Console email in DEBUG
        print(f'[DLMS OTP] {email} → {otp}')
        return Response({
            'detail': 'OTP sent to your email',
            'email': email,
            'otp_demo': otp if settings.DEBUG else None,
        })


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = OTPVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email'].lower()
        otp = ser.validated_data['otp']
        expiry = timezone.now() - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        record = PasswordOTP.objects.filter(
            email=email, otp=otp, is_used=False, created_at__gte=expiry
        ).first()
        if not record:
            return Response({'detail': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)
        record.verified_at = timezone.now()
        record.save(update_fields=['verified_at'])
        return Response({'detail': 'OTP verified', 'email': email})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = ResetPasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email'].lower()
        otp = ser.validated_data['otp']
        expiry = timezone.now() - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        record = PasswordOTP.objects.filter(
            email=email, otp=otp, is_used=False, created_at__gte=expiry
        ).first()
        if not record or not record.verified_at:
            return Response(
                {'detail': 'OTP not verified or expired'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.set_password(ser.validated_data['password'])
        user.save()
        record.is_used = True
        record.save(update_fields=['is_used'])
        return Response(
            {
                'success': True,
                'message': 'Password reset successfully',
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not request.user.check_password(ser.validated_data['current_password']):
            return Response(
                {
                    'success': False,
                    'message': 'Current password is incorrect',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save()
        return Response(
            {
                'success': True,
                'message': 'Password changed successfully',
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    def get(self, request):
        owner = data_owner(request.user)
        profile, _ = BusinessProfile.objects.get_or_create(
            user=owner,
            defaults={
                'shop_name': owner.shop_name or 'My Shop',
                'owner_name': owner.name,
                'email': owner.email,
                'mobile': owner.mobile,
            },
        )
        return Response(BusinessProfileSerializer(profile, context={'request': request}).data)

    def patch(self, request):
        owner = data_owner(request.user)
        profile, _ = BusinessProfile.objects.get_or_create(user=owner)
        data = request.data.copy()
        # accept camelCase
        aliases = {
            'shopName': 'shop_name',
            'ownerName': 'owner_name',
            'invoicePrefix': 'invoice_prefix',
            'bankName': 'bank_name',
            'bankAccount': 'bank_account',
            'bankIFSC': 'bank_ifsc',
            'bankBranch': 'bank_branch',
            'upiId': 'upi_id',
        }
        for k, v in aliases.items():
            if k in data:
                data[v] = data.pop(k)
        ser = BusinessProfileSerializer(profile, data=data, partial=True, context={'request': request})
        ser.is_valid(raise_exception=True)
        ser.save()
        # keep BusinessSettings in sync (Settings page reads gstNumber from here)
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=owner)
        dirty = False
        if profile.gst and settings_obj.gst_number != profile.gst:
            settings_obj.gst_number = profile.gst
            dirty = True
        if profile.shop_name and settings_obj.business_name != profile.shop_name:
            settings_obj.business_name = profile.shop_name
            dirty = True
        if profile.invoice_prefix and settings_obj.invoice_prefix != profile.invoice_prefix:
            settings_obj.invoice_prefix = profile.invoice_prefix
            dirty = True
        if dirty:
            settings_obj.save()
        data = ser.data
        return Response(
            {
                'success': True,
                'message': 'Profile updated successfully',
                'data': data,
            },
            status=status.HTTP_200_OK,
        )


class SettingsView(APIView):
    def get(self, request):
        owner = data_owner(request.user)
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=owner)
        profile, _ = BusinessProfile.objects.get_or_create(
            user=owner,
            defaults={
                'shop_name': owner.shop_name or 'My Shop',
                'owner_name': owner.name,
                'email': owner.email,
                'mobile': owner.mobile,
            },
        )
        # Backfill from profile when settings fields were never set
        dirty = False
        if not settings_obj.gst_number and profile.gst:
            settings_obj.gst_number = profile.gst
            dirty = True
        if not settings_obj.business_name and profile.shop_name:
            settings_obj.business_name = profile.shop_name
            dirty = True
        if (not settings_obj.invoice_prefix or settings_obj.invoice_prefix == 'INV') and profile.invoice_prefix:
            if profile.invoice_prefix != settings_obj.invoice_prefix:
                settings_obj.invoice_prefix = profile.invoice_prefix
                dirty = True
        if dirty:
            settings_obj.save()
        return Response(BusinessSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=data_owner(request.user))
        ser = BusinessSettingsSerializer(settings_obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        # sync prefix/name to profile
        owner = data_owner(request.user)
        profile, _ = BusinessProfile.objects.get_or_create(user=owner)
        if settings_obj.invoice_prefix:
            profile.invoice_prefix = settings_obj.invoice_prefix
        if settings_obj.business_name:
            profile.shop_name = settings_obj.business_name
        if settings_obj.gst_number:
            profile.gst = settings_obj.gst_number
        profile.save()
        data = BusinessSettingsSerializer(settings_obj).data
        return Response(
            {
                'success': True,
                'message': 'Settings updated successfully',
                'data': data,
            },
            status=status.HTTP_200_OK,
        )


class StaffUserViewSet(viewsets.ModelViewSet):
    serializer_class = StaffUserSerializer
    search_fields = ['email', 'first_name', 'last_name', 'mobile']
    ordering = ['first_name', 'email']

    def get_queryset(self):
        from django.db.models import Q
        owner = data_owner(self.request.user)
        return User.objects.filter(Q(pk=owner.pk) | Q(business_owner=owner)).order_by('role', 'first_name')

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        owner = data_owner(self.request.user)
        if instance.pk == owner.pk:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Cannot delete the shop owner')
        if instance.business_owner_id != owner.pk:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not your staff member')
        instance.delete()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'User created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'User updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'User deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ShopRoleViewSet(viewsets.ModelViewSet):
    serializer_class = ShopRoleSerializer
    search_fields = ['name', 'description']
    ordering = ['name']

    def get_queryset(self):
        return ShopRole.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        serializer.save(owner=data_owner(self.request.user))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Role created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Role updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Role deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ShopPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = ShopPermissionSerializer
    search_fields = ['module']
    ordering = ['module']

    def get_queryset(self):
        return ShopPermission.objects.filter(owner=data_owner(self.request.user))

    def perform_create(self, serializer):
        serializer.save(owner=data_owner(self.request.user))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Permission created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Permission updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Permission deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
