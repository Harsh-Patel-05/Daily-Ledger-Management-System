from datetime import date, timedelta
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.models import (
    BusinessProfile,
    BusinessSettings,
    ShopRole,
    ShopPermission,
)
from customers.models import Customer
from transactions.models import Transaction
from invoices.models import Invoice, InvoiceItem, SalesReturn
from notifications.models import Notification, ActivityLog
from inventory.models import Category, Brand, Supplier, Product, apply_stock_movement, StockMovement
from expenses.models import ExpenseCategory, Expense
from purchase.models import PurchaseBill, PurchasePayment, PurchaseReturn
from core.models import OpeningBalance

User = get_user_model()

DEMO_EMAIL = 'mukesh@ganeshtraders.com'
DEMO_PASSWORD = 'password123'

DEMO_CUSTOMERS = [
    {'name': 'Rajesh Kumar', 'mobile': '9876543210', 'business_name': 'Kumar Kirana Store',
     'address': '12, MG Road, Indore, MP 452001', 'gst': '23AABCK1234A1Z5',
     'email': 'rajesh.kumar@email.com', 'credit_limit': 50000, 'status': 'active',
     'notes': 'Regular wholesale customer'},
    {'name': 'Priya Sharma', 'mobile': '9123456780', 'business_name': 'Sharma General Store',
     'address': '45, Sarafa Bazaar, Indore, MP', 'gst': '23AABCS5678B1Z2',
     'email': 'priya.sharma@email.com', 'credit_limit': 30000, 'status': 'active',
     'notes': 'Prefers UPI payments'},
    {'name': 'Amit Patel', 'mobile': '9988776655', 'business_name': 'Patel Traders',
     'address': '78, Cotton Market, Indore', 'gst': '23AABCP9012C1Z8',
     'email': 'amit.patel@email.com', 'credit_limit': 100000, 'status': 'overdue',
     'notes': 'Large volume buyer'},
    {'name': 'Sunita Devi', 'mobile': '9876501234', 'business_name': 'Devi Provision Store',
     'address': '23, Rajwada Chowk, Indore', 'gst': '',
     'email': 'sunita.devi@email.com', 'credit_limit': 15000, 'status': 'active', 'notes': ''},
    {'name': 'Vikram Singh', 'mobile': '9765432109', 'business_name': 'Singh Wholesale Mart',
     'address': '56, Industrial Area, Dewas Road', 'gst': '23AABCV3456D1Z1',
     'email': 'vikram.singh@email.com', 'credit_limit': 200000, 'status': 'active',
     'notes': 'Monthly settlement preferred'},
    {'name': 'Fatima Sheikh', 'mobile': '9654321098', 'business_name': 'Sheikh Super Mart',
     'address': '89, Palasia Square, Indore', 'gst': '23AABCF7890E1Z3',
     'email': 'fatima.sheikh@email.com', 'credit_limit': 75000, 'status': 'active', 'notes': ''},
    {'name': 'Manoj Tiwari', 'mobile': '9543210987', 'business_name': 'Tiwari & Sons',
     'address': '34, Subhash Nagar, Indore', 'gst': '23AABCT2345F1Z6',
     'email': 'manoj.tiwari@email.com', 'credit_limit': 150000, 'status': 'active',
     'notes': 'Pays by cheque often'},
    {'name': 'Deepak Malhotra', 'mobile': '9432109876', 'business_name': 'Malhotra Retail',
     'address': '67, Vijay Nagar, Indore', 'gst': '',
     'email': 'deepak.m@email.com', 'credit_limit': 40000, 'status': 'active', 'notes': ''},
    {'name': 'Kavita Joshi', 'mobile': '9321098765', 'business_name': 'Joshi Kirana',
     'address': '11, Bhawarkua, Indore', 'gst': '',
     'email': 'kavita.joshi@email.com', 'credit_limit': 20000, 'status': 'inactive', 'notes': 'Seasonal'},
    {'name': 'Ramesh Yadav', 'mobile': '9210987654', 'business_name': 'Yadav Traders',
     'address': '90, Sanwer Road, Indore', 'gst': '23AABCY4567G1Z9',
     'email': 'ramesh.yadav@email.com', 'credit_limit': 80000, 'status': 'active', 'notes': ''},
    {'name': 'Anjali Gupta', 'mobile': '9109876543', 'business_name': 'Gupta Provisions',
     'address': '22, Sapna Sangeeta, Indore', 'gst': '',
     'email': 'anjali.g@email.com', 'credit_limit': 25000, 'status': 'active', 'notes': ''},
    {'name': 'Suresh Choudhary', 'mobile': '9098765432', 'business_name': 'Choudhary Wholesale',
     'address': '55, AB Road, Indore', 'gst': '23AABCC8901H1Z4',
     'email': 'suresh.c@email.com', 'credit_limit': 120000, 'status': 'overdue',
     'notes': 'Follow up pending'},
    {'name': 'Meena Verma', 'mobile': '8987654321', 'business_name': 'Verma Store',
     'address': '33, Rajendra Nagar, Indore', 'gst': '',
     'email': 'meena.verma@email.com', 'credit_limit': 18000, 'status': 'active', 'notes': ''},
    {'name': 'Imran Khan', 'mobile': '8876543210', 'business_name': 'Khan Enterprises',
     'address': '44, Khajuri Bazaar, Indore', 'gst': '23AABCI1234I1Z7',
     'email': 'imran.khan@email.com', 'credit_limit': 90000, 'status': 'active', 'notes': ''},
    {'name': 'Pooja Agrawal', 'mobile': '8765432109', 'business_name': 'Agrawal Mart',
     'address': '77, New Palasia, Indore', 'gst': '23AABCA5678J1Z0',
     'email': 'pooja.a@email.com', 'credit_limit': 60000, 'status': 'active', 'notes': ''},
]

