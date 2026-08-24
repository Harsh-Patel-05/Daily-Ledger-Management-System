from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import BusinessProfile, BusinessSettings, PasswordOTP, ShopRole, ShopPermission
from .ownership import data_owner

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
        data['id'] = instance.pk
        return data


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6, required=False)
    name = serializers.CharField(max_length=150)
    mobile = serializers.CharField(required=False, allow_blank=True)
    shop_name = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'shopName' in data and 'shop_name' not in data:
            data['shop_name'] = data.pop('shopName')
        if 'confirmPassword' in data and 'confirm_password' not in data:
            data['confirm_password'] = data.pop('confirmPassword')
        return super().to_internal_value(data)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already registered')
        return value.lower()

    def validate_mobile(self, value):
        if not value:
            return value
        digits = ''.join(c for c in value if c.isdigit())
        if len(digits) < 10:
            raise serializers.ValidationError('Enter a valid 10-digit mobile number')
        return value

    def validate(self, attrs):
        confirm = attrs.get('confirm_password')
        if confirm is not None and attrs['password'] != confirm:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated):
        name = validated.pop('name')
        validated.pop('confirm_password', None)
        parts = name.split(' ', 1)
        shop = validated.get('shop_name') or f"{parts[0]}'s Shop"
        user = User.objects.create_user(
            email=validated['email'],
            password=validated['password'],
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else '',
            mobile=validated.get('mobile', ''),
            shop_name=shop,
        )
        BusinessProfile.objects.create(
            user=user,
            shop_name=shop,
            owner_name=name,
            email=user.email,
            mobile=validated.get('mobile', ''),
        )
        BusinessSettings.objects.create(
            user=user,
            business_name=shop,
        )
        from companies.services import ensure_primary_company

        ensure_primary_company(user)
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
        if not obj.logo:
            return None
        # Relative /media/... so Vite proxy and page refresh always resolve correctly
        return obj.logo.url

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
        logo = data.get('logo_url')
        # Cache-bust so browser shows new logo after upload/refresh
        if logo and instance.updated_at:
            sep = '&' if '?' in logo else '?'
            logo = f'{logo}{sep}v={int(instance.updated_at.timestamp())}'
        data['logo'] = logo
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
            'accentColor': data.get('accent_color') or 'blue',
            'fiscalYearStart': data['fiscal_year_start'],
            'defaultTaxRate': float(data['default_tax_rate']),
            'defaultPaymentTerms': data['default_payment_terms'],
            'lowStockAlert': bool(data.get('low_stock_alert', True)),
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
            'accentColor': 'accent_color',
            'fiscalYearStart': 'fiscal_year_start',
            'defaultTaxRate': 'default_tax_rate',
            'defaultPaymentTerms': 'default_payment_terms',
            'lowStockAlert': 'low_stock_alert',
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


class StaffUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    phone = serializers.CharField(source='mobile', required=False, allow_blank=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'name', 'first_name', 'last_name', 'phone', 'mobile',
            'role', 'password', 'status', 'is_active_staff', 'shop_name',
        )
        read_only_fields = ('id',)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'phone' in data and 'mobile' not in data:
            data['mobile'] = data.get('phone')
        return super().to_internal_value(data)

    def get_status(self, obj):
        return 'active' if obj.is_active_staff and obj.is_active else 'inactive'

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'name': instance.name,
            'email': instance.email,
            'phone': instance.mobile or '',
            'mobile': instance.mobile or '',
            'role': instance.role,
            'status': self.get_status(instance),
            'shopName': instance.shop_name or '',
        }

    def create(self, validated):
        request = self.context['request']
        owner = data_owner(request.user)
        name = validated.pop('name', '') or ''
        password = validated.pop('password', None) or 'changeme123'
        if name and not validated.get('first_name'):
            parts = name.split(' ', 1)
            validated['first_name'] = parts[0]
            validated['last_name'] = parts[1] if len(parts) > 1 else ''
        role = validated.get('role') or User.Role.STAFF
        if role == User.Role.OWNER:
            role = User.Role.STAFF
        user = User.objects.create_user(
            email=validated['email'].lower(),
            password=password,
            first_name=validated.get('first_name') or '',
            last_name=validated.get('last_name') or '',
            mobile=validated.get('mobile') or '',
            role=role,
            shop_name=owner.shop_name,
            business_owner=owner,
            is_active_staff=True,
        )
        return user

    def update(self, instance, validated):
        name = validated.pop('name', None)
        password = validated.pop('password', None)
        if name:
            parts = name.split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''
        for field in ('email', 'mobile', 'role', 'is_active_staff'):
            if field in validated:
                setattr(instance, field, validated[field])
        status_raw = self.initial_data.get('status')
        if status_raw is not None:
            instance.is_active_staff = str(status_raw).lower() == 'active'
            instance.is_active = instance.is_active_staff
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ShopRoleSerializer(serializers.ModelSerializer):
    users = serializers.SerializerMethodField()

    class Meta:
        model = ShopRole
        fields = ('id', 'name', 'description', 'is_system', 'users', 'created_at')
        read_only_fields = ('id', 'is_system', 'created_at')

    def get_users(self, obj):
        owner = obj.owner
        role_key = obj.name.lower()
        mapping = {
            'owner': User.Role.OWNER,
            'staff': User.Role.STAFF,
            'accountant': User.Role.ACCOUNTANT,
            'manager': User.Role.STAFF,
            'cashier': User.Role.STAFF,
        }
        role = mapping.get(role_key)
        if not role:
            return 0
        if role == User.Role.OWNER:
            return 1
        return User.objects.filter(business_owner=owner, role=role, is_active_staff=True).count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['users'] = self.get_users(instance)
        return data

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)


class ShopPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopPermission
        fields = ('id', 'module', 'can_view', 'can_create', 'can_edit', 'can_delete')
        read_only_fields = ('id',)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        aliases = {
            'view': 'can_view',
            'create': 'can_create',
            'edit': 'can_edit',
            'delete': 'can_delete',
        }
        for k, v in aliases.items():
            if k in data and v not in data:
                data[v] = data[k]
        return super().to_internal_value(data)

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'module': instance.module,
            'view': instance.can_view,
            'create': instance.can_create,
            'edit': instance.can_edit,
            'delete': instance.can_delete,
        }

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)
