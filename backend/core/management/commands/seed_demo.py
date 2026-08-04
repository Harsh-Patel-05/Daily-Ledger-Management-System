from datetime import date, timedelta
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.models import BusinessProfile, BusinessSettings
from customers.models import Customer
from transactions.models import Transaction
from invoices.models import Invoice, InvoiceItem
from notifications.models import Notification, ActivityLog

User = get_user_model()

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

ITEMS = [
    ('Atta 50kg', 2100), ('Rice 25kg', 1450), ('Sugar 10kg', 480),
    ('Dal Moong 5kg', 650), ('Oil 15L', 1850), ('Tea 1kg', 420),
    ('Soap Carton', 890), ('Detergent 5kg', 560), ('Masala Mix', 320),
    ('Biscuits Case', 750), ('Namkeen 5kg', 980), ('Salt 50kg', 280),
]

METHODS = ['Cash', 'UPI', 'Bank', 'Cheque']


class Command(BaseCommand):
    help = 'Seed demo owner + customers, transactions, invoices, notifications'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Clear existing demo data for this user')

    def handle(self, *args, **options):
        email = 'mukesh@ganeshtraders.com'
        password = 'password123'

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Mukesh',
                'last_name': 'Patel',
                'mobile': '9876543210',
                'shop_name': 'Ganesh Traders',
                'role': 'owner',
            },
        )
        if created or options['flush']:
            user.set_password(password)
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
            },
        )

        if options['flush']:
            Invoice.objects.filter(owner=user).delete()
            Transaction.objects.filter(owner=user).delete()
            Notification.objects.filter(owner=user).delete()
            ActivityLog.objects.filter(owner=user).delete()
            Customer.objects.filter(owner=user).delete()
            self.stdout.write('Flushed existing demo data')

        if Customer.objects.filter(owner=user).exists() and not options['flush']:
            self.stdout.write(self.style.WARNING(
                f'Demo data already exists for {email}. Use --flush to recreate.'
            ))
            self.stdout.write(f'Login: {email} / {password}')
            return

        today = date.today()
        customers = []
        for data in DEMO_CUSTOMERS:
            c = Customer.objects.create(owner=user, **data)
            customers.append(c)

        random.seed(42)
        tx_count = 0
        for i in range(80):
            cust = customers[i % len(customers)]
            d = today - timedelta(days=random.randint(0, 90))
            item_name, rate = random.choice(ITEMS)
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

        # Today's activity for dashboard
        for cust in customers[:4]:
            Transaction.objects.create(
                owner=user,
                customer=cust,
                date=today,
                type=Transaction.Type.PAYMENT,
                item_description='Payment received',
                quantity=1,
                rate=Decimal(random.randint(1000, 8000)),
                amount=Decimal(random.randint(1000, 8000)),
                payment_method=random.choice(['Cash', 'UPI']),
            )
            tx_count += 1

        for c in customers:
            c.recalculate_balance()

        # Sample invoices
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
                name, rate = random.choice(ITEMS)
                qty = random.choice([1, 2, 3])
                InvoiceItem.objects.create(
                    invoice=inv,
                    description=name,
                    hsn='1001',
                    quantity=qty,
                    rate=rate,
                    sort_order=j,
                )
            inv.recalculate_totals()

        # Notifications
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

        overdue = [c for c in customers if c.status == 'overdue']
        for cust in overdue:
            Notification.objects.create(
                owner=user,
                type=Notification.Type.OVERDUE,
                title=f'Overdue — {cust.name}',
                message=f'Account overdue. Balance ₹{cust.current_balance}',
                customer=cust,
                amount=cust.current_balance,
            )

        ActivityLog.objects.create(owner=user, type='system', message='Demo data seeded')
        ActivityLog.objects.create(owner=user, type='customer', message=f'{len(customers)} customers imported')
        ActivityLog.objects.create(owner=user, type='transaction', message=f'{tx_count} transactions recorded')

        self.stdout.write(self.style.SUCCESS(
            f'Seeded demo data for {email}\n'
            f'  Customers: {len(customers)}\n'
            f'  Transactions: {tx_count}\n'
            f'  Invoices: {Invoice.objects.filter(owner=user).count()}\n'
            f'Login: {email} / {password}'
        ))
