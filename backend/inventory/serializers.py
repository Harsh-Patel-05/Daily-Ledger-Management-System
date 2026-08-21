from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from accounts.ownership import data_owner
from .models import (
    Category,
    Brand,
    Supplier,
    Product,
    StockMovement,
    ProductAlternateUnit,
    GodownStock,
    apply_stock_movement,
    get_default_godown,
)


def _dec(value, default='0'):
    try:
        return Decimal(str(value if value is not None else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'color', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Category name is required')
        request = self.context['request']
        owner = data_owner(request.user)
        qs = Category.objects.filter(owner=owner, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Category with this name already exists')
        return value

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        return data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name', 'description', 'color', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Brand name is required')
        request = self.context['request']
        owner = data_owner(request.user)
        qs = Brand.objects.filter(owner=owner, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Brand with this name already exists')
        return value

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        return data


class SupplierSerializer(serializers.ModelSerializer):
    contactPerson = serializers.CharField(source='contact_person', required=False, allow_blank=True)

    class Meta:
        model = Supplier
        fields = (
            'id', 'name', 'contact_person', 'contactPerson', 'mobile', 'email',
            'address', 'gst', 'notes', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {'contact_person': {'required': False}}

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Supplier name is required')
        return value

    def validate_mobile(self, value):
        if not value:
            return value
        digits = ''.join(c for c in value if c.isdigit())
        if len(digits) != 10:
            raise serializers.ValidationError('Enter a valid 10-digit mobile number')
        return digits

    def create(self, validated):
        validated['owner'] = data_owner(self.context['request'].user)
        return super().create(validated)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['contactPerson'] = data.get('contact_person') or ''
        return data


class ProductAlternateUnitSerializer(serializers.ModelSerializer):
    unitId = serializers.IntegerField(source='unit_id')
    unitName = serializers.CharField(source='unit.name', read_only=True)
    conversionFactor = serializers.DecimalField(
        source='conversion_factor', max_digits=14, decimal_places=6
    )

    class Meta:
        model = ProductAlternateUnit
        fields = (
            'id', 'unitId', 'unitName', 'conversion_factor', 'conversionFactor',
            'barcode',
        )


class GodownStockSerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id')
    godownName = serializers.CharField(source='godown.name', read_only=True)
    productId = serializers.IntegerField(source='product_id', read_only=True)

    class Meta:
        model = GodownStock
        fields = ('id', 'productId', 'godownId', 'godownName', 'qty')


class ProductSerializer(serializers.ModelSerializer):
    categoryId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    brandId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    itemGroupId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    supplierId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    unitId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    godownId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    alternateUnits = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)
    purchasePrice = serializers.DecimalField(
        source='purchase_price', max_digits=12, decimal_places=2, required=False
    )
    purchaseDate = serializers.DateField(
        source='purchase_date', required=False, allow_null=True
    )
    sellingPrice = serializers.DecimalField(
        source='selling_price', max_digits=12, decimal_places=2, required=False
    )
    purchasePriceWithGst = serializers.DecimalField(
        source='purchase_price_with_gst', max_digits=12, decimal_places=2, required=False
    )
    sellingPriceWithGst = serializers.DecimalField(
        source='selling_price_with_gst', max_digits=12, decimal_places=2, required=False
    )
    taxRate = serializers.DecimalField(
        source='tax_rate', max_digits=5, decimal_places=2, required=False
    )
    stockQty = serializers.DecimalField(
        source='stock_qty', max_digits=12, decimal_places=2, required=False
    )
    purchasedQuantity = serializers.DecimalField(
        source='purchased_quantity', max_digits=12, decimal_places=2, required=False
    )
    reorderLevel = serializers.DecimalField(
        source='reorder_level', max_digits=12, decimal_places=2, required=False
    )

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'sku', 'barcode', 'brand', 'brandId', 'category', 'categoryId',
            'item_group', 'itemGroupId',
            'supplier', 'supplierId', 'unit', 'unitId', 'godownId', 'alternateUnits',
            'description',
            'purchase_date', 'purchaseDate',
            'purchase_price', 'purchasePrice',
            'purchase_price_with_gst', 'purchasePriceWithGst',
            'selling_price', 'sellingPrice',
            'selling_price_with_gst', 'sellingPriceWithGst',
            'tax_rate', 'taxRate', 'stock_qty', 'stockQty',
            'purchased_quantity', 'purchasedQuantity',
            'reorder_level', 'reorderLevel',
            'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'unit')
        extra_kwargs = {
            'category': {'required': False, 'allow_null': True},
            'brand': {'required': False, 'allow_null': True},
            'item_group': {'required': False, 'allow_null': True},
            'supplier': {'required': False, 'allow_null': True},
            'sku': {'required': False, 'allow_blank': True},
            'barcode': {'required': False, 'allow_blank': True},
            'purchase_date': {'required': False, 'allow_null': True},
            'purchase_price': {'required': False},
            'selling_price': {'required': False},
            'purchase_price_with_gst': {'required': False},
            'selling_price_with_gst': {'required': False},
            'tax_rate': {'required': False},
            'purchased_quantity': {'required': False},
            'stock_qty': {'required': False},
            'reorder_level': {'required': False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            owner = data_owner(request.user)
            self.fields['category'].queryset = Category.objects.filter(owner=owner)
            self.fields['brand'].queryset = Brand.objects.filter(owner=owner)
            self.fields['supplier'].queryset = Supplier.objects.filter(owner=owner)

    def _resolve_fk(self, model, raw, field_name):
        if raw in (None, '', 'null'):
            return None
        pk = str(raw).replace('cat_', '').replace('sup_', '').replace('prod_', '')
        owner = data_owner(self.context['request'].user)
        try:
            return model.objects.get(pk=pk, owner=owner)
        except (model.DoesNotExist, ValueError):
            raise serializers.ValidationError({field_name: 'Not found'})

    def _resolve_unit(self, raw):
        if raw in (None, '', 'null'):
            return None
        from books.models import Unit
        from companies.company_scope import get_active_company
        company = get_active_company(self.context['request'], required=False)
        qs = Unit.objects.all()
        if company:
            qs = qs.filter(company=company)
        try:
            return qs.get(pk=int(raw))
        except (Unit.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({'unitId': 'Unit not found'})

    def _resolve_item_group(self, raw):
        if raw in (None, '', 'null'):
            return None
        from books.models import ItemGroup
        from companies.company_scope import get_active_company
        company = get_active_company(self.context['request'], required=False)
        qs = ItemGroup.objects.all()
        if company:
            qs = qs.filter(company=company)
        try:
            return qs.get(pk=int(raw))
        except (ItemGroup.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({'itemGroupId': 'Item group not found'})

    def _resolve_godown(self, raw, company):
        if raw in (None, '', 'null'):
            return None
        from books.models import Godown
        try:
            return Godown.objects.get(pk=int(raw), company=company)
        except (Godown.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({'godownId': 'Godown not found'})

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Product name is required')
        return value

    def validate_barcode(self, value):
        value = (value or '').strip()
        if not value:
            return ''
        from companies.company_scope import get_active_company
        company = get_active_company(self.context['request'], required=False)
        qs = Product.objects.filter(barcode__iexact=value)
        if company:
            qs = qs.filter(company=company)
        else:
            qs = qs.filter(owner=data_owner(self.context['request'].user))
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Barcode already used on another product')
        return value

    def validate(self, attrs):
        if 'purchase_date' in attrs and attrs['purchase_date'] == '':
            attrs['purchase_date'] = None

        for key in (
            'purchase_price',
            'selling_price',
            'purchase_price_with_gst',
            'selling_price_with_gst',
            'tax_rate',
            'purchased_quantity',
            'reorder_level',
        ):
            if key in attrs and attrs[key] is not None and Decimal(attrs[key]) < 0:
                raise serializers.ValidationError({key: 'Must be zero or greater'})

        # opening stock only on create
        if self.instance is None:
            opening = attrs.get('stock_qty')
            if opening is None and 'stockQty' in self.initial_data:
                opening = _dec(self.initial_data.get('stockQty'))
                attrs['stock_qty'] = opening
            if opening is not None and Decimal(opening) < 0:
                raise serializers.ValidationError({'stockQty': 'Opening stock cannot be negative'})
        else:
            attrs.pop('stock_qty', None)

        raw_cat = self.initial_data.get('categoryId', self.initial_data.get('category_id'))
        if 'categoryId' in self.initial_data or 'category_id' in self.initial_data:
            attrs['category'] = self._resolve_fk(Category, raw_cat, 'categoryId')

        raw_brand = self.initial_data.get('brandId', self.initial_data.get('brand_id'))
        if 'brandId' in self.initial_data or 'brand_id' in self.initial_data:
            attrs['brand'] = self._resolve_fk(Brand, raw_brand, 'brandId')

        if 'itemGroupId' in self.initial_data or 'item_group_id' in self.initial_data:
            attrs['item_group'] = self._resolve_item_group(
                self.initial_data.get('itemGroupId', self.initial_data.get('item_group_id'))
            )

        raw_sup = self.initial_data.get('supplierId', self.initial_data.get('supplier_id'))
        if 'supplierId' in self.initial_data or 'supplier_id' in self.initial_data:
            attrs['supplier'] = self._resolve_fk(Supplier, raw_sup, 'supplierId')

        if 'unitId' in self.initial_data or 'unit_id' in self.initial_data:
            attrs['unit'] = self._resolve_unit(
                self.initial_data.get('unitId', self.initial_data.get('unit_id'))
            )

        attrs['_opening_godown_id'] = self.initial_data.get(
            'godownId', self.initial_data.get('godown_id')
        )
        attrs['_alternate_units'] = self.initial_data.get(
            'alternateUnits', self.initial_data.get('alternate_units', [])
        )

        attrs.pop('categoryId', None)
        attrs.pop('brandId', None)
        attrs.pop('itemGroupId', None)
        attrs.pop('supplierId', None)
        attrs.pop('unitId', None)
        attrs.pop('godownId', None)
        attrs.pop('alternateUnits', None)

        return attrs

    def _sync_alternate_units(self, product, rows):
        if rows is None:
            return
        from books.models import Unit
        from companies.company_scope import get_active_company
        company = get_active_company(self.context['request'], required=False)
        keep_ids = []
        for row in rows or []:
            unit_id = row.get('unitId') or row.get('unit_id')
            if not unit_id:
                continue
            qs = Unit.objects.filter(pk=int(unit_id))
            if company:
                qs = qs.filter(company=company)
            unit = qs.first()
            if not unit or (product.unit_id and unit.pk == product.unit_id):
                continue
            factor = _dec(row.get('conversionFactor', row.get('conversion_factor', 1)), '1')
            if factor <= 0:
                continue
            obj, _ = ProductAlternateUnit.objects.update_or_create(
                product=product,
                unit=unit,
                defaults={
                    'conversion_factor': factor,
                    'barcode': (row.get('barcode') or '')[:80],
                },
            )
            keep_ids.append(obj.pk)
        ProductAlternateUnit.objects.filter(product=product).exclude(pk__in=keep_ids).delete()

    def create(self, validated):
        request = self.context['request']
        owner = data_owner(request.user)
        opening = Decimal(validated.pop('stock_qty', 0) or 0)
        opening_godown_id = validated.pop('_opening_godown_id', None)
        alt_units = validated.pop('_alternate_units', [])
        validated.pop('categoryId', None)
        validated.pop('brandId', None)
        validated.pop('itemGroupId', None)
        validated.pop('supplierId', None)
        validated['stock_qty'] = Decimal('0')
        validated['owner'] = owner
        product = super().create(validated)
        self._sync_alternate_units(product, alt_units)
        if opening > 0:
            from companies.company_scope import get_active_company
            company = product.company or get_active_company(request, required=False)
            godown = None
            if opening_godown_id and company:
                godown = self._resolve_godown(opening_godown_id, company)
            apply_stock_movement(
                owner=owner,
                product=product,
                movement_type=StockMovement.Type.IN,
                quantity=opening,
                reason='Opening stock',
                company=company,
                godown=godown or get_default_godown(company),
            )
            product.refresh_from_db()
        return product

    def update(self, instance, validated):
        alt_units = validated.pop('_alternate_units', None)
        validated.pop('_opening_godown_id', None)
        validated.pop('categoryId', None)
        validated.pop('brandId', None)
        validated.pop('itemGroupId', None)
        validated.pop('supplierId', None)
        validated.pop('stock_qty', None)
        product = super().update(instance, validated)
        if alt_units is not None:
            self._sync_alternate_units(product, alt_units)
        return product

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = instance.pk
        data['sku'] = instance.sku or ''
        data['barcode'] = instance.barcode or ''
        data['categoryId'] = instance.category_id or ''
        data['brandId'] = instance.brand_id or ''
        data['itemGroupId'] = instance.item_group_id or ''
        data['itemGroup'] = instance.item_group.name if instance.item_group_id else ''
        data['supplierId'] = instance.supplier_id or ''
        data['unitId'] = instance.unit_id or ''
        data['unitName'] = instance.unit.name if instance.unit_id else ''
        data['brand'] = instance.brand.name if instance.brand_id else ''
        purchase = float(instance.purchase_price or 0)
        selling = float(instance.selling_price or 0)
        purchase_with = float(instance.purchase_price_with_gst or 0)
        selling_with = float(instance.selling_price_with_gst or 0)
        data['purchasePrice'] = purchase
        data['sellingPrice'] = selling
        data['purchasePriceWithoutGst'] = purchase
        data['sellingPriceWithoutGst'] = selling
        data['purchasePriceWithGst'] = purchase_with
        data['sellingPriceWithGst'] = selling_with
        data['taxRate'] = float(instance.tax_rate or 0)
        data['purchaseDate'] = instance.purchase_date.isoformat() if instance.purchase_date else ''
        data['stockQty'] = float(instance.stock_qty or 0)
        data['purchasedQuantity'] = float(instance.purchased_quantity or 0)
        data['reorderLevel'] = float(instance.reorder_level or 0)
        data['createdAt'] = instance.created_at.date().isoformat() if instance.created_at else None
        data['updatedAt'] = instance.updated_at.date().isoformat() if instance.updated_at else None
        data['isLowStock'] = instance.is_low_stock
        data['isOutOfStock'] = instance.is_out_of_stock
        data['alternateUnits'] = [
            {
                'id': a.id,
                'unitId': a.unit_id,
                'unitName': a.unit.name if a.unit_id else '',
                'conversionFactor': float(a.conversion_factor or 1),
                'barcode': a.barcode or '',
            }
            for a in instance.alternate_units.select_related('unit').all()
        ]
        data['godownStocks'] = [
            {
                'id': g.id,
                'godownId': g.godown_id,
                'godownName': g.godown.name if g.godown_id else '',
                'qty': float(g.qty or 0),
            }
            for g in instance.godown_stocks.select_related('godown').all()
        ]
        return data


class StockMovementSerializer(serializers.ModelSerializer):
    productId = serializers.CharField(write_only=True, required=False)
    godownId = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    newQty = serializers.DecimalField(
        write_only=True, max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = StockMovement
        fields = (
            'id', 'product', 'productId', 'godownId', 'type', 'quantity', 'newQty',
            'previous_qty', 'new_qty', 'reason', 'reference', 'date', 'created_at',
        )
        read_only_fields = (
            'id', 'product', 'previous_qty', 'new_qty', 'created_at',
        )
        extra_kwargs = {
            'type': {'required': True},
            'date': {'required': False},
        }

    def validate(self, attrs):
        request = self.context['request']
        owner = data_owner(request.user)
        raw = (
            self.initial_data.get('productId')
            or self.initial_data.get('product_id')
            or attrs.get('product')
        )
        if not raw:
            raise serializers.ValidationError({'productId': 'Product is required'})
        pk = str(getattr(raw, 'pk', raw)).replace('prod_', '')
        try:
            product = Product.objects.get(pk=pk, owner=owner)
        except (Product.DoesNotExist, ValueError):
            raise serializers.ValidationError({'productId': 'Product not found'})

        movement_type = attrs.get('type')
        if movement_type not in dict(StockMovement.Type.choices):
            raise serializers.ValidationError({'type': 'Invalid movement type'})

        from companies.company_scope import get_active_company
        from books.models import Godown
        company = product.company or get_active_company(request, required=False)
        godown = None
        raw_g = self.initial_data.get('godownId', self.initial_data.get('godown_id'))
        if raw_g not in (None, '', 'null'):
            try:
                godown = Godown.objects.get(pk=int(raw_g), company=company)
            except (Godown.DoesNotExist, ValueError, TypeError):
                raise serializers.ValidationError({'godownId': 'Godown not found'})
        else:
            godown = get_default_godown(company)

        if movement_type == StockMovement.Type.ADJUST:
            new_qty = attrs.get('newQty', self.initial_data.get('newQty', self.initial_data.get('new_qty')))
            if new_qty is None or new_qty == '':
                raise serializers.ValidationError({'newQty': 'New quantity is required'})
            attrs['new_qty_value'] = _dec(new_qty)
            if attrs['new_qty_value'] < 0:
                raise serializers.ValidationError({'newQty': 'Cannot be negative'})
        else:
            qty = attrs.get('quantity', self.initial_data.get('quantity'))
            qty = _dec(qty)
            if qty <= 0:
                raise serializers.ValidationError({'quantity': 'Quantity must be greater than 0'})
            if movement_type == StockMovement.Type.OUT and godown:
                available = GodownStock.objects.filter(
                    product=product, godown=godown
                ).values_list('qty', flat=True).first() or 0
                if qty > Decimal(available):
                    raise serializers.ValidationError({
                        'quantity': f'Insufficient stock at godown (available: {available})'
                    })
            attrs['quantity'] = qty

        attrs['product_obj'] = product
        attrs['godown_obj'] = godown
        return attrs

    def create(self, validated):
        request = self.context['request']
        owner = data_owner(request.user)
        product = validated['product_obj']
        movement_type = validated['type']
        try:
            movement = apply_stock_movement(
                owner=owner,
                product=product,
                movement_type=movement_type,
                quantity=validated.get('quantity'),
                new_qty=validated.get('new_qty_value'),
                reason=validated.get('reason', ''),
                reference=validated.get('reference', ''),
                date=validated.get('date'),
                company=product.company,
                godown=validated.get('godown_obj'),
            )
        except Exception as exc:
            raise serializers.ValidationError(str(exc))
        return movement

    def to_representation(self, instance):
        return {
            'id': instance.pk,
            'productId': instance.product_id,
            'productName': instance.product.name if instance.product_id else '',
            'godownId': instance.godown_id or '',
            'godownName': instance.godown.name if instance.godown_id else '',
            'type': instance.type,
            'quantity': float(instance.quantity or 0),
            'previousQty': float(instance.previous_qty or 0),
            'newQty': float(instance.new_qty or 0),
            'reason': instance.reason,
            'reference': instance.reference,
            'date': instance.date.isoformat() if instance.date else None,
            'createdAt': instance.created_at.isoformat() if instance.created_at else None,
        }
