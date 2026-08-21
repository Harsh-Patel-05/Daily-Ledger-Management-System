from rest_framework import serializers

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
    VoucherLine,
    JournalEntry,
    ContraEntry,
    BankReconciliation,
    StockJournal,
    DocumentSeries,
    PrintTemplate,
)


class LedgerAccountSerializer(serializers.ModelSerializer):
    underGroup = serializers.CharField(source='under_group', read_only=True)
    nature = serializers.CharField(read_only=True)
    shortName = serializers.CharField(source='short_name', required=False, allow_blank=True)
    groupId = serializers.PrimaryKeyRelatedField(
        source='group', queryset=AccountGroup.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = LedgerAccount
        fields = [
            'id', 'name', 'short_name', 'shortName', 'group', 'groupId',
            'underGroup', 'nature', 'opening', 'side', 'status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'underGroup', 'nature']


class AccountGroupSerializer(serializers.ModelSerializer):
    parentId = serializers.PrimaryKeyRelatedField(
        source='parent', queryset=AccountGroup.objects.all(), required=False, allow_null=True
    )
    isPrimary = serializers.BooleanField(source='is_primary', required=False)
    isSystem = serializers.BooleanField(source='is_system', required=False)
    ledgers = LedgerAccountSerializer(many=True, read_only=True)

    class Meta:
        model = AccountGroup
        fields = [
            'id', 'name', 'nature', 'parent', 'parentId',
            'is_primary', 'isPrimary', 'is_system', 'isSystem',
            'sort_order', 'ledgers', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'ledgers']


class BankAccountSerializer(serializers.ModelSerializer):
    accountNumber = serializers.CharField(source='account_number', required=False, allow_blank=True)

    class Meta:
        model = BankAccount
        fields = [
            'id', 'name', 'account_number', 'accountNumber', 'ifsc', 'branch',
            'opening', 'balance', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class TransporterSerializer(serializers.ModelSerializer):
    vehicleNo = serializers.CharField(source='vehicle_no', required=False, allow_blank=True)

    class Meta:
        model = Transporter
        fields = [
            'id', 'name', 'vehicle_no', 'vehicleNo', 'mobile', 'gstin', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UnitSerializer(serializers.ModelSerializer):
    formalName = serializers.CharField(source='formal_name', required=False, allow_blank=True)
    decimalPlaces = serializers.IntegerField(source='decimal_places', required=False)

    class Meta:
        model = Unit
        fields = [
            'id', 'name', 'formal_name', 'formalName', 'decimal_places', 'decimalPlaces',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class HsnCodeSerializer(serializers.ModelSerializer):
    gstRate = serializers.DecimalField(source='gst_rate', max_digits=5, decimal_places=2, required=False)

    class Meta:
        model = HsnCode
        fields = [
            'id', 'code', 'description', 'type', 'gst_rate', 'gstRate', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GodownSerializer(serializers.ModelSerializer):
    inCharge = serializers.CharField(source='in_charge', required=False, allow_blank=True)

    class Meta:
        model = Godown
        fields = [
            'id', 'name', 'address', 'in_charge', 'inCharge', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ItemGroupSerializer(serializers.ModelSerializer):
    parentId = serializers.PrimaryKeyRelatedField(
        source='parent', queryset=ItemGroup.objects.all(), required=False, allow_null=True
    )
    parentName = serializers.SerializerMethodField()

    class Meta:
        model = ItemGroup
        fields = ['id', 'name', 'parent', 'parentId', 'parentName', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'parentName']

    def get_parentName(self, obj):
        return obj.parent.name if obj.parent_id else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['parentId'] = instance.parent_id or ''
        data['parent'] = instance.parent.name if instance.parent_id else ''
        return data


class VoucherLineSerializer(serializers.ModelSerializer):
    productId = serializers.IntegerField(source='product_id', required=False, allow_null=True)
    taxRate = serializers.DecimalField(
        source='tax_rate', max_digits=6, decimal_places=2, required=False
    )

    class Meta:
        model = VoucherLine
        fields = [
            'id', 'product', 'productId', 'description', 'hsn',
            'quantity', 'rate', 'amount', 'tax_rate', 'taxRate', 'sort_order',
        ]
        read_only_fields = ['id', 'product', 'amount']


class VoucherSerializer(serializers.ModelSerializer):
    docType = serializers.CharField(source='doc_type', required=False)
    gstType = serializers.CharField(source='gst_type', required=False)
    customerId = serializers.IntegerField(source='customer_id', required=False, allow_null=True)
    supplierId = serializers.IntegerField(source='supplier_id', required=False, allow_null=True)
    relatedVoucherId = serializers.IntegerField(
        source='related_voucher_id', required=False, allow_null=True
    )
    relatedInvoiceId = serializers.IntegerField(
        source='related_invoice_id', required=False, allow_null=True
    )
    relatedBillId = serializers.IntegerField(
        source='related_bill_id', required=False, allow_null=True
    )
    fiscalYear = serializers.CharField(source='fiscal_year', required=False, allow_blank=True)
    taxableAmount = serializers.DecimalField(
        source='taxable_amount', max_digits=14, decimal_places=2, required=False
    )
    taxRate = serializers.DecimalField(
        source='tax_rate', max_digits=6, decimal_places=2, required=False
    )
    taxAmount = serializers.DecimalField(
        source='tax_amount', max_digits=14, decimal_places=2, required=False
    )
    cgstAmount = serializers.DecimalField(
        source='cgst_amount', max_digits=14, decimal_places=2, required=False
    )
    sgstAmount = serializers.DecimalField(
        source='sgst_amount', max_digits=14, decimal_places=2, required=False
    )
    igstAmount = serializers.DecimalField(
        source='igst_amount', max_digits=14, decimal_places=2, required=False
    )
    placeOfSupply = serializers.CharField(
        source='place_of_supply', required=False, allow_blank=True
    )
    isInterstate = serializers.BooleanField(source='is_interstate', required=False)
    items = VoucherLineSerializer(source='lines', many=True, required=False)

    class Meta:
        model = Voucher
        fields = [
            'id', 'doc_type', 'docType', 'number', 'date', 'party',
            'customer', 'customerId', 'supplier', 'supplierId',
            'amount', 'taxable_amount', 'taxableAmount', 'discount',
            'tax_rate', 'taxRate', 'tax_amount', 'taxAmount',
            'cgst_amount', 'cgstAmount', 'sgst_amount', 'sgstAmount',
            'igst_amount', 'igstAmount',
            'gst_type', 'gstType',
            'place_of_supply', 'placeOfSupply', 'is_interstate', 'isInterstate',
            'status', 'notes', 'terms',
            'related_voucher', 'relatedVoucherId',
            'related_invoice', 'relatedInvoiceId',
            'related_bill', 'relatedBillId',
            'fiscal_year', 'fiscalYear',
            'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'customer', 'supplier',
            'related_voucher', 'related_invoice', 'related_bill',
        ]

    def _sync_lines(self, voucher, items_data):
        if items_data is None:
            return
        voucher.lines.all().delete()
        for i, row in enumerate(items_data):
            VoucherLine.objects.create(
                voucher=voucher,
                product_id=row.get('product_id'),
                description=row.get('description') or '',
                hsn=row.get('hsn') or '',
                quantity=row.get('quantity') or 1,
                rate=row.get('rate') or 0,
                tax_rate=row.get('tax_rate') if row.get('tax_rate') is not None else voucher.tax_rate,
                sort_order=row.get('sort_order', i),
            )
        voucher.recalculate(save=True)

    def create(self, validated_data):
        items_data = validated_data.pop('lines', None)
        voucher = super().create(validated_data)
        if items_data is not None:
            self._sync_lines(voucher, items_data)
        else:
            voucher.recalculate(save=True)
        return voucher

    def update(self, instance, validated_data):
        items_data = validated_data.pop('lines', None)
        voucher = super().update(instance, validated_data)
        if items_data is not None:
            self._sync_lines(voucher, items_data)
        else:
            voucher.recalculate(save=True)
        return voucher


class JournalEntrySerializer(serializers.ModelSerializer):
    debitAccount = serializers.CharField(source='debit_account', required=False, allow_blank=True)
    creditAccount = serializers.CharField(source='credit_account', required=False, allow_blank=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'kind', 'number', 'date',
            'debit_account', 'debitAccount', 'credit_account', 'creditAccount',
            'amount', 'type', 'narration',
            'debit_ledger', 'credit_ledger', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ContraEntrySerializer(serializers.ModelSerializer):
    fromAccount = serializers.CharField(source='from_account')
    toAccount = serializers.CharField(source='to_account')

    class Meta:
        model = ContraEntry
        fields = [
            'id', 'number', 'date', 'from_account', 'fromAccount',
            'to_account', 'toAccount', 'amount', 'narration', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class BankReconciliationSerializer(serializers.ModelSerializer):
    statementDate = serializers.DateField(source='statement_date', required=False)
    bookBalance = serializers.DecimalField(
        source='book_balance', max_digits=14, decimal_places=2, required=False
    )
    bankBalance = serializers.DecimalField(
        source='bank_balance', max_digits=14, decimal_places=2, required=False
    )

    class Meta:
        model = BankReconciliation
        fields = [
            'id', 'statement_date', 'statementDate', 'bank', 'bank_account',
            'book_balance', 'bookBalance', 'bank_balance', 'bankBalance',
            'difference', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'difference', 'created_at']


class StockJournalSerializer(serializers.ModelSerializer):
    fromGodown = serializers.CharField(source='from_godown', required=False, allow_blank=True)
    toGodown = serializers.CharField(source='to_godown', required=False, allow_blank=True)
    productId = serializers.IntegerField(source='product_id', required=False, allow_null=True)
    sourceGodownId = serializers.IntegerField(source='source_godown_id', required=False, allow_null=True)
    destinationGodownId = serializers.IntegerField(
        source='destination_godown_id', required=False, allow_null=True
    )

    class Meta:
        model = StockJournal
        fields = [
            'id', 'number', 'date', 'item', 'product', 'productId',
            'from_godown', 'fromGodown', 'to_godown', 'toGodown',
            'source_godown', 'sourceGodownId', 'destination_godown', 'destinationGodownId',
            'qty', 'narration', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'product', 'source_godown', 'destination_godown']

    def validate(self, attrs):
        from books.models import Godown
        from inventory.models import Product
        from accounts.ownership import data_owner
        from companies.company_scope import get_active_company
        company = get_active_company(self.context['request'], required=True)

        product_id = attrs.get('product_id') or self.initial_data.get('productId')
        product = None
        if product_id:
            product = Product.objects.filter(pk=product_id, company=company).first()
            if not product:
                # also allow owner match when company null on legacy rows
                product = Product.objects.filter(
                    pk=product_id, owner=data_owner(self.context['request'].user)
                ).first()
            if not product:
                raise serializers.ValidationError({'productId': 'Product not found'})
            attrs['product'] = product
            if not attrs.get('item'):
                attrs['item'] = product.name

        src_id = attrs.get('source_godown_id') or self.initial_data.get('sourceGodownId')
        dst_id = attrs.get('destination_godown_id') or self.initial_data.get('destinationGodownId')
        # Resolve by name if IDs missing
        from_name = attrs.get('from_godown') or self.initial_data.get('fromGodown') or ''
        to_name = attrs.get('to_godown') or self.initial_data.get('toGodown') or ''

        src = None
        dst = None
        if src_id:
            src = Godown.objects.filter(pk=src_id, company=company).first()
            if not src:
                raise serializers.ValidationError({'sourceGodownId': 'Godown not found'})
        elif from_name:
            src = Godown.objects.filter(company=company, name__iexact=from_name.strip()).first()

        if dst_id:
            dst = Godown.objects.filter(pk=dst_id, company=company).first()
            if not dst:
                raise serializers.ValidationError({'destinationGodownId': 'Godown not found'})
        elif to_name:
            dst = Godown.objects.filter(company=company, name__iexact=to_name.strip()).first()

        if self.instance is None and product and (src or dst):
            if not src or not dst:
                raise serializers.ValidationError('Both from and to godown are required for transfer')
            if src.pk == dst.pk:
                raise serializers.ValidationError('From and To godown must be different')

        attrs['_src'] = src
        attrs['_dst'] = dst
        if src:
            attrs['source_godown'] = src
            attrs['from_godown'] = src.name
        if dst:
            attrs['destination_godown'] = dst
            attrs['to_godown'] = dst.name
        return attrs

    def create(self, validated):
        from inventory.models import transfer_godown_stock
        from accounts.ownership import data_owner
        src = validated.pop('_src', None)
        dst = validated.pop('_dst', None)
        product = validated.get('product')
        qty = validated.get('qty') or 0
        instance = super().create(validated)
        if product and src and dst and qty:
            try:
                transfer_godown_stock(
                    owner=data_owner(self.context['request'].user),
                    product=product,
                    from_godown=src,
                    to_godown=dst,
                    quantity=qty,
                    company=instance.company,
                    reference=instance.number,
                )
            except Exception as exc:
                instance.delete()
                raise serializers.ValidationError(str(exc))
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['productId'] = instance.product_id
        data['sourceGodownId'] = instance.source_godown_id
        data['destinationGodownId'] = instance.destination_godown_id
        data['fromGodown'] = instance.from_godown or (
            instance.source_godown.name if instance.source_godown_id else ''
        )
        data['toGodown'] = instance.to_godown or (
            instance.destination_godown.name if instance.destination_godown_id else ''
        )
        return data


class DocumentSeriesSerializer(serializers.ModelSerializer):
    nextNumber = serializers.IntegerField(source='next_number', required=False)

    class Meta:
        model = DocumentSeries
        fields = [
            'id', 'document', 'prefix', 'next_number', 'nextNumber', 'fy', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PrintTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintTemplate
        fields = ['id', 'name', 'document', 'paper', 'copies', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
