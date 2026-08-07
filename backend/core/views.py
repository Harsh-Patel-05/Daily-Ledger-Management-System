from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from customers.models import Customer
from transactions.models import Transaction
from invoices.models import Invoice
from notifications.models import Notification, ActivityLog


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        month_start = today.replace(day=1)

        customers = Customer.objects.filter(owner=user)
        txs = Transaction.objects.filter(owner=user)
        invoices = Invoice.objects.filter(owner=user)

        total_receivable = customers.aggregate(t=Sum('current_balance'))['t'] or 0
        today_collection = txs.filter(
            date=today, type=Transaction.Type.PAYMENT
        ).aggregate(t=Sum('amount'))['t'] or 0
        month_credit = txs.filter(
            date__gte=month_start, type=Transaction.Type.CREDIT
        ).aggregate(t=Sum('amount'))['t'] or 0
        month_payment = txs.filter(
            date__gte=month_start, type=Transaction.Type.PAYMENT
        ).aggregate(t=Sum('amount'))['t'] or 0

        overdue_customers = customers.filter(
            Q(status=Customer.Status.OVERDUE) | Q(current_balance__gt=F('credit_limit'))
        ).count()
        unpaid_invoices = invoices.filter(
            status__in=[Invoice.Status.UNPAID, Invoice.Status.PARTIAL, Invoice.Status.OVERDUE]
        ).count()

        recent_txs = txs.select_related('customer').order_by('-date', '-created_at')[:8]
        recent = [
            {
                'id': t.pk,
                'date': t.date.isoformat(),
                'customerName': t.customer_name,
                'type': t.type,
                'amount': float(t.amount),
                'itemDescription': t.item_description,
            }
            for t in recent_txs
        ]

        top_debtors = customers.filter(current_balance__gt=0).order_by('-current_balance')[:5]
        debtors = [
            {
                'id': c.pk,
                'name': c.name,
                'businessName': c.business_name,
                'currentBalance': float(c.current_balance),
                'creditLimit': float(c.credit_limit),
            }
            for c in top_debtors
        ]

        activities = ActivityLog.objects.filter(owner=user)[:10]
        activity = [
            {
                'id': a.pk,
                'type': a.type,
                'message': a.message,
                'createdAt': a.created_at.isoformat(),
            }
            for a in activities
        ]

        unread = Notification.objects.filter(owner=user, is_read=False).count()

        return Response({
            'stats': {
                'totalReceivable': float(total_receivable),
                'todayCollection': float(today_collection),
                'monthCredit': float(month_credit),
                'monthPayment': float(month_payment),
                'customerCount': customers.count(),
                'overdueCustomers': overdue_customers,
                'unpaidInvoices': unpaid_invoices,
                'unreadNotifications': unread,
            },
            'recentTransactions': recent,
            'topDebtors': debtors,
            'activity': activity,
        })


