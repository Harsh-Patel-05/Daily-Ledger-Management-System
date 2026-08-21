from rest_framework import serializers

from .models import EInvoice, EWayBill


class EInvoiceSerializer(serializers.ModelSerializer):
    invoiceId = serializers.IntegerField(source='invoice_id', required=False, allow_null=True)
    invoiceNumber = serializers.CharField(source='invoice_number', required=False)
    invoiceDate = serializers.DateField(source='invoice_date', required=False)
    buyerGstin = serializers.CharField(source='buyer_gstin', required=False, allow_blank=True)
    buyerName = serializers.CharField(source='buyer_name', required=False, allow_blank=True)
    taxableAmount = serializers.DecimalField(
        source='taxable_amount', max_digits=14, decimal_places=2, required=False
    )
    taxAmount = serializers.DecimalField(
        source='tax_amount', max_digits=14, decimal_places=2, required=False
    )
    ackNo = serializers.CharField(source='ack_no', required=False, allow_blank=True)
    ackDate = serializers.DateTimeField(source='ack_date', required=False, allow_null=True)

    class Meta:
        model = EInvoice
        fields = [
            'id', 'invoice', 'invoiceId', 'invoice_number', 'invoiceNumber',
            'invoice_date', 'invoiceDate', 'buyer_gstin', 'buyerGstin',
            'buyer_name', 'buyerName', 'taxable_amount', 'taxableAmount',
            'tax_amount', 'taxAmount', 'total', 'irn', 'ack_no', 'ackNo',
            'ack_date', 'ackDate', 'status', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'invoice', 'created_at', 'irn', 'ack_no', 'ack_date']


class EWayBillSerializer(serializers.ModelSerializer):
    invoiceId = serializers.IntegerField(source='invoice_id', required=False, allow_null=True)
    documentNumber = serializers.CharField(source='document_number', required=False)
    documentDate = serializers.DateField(source='document_date', required=False)
    fromPlace = serializers.CharField(source='from_place', required=False, allow_blank=True)
    toPlace = serializers.CharField(source='to_place', required=False, allow_blank=True)
    transporterName = serializers.CharField(
        source='transporter_name', required=False, allow_blank=True
    )
    vehicleNo = serializers.CharField(source='vehicle_no', required=False, allow_blank=True)
    distanceKm = serializers.IntegerField(source='distance_km', required=False)
    taxableAmount = serializers.DecimalField(
        source='taxable_amount', max_digits=14, decimal_places=2, required=False
    )
    ewbNumber = serializers.CharField(source='ewb_number', required=False, allow_blank=True)
    validUpto = serializers.DateTimeField(source='valid_upto', required=False, allow_null=True)

    class Meta:
        model = EWayBill
        fields = [
            'id', 'invoice', 'invoiceId', 'document_number', 'documentNumber',
            'document_date', 'documentDate', 'from_place', 'fromPlace',
            'to_place', 'toPlace', 'transporter_name', 'transporterName',
            'vehicle_no', 'vehicleNo', 'distance_km', 'distanceKm',
            'taxable_amount', 'taxableAmount', 'ewb_number', 'ewbNumber',
            'valid_upto', 'validUpto', 'status', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'invoice', 'created_at', 'ewb_number', 'valid_upto']
