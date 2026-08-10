from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.models import ShopRole, ShopPermission
from customers.models import Customer
from transactions.models import Transaction
from invoices.models import Invoice
from notifications.models import Notification, ActivityLog
from purchase.models import PurchaseBill, PurchasePayment, PurchaseReturn
from expenses.models import Expense, ExpenseCategory
from inventory.models import Category, Supplier, Product, StockMovement
from core.models import OpeningBalance

User = get_user_model()


class Command(BaseCommand):
    help = 'Remove demo/static business data (keeps user accounts). Use --all-users to clear every shop.'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='', help='Clear data for this owner email only')
        parser.add_argument('--all-users', action='store_true', help='Clear business data for all owners')

    def handle(self, *args, **options):
        if options['all_users']:
            owners = User.objects.filter(business_owner__isnull=True)
        elif options['email']:
            owners = User.objects.filter(email__iexact=options['email'], business_owner__isnull=True)
            if not owners.exists():
                self.stderr.write(f'Owner not found: {options["email"]}')
                return
        else:
            self.stderr.write('Pass --email=owner@example.com or --all-users')
            return

        total = 0
        for owner in owners:
            counts = self._clear_owner(owner)
            total += sum(counts.values())
            self.stdout.write(
                f'Cleared {owner.email}: ' + ', '.join(f'{k}={v}' for k, v in counts.items() if v)
            )
        self.stdout.write(self.style.SUCCESS(f'Done. Removed {total} rows.'))

    def _clear_owner(self, owner):
        models = [
            ('sales_returns', 'invoices.SalesReturn'),
            ('invoice_items', None),
            ('invoices', Invoice),
            ('transactions', Transaction),
            ('notifications', Notification),
            ('activity', ActivityLog),
            ('customers', Customer),
            ('purchase_payments', PurchasePayment),
            ('purchase_returns', PurchaseReturn),
            ('purchase_bills', PurchaseBill),
            ('expenses', Expense),
            ('expense_categories', ExpenseCategory),
            ('movements', StockMovement),
            ('products', Product),
            ('categories', Category),
            ('suppliers', Supplier),
            ('opening_balances', OpeningBalance),
            ('shop_roles', ShopRole),
            ('shop_permissions', ShopPermission),
        ]
        from invoices.models import SalesReturn, InvoiceItem

        counts = {}
        # Order matters for FKs
        ordered = [
            ('invoice_items', InvoiceItem.objects.filter(invoice__owner=owner)),
            ('sales_returns', SalesReturn.objects.filter(owner=owner)),
            ('invoices', Invoice.objects.filter(owner=owner)),
            ('transactions', Transaction.objects.filter(owner=owner)),
            ('notifications', Notification.objects.filter(owner=owner)),
            ('activity', ActivityLog.objects.filter(owner=owner)),
            ('customers', Customer.objects.filter(owner=owner)),
            ('purchase_payments', PurchasePayment.objects.filter(owner=owner)),
            ('purchase_returns', PurchaseReturn.objects.filter(owner=owner)),
            ('purchase_bills', PurchaseBill.objects.filter(owner=owner)),
            ('expenses', Expense.objects.filter(owner=owner)),
            ('expense_categories', ExpenseCategory.objects.filter(owner=owner)),
            ('movements', StockMovement.objects.filter(owner=owner)),
            ('products', Product.objects.filter(owner=owner)),
            ('categories', Category.objects.filter(owner=owner)),
            ('suppliers', Supplier.objects.filter(owner=owner)),
            ('opening_balances', OpeningBalance.objects.filter(owner=owner)),
            ('shop_roles', ShopRole.objects.filter(owner=owner)),
            ('shop_permissions', ShopPermission.objects.filter(owner=owner)),
        ]
        for name, qs in ordered:
            counts[name] = qs.count()
            qs.delete()

        # Staff accounts under this owner
        staff = User.objects.filter(business_owner=owner)
        counts['staff'] = staff.count()
        staff.delete()
        return counts
