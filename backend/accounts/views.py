import random
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import BusinessProfile, BusinessSettings, PasswordOTP
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ForgotPasswordSerializer, OTPVerifySerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, BusinessProfileSerializer, BusinessSettingsSerializer,
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
        return Response(tokens_for_user(user), status=status.HTTP_201_CREATED)


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
            return Response({'detail': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(tokens_for_user(user))


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
        return Response({'detail': 'Password reset successfully'})


class ChangePasswordView(APIView):
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not request.user.check_password(ser.validated_data['current_password']):
            return Response({'detail': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully'})


class ProfileView(APIView):
    def get(self, request):
        profile, _ = BusinessProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'shop_name': request.user.shop_name or 'My Shop',
                'owner_name': request.user.name,
                'email': request.user.email,
                'mobile': request.user.mobile,
            },
        )
        return Response(BusinessProfileSerializer(profile, context={'request': request}).data)

    def patch(self, request):
        profile, _ = BusinessProfile.objects.get_or_create(user=request.user)
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
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=request.user)
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
        return Response(ser.data)


class SettingsView(APIView):
    def get(self, request):
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=request.user)
        profile, _ = BusinessProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'shop_name': request.user.shop_name or 'My Shop',
                'owner_name': request.user.name,
                'email': request.user.email,
                'mobile': request.user.mobile,
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
        settings_obj, _ = BusinessSettings.objects.get_or_create(user=request.user)
        ser = BusinessSettingsSerializer(settings_obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        # sync prefix/name to profile
        profile, _ = BusinessProfile.objects.get_or_create(user=request.user)
        if settings_obj.invoice_prefix:
            profile.invoice_prefix = settings_obj.invoice_prefix
        if settings_obj.business_name:
            profile.shop_name = settings_obj.business_name
        if settings_obj.gst_number:
            profile.gst = settings_obj.gst_number
        profile.save()
        return Response(BusinessSettingsSerializer(settings_obj).data)
