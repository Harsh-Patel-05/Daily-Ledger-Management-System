from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import BusinessProfile, BusinessSettings, PasswordOTP

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'name', 'mobile', 'role', 'shop_name')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['name'] = instance.name
        data['id'] = f'user_{instance.pk}'
        return data


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(max_length=150)
    mobile = serializers.CharField(required=False, allow_blank=True)
    shop_name = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already registered')
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated):
        name = validated.pop('name')
        parts = name.split(' ', 1)
        user = User.objects.create_user(
            email=validated['email'],
            password=validated['password'],
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else '',
            mobile=validated.get('mobile', ''),
            shop_name=validated.get('shop_name', ''),
        )
        BusinessProfile.objects.create(
            user=user,
            shop_name=validated.get('shop_name') or f"{parts[0]}'s Shop",
            owner_name=name,
            email=user.email,
            mobile=validated.get('mobile', ''),
        )
        BusinessSettings.objects.create(
            user=user,
            business_name=validated.get('shop_name') or f"{parts[0]}'s Shop",
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField(min_length=6)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        validate_password(attrs['password'])
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField(min_length=6)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        validate_password(attrs['new_password'])
        return attrs


class BusinessProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProfile
        fields = (
            'shop_name', 'owner_name', 'email', 'mobile', 'address', 'gst',
            'invoice_prefix', 'currency', 'language', 'logo', 'logo_url',
            'bank_name', 'bank_account', 'bank_ifsc', 'bank_branch', 'upi_id',
            'created_at', 'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at', 'logo_url')

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            url = obj.logo.url
            return request.build_absolute_uri(url) if request else url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Frontend camelCase aliases
        data['shopName'] = data['shop_name']
        data['ownerName'] = data['owner_name']
        data['invoicePrefix'] = data['invoice_prefix']
        data['bankName'] = data['bank_name']
        data['bankAccount'] = data['bank_account']
        data['bankIFSC'] = data['bank_ifsc']
        data['bankBranch'] = data['bank_branch']
        data['upiId'] = data['upi_id']
        data['joinedAt'] = instance.created_at.date().isoformat() if instance.created_at else None
        data['logo'] = data.get('logo_url')
        return data


class BusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessSettings
        exclude = ('id', 'user')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {
            'businessName': data['business_name'],
            'gstNumber': data['gst_number'],
            'invoicePrefix': data['invoice_prefix'],
            'currency': data['currency'],
            'language': data['language'],
            'theme': data['theme'],
            'fiscalYearStart': data['fiscal_year_start'],
            'defaultTaxRate': float(data['default_tax_rate']),
            'defaultPaymentTerms': data['default_payment_terms'],
            'notifications': {
                'paymentReminders': data['payment_reminders'],
                'overdueAlerts': data['overdue_alerts'],
                'dailySummary': data['daily_summary'],
                'invoiceAlerts': data['invoice_alerts'],
                'emailNotifications': data['email_notifications'],
                'smsNotifications': data['sms_notifications'],
            },
        }

    def to_internal_value(self, data):
        mapped = {}
        mapping = {
            'businessName': 'business_name',
            'gstNumber': 'gst_number',
            'invoicePrefix': 'invoice_prefix',
            'currency': 'currency',
            'language': 'language',
            'theme': 'theme',
            'fiscalYearStart': 'fiscal_year_start',
            'defaultTaxRate': 'default_tax_rate',
            'defaultPaymentTerms': 'default_payment_terms',
        }
        for k, v in mapping.items():
            if k in data:
                mapped[v] = data[k]
        notif = data.get('notifications') or {}
        notif_map = {
            'paymentReminders': 'payment_reminders',
            'overdueAlerts': 'overdue_alerts',
            'dailySummary': 'daily_summary',
            'invoiceAlerts': 'invoice_alerts',
            'emailNotifications': 'email_notifications',
            'smsNotifications': 'sms_notifications',
        }
        for k, v in notif_map.items():
            if k in notif:
                mapped[v] = notif[k]
        # also accept snake_case
        for field in self.Meta.model._meta.fields:
            if field.name in data and field.name != 'user':
                mapped[field.name] = data[field.name]
        return super().to_internal_value(mapped)
