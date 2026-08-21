from decimal import Decimal
from django.db.models import Sum, Q
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.ownership import data_owner
from companies.company_scope import get_active_company
from invoices.models import Invoice
from purchase.models import PurchaseBill

from .models import EInvoice, EWayBill
from .serializers import EInvoiceSerializer, EWayBillSerializer


def _d(v):
    return float(Decimal(str(v or 0)))


def _period_filter(qs, date_field, month=None, year=None):
    if year:
        qs = qs.filter(**{f'{date_field}__year': int(year)})
    if month:
        qs = qs.filter(**{f'{date_field}__month': int(month)})
    return qs


class CompanyOwnedMixin:
    def get_company(self):
        return get_active_company(self.request, required=True)

    def get_queryset(self):
        company = get_active_company(self.request)
        if not company:
            return self.queryset.none()
        return self.queryset.filter(company=company)

    def perform_create(self, serializer):
        company = self.get_company()
        serializer.save(company=company, owner=data_owner(self.request.user))


class EInvoiceViewSet(CompanyOwnedMixin, viewsets.ModelViewSet):
    queryset = EInvoice.objects.select_related('invoice').all()
    serializer_class = EInvoiceSerializer
    search_fields = ['invoice_number', 'buyer_name', 'buyer_gstin', 'irn']

    @action(detail=True, methods=['post'])
    def generate_irn(self, request, pk=None):
        """Local IRN stub (Munim-style) — not NIC live API."""
        import hashlib
        from django.utils import timezone as tz
        doc = self.get_object()
        if doc.status == EInvoice.Status.CANCELLED:
            return Response({'detail': 'Cancelled e-invoice cannot be generated'}, status=400)
        raw = f'{doc.company_id}:{doc.invoice_number}:{doc.invoice_date}:{doc.total}'
        doc.irn = hashlib.sha256(raw.encode()).hexdigest()
        doc.ack_no = str(abs(hash(doc.irn)) % 10**12).zfill(12)
        doc.ack_date = tz.now()
        doc.status = EInvoice.Status.GENERATED
        doc.save(update_fields=['irn', 'ack_no', 'ack_date', 'status', 'updated_at'])
        return Response(EInvoiceSerializer(doc).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        doc = self.get_object()
        doc.status = EInvoice.Status.CANCELLED
        doc.save(update_fields=['status', 'updated_at'])
        return Response(EInvoiceSerializer(doc).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'E-invoice created successfully',
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
                'message': 'E-invoice updated successfully',
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
                'message': 'E-invoice deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class EWayBillViewSet(CompanyOwnedMixin, viewsets.ModelViewSet):
    queryset = EWayBill.objects.select_related('invoice').all()
    serializer_class = EWayBillSerializer
    search_fields = ['document_number', 'ewb_number', 'vehicle_no', 'transporter_name']

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        from django.utils import timezone as tz
        from datetime import timedelta
        doc = self.get_object()
        if doc.status == EWayBill.Status.CANCELLED:
            return Response({'detail': 'Cancelled e-way cannot be generated'}, status=400)
        doc.ewb_number = str(abs(hash(f'{doc.company_id}{doc.document_number}{doc.id}')) % 10**12).zfill(12)
        doc.valid_upto = tz.now() + timedelta(days=1 if doc.distance_km <= 100 else 3)
        doc.status = EWayBill.Status.ACTIVE
        doc.save(update_fields=['ewb_number', 'valid_upto', 'status', 'updated_at'])
        return Response(EWayBillSerializer(doc).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        doc = self.get_object()
        doc.status = EWayBill.Status.CANCELLED
        doc.save(update_fields=['status', 'updated_at'])
        return Response(EWayBillSerializer(doc).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'E-way bill created successfully',
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
                'message': 'E-way bill updated successfully',
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
                'message': 'E-way bill deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gstr1(request):
    """Outward supplies summary for active company (GSTR-1 style tables)."""
    company = get_active_company(request, required=True)
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    qs = Invoice.objects.filter(company=company, gst_type=Invoice.GstType.GST).prefetch_related('items')
    qs = _period_filter(qs, 'date', month, year)

    b2b, b2c = [], []
    hsn_map = {}
    for inv in qs:
        taxable = _d(inv.subtotal) - _d(inv.discount)
        row = {
            'id': inv.id,
            'invoiceNumber': inv.invoice_number,
            'date': inv.date.isoformat(),
            'party': inv.customer_business or inv.customer_name,
            'gstin': inv.customer_gst or '',
            'placeOfSupply': inv.place_of_supply or '',
            'taxable': taxable,
            'cgst': _d(inv.cgst_amount),
            'sgst': _d(inv.sgst_amount),
            'igst': _d(inv.igst_amount),
            'tax': _d(inv.tax_amount),
            'total': _d(inv.total),
            'isInterstate': inv.is_interstate,
        }
        if inv.customer_gst:
            b2b.append(row)
        else:
            b2c.append(row)
        for item in inv.items.all():
            hsn = item.hsn or 'N/A'
            bucket = hsn_map.setdefault(
                hsn, {'hsn': hsn, 'qty': 0, 'taxable': 0, 'tax': 0}
            )
            bucket['qty'] += _d(item.quantity)
            bucket['taxable'] += _d(item.amount)

    # allocate tax proportionally per HSN for display
    for inv in qs:
        inv_taxable = max(_d(inv.subtotal) - _d(inv.discount), 0.01)
        for item in inv.items.all():
            hsn = item.hsn or 'N/A'
            share = _d(item.amount) / inv_taxable
            hsn_map[hsn]['tax'] += _d(inv.tax_amount) * share

    summary = {
        'b2bCount': len(b2b),
        'b2cCount': len(b2c),
        'taxable': sum(r['taxable'] for r in b2b + b2c),
        'cgst': sum(r['cgst'] for r in b2b + b2c),
        'sgst': sum(r['sgst'] for r in b2b + b2c),
        'igst': sum(r['igst'] for r in b2b + b2c),
        'tax': sum(r['tax'] for r in b2b + b2c),
    }
    return Response({
        'period': {'month': month, 'year': year},
        'summary': summary,
        'b2b': b2b,
        'b2c': b2c,
        'hsn': list(hsn_map.values()),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gstr3b(request):
    """Monthly GSTR-3B style summary for active company."""
    company = get_active_company(request, required=True)
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    sales = Invoice.objects.filter(company=company, gst_type=Invoice.GstType.GST)
    sales = _period_filter(sales, 'date', month, year)
    purchases = PurchaseBill.objects.filter(company=company, gst_type=PurchaseBill.GstType.GST)
    purchases = _period_filter(purchases, 'date', month, year)

    out_taxable = sales.aggregate(t=Sum('subtotal'))['t'] or 0
    out_disc = sales.aggregate(t=Sum('discount'))['t'] or 0
    out_cgst = sales.aggregate(t=Sum('cgst_amount'))['t'] or 0
    out_sgst = sales.aggregate(t=Sum('sgst_amount'))['t'] or 0
    out_igst = sales.aggregate(t=Sum('igst_amount'))['t'] or 0
    out_tax = sales.aggregate(t=Sum('tax_amount'))['t'] or 0

    in_taxable = purchases.aggregate(t=Sum('taxable_amount'))['t'] or 0
    in_cgst = purchases.aggregate(t=Sum('cgst_amount'))['t'] or 0
    in_sgst = purchases.aggregate(t=Sum('sgst_amount'))['t'] or 0
    in_igst = purchases.aggregate(t=Sum('igst_amount'))['t'] or 0
    in_tax = purchases.aggregate(t=Sum('gst_amount'))['t'] or 0

    outward_taxable = _d(out_taxable) - _d(out_disc)
    return Response({
        'period': {'month': month, 'year': year},
        'outward': {
            'taxable': outward_taxable,
            'cgst': _d(out_cgst),
            'sgst': _d(out_sgst),
            'igst': _d(out_igst),
            'tax': _d(out_tax),
        },
        'inward': {
            'taxable': _d(in_taxable),
            'cgst': _d(in_cgst),
            'sgst': _d(in_sgst),
            'igst': _d(in_igst),
            'tax': _d(in_tax),
        },
        'net': {
            'cgst': _d(out_cgst) - _d(in_cgst),
            'sgst': _d(out_sgst) - _d(in_sgst),
            'igst': _d(out_igst) - _d(in_igst),
            'tax': _d(out_tax) - _d(in_tax),
        },
        'nonGstSales': Invoice.objects.filter(
            company=company, gst_type=Invoice.GstType.NON_GST
        ).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tax_summary(request):
    company = get_active_company(request, required=True)
    month = request.query_params.get('month')
    year = request.query_params.get('year')
    sales = _period_filter(
        Invoice.objects.filter(company=company, gst_type=Invoice.GstType.GST), 'date', month, year
    )
    purchases = _period_filter(
        PurchaseBill.objects.filter(company=company, gst_type=PurchaseBill.GstType.GST),
        'date', month, year,
    )
    rows = []
    for tax, out_f, in_f in (
        ('CGST', 'cgst_amount', 'cgst_amount'),
        ('SGST', 'sgst_amount', 'sgst_amount'),
        ('IGST', 'igst_amount', 'igst_amount'),
    ):
        out_v = _d(sales.aggregate(t=Sum(out_f))['t'])
        in_v = _d(purchases.aggregate(t=Sum(in_f))['t'])
        rows.append({'id': tax, 'tax': tax, 'output': out_v, 'input': in_v, 'net': out_v - in_v})

    out_tax = _d(sales.aggregate(t=Sum('tax_amount'))['t'])
    in_tax = _d(purchases.aggregate(t=Sum('gst_amount'))['t'])
    out_taxable = _d(sales.aggregate(t=Sum('subtotal'))['t']) - _d(sales.aggregate(t=Sum('discount'))['t'])
    in_taxable = _d(purchases.aggregate(t=Sum('taxable_amount'))['t'])
    return Response({
        'rows': rows,
        'summary': {
            'salesTaxable': out_taxable,
            'purchaseTaxable': in_taxable,
            'outputGst': out_tax,
            'inputGst': in_tax,
            'netGst': out_tax - in_tax,
            'nonGstSales': Invoice.objects.filter(
                company=company, gst_type=Invoice.GstType.NON_GST
            ).count(),
            'gstSalesCount': sales.count(),
            'gstPurchaseCount': purchases.count(),
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hsn_summary(request):
    """HSN/SAC rollup — same data as GSTR-1 HSN table."""
    data = gstr1(request).data
    return Response({
        'period': data.get('period'),
        'rows': data.get('hsn') or [],
        'summary': data.get('summary') or {},
    })