class LedgerView(APIView):
    """Customer-wise ledger with running balance."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        customer_raw = request.query_params.get('customerId') or request.query_params.get('customer')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not customer_raw:
            # Summary of all customer ledgers
            customers = Customer.objects.filter(owner=user).order_by('name')
            data = [
                {
                    'id': c.pk,
                    'name': c.name,
                    'businessName': c.business_name,
                    'mobile': c.mobile,
                    'currentBalance': float(c.current_balance),
                    'lastTransaction': c.last_transaction.isoformat() if c.last_transaction else None,
                    'status': c.status,
                }
                for c in customers
            ]
            return Response({'customers': data})

        pk = str(customer_raw).replace('cust_', '')
        try:
            customer = Customer.objects.get(pk=pk, owner=user)
        except Customer.DoesNotExist:
            return Response({'detail': 'Customer not found'}, status=404)

        qs = Transaction.objects.filter(owner=user, customer=customer).order_by('date', 'created_at')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        running = Decimal('0')
        entries = []
        for t in qs:
            debit = Decimal('0')
            credit = Decimal('0')
            if t.type == Transaction.Type.CREDIT:
                debit = t.amount
                running += t.amount
            elif t.type in (Transaction.Type.PAYMENT, Transaction.Type.RETURN, Transaction.Type.DISCOUNT):
                credit = t.amount
                running -= t.amount
            entries.append({
                'id': t.pk,
                'date': t.date.isoformat(),
                'type': t.type,
                'description': t.item_description,
                'debit': float(debit),
                'credit': float(credit),
                'balance': float(max(Decimal('0'), running)),
                'paymentMethod': t.payment_method,
                'notes': t.notes,
            })

        return Response({
            'customer': {
                'id': customer.pk,
                'name': customer.name,
                'businessName': customer.business_name,
                'mobile': customer.mobile,
                'address': customer.address,
                'gst': customer.gst,
                'currentBalance': float(customer.current_balance),
                'creditLimit': float(customer.credit_limit),
            },
            'entries': entries,
            'openingBalance': 0,
            'closingBalance': float(customer.current_balance),
        })


class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        report_type = request.query_params.get('type', 'summary')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        today = date.today()

        if not date_from:
            date_from = (today - timedelta(days=30)).isoformat()
        if not date_to:
            date_to = today.isoformat()

        txs = Transaction.objects.filter(
            owner=user, date__gte=date_from, date__lte=date_to
        )
        invoices = Invoice.objects.filter(
            owner=user, date__gte=date_from, date__lte=date_to
        )

        credit = txs.filter(type='credit').aggregate(t=Sum('amount'))['t'] or 0
        payment = txs.filter(type='payment').aggregate(t=Sum('amount'))['t'] or 0
        expense = txs.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0
        returns = txs.filter(type='return').aggregate(t=Sum('amount'))['t'] or 0
        discount = txs.filter(type='discount').aggregate(t=Sum('amount'))['t'] or 0

        by_method = list(
            txs.filter(type='payment')
            .values('payment_method')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )
        for row in by_method:
            row['total'] = float(row['total'] or 0)

        # `date` is already a DateField — group directly (TruncDate breaks on SQLite)
        daily = list(
            txs.values('date')
            .annotate(
                credit=Sum('amount', filter=Q(type='credit')),
                payment=Sum('amount', filter=Q(type='payment')),
            )
            .order_by('date')
        )
        for row in daily:
            row['day'] = row.pop('date').isoformat() if row.get('date') else None
            row['credit'] = float(row['credit'] or 0)
            row['payment'] = float(row['payment'] or 0)

        invoice_stats = {
            'count': invoices.count(),
            'total': float(invoices.aggregate(t=Sum('total'))['t'] or 0),
            'collected': float(invoices.aggregate(t=Sum('paid_amount'))['t'] or 0),
            'outstanding': float(invoices.aggregate(t=Sum('balance'))['t'] or 0),
        }

        top_customers = list(
            txs.filter(type='credit', customer__isnull=False)
            .values('customer_id', 'customer__name')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')[:10]
        )
        for row in top_customers:
            row['customerId'] = row.pop('customer_id')
            row['name'] = row.pop('customer__name')
            row['total'] = float(row['total'] or 0)

        return Response({
            'type': report_type,
            'period': {'from': date_from, 'to': date_to},
            'summary': {
                'credit': float(credit),
                'payment': float(payment),
                'expense': float(expense),
                'return': float(returns),
                'discount': float(discount),
                'netReceivable': float(credit - payment - returns - discount),
            },
            'paymentMethods': by_method,
            'daily': daily,
            'invoices': invoice_stats,
            'topCustomers': top_customers,
        })


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        months_back = int(request.query_params.get('months', 6))
        start = (today.replace(day=1) - timedelta(days=months_back * 30)).replace(day=1)

        txs = Transaction.objects.filter(owner=user, date__gte=start)

        monthly = list(
            txs.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                credit=Sum('amount', filter=Q(type='credit')),
                payment=Sum('amount', filter=Q(type='payment')),
                expense=Sum('amount', filter=Q(type='expense')),
                count=Count('id'),
            )
            .order_by('month')
        )
        for row in monthly:
            row['month'] = row['month'].strftime('%Y-%m') if row['month'] else None
            row['credit'] = float(row['credit'] or 0)
            row['payment'] = float(row['payment'] or 0)
            row['expense'] = float(row['expense'] or 0)

        customers = Customer.objects.filter(owner=user)
        status_dist = list(
            customers.values('status').annotate(count=Count('id'))
        )

        top_by_balance = [
            {
                'name': c.name,
                'amount': float(c.current_balance),
                'transactions': c.transactions.count(),
            }
            for c in customers.filter(current_balance__gt=0).order_by('-current_balance')[:5]
        ]

        type_dist = list(
            txs.values('type').annotate(total=Sum('amount'), count=Count('id'))
        )
        for row in type_dist:
            row['total'] = float(row['total'] or 0)

        # Aggregate invoice line items for top products
        from invoices.models import InvoiceItem
        product_rows = (
            InvoiceItem.objects.filter(invoice__owner=user, invoice__date__gte=start)
            .values('description')
            .annotate(sold=Sum('quantity'), revenue=Sum('amount'))
            .order_by('-revenue')[:8]
        )
        top_products = [
            {
                'name': row['description'] or 'Item',
                'sold': float(row['sold'] or 0),
                'revenue': float(row['revenue'] or 0),
            }
            for row in product_rows
        ]

        return Response({
            'monthlyTrend': monthly,
            'customerStatus': status_dist,
            'topCustomers': top_by_balance,
            'topProducts': top_products,
            'transactionTypes': type_dist,
            'totals': {
                'customers': customers.count(),
                'receivable': float(customers.aggregate(t=Sum('current_balance'))['t'] or 0),
                'transactions': txs.count(),
            },
        })


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({'status': 'ok', 'service': 'Daily Ledger API'})
