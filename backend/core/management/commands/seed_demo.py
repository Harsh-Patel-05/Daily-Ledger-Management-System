"""
Seed master-module data + default roles/permissions for Daily Ledger.

Keeps:
  - Demo owner user + business profile/settings
  - Companies + fiscal years + chart of accounts / bank / units / HSN / godowns / series
  - Party master (customers + vendors/suppliers)
  - Item master (categories, brands, products with opening stock)
  - Default roles (Owner, Staff, Accountant) + full permission matrix

Does NOT seed transactional data (invoices, payments, journals, expenses, etc.).
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import (
    BusinessProfile,
    BusinessSettings,
    ShopPermission,
    ShopRole,
)
from customers.models import Customer
from inventory.models import (
    Brand,
    Category,
    Product,
    StockMovement,
    Supplier,
    apply_stock_movement,
)
from notifications.models import ActivityLog

User = get_user_model()

DEMO_EMAIL = 'mukesh@ganeshtraders.com'
DEMO_PASSWORD = 'password123'

DEMO_CUSTOMERS = [
    {'name': 'Rajesh Kumar', 'mobile': '9876543210', 'business_name': 'Kumar Kirana Store',
     'address': '12, MG Road, Indore, MP 452001', 'billing_address': '12, MG Road, Indore, MP 452001',
     'shipping_address': '12, MG Road, Indore, MP 452001', 'gst': '23AABCK1234A1Z5',
     'email': 'rajesh.kumar@email.com', 'credit_limit': 50000, 'status': 'active',
     'state': 'Madhya Pradesh', 'state_code': '23', 'pincode': '452001',
     'notes': 'Regular wholesale customer'},
    {'name': 'Priya Sharma', 'mobile': '9123456780', 'business_name': 'Sharma General Store',
     'address': '45, Sarafa Bazaar, Indore, MP', 'billing_address': '45, Sarafa Bazaar, Indore, MP',
     'shipping_address': '45, Sarafa Bazaar, Indore, MP', 'gst': '23AABCS5678B1Z2',
     'email': 'priya.sharma@email.com', 'credit_limit': 30000, 'status': 'active',
     'state': 'Madhya Pradesh', 'state_code': '23', 'pincode': '452002',
     'notes': 'Prefers UPI payments'},
    {'name': 'Amit Patel', 'mobile': '9988776655', 'business_name': 'Patel Traders',
     'address': '78, Cotton Market, Indore', 'billing_address': '78, Cotton Market, Indore',
     'shipping_address': '78, Cotton Market, Indore', 'gst': '23AABCP9012C1Z8',
     'email': 'amit.patel@email.com', 'credit_limit': 100000, 'status': 'active',
     'state': 'Madhya Pradesh', 'state_code': '23', 'pincode': '452003',
     'notes': 'Large volume buyer'},
    {'name': 'Sunita Devi', 'mobile': '9876501234', 'business_name': 'Devi Provision Store',
     'address': '23, Rajwada Chowk, Indore', 'billing_address': '23, Rajwada Chowk, Indore',
     'shipping_address': '23, Rajwada Chowk, Indore', 'gst': '',
     'email': 'sunita.devi@email.com', 'credit_limit': 15000, 'status': 'active',
     'state': 'Madhya Pradesh', 'state_code': '23', 'pincode': '452004', 'notes': ''},
    {'name': 'Vikram Singh', 'mobile': '9765432109', 'business_name': 'Singh Wholesale Mart',
     'address': '56, Industrial Area, Dewas Road', 'billing_address': '56, Industrial Area, Dewas Road',
     'shipping_address': '56, Industrial Area, Dewas Road', 'gst': '23AABCV3456D1Z1',
     'email': 'vikram.singh@email.com', 'credit_limit': 200000, 'status': 'active',
     'state': 'Madhya Pradesh', 'state_code': '23', 'pincode': '452010',
     'notes': 'Monthly settlement preferred'},
]

DEMO_PRODUCTS = [
    # name, brand, category, purchase, selling, stock, purchased_qty
    ('Atta 50kg', 'Aashirvaad', 'Groceries', 2100, 2350, 40, 50),
    ('Rice 25kg', 'India Gate', 'Groceries', 1450, 1650, 28, 40),
    ('Sugar 10kg', 'Madhur', 'Groceries', 480, 540, 60, 80),
    ('Dal Moong 5kg', 'Tata Sampann', 'Groceries', 650, 740, 22, 30),
    ('Oil 15L', 'Fortune', 'Groceries', 1850, 2100, 15, 25),
    ('Tea 1kg', 'Tata Tea', 'Groceries', 420, 480, 35, 40),
    ('Soap Carton', 'Lux', 'Cleaning', 890, 1020, 12, 20),
    ('Detergent 5kg', 'Surf Excel', 'Cleaning', 560, 650, 8, 20),
    ('Masala Mix', 'MDH', 'Groceries', 320, 380, 45, 50),
    ('Biscuits Case', 'Parle', 'Packaging', 750, 860, 18, 30),
    ('Namkeen 5kg', 'Haldiram', 'Groceries', 980, 1120, 10, 20),
    ('Salt 50kg', 'Tata Salt', 'Groceries', 280, 320, 55, 60),
    ('Corrugated Box (L)', 'Generic', 'Packaging', 45, 70, 200, 250),
    ('Carry Bags Pack', 'Generic', 'Packaging', 120, 160, 5, 40),
    ('Floor Cleaner 5L', 'Lizol', 'Cleaning', 310, 380, 0, 15),
]

DEFAULT_ROLES = [
    ('Owner', 'Full access to all modules'),
    ('Staff', 'Counter / billing staff — day-to-day transactions'),
    ('Accountant', 'Accounts, ledgers, GST and reports access'),
]

# Module access matrix — aligned with frontend menuConfig / Munim modules.
PERMISSION_MODULES = [
    'Dashboard',
    'Companies',
    'Charts of Account',
    'Accounts',
    'Bank',
    'Transporter',
    'Customers',
    'Vendors',
    'Outstanding',
    'Inventory',
    'Item Groups',
    'Categories',
    'Brands',
    'Units',
    'HSN / SAC',
    'Godowns',
    'Stock',
    'Invoices',
    'Quotations',
    'Proforma Invoice',
    'Sales Orders',
    'Delivery Challans',
    'Credit Notes',
    'Sales Payments',
    'Sales Returns',
    'Purchase',
    'Purchase Orders',
    'Goods Receipt',
    'Debit Notes',
    'Purchase Payments',
    'Purchase Returns',
    'Expenses',
    'Receipt',
    'Payment',
    'Contra Entry',
    'Bank Reconciliation',
    'Journal Voucher',
    'GST Journal',
    'Transactions',
    'Party Ledger',
    'Cash Book',
    'Day Book',
    'Opening Balance',
    'Closing Balance',
    'Stock Adjustment',
    'Stock Journal',
    'GST',
    'GSTR-1',
    'GSTR-3B',
    'E-Invoice',
    'E-Way Bill',
    'Reports',
    'Sales Register',
    'Purchase Register',
    'Journal Register',
    'Trial Balance',
    'Balance Sheet',
    'Users',
    'Roles',
    'Permissions',
    'Settings',
    'Series Configuration',
    'Print Templates',
    'Notifications',
]

_PERMISSION_FULL = {
    'Dashboard', 'Companies', 'Charts of Account', 'Accounts', 'Bank', 'Transporter',
    'Customers', 'Vendors', 'Invoices', 'Quotations', 'Proforma Invoice', 'Sales Orders',
    'Delivery Challans', 'Credit Notes', 'Sales Payments', 'Sales Returns',
    'Purchase', 'Purchase Orders', 'Goods Receipt', 'Debit Notes',
    'Purchase Payments', 'Purchase Returns', 'Inventory', 'Item Groups', 'Categories',
    'Brands', 'Units', 'HSN / SAC', 'Godowns', 'Stock', 'Expenses',
    'Receipt', 'Payment', 'Contra Entry', 'Bank Reconciliation', 'Journal Voucher',
    'GST Journal', 'Transactions', 'Party Ledger', 'Cash Book', 'Day Book',
    'Opening Balance', 'Stock Adjustment', 'Stock Journal', 'Reports',
}
_PERMISSION_DELETE = {
    'Companies', 'Customers', 'Vendors', 'Transactions', 'Invoices', 'Quotations',
    'Sales Orders', 'Credit Notes', 'Purchase', 'Purchase Orders', 'Debit Notes',
    'Inventory', 'Expenses', 'Contra Entry', 'Journal Voucher', 'GST Journal',
    'Stock Journal', 'Users',
}
_PERMISSION_EXTRA_WRITE = {
    'Settings', 'Series Configuration', 'Print Templates', 'Users', 'Roles',
    'Permissions', 'GST', 'GSTR-1', 'GSTR-3B', 'E-Invoice', 'E-Way Bill',
    'Outstanding', 'Closing Balance', 'Sales Register', 'Purchase Register',
    'Journal Register', 'Trial Balance', 'Balance Sheet', 'Notifications',
}


def default_permission_flags(module, *, owner_style=True):
    if not owner_style:
        return {
            'can_view': True,
            'can_create': module in _PERMISSION_FULL,
            'can_edit': module in _PERMISSION_FULL,
            'can_delete': False,
        }
    return {
        'can_view': True,
        'can_create': module in _PERMISSION_FULL or module in _PERMISSION_EXTRA_WRITE,
        'can_edit': module in _PERMISSION_FULL or module in _PERMISSION_EXTRA_WRITE,
        'can_delete': module in _PERMISSION_DELETE,
    }


def ensure_shop_permissions(owner, *, reset=False, owner_style=True):
    if reset:
        ShopPermission.objects.filter(owner=owner).delete()
    existing = {p.module: p for p in ShopPermission.objects.filter(owner=owner)}
    created = 0
    for module in PERMISSION_MODULES:
        if module in existing:
            continue
        flags = default_permission_flags(module, owner_style=owner_style)
        ShopPermission.objects.create(owner=owner, module=module, **flags)
        created += 1
    return created


def ensure_default_roles(owner, *, reset=False):
    if reset:
        ShopRole.objects.filter(owner=owner, is_system=True).delete()
        # Also clear non-system leftovers when full reset requested
        ShopRole.objects.filter(owner=owner).delete()
    created = 0
    for name, description in DEFAULT_ROLES:
        role, was_created = ShopRole.objects.get_or_create(
            owner=owner,
            name=name,
            defaults={'description': description, 'is_system': True},
        )
        if was_created:
            created += 1
        elif not role.is_system:
            role.is_system = True
            role.description = description or role.description
            role.save(update_fields=['is_system', 'description'])
    return created


class Command(BaseCommand):
    help = (
        'Seed master modules only: companies, CoA, parties, items, '
        'default roles and permissions. No invoices/transactions/expenses.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Clear existing shop data for this owner before seeding',
        )
        parser.add_argument(
            '--all-owners',
            action='store_true',
            help='Also seed master data for other shop owners that have no customers yet',
        )

    def handle(self, *args, **options):
        email = DEMO_EMAIL
        password = DEMO_PASSWORD
        today = date.today()

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Mukesh',
                'last_name': 'Patel',
                'mobile': '9876543210',
                'shop_name': 'Ganesh Traders',
                'role': User.Role.OWNER,
            },
        )
        if created or options['flush']:
            user.set_password(password)
            user.first_name = 'Mukesh'
            user.last_name = 'Patel'
            user.mobile = '9876543210'
            user.shop_name = 'Ganesh Traders'
            user.role = User.Role.OWNER
            user.business_owner = None
            user.save()

        BusinessProfile.objects.update_or_create(
            user=user,
            defaults={
                'shop_name': 'Ganesh Traders',
                'owner_name': 'Mukesh Patel',
                'email': email,
                'mobile': '9876543210',
                'address': '15, Wholesale Market, Indore, MP 452001',
                'gst': '23AABCG1234K1Z5',
                'invoice_prefix': 'INV',
                'bank_name': 'State Bank of India',
                'bank_account': '123456789012',
                'bank_ifsc': 'SBIN0001234',
                'bank_branch': 'Indore Main',
                'upi_id': 'ganeshtraders@sbi',
            },
        )
        BusinessSettings.objects.update_or_create(
            user=user,
            defaults={
                'business_name': 'Ganesh Traders',
                'gst_number': '23AABCG1234K1Z5',
                'invoice_prefix': 'INV',
                'default_tax_rate': 18,
                'default_payment_terms': 15,
                'low_stock_alert': True,
                'payment_reminders': True,
                'overdue_alerts': True,
                'daily_summary': True,
                'invoice_alerts': True,
                'sms_notifications': True,
            },
        )

        if options['flush']:
            self._flush_owner(user)
            self.stdout.write('Flushed existing shop data')

        if Customer.objects.filter(owner=user).exists() and not options['flush']:
            self._ensure_companies(user)
            roles_added = ensure_default_roles(user, reset=False)
            perms_added = ensure_shop_permissions(user, reset=False, owner_style=True)
            if roles_added or perms_added:
                self.stdout.write(self.style.SUCCESS(
                    f'Synced defaults for {email}: +{roles_added} roles, +{perms_added} permissions'
                ))
            self.stdout.write(self.style.WARNING(
                f'Master data already exists for {email}. Use --flush to recreate.'
            ))
            self.stdout.write(f'Login: {email} / {password}')
            self._seed_other_owners(user, flush=options['flush'], force=options['all_owners'])
            return

        # Primary company first — all master data is scoped to it (Munim-style)
        primary = self._ensure_companies(user, reset=options['flush'])

        # --- Party master ---
        customers = [
            Customer.objects.create(owner=user, company=primary, **data)
            for data in DEMO_CUSTOMERS
        ]

        # --- Item master ---
        category_map = {}
        for name, color in [
            ('Groceries', '#0ea5e9'),
            ('Cleaning', '#10b981'),
            ('Packaging', '#f59e0b'),
        ]:
            category_map[name] = Category.objects.create(
                owner=user, company=primary, name=name, description=f'{name} category', color=color
            )

        brand_map = {}
        for name in {
            'Aashirvaad', 'India Gate', 'Madhur', 'Tata Sampann', 'Fortune', 'Tata Tea',
            'Lux', 'Surf Excel', 'MDH', 'Parle', 'Haldiram', 'Tata Salt', 'Generic', 'Lizol',
        }:
            brand_map[name] = Brand.objects.create(owner=user, company=primary, name=name)

        suppliers = [
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='Indore Agro Distributors',
                contact_person='Ravi Mehta',
                mobile='9811112233',
                email='sales@indoreagro.com',
                address='Warehouse Complex, Dewas Naka, Indore',
                gst='23AABCI1111A1Z1',
            ),
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='MP FMCG Supply Co.',
                contact_person='Neha Jain',
                mobile='9822223344',
                email='orders@mpfmcg.com',
                address='Scheme 78, Vijay Nagar, Indore',
                gst='23AABCM2222B1Z2',
            ),
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='PackRight India',
                contact_person='Sanjay Rawat',
                mobile='9833334455',
                email='hello@packright.in',
                address='Sanwer Road Industrial Area, Indore',
                gst='23AABCP3333C1Z3',
            ),
        ]

        products = []
        for i, (name, brand, cat, purchase, selling, stock, purchased) in enumerate(DEMO_PRODUCTS):
            gst_rate = Decimal('18')
            purchase_d = Decimal(purchase)
            selling_d = Decimal(selling)
            product = Product.objects.create(
                owner=user,
                company=primary,
                name=name,
                brand=brand_map[brand],
                category=category_map[cat],
                supplier=suppliers[i % len(suppliers)],
                description=f'Master product · {name}',
                purchase_date=today - timedelta(days=30 + (i % 20)),
                purchase_price=purchase_d,
                selling_price=selling_d,
                purchase_price_with_gst=(purchase_d * (1 + gst_rate / 100)).quantize(Decimal('0.01')),
                selling_price_with_gst=(selling_d * (1 + gst_rate / 100)).quantize(Decimal('0.01')),
                tax_rate=gst_rate,
                stock_qty=0,
                purchased_quantity=Decimal(purchased),
                status=Product.Status.ACTIVE,
            )
            if stock > 0:
                apply_stock_movement(
                    owner=user,
                    product=product,
                    movement_type=StockMovement.Type.IN,
                    quantity=Decimal(stock),
                    reason='Opening stock (master seed)',
                    reference='SEED-OPEN',
                    date=today - timedelta(days=25),
                    company=primary,
                )
                product.refresh_from_db()
            products.append(product)

        # --- Default roles + permissions ---
        ensure_default_roles(user, reset=True)
        ensure_shop_permissions(user, reset=True, owner_style=True)

        staff, staff_created = User.objects.get_or_create(
            email='staff@ganeshtraders.com',
            defaults={
                'first_name': 'Ravi',
                'last_name': 'Sharma',
                'mobile': '9900011122',
                'shop_name': 'Ganesh Traders',
                'role': User.Role.STAFF,
                'business_owner': user,
                'is_active_staff': True,
            },
        )
        if staff_created or options['flush']:
            staff.set_password('password123')
            staff.business_owner = user
            staff.role = User.Role.STAFF
            staff.is_active_staff = True
            staff.save()

        ActivityLog.objects.create(
            owner=user, type='system', message='Master modules seeded'
        )

        from companies.models import Company

        self.stdout.write(self.style.SUCCESS(
            f'Seeded master data for {email}\n'
            f'  Companies: {Company.objects.filter(owner=user).count()}\n'
            f'  Customers: {len(customers)}\n'
            f'  Vendors: {len(suppliers)}\n'
            f'  Products: {len(products)}\n'
            f'  Categories/Brands: '
            f'{Category.objects.filter(owner=user).count()}/'
            f'{Brand.objects.filter(owner=user).count()}\n'
            f'  Roles/Permissions: '
            f'{ShopRole.objects.filter(owner=user).count()}/'
            f'{ShopPermission.objects.filter(owner=user).count()}\n'
            f'Login (owner): {email} / {password}\n'
            f'Login (staff): staff@ganeshtraders.com / password123'
        ))
        self._seed_other_owners(user, flush=options['flush'], force=options['all_owners'])

    def _ensure_companies(self, user, reset=False):
        from companies.models import Company
        from companies.services import (
            ensure_default_fiscal_years,
            ensure_primary_company,
            seed_company_defaults,
        )

        if reset:
            Company.objects.filter(owner=user).delete()

        # Primary = logged-in user's shop (Ganesh Traders)
        primary = ensure_primary_company(user)
        primary.name = 'Ganesh Traders'
        primary.legal_name = 'Mukesh Kumar'
        primary.organization_type = 'Proprietorship'
        primary.registration_type = 'Regular (With GST)'
        primary.gstin = '23AABCG1234K1Z5'
        primary.pan = primary.pan or 'AABCG1234K'
        primary.address_line1 = '15, Wholesale Market'
        primary.address_line2 = ''
        primary.city = 'Indore'
        primary.state = 'Madhya Pradesh'
        primary.pincode = '452001'
        primary.mobile = primary.mobile or '9876543210'
        primary.email = primary.email or user.email
        primary.is_primary = True
        primary.is_default = True
        primary.parent = None
        primary.save()

        # Sub-company WITH GST
        gst_sub, _ = Company.objects.update_or_create(
            owner=user,
            name='SEEMA ENTERPRISE',
            defaults={
                'parent': primary,
                'is_primary': False,
                'alias': 'Jack',
                'gstin': '24DEJPP6431L1Z4',
                'pan': 'DEJPP6431L',
                'registration_type': 'Regular (With GST)',
                'legal_name': 'DHRUMIL JAIMINBHAI PATEL',
                'organization_type': 'Proprietorship',
                'address_line1': '01, CF, Zaverinagar',
                'address_line2': 'Dabhoi, Dabhoi',
                'pincode': '391110',
                'state': 'GUJARAT',
                'city': 'CHHOTAUDEPUR',
                'mobile': '9510037187',
                'email': 'seema.enterprise@outlook.com',
                'is_default': False,
                'subscription_status': 'Active',
            },
        )
        # Sub-company WITHOUT GST
        nogst_sub, _ = Company.objects.update_or_create(
            owner=user,
            name='Seema Electricals',
            defaults={
                'parent': primary,
                'is_primary': False,
                'registration_type': 'Unregistered',
                'gstin': '',
                'organization_type': 'Public Limited Company',
                'legal_name': 'Seema Electricals',
                'city': 'CHHOTAUDEPUR',
                'state': 'GUJARAT',
                'mobile': '9510037187',
                'is_default': False,
                'subscription_status': 'Active',
            },
        )
        for c in (primary, gst_sub, nogst_sub):
            ensure_default_fiscal_years(c)
            seed_company_defaults(c)
        return primary

    def _seed_other_owners(self, demo_user, flush=False, force=False):
        """Optionally seed empty shop owners. Never flush other owners on demo --flush."""
        if not force:
            return
        others = User.objects.filter(business_owner__isnull=True).exclude(pk=demo_user.pk)
        for other in others:
            if Customer.objects.filter(owner=other).exists():
                self.stdout.write(f'Skip {other.email} (already has master data)')
                continue
            self._seed_master_modules(other)
            self.stdout.write(self.style.SUCCESS(
                f'Seeded masters for {other.email} '
                f'(customers={Customer.objects.filter(owner=other).count()}, '
                f'products={Product.objects.filter(owner=other).count()})'
            ))

    def _seed_master_modules(self, user):
        """Party + item masters + roles/permissions for an existing shop owner."""
        today = date.today()
        primary = self._ensure_companies(user)

        BusinessProfile.objects.get_or_create(
            user=user,
            defaults={
                'shop_name': user.shop_name or 'My Shop',
                'owner_name': user.name,
                'email': user.email,
                'mobile': user.mobile or '',
                'invoice_prefix': 'INV',
            },
        )
        BusinessSettings.objects.get_or_create(
            user=user,
            defaults={
                'business_name': user.shop_name or 'My Shop',
                'invoice_prefix': 'INV',
                'default_tax_rate': 18,
            },
        )

        for data in DEMO_CUSTOMERS:
            Customer.objects.create(owner=user, company=primary, **data)

        category_map = {}
        for name, color in [
            ('Groceries', '#0ea5e9'),
            ('Cleaning', '#10b981'),
            ('Packaging', '#f59e0b'),
        ]:
            category_map[name], _ = Category.objects.get_or_create(
                owner=user,
                name=name,
                defaults={
                    'company': primary,
                    'description': f'{name} category',
                    'color': color,
                },
            )
            if not category_map[name].company_id:
                category_map[name].company = primary
                category_map[name].save(update_fields=['company'])
        brand_map = {}
        for name in {
            'Aashirvaad', 'India Gate', 'Madhur', 'Tata Sampann', 'Fortune', 'Tata Tea',
            'Lux', 'Surf Excel', 'MDH', 'Parle', 'Haldiram', 'Tata Salt', 'Generic', 'Lizol',
        }:
            brand_map[name], _ = Brand.objects.get_or_create(
                owner=user, name=name, defaults={'company': primary}
            )
            if not brand_map[name].company_id:
                brand_map[name].company = primary
                brand_map[name].save(update_fields=['company'])

        suppliers = [
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='Indore Agro Distributors',
                contact_person='Ravi Mehta',
                mobile='9811112233',
                gst='23AABCI1111A1Z1',
            ),
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='MP FMCG Supply Co.',
                contact_person='Neha Jain',
                mobile='9822223344',
                gst='23AABCM2222B1Z2',
            ),
            Supplier.objects.create(
                owner=user,
                company=primary,
                name='PackRight India',
                contact_person='Sanjay Rawat',
                mobile='9833334455',
                gst='23AABCP3333C1Z3',
            ),
        ]

        for i, (name, brand, cat, purchase, selling, stock, purchased) in enumerate(DEMO_PRODUCTS):
            gst_rate = Decimal('18')
            purchase_d = Decimal(purchase)
            selling_d = Decimal(selling)
            product = Product.objects.create(
                owner=user,
                company=primary,
                name=name,
                brand=brand_map[brand],
                category=category_map[cat],
                supplier=suppliers[i % len(suppliers)],
                purchase_date=today - timedelta(days=30 + (i % 20)),
                purchase_price=purchase_d,
                selling_price=selling_d,
                purchase_price_with_gst=(purchase_d * (1 + gst_rate / 100)).quantize(Decimal('0.01')),
                selling_price_with_gst=(selling_d * (1 + gst_rate / 100)).quantize(Decimal('0.01')),
                tax_rate=gst_rate,
                stock_qty=0,
                purchased_quantity=Decimal(purchased),
                status=Product.Status.ACTIVE,
            )
            if stock > 0:
                apply_stock_movement(
                    owner=user,
                    product=product,
                    movement_type=StockMovement.Type.IN,
                    quantity=Decimal(stock),
                    reason='Opening stock (master seed)',
                    reference='SEED-OPEN',
                    date=today - timedelta(days=25),
                    company=primary,
                )

        ensure_default_roles(user, reset=False)
        ensure_shop_permissions(user, reset=False, owner_style=True)
        ActivityLog.objects.create(owner=user, type='system', message='Master modules seeded')

    def _flush_owner(self, owner):
        from companies.models import Company
        from core.models import OpeningBalance
        from expenses.models import Expense, ExpenseCategory
        from invoices.models import Invoice, InvoiceItem, SalesReturn
        from notifications.models import Notification
        from purchase.models import PurchaseBill, PurchasePayment, PurchaseReturn
        from transactions.models import Transaction
        from django.db import connection

        # Clear leftover transactional data if any, then masters
        InvoiceItem.objects.filter(invoice__owner=owner).delete()
        SalesReturn.objects.filter(owner=owner).delete()
        Invoice.objects.filter(owner=owner).delete()
        Transaction.objects.filter(owner=owner).delete()
        Notification.objects.filter(owner=owner).delete()
        ActivityLog.objects.filter(owner=owner).delete()
        OpeningBalance.objects.filter(owner=owner).delete()
        PurchasePayment.objects.filter(owner=owner).delete()
        PurchaseReturn.objects.filter(owner=owner).delete()
        PurchaseBill.objects.filter(owner=owner).delete()
        Expense.objects.filter(owner=owner).delete()
        ExpenseCategory.objects.filter(owner=owner).delete()

        # Extra inventory tables that may FK to products (not always in Django models)
        product_ids = list(Product.objects.filter(owner=owner).values_list('id', flat=True))
        with connection.cursor() as cursor:
            if product_ids:
                placeholders = ','.join('?' * len(product_ids))
                for table in (
                    'inventory_stockserial',
                    'inventory_stockbatch',
                    'inventory_godownstock',
                    'inventory_stockmovement',
                ):
                    try:
                        cursor.execute(
                            f'DELETE FROM {table} WHERE product_id IN ({placeholders})',
                            product_ids,
                        )
                    except Exception:
                        pass
            try:
                cursor.execute(
                    'DELETE FROM inventory_godown WHERE owner_id = ?',
                    [owner.id],
                )
            except Exception:
                pass

        StockMovement.objects.filter(owner=owner).delete()
        Product.objects.filter(owner=owner).delete()
        Brand.objects.filter(owner=owner).delete()
        Category.objects.filter(owner=owner).delete()
        Supplier.objects.filter(owner=owner).delete()
        Customer.objects.filter(owner=owner).delete()
        Company.objects.filter(owner=owner).delete()
        ShopRole.objects.filter(owner=owner).delete()
        ShopPermission.objects.filter(owner=owner).delete()
        User.objects.filter(business_owner=owner).delete()