# Grocery-style catalogue (purchase / selling without GST; GST rate applied separately)
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
    ('Carry Bags Pack', 'Generic', 'Packaging', 120, 160, 5, 40),  # low stock
    ('Floor Cleaner 5L', 'Lizol', 'Cleaning', 310, 380, 0, 15),  # out of stock
]

METHODS = ['Cash', 'UPI', 'Bank', 'Cheque']

PERMISSION_MODULES = [
    'Dashboard',
    'Customers',
    'Transactions',
    'Invoices',
    'Inventory',
    'Purchase',
    'Expenses',
    'Reports',
    'Settings',
    'Users',
]


class Command(BaseCommand):
    help = (
        'Seed full demo shop data for all frontend modules '
        '(customers, inventory, purchase, expenses, invoices, roles, etc.)'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Clear existing demo data for this owner before seeding',
        )
        parser.add_argument(
            '--all-owners',
            action='store_true',
            help='Also seed every other shop owner that has no customers yet',
        )

    def handle(self, *args, **options):
        email = DEMO_EMAIL
        password = DEMO_PASSWORD
        today = date.today()
        random.seed(42)

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
            self.stdout.write('Flushed existing demo data')

        if Customer.objects.filter(owner=user).exists() and not options['flush']:
            self.stdout.write(self.style.WARNING(
                f'Demo data already exists for {email}. Use --flush to recreate.'
            ))
            self.stdout.write(f'Login: {email} / {password}')
            self._seed_other_owners(user, flush=options['flush'], force=options['all_owners'])
            return

        # --- Customers ---
        customers = [Customer.objects.create(owner=user, **data) for data in DEMO_CUSTOMERS]

        # --- Inventory masters ---
        category_map = {}
        for name, color in [
            ('Groceries', '#0ea5e9'),
            ('Cleaning', '#10b981'),
            ('Packaging', '#f59e0b'),
        ]:
            category_map[name] = Category.objects.create(
                owner=user, name=name, description=f'{name} category', color=color
            )

        brand_map = {}
        for name in {
            'Aashirvaad', 'India Gate', 'Madhur', 'Tata Sampann', 'Fortune', 'Tata Tea',
            'Lux', 'Surf Excel', 'MDH', 'Parle', 'Haldiram', 'Tata Salt', 'Generic', 'Lizol',
        }:
            brand_map[name] = Brand.objects.create(owner=user, name=name)

        suppliers = [
            Supplier.objects.create(
                owner=user,
                name='Indore Agro Distributors',
                contact_person='Ravi Mehta',
                mobile='9811112233',
                email='sales@indoreagro.com',
                address='Warehouse Complex, Dewas Naka, Indore',
                gst='23AABCI1111A1Z1',
            ),
            Supplier.objects.create(
                owner=user,
                name='MP FMCG Supply Co.',
                contact_person='Neha Jain',
                mobile='9822223344',
                email='orders@mpfmcg.com',
                address='Scheme 78, Vijay Nagar, Indore',
                gst='23AABCM2222B1Z2',
            ),
            Supplier.objects.create(
                owner=user,
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
                name=name,
                brand=brand_map[brand],
                category=category_map[cat],
                supplier=suppliers[i % len(suppliers)],
                description=f'Demo product · {name}',
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
                    reason='Opening stock (demo seed)',
                    reference='SEED-OPEN',
                    date=today - timedelta(days=25),
                )
                product.refresh_from_db()
            products.append(product)

        # --- Transactions ---
        item_pairs = [(p.name, float(p.selling_price)) for p in products[:12]]
        tx_count = 0
        for i in range(80):
            cust = customers[i % len(customers)]
            d = today - timedelta(days=random.randint(0, 90))
            item_name, rate = random.choice(item_pairs)
            qty = random.choice([1, 2, 3, 5])
            amount = Decimal(rate * qty)
            ttype = random.choices(
                ['credit', 'payment', 'return', 'discount'],
                weights=[55, 35, 5, 5],
            )[0]
            if ttype == 'payment':
                amount = Decimal(random.randint(500, 15000))
                item_name = 'Payment received'
                qty, rate = 1, amount
            elif ttype in ('return', 'discount'):
                amount = Decimal(random.randint(200, 2000))
                qty, rate = 1, amount
                item_name = 'Return / Discount' if ttype == 'return' else 'Discount allowed'

            Transaction.objects.create(
                owner=user,
                customer=cust,
                date=d,
                type=ttype,
                item_description=item_name,
                quantity=qty,
                rate=rate,
                amount=amount,
                payment_method=random.choice(METHODS) if ttype == 'payment' else 'Credit',
                notes='',
            )
            tx_count += 1

        for cust in customers[:4]:
            amt = Decimal(random.randint(1000, 8000))
            Transaction.objects.create(
                owner=user,
                customer=cust,
                date=today,
                type=Transaction.Type.PAYMENT,
                item_description='Payment received',
                quantity=1,
                rate=amt,
                amount=amt,
                payment_method=random.choice(['Cash', 'UPI']),
            )
            tx_count += 1

        for c in customers:
            c.recalculate_balance()

        # --- Invoices (linked to products) ---
        invoices = []
        for i, cust in enumerate(customers[:6]):
            inv = Invoice.objects.create(
                owner=user,
                customer=cust,
                invoice_number=f'INV-{today.year}-{str(i + 1).zfill(4)}',
                date=today - timedelta(days=i * 3),
                due_date=today + timedelta(days=15 - i),
                customer_name=cust.name,
                customer_business=cust.business_name,
                customer_address=cust.address,
                customer_gst=cust.gst,
                customer_mobile=cust.mobile,
                discount=0,
                tax_rate=18,
                paid_amount=0 if i % 3 else Decimal('5000'),
                payment_method=Invoice.PaymentMethod.CREDIT,
                format=random.choice(['classic', 'modern', 'compact', 'traditional']),
                notes='Thank you for your business',
                terms='Payment due within 15 days',
            )
            for j in range(random.randint(2, 4)):
                product = products[(i + j) % len(products)]
                qty = Decimal(random.choice([1, 2, 3]))
                InvoiceItem.objects.create(
                    invoice=inv,
                    product=product,
                    description=product.name,
                    hsn='1001',
                    quantity=qty,
                    rate=product.selling_price,
                    sort_order=j,
                )
            inv.recalculate_totals()
            invoices.append(inv)

        # --- Sales returns ---
        for inv in invoices[:2]:
            SalesReturn.objects.create(
                owner=user,
                customer=inv.customer,
                invoice=inv,
                amount=Decimal('500.00'),
                date=today - timedelta(days=2),
                reason='Damaged goods returned',
                gst_applicable=True,
            )

        # --- Purchase bills / payments / returns ---
        bills = []
        for i, supplier in enumerate(suppliers):
            product = products[i]
            taxable = Decimal(product.purchase_price) * Decimal('10')
            gst_amt = (taxable * Decimal('0.18')).quantize(Decimal('0.01'))
            paid = Decimal('0') if i else taxable + gst_amt
            bill = PurchaseBill(
                owner=user,
                bill_no=f'PB-{today.year}-{str(i + 1).zfill(3)}',
                date=today - timedelta(days=10 + i),
                supplier=supplier,
                supplier_name=supplier.name,
                taxable_amount=taxable,
                gst_amount=gst_amt,
                paid=paid,
                gst_type=PurchaseBill.GstType.GST,
                notes='Demo purchase bill',
                product=product,
                stock_qty=Decimal('10'),
            )
            bill.recompute_totals(save=False)
            bill.save()
            bills.append(bill)

            if paid > 0:
                PurchasePayment.objects.create(
                    owner=user,
                    bill=bill,
                    bill_no=bill.bill_no,
                    supplier_name=supplier.name,
                    amount=paid,
                    mode='Bank',
                    date=bill.date,
                    notes='Full payment on receipt',
                )

        # Partial payment on second bill
        if len(bills) > 1:
            partial = (bills[1].total / 2).quantize(Decimal('0.01'))
            PurchasePayment.objects.create(
                owner=user,
                bill=bills[1],
                bill_no=bills[1].bill_no,
                supplier_name=bills[1].supplier_name,
                amount=partial,
                mode='UPI',
                date=today - timedelta(days=5),
                notes='Partial payment',
            )
            bills[1].paid = partial
            bills[1].recompute_totals(save=True)

        PurchaseReturn.objects.create(
            owner=user,
            bill=bills[0],
            bill_no=bills[0].bill_no,
            supplier_name=bills[0].supplier_name,
            amount=Decimal('800.00'),
            gst_type=PurchaseBill.GstType.GST,
            reason='Short expiry stock returned',
            date=today - timedelta(days=3),
        )

        # --- Expenses ---
        exp_cats = {}
        for name in ['Rent', 'Utilities', 'Transport', 'Miscellaneous']:
            exp_cats[name] = ExpenseCategory.objects.create(
                owner=user, name=name, description=f'{name} expenses', status='active'
            )

        expense_rows = [
            ('Rent', 15000, 'Bank', 'Shop rent', 'Non-GST', 28),
            ('Utilities', 3200, 'UPI', 'Electricity bill', 'Non-GST', 20),
            ('Utilities', 900, 'Cash', 'Water charges', 'Non-GST', 18),
            ('Transport', 4500, 'Cash', 'Goods delivery', 'Non-GST', 12),
            ('Transport', 2800, 'UPI', 'Local cartage', 'Non-GST', 7),
            ('Miscellaneous', 1200, 'Cash', 'Stationery', 'GST', 5),
            ('Miscellaneous', 750, 'UPI', 'Tea / staff snacks', 'Non-GST', 3),
            ('Rent', 5000, 'Bank', 'Godown rent (partial)', 'Non-GST', 1),
            ('Utilities', 1500, 'UPI', 'Internet', 'Non-GST', 0),
            ('Transport', 1800, 'Cash', 'Courier return pickup', 'Non-GST', 2),
        ]
        for cat_name, amount, mode, notes, gst_type, days_ago in expense_rows:
            Expense.objects.create(
                owner=user,
                category=exp_cats[cat_name],
                category_name=cat_name,
                date=today - timedelta(days=days_ago),
                amount=Decimal(amount),
                payment_mode=mode,
                notes=notes,
                gst_type=gst_type,
            )

        # --- Opening balances ---
        OpeningBalance.objects.create(
            owner=user,
            party_type=OpeningBalance.PartyType.CUSTOMER,
            party_name=customers[0].name,
            customer=customers[0],
            amount=Decimal('5000.00'),
            type=OpeningBalance.BalanceType.DEBIT,
            as_of=today.replace(month=4, day=1) if today.month >= 4 else today.replace(year=today.year - 1, month=4, day=1),
        )
        OpeningBalance.objects.create(
            owner=user,
            party_type=OpeningBalance.PartyType.SUPPLIER,
            party_name=suppliers[0].name,
            amount=Decimal('12000.00'),
            type=OpeningBalance.BalanceType.CREDIT,
            as_of=today.replace(month=4, day=1) if today.month >= 4 else today.replace(year=today.year - 1, month=4, day=1),
        )
        OpeningBalance.objects.create(
            owner=user,
            party_type=OpeningBalance.PartyType.CASH,
            party_name='Cash in hand',
            amount=Decimal('8500.00'),
            type=OpeningBalance.BalanceType.DEBIT,
            as_of=today.replace(month=4, day=1) if today.month >= 4 else today.replace(year=today.year - 1, month=4, day=1),
        )

        # --- Roles / permissions / staff ---
        ShopRole.objects.create(
            owner=user, name='Staff', description='Counter / billing staff'
        )
        ShopRole.objects.create(
            owner=user, name='Accountant', description='Accounts and reports access'
        )
        for module in PERMISSION_MODULES:
            full = module in ('Dashboard', 'Customers', 'Transactions', 'Invoices', 'Reports')
            ShopPermission.objects.create(
                owner=user,
                module=module,
                can_view=True,
                can_create=full or module in ('Inventory', 'Purchase', 'Expenses'),
                can_edit=full or module in ('Inventory', 'Purchase', 'Expenses'),
                can_delete=module in ('Customers', 'Transactions'),
            )

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

        # --- Notifications / activity ---
        for cust in customers[:5]:
            if cust.current_balance > 0:
                Notification.objects.create(
                    owner=user,
                    type=Notification.Type.PAYMENT_REMINDER,
                    title=f'Payment reminder — {cust.name}',
                    message=f'{cust.business_name} has outstanding ₹{cust.current_balance}',
                    customer=cust,
                    amount=cust.current_balance,
                )

        for cust in [c for c in customers if c.status == 'overdue']:
            Notification.objects.create(
                owner=user,
                type=Notification.Type.OVERDUE,
                title=f'Overdue — {cust.name}',
                message=f'Account overdue. Balance ₹{cust.current_balance}',
                customer=cust,
                amount=cust.current_balance,
            )

        ActivityLog.objects.create(owner=user, type='system', message='Demo data seeded')
        ActivityLog.objects.create(
            owner=user, type='customer', message=f'{len(customers)} customers imported'
        )
        ActivityLog.objects.create(
            owner=user, type='transaction', message=f'{tx_count} transactions recorded'
        )
        ActivityLog.objects.create(
            owner=user, type='inventory', message=f'{len(products)} products seeded'
        )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded full demo data for {email}\n'
            f'  Customers: {len(customers)}\n'
            f'  Products: {len(products)}\n'
            f'  Categories/Brands/Suppliers: '
            f'{Category.objects.filter(owner=user).count()}/'
            f'{Brand.objects.filter(owner=user).count()}/'
            f'{Supplier.objects.filter(owner=user).count()}\n'
            f'  Transactions: {tx_count}\n'
            f'  Invoices: {Invoice.objects.filter(owner=user).count()}\n'
            f'  Purchase bills: {PurchaseBill.objects.filter(owner=user).count()}\n'
            f'  Expenses: {Expense.objects.filter(owner=user).count()}\n'
            f'  Opening balances: {OpeningBalance.objects.filter(owner=user).count()}\n'
            f'  Roles/Permissions: '
            f'{ShopRole.objects.filter(owner=user).count()}/'
            f'{ShopPermission.objects.filter(owner=user).count()}\n'
            f'Login (owner): {email} / {password}\n'
            f'Login (staff): staff@ganeshtraders.com / password123'
        ))
        self._seed_other_owners(user, flush=options['flush'], force=options['all_owners'])

    def _seed_other_owners(self, demo_user, flush=False, force=False):
        others = User.objects.filter(business_owner__isnull=True).exclude(pk=demo_user.pk)
        if not others.exists():
            return
        for other in others:
            if Customer.objects.filter(owner=other).exists() and not flush:
                self.stdout.write(f'Skip {other.email} (already has customers)')
                continue
            if flush:
                self._flush_owner(other)
            self._seed_ledger_modules(other)
            self.stdout.write(self.style.SUCCESS(
                f'Seeded ledger modules for {other.email} '
                f'(customers={Customer.objects.filter(owner=other).count()}, '
                f'products={Product.objects.filter(owner=other).count()})'
            ))

    def _seed_ledger_modules(self, user):
        """Fill customers / sales / purchase / expenses for an existing shop owner."""
        today = date.today()
        random.seed(42 + (user.pk or 0))

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

        customers = [Customer.objects.create(owner=user, **data) for data in DEMO_CUSTOMERS]

        products = list(Product.objects.filter(owner=user))
        suppliers = list(Supplier.objects.filter(owner=user))
        if not products:
            category_map = {}
            for name, color in [
                ('Groceries', '#0ea5e9'),
                ('Cleaning', '#10b981'),
                ('Packaging', '#f59e0b'),
            ]:
                category_map[name], _ = Category.objects.get_or_create(
                    owner=user, name=name, defaults={'description': f'{name} category', 'color': color}
                )
            brand_map = {}
            for name in {
                'Aashirvaad', 'India Gate', 'Madhur', 'Tata Sampann', 'Fortune', 'Tata Tea',
                'Lux', 'Surf Excel', 'MDH', 'Parle', 'Haldiram', 'Tata Salt', 'Generic', 'Lizol',
            }:
                brand_map[name], _ = Brand.objects.get_or_create(owner=user, name=name)
            if not suppliers:
                suppliers = [
                    Supplier.objects.create(
                        owner=user,
                        name='Indore Agro Distributors',
                        contact_person='Ravi Mehta',
                        mobile='9811112233',
                        gst='23AABCI1111A1Z1',
                    ),
                    Supplier.objects.create(
                        owner=user,
                        name='MP FMCG Supply Co.',
                        contact_person='Neha Jain',
                        mobile='9822223344',
                        gst='23AABCM2222B1Z2',
                    ),
                    Supplier.objects.create(
                        owner=user,
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
                        reason='Opening stock (demo seed)',
                        reference='SEED-OPEN',
                        date=today - timedelta(days=25),
                    )
                    product.refresh_from_db()
                products.append(product)
        elif not suppliers:
            suppliers = [
                Supplier.objects.create(
                    owner=user, name='Local Supplier', mobile='9800000000'
                )
            ]

        item_pairs = [(p.name, float(p.selling_price or 100)) for p in products[:12]] or [
            ('Item', 500.0)
        ]
        for i in range(80):
            cust = customers[i % len(customers)]
            d = today - timedelta(days=random.randint(0, 90))
            item_name, rate = random.choice(item_pairs)
            qty = random.choice([1, 2, 3, 5])
            amount = Decimal(str(rate * qty))
            ttype = random.choices(
                ['credit', 'payment', 'return', 'discount'],
                weights=[55, 35, 5, 5],
            )[0]
            if ttype == 'payment':
                amount = Decimal(random.randint(500, 15000))
                item_name = 'Payment received'
                qty, rate = 1, amount
            elif ttype in ('return', 'discount'):
                amount = Decimal(random.randint(200, 2000))
                qty, rate = 1, amount
                item_name = 'Return / Discount' if ttype == 'return' else 'Discount allowed'
            Transaction.objects.create(
                owner=user,
                customer=cust,
                date=d,
                type=ttype,
                item_description=item_name,
                quantity=qty,
                rate=rate,
                amount=amount,
                payment_method=random.choice(METHODS) if ttype == 'payment' else 'Credit',
            )

        for c in customers:
            c.recalculate_balance()

        invoices = []
        for i, cust in enumerate(customers[:6]):
            inv = Invoice.objects.create(
                owner=user,
                customer=cust,
                invoice_number=f'INV-{today.year}-{str(i + 1).zfill(4)}',
                date=today - timedelta(days=i * 3),
                due_date=today + timedelta(days=15 - i),
                customer_name=cust.name,
                customer_business=cust.business_name,
                customer_address=cust.address,
                customer_gst=cust.gst,
                customer_mobile=cust.mobile,
                tax_rate=18,
                paid_amount=0 if i % 3 else Decimal('5000'),
                payment_method=Invoice.PaymentMethod.CREDIT,
                notes='Thank you for your business',
                terms='Payment due within 15 days',
            )
            for j in range(2):
                product = products[j % len(products)] if products else None
                qty = Decimal(random.choice([1, 2, 3]))
                rate = product.selling_price if product else Decimal('500')
                InvoiceItem.objects.create(
                    invoice=inv,
                    product=product,
                    description=product.name if product else 'Item',
                    quantity=qty,
                    rate=rate,
                    sort_order=j,
                )
            inv.recalculate_totals()
            invoices.append(inv)

        if invoices:
            SalesReturn.objects.create(
                owner=user,
                customer=invoices[0].customer,
                invoice=invoices[0],
                amount=Decimal('500.00'),
                date=today - timedelta(days=2),
                reason='Damaged goods returned',
                gst_applicable=True,
            )

        if suppliers and not PurchaseBill.objects.filter(owner=user).exists():
            supplier = suppliers[0]
            product = products[0] if products else None
            taxable = Decimal('10000.00')
            gst_amt = Decimal('1800.00')
            bill = PurchaseBill(
                owner=user,
                bill_no=f'PB-{today.year}-001',
                date=today - timedelta(days=10),
                supplier=supplier,
                supplier_name=supplier.name,
                taxable_amount=taxable,
                gst_amount=gst_amt,
                paid=Decimal('0'),
                gst_type=PurchaseBill.GstType.GST,
                product=product,
                stock_qty=Decimal('10'),
            )
            bill.recompute_totals(save=False)
            bill.save()
            PurchasePayment.objects.create(
                owner=user,
                bill=bill,
                bill_no=bill.bill_no,
                supplier_name=supplier.name,
                amount=Decimal('5000.00'),
                mode='UPI',
                date=today - timedelta(days=5),
            )
            bill.paid = Decimal('5000.00')
            bill.recompute_totals(save=True)

        if not ExpenseCategory.objects.filter(owner=user).exists():
            exp_cats = {}
            for name in ['Rent', 'Utilities', 'Transport', 'Miscellaneous']:
                exp_cats[name] = ExpenseCategory.objects.create(
                    owner=user, name=name, status='active'
                )
            Expense.objects.create(
                owner=user, category=exp_cats['Rent'], category_name='Rent',
                date=today - timedelta(days=5), amount=Decimal('15000'),
                payment_mode='Bank', notes='Shop rent', gst_type='Non-GST',
            )
            Expense.objects.create(
                owner=user, category=exp_cats['Utilities'], category_name='Utilities',
                date=today - timedelta(days=2), amount=Decimal('3200'),
                payment_mode='UPI', notes='Electricity bill', gst_type='Non-GST',
            )
            Expense.objects.create(
                owner=user, category=exp_cats['Transport'], category_name='Transport',
                date=today, amount=Decimal('1800'),
                payment_mode='Cash', notes='Delivery', gst_type='Non-GST',
            )

        fy = today.replace(month=4, day=1) if today.month >= 4 else today.replace(
            year=today.year - 1, month=4, day=1
        )
        if not OpeningBalance.objects.filter(owner=user).exists():
            OpeningBalance.objects.create(
                owner=user,
                party_type=OpeningBalance.PartyType.CUSTOMER,
                party_name=customers[0].name,
                customer=customers[0],
                amount=Decimal('5000.00'),
                type=OpeningBalance.BalanceType.DEBIT,
                as_of=fy,
            )
            OpeningBalance.objects.create(
                owner=user,
                party_type=OpeningBalance.PartyType.CASH,
                party_name='Cash in hand',
                amount=Decimal('8500.00'),
                type=OpeningBalance.BalanceType.DEBIT,
                as_of=fy,
            )

        if not ShopRole.objects.filter(owner=user).exists():
            ShopRole.objects.create(owner=user, name='Staff', description='Counter / billing staff')
            ShopRole.objects.create(owner=user, name='Accountant', description='Accounts and reports')
        if not ShopPermission.objects.filter(owner=user).exists():
            for module in PERMISSION_MODULES:
                ShopPermission.objects.create(
                    owner=user, module=module, can_view=True,
                    can_create=True, can_edit=True, can_delete=False,
                )

        ActivityLog.objects.create(owner=user, type='system', message='Demo ledger data seeded')

    def _flush_owner(self, owner):
        from invoices.models import InvoiceItem

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
        StockMovement.objects.filter(owner=owner).delete()
        Product.objects.filter(owner=owner).delete()
        Brand.objects.filter(owner=owner).delete()
        Category.objects.filter(owner=owner).delete()
        Supplier.objects.filter(owner=owner).delete()
        Customer.objects.filter(owner=owner).delete()
        ShopRole.objects.filter(owner=owner).delete()
        ShopPermission.objects.filter(owner=owner).delete()
        User.objects.filter(business_owner=owner).delete()
