from rest_framework import serializers
from .models import Company, FiscalYear


class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = [
            'id', 'label', 'start_date', 'end_date', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CompanySerializer(serializers.ModelSerializer):
    fiscal_years = FiscalYearSerializer(many=True, read_only=True)
    parentId = serializers.IntegerField(source='parent_id', required=False, allow_null=True)
    isPrimary = serializers.BooleanField(source='is_primary', required=False)
    hasGst = serializers.SerializerMethodField()
    subCompanyCount = serializers.SerializerMethodField()
    # camelCase aliases for frontend Munim forms
    registrationType = serializers.CharField(source='registration_type', required=False)
    partyType = serializers.CharField(source='party_type', required=False)
    gstApplicableFrom = serializers.DateField(
        source='gst_applicable_from', required=False, allow_null=True
    )
    legalName = serializers.CharField(source='legal_name', required=False, allow_blank=True)
    organizationType = serializers.CharField(
        source='organization_type', required=False, allow_blank=True
    )
    businessType = serializers.CharField(
        source='business_type', required=False, allow_blank=True
    )
    industryType = serializers.CharField(
        source='industry_type', required=False, allow_blank=True
    )
    addressLine1 = serializers.CharField(
        source='address_line1', required=False, allow_blank=True
    )
    addressLine2 = serializers.CharField(
        source='address_line2', required=False, allow_blank=True
    )
    establishDate = serializers.DateField(
        source='establish_date', required=False, allow_null=True
    )
    customFields = serializers.JSONField(source='custom_fields', required=False)
    subscriptionStatus = serializers.CharField(
        source='subscription_status', required=False
    )
    isDefault = serializers.BooleanField(source='is_default', required=False)

    class Meta:
        model = Company
        fields = [
            'id', 'parent', 'parentId', 'is_primary', 'isPrimary',
            'hasGst', 'subCompanyCount',
            'name', 'alias', 'gstin', 'pan',
            'registration_type', 'registrationType',
            'party_type', 'partyType',
            'gst_applicable_from', 'gstApplicableFrom',
            'legal_name', 'legalName',
            'organization_type', 'organizationType',
            'business_type', 'businessType',
            'industry_type', 'industryType',
            'address_line1', 'addressLine1',
            'address_line2', 'addressLine2',
            'country', 'pincode', 'state', 'city',
            'phone', 'mobile', 'fax', 'email', 'website',
            'establish_date', 'establishDate',
            'logo', 'signature',
            'custom_fields', 'customFields',
            'ownership',
            'subscription_status', 'subscriptionStatus',
            'is_default', 'isDefault',
            'fiscal_years',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'fiscal_years',
            'parent', 'hasGst', 'subCompanyCount',
        ]

    def get_hasGst(self, obj):
        return obj.has_gst

    def get_subCompanyCount(self, obj):
        if not obj.is_primary:
            return 0
        return obj.sub_companies.count()
