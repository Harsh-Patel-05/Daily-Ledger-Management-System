from decimal import Decimal

from django.db.models import Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.ownership import data_owner

from .company_scope import get_active_company
from .models import (
    AccountGroup,
    LedgerAccount,
    BankAccount,
    Transporter,
    Unit,
    HsnCode,
    Godown,
    ItemGroup,
    Voucher,
    JournalEntry,
    ContraEntry,
    BankReconciliation,
    StockJournal,
    DocumentSeries,
    PrintTemplate,
)
from .serializers import (
    AccountGroupSerializer,
    LedgerAccountSerializer,
    BankAccountSerializer,
    TransporterSerializer,
    UnitSerializer,
    HsnCodeSerializer,
    GodownSerializer,
    ItemGroupSerializer,
    VoucherSerializer,
    JournalEntrySerializer,
    ContraEntrySerializer,
    BankReconciliationSerializer,
    StockJournalSerializer,
    DocumentSeriesSerializer,
    PrintTemplateSerializer,
)
from .seed import seed_chart_of_accounts, seed_masters


class CompanyScopedMixin:
    """Scope queryset by active company; set company (+ owner) on create."""

    company_required = True
    set_owner = False

    def get_company(self):
        return get_active_company(self.request, required=self.company_required)

    def get_queryset(self):
        company = self.get_company()
        qs = self.queryset
        if company is None:
            return qs.none()
        return qs.filter(company=company)

    def perform_create(self, serializer):
        company = get_active_company(self.request, required=True)
        kwargs = {'company': company}
        if self.set_owner:
            kwargs['owner'] = data_owner(self.request.user)
        serializer.save(**kwargs)


class AccountGroupViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = AccountGroup.objects.all().prefetch_related('ledgers')
    serializer_class = AccountGroupSerializer
    search_fields = ['name', 'nature']
    ordering = ['sort_order', 'name']

    @action(detail=False, methods=['post'])
    def seed(self, request):
        company = get_active_company(request, required=True)
        seed_chart_of_accounts(company)
        seed_masters(company)
        qs = AccountGroup.objects.filter(company=company).prefetch_related('ledgers')
        return Response(AccountGroupSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def add_subgroup(self, request, pk=None):
        parent = self.get_object()
        name = str(request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        group = AccountGroup.objects.create(
            company=parent.company,
            name=name,
            nature=parent.nature,
            parent=parent,
            is_primary=False,
            is_system=False,
        )
        return Response(AccountGroupSerializer(group).data, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Account group created successfully',
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
                'message': 'Account group updated successfully',
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
                'message': 'Account group deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class LedgerAccountViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = LedgerAccount.objects.select_related('group').all()
    serializer_class = LedgerAccountSerializer
    search_fields = ['name', 'short_name']
    ordering = ['name']

    def perform_create(self, serializer):
        company = get_active_company(self.request, required=True)
        group = serializer.validated_data.get('group')
        if group and group.company_id != company.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'group': 'Group must belong to active company'})
        serializer.save(company=company)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Ledger account created successfully',
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
                'message': 'Ledger account updated successfully',
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
                'message': 'Ledger account deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class BankAccountViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer
    search_fields = ['name', 'account_number', 'ifsc']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Bank account created successfully',
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
                'message': 'Bank account updated successfully',
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
                'message': 'Bank account deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class TransporterViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Transporter.objects.all()
    serializer_class = TransporterSerializer
    search_fields = ['name', 'vehicle_no', 'mobile', 'gstin']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Transporter created successfully',
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
                'message': 'Transporter updated successfully',
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
                'message': 'Transporter deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class UnitViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    search_fields = ['name', 'formal_name']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Unit created successfully',
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
                'message': 'Unit updated successfully',
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
                'message': 'Unit deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class HsnCodeViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = HsnCode.objects.all()
    serializer_class = HsnCodeSerializer
    search_fields = ['code', 'description']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'HSN code created successfully',
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
                'message': 'HSN code updated successfully',
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
                'message': 'HSN code deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class GodownViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Godown.objects.all()
    serializer_class = GodownSerializer
    search_fields = ['name', 'address', 'in_charge']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Godown created successfully',
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
                'message': 'Godown updated successfully',
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
                'message': 'Godown deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ItemGroupViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = ItemGroup.objects.all()
    serializer_class = ItemGroupSerializer
    search_fields = ['name']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Item group created successfully',
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
                'message': 'Item group updated successfully',
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
                'message': 'Item group deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class VoucherViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Voucher.objects.select_related(
        'customer', 'supplier', 'related_invoice'
    ).prefetch_related('lines').all()
    serializer_class = VoucherSerializer
    search_fields = ['number', 'party', 'status']
    filterset_fields = ['doc_type', 'status']
    set_owner = True

    def get_queryset(self):
        qs = super().get_queryset()
        doc_type = self.request.query_params.get('doc_type') or self.request.query_params.get('type')
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        return qs

    def perform_create(self, serializer):
        company = get_active_company(self.request, required=True)
        data = serializer.validated_data
        party = data.get('party')
        if not party:
            cust = data.get('customer')
            supp = data.get('supplier')
            if cust:
                serializer.validated_data['party'] = cust.business_name or cust.name
            elif supp:
                serializer.validated_data['party'] = supp.name
        # Infer interstate from company vs party state when possible
        cust = data.get('customer')
        if cust and company.state and cust.state:
            interstate = (company.state or '').strip().upper() != (cust.state or '').strip().upper()
            serializer.validated_data.setdefault('is_interstate', interstate)
            serializer.validated_data.setdefault('place_of_supply', cust.state or company.state)
        serializer.save(company=company, owner=data_owner(self.request.user))

    def _copy_lines(self, source, target):
        from .models import VoucherLine
        for line in source.lines.all():
            VoucherLine.objects.create(
                voucher=target,
                product=line.product,
                description=line.description,
                hsn=line.hsn,
                quantity=line.quantity,
                rate=line.rate,
                tax_rate=line.tax_rate,
                sort_order=line.sort_order,
            )
        target.discount = source.discount
        target.tax_rate = source.tax_rate
        target.gst_type = source.gst_type
        target.place_of_supply = source.place_of_supply
        target.is_interstate = source.is_interstate
        target.notes = source.notes
        target.terms = source.terms
        target.recalculate(save=True)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Convert quotation→order→invoice or PO→bill, keeping line items."""
        voucher = self.get_object()
        mapping = {
            'quotation': 'sales_order',
            'sales_order': 'invoice',
            'proforma': 'invoice',
            'delivery_challan': 'invoice',
            'purchase_order': 'bill',
            'grn': 'bill',
            'credit_note': None,
            'debit_note': None,
        }
        target = request.data.get('target') or mapping.get(voucher.doc_type)
        if not target:
            return Response({'detail': 'Cannot convert this document'}, status=400)

        if target in Voucher.DocType.values:
            child = Voucher.objects.create(
                company=voucher.company,
                owner=voucher.owner,
                doc_type=target,
                number=request.data.get('number') or f'{target[:2].upper()}-{voucher.number}',
                date=request.data.get('date') or voucher.date,
                party=voucher.party,
                customer=voucher.customer,
                supplier=voucher.supplier,
                amount=voucher.amount,
                taxable_amount=voucher.taxable_amount,
                discount=voucher.discount,
                tax_rate=voucher.tax_rate,
                gst_type=voucher.gst_type,
                place_of_supply=voucher.place_of_supply,
                is_interstate=voucher.is_interstate,
                status='Open',
                notes=voucher.notes,
                terms=voucher.terms,
                related_voucher=voucher,
                fiscal_year=voucher.fiscal_year,
            )
            self._copy_lines(voucher, child)
            voucher.status = 'Converted'
            voucher.save(update_fields=['status', 'updated_at'])
            return Response(VoucherSerializer(child).data, status=201)

        if target == 'invoice':
            from invoices.models import Invoice, InvoiceItem
            if not voucher.customer_id:
                return Response(
                    {'detail': 'Link a customer before converting to invoice'},
                    status=400,
                )
            voucher.recalculate(save=True)
            inv = Invoice.objects.create(
                owner=voucher.owner,
                company=voucher.company,
                customer=voucher.customer,
                invoice_number=Invoice.next_number(voucher.owner),
                date=voucher.date,
                customer_name=voucher.customer.name,
                customer_business=voucher.customer.business_name,
                customer_address=voucher.customer.address,
                customer_gst=voucher.customer.gst,
                customer_mobile=voucher.customer.mobile,
                subtotal=voucher.taxable_amount or voucher.amount,
                discount=voucher.discount,
                tax_rate=voucher.tax_rate if voucher.gst_type != 'Non-GST' else 0,
                tax_amount=voucher.tax_amount,
                total=voucher.amount,
                balance=voucher.amount,
                gst_type=voucher.gst_type if voucher.gst_type in ('GST', 'Non-GST') else 'GST',
                notes=voucher.notes,
                terms=voucher.terms,
            )
            for i, line in enumerate(voucher.lines.all()):
                InvoiceItem.objects.create(
                    invoice=inv,
                    product=line.product,
                    description=line.description,
                    hsn=line.hsn,
                    quantity=line.quantity,
                    rate=line.rate,
                    amount=line.amount,
                    sort_order=i,
                )
            voucher.related_invoice = inv
            voucher.status = 'Converted'
            voucher.save(update_fields=['related_invoice', 'status', 'updated_at'])
            return Response(
                {'invoice_id': inv.id, 'invoice_number': inv.invoice_number},
                status=201,
            )

        if target == 'bill':
            from purchase.models import PurchaseBill
            voucher.recalculate(save=True)
            bill = PurchaseBill.objects.create(
                owner=voucher.owner,
                company=voucher.company,
                bill_no=request.data.get('number') or f'PB-{voucher.number}',
                date=voucher.date,
                supplier=voucher.supplier,
                supplier_name=voucher.party or (
                    voucher.supplier.name if voucher.supplier else ''
                ),
                taxable_amount=voucher.taxable_amount or voucher.amount,
                gst_amount=voucher.tax_amount,
                total=voucher.amount,
                balance=voucher.amount,
                gst_type=voucher.gst_type if voucher.gst_type in ('GST', 'Non-GST') else 'GST',
                notes=voucher.notes,
            )
            voucher.related_bill = bill
            voucher.status = 'Converted'
            voucher.save(update_fields=['related_bill', 'status', 'updated_at'])
            return Response({'bill_id': bill.id, 'bill_no': bill.bill_no}, status=201)

        return Response({'detail': 'Unknown target'}, status=400)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Voucher created successfully',
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
                'message': 'Voucher updated successfully',
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
                'message': 'Voucher deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class JournalEntryViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    search_fields = ['number', 'debit_account', 'credit_account', 'type']
    set_owner = True

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Journal entry created successfully',
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
                'message': 'Journal entry updated successfully',
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
                'message': 'Journal entry deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class ContraEntryViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = ContraEntry.objects.all()
    serializer_class = ContraEntrySerializer
    search_fields = ['number', 'from_account', 'to_account']
    set_owner = True

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Contra entry created successfully',
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
                'message': 'Contra entry updated successfully',
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
                'message': 'Contra entry deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class BankReconciliationViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = BankReconciliation.objects.all()
    serializer_class = BankReconciliationSerializer
    search_fields = ['bank', 'status']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Bank reconciliation created successfully',
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
                'message': 'Bank reconciliation updated successfully',
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
                'message': 'Bank reconciliation deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class StockJournalViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = StockJournal.objects.select_related('product').all()
    serializer_class = StockJournalSerializer
    search_fields = ['number', 'item']
    set_owner = True

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Stock journal created successfully',
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
                'message': 'Stock journal updated successfully',
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
                'message': 'Stock journal deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class DocumentSeriesViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = DocumentSeries.objects.all()
    serializer_class = DocumentSeriesSerializer
    search_fields = ['document', 'prefix']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Document series created successfully',
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
                'message': 'Document series updated successfully',
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
                'message': 'Document series deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


class PrintTemplateViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = PrintTemplate.objects.all()
    serializer_class = PrintTemplateSerializer
    search_fields = ['name', 'document']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Print template created successfully',
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
                'message': 'Print template updated successfully',
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
                'message': 'Print template deleted successfully',
            },
            status=status.HTTP_200_OK,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trial_balance(request):
    from .reports import compute_trial_balance
    company = get_active_company(request, required=True)
    data = compute_trial_balance(
        company,
        from_date=request.query_params.get('from'),
        to_date=request.query_params.get('to'),
    )
    # Backward compatible: list of rows still works for old UI; prefer full payload
    if request.query_params.get('format') == 'flat':
        return Response(data['rows'])
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def balance_sheet(request):
    from .reports import compute_balance_sheet
    company = get_active_company(request, required=True)
    data = compute_balance_sheet(company, as_of=request.query_params.get('as_of'))
    if request.query_params.get('format') == 'flat':
        return Response(data['groups'])
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_loss(request):
    from .reports import compute_profit_loss
    company = get_active_company(request, required=True)
    data = compute_profit_loss(
        company,
        from_date=request.query_params.get('from'),
        to_date=request.query_params.get('to'),
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_register(request):
    from invoices.models import Invoice
    owner = data_owner(request.user)
    company = get_active_company(request, required=True)
    invoices = Invoice.objects.filter(owner=owner, company=company).order_by('-date')[:100]
    rows = [
        {
            'id': inv.id,
            'number': inv.invoice_number,
            'date': inv.date,
            'party': inv.customer_business or inv.customer_name,
            'amount': float(inv.total),
            'status': inv.status.title() if inv.status else 'Open',
        }
        for inv in invoices
    ]
    return Response(rows)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_register(request):
    from purchase.models import PurchaseBill
    owner = data_owner(request.user)
    company = get_active_company(request, required=True)
    bills = PurchaseBill.objects.filter(owner=owner, company=company).order_by('-date')[:100]
    rows = [
        {
            'id': b.id,
            'number': b.bill_no,
            'date': b.date,
            'party': b.supplier_name,
            'amount': float(b.total),
            'status': b.status.title() if b.status else 'Open',
        }
        for b in bills
    ]
    return Response(rows)
