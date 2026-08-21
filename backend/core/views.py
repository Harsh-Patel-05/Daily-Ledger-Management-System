from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.ownership import data_owner
from companies.company_scope import scope_queryset, get_active_company
from customers.models import Customer
from transactions.models import Transaction
from invoices.models import Invoice
from notifications.models import Notification, ActivityLog
from .serializers import EmptySerializer


class DashboardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        user = data_owner(request.user)
        today = date.today()
        month_start = today.replace(day=1)

        customers = scope_queryset(Customer.objects.all(), request)
        txs = scope_queryset(Transaction.objects.all(), request)
        invoices = scope_queryset(Invoice.objects.all(), request)

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

        return Response(
            {
                'success': True,
                'message': 'Dashboard fetched successfully',
                'data': {
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
                },
            },
            status=status.HTTP_200_OK,
        )


class LedgerViewSet(viewsets.ModelViewSet):
    """Customer-wise ledger with opening + running balance (party books)."""

    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        from .models import OpeningBalance

        user = data_owner(request.user)
        company = get_active_company(request)
        customer_raw = request.query_params.get('customerId') or request.query_params.get('customer')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not customer_raw:
            customers = scope_queryset(Customer.objects.all(), request).order_by('name')
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
            return Response(
                {
                    'success': True,
                    'message': 'Customers fetched successfully',
                    'data': {'customers': data},
                },
                status=status.HTTP_200_OK,
            )

        pk = str(customer_raw).replace('cust_', '')
        try:
            customer = Customer.objects.get(pk=pk, owner=user, company=company)
        except Customer.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'message': 'Customer not found',
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        ob_row = scope_queryset(OpeningBalance.objects.all(), request).filter(
            party_type=OpeningBalance.PartyType.CUSTOMER,
            party_name__iexact=customer.name,
        ).order_by('-as_of').first()
        if ob_row:
            opening = Decimal(ob_row.amount or 0)
            if ob_row.type == OpeningBalance.BalanceType.CREDIT:
                opening = -opening
        else:
            opening = Decimal('0')
            if date_from:
                prior = scope_queryset(
                    Transaction.objects.filter(customer=customer, date__lt=date_from),
                    request,
                )
                for t in prior:
                    if t.type == Transaction.Type.CREDIT:
                        opening += t.amount
                    elif t.type in (
                        Transaction.Type.PAYMENT,
                        Transaction.Type.RETURN,
                        Transaction.Type.DISCOUNT,
                    ):
                        opening -= t.amount

        qs = scope_queryset(
            Transaction.objects.filter(customer=customer).all(),
            request,
        ).order_by('date', 'created_at')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        running = opening
        entries = []
        total_debit = Decimal('0')
        total_credit = Decimal('0')
        for t in qs:
            debit = Decimal('0')
            credit = Decimal('0')
            if t.type == Transaction.Type.CREDIT:
                debit = t.amount
                running += t.amount
            elif t.type in (
                Transaction.Type.PAYMENT,
                Transaction.Type.RETURN,
                Transaction.Type.DISCOUNT,
            ):
                credit = t.amount
                running -= t.amount
            total_debit += debit
            total_credit += credit
            entries.append({
                'id': t.pk,
                'date': t.date.isoformat(),
                'type': t.type,
                'description': t.item_description,
                'itemDescription': t.item_description,
                'quantity': float(t.quantity or 0),
                'rate': float(t.rate or 0),
                'debit': float(debit),
                'credit': float(credit),
                'runningBalance': float(running),
                'balance': float(running),
                'paymentMethod': t.payment_method,
                'notes': t.notes,
            })

        return Response(
            {
                'success': True,
                'message': 'Ledger fetched successfully',
                'data': {
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
                    'openingBalance': float(opening),
                    'closingBalance': float(running),
                    'totalDebit': float(total_debit),
                    'totalCredit': float(total_credit),
                    'totalCreditSale': float(total_debit),
                    'totalPayment': float(total_credit),
                },
            },
            status=status.HTTP_200_OK,
        )


class CashBookViewSet(viewsets.ModelViewSet):
    """Cash in/out for a date from transactions, purchase payments, expenses."""

    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        from purchase.models import PurchasePayment
        from expenses.models import Expense

        day = request.query_params.get('date') or date.today().isoformat()
        rows = []

        txs = scope_queryset(Transaction.objects.all(), request).filter(date=day)
        for t in txs:
            mode = (t.payment_method or 'Cash').lower()
            if mode != 'cash':
                continue
            in_amt = float(t.amount) if t.type == Transaction.Type.PAYMENT else 0
            out_amt = float(t.amount) if t.type in (
                Transaction.Type.RETURN, Transaction.Type.DISCOUNT
            ) else 0
            if t.type == Transaction.Type.CREDIT:
                continue
            rows.append({
                'id': f'tx-{t.pk}',
                'date': t.date.isoformat(),
                'note': t.notes or t.item_description or t.type,
                'inAmt': in_amt,
                'outAmt': out_amt,
                'source': 'transaction',
            })

        for p in scope_queryset(PurchasePayment.objects.all(), request).filter(date=day):
            mode = (getattr(p, 'mode', None) or getattr(p, 'payment_mode', None) or 'Cash')
            if str(mode).lower() != 'cash':
                continue
            rows.append({
                'id': f'pp-{p.pk}',
                'date': p.date.isoformat(),
                'note': f'Purchase · {getattr(p, "supplier_name", "") or ""}',
                'inAmt': 0,
                'outAmt': float(p.amount or 0),
                'source': 'purchase_payment',
            })

        for e in scope_queryset(Expense.objects.all(), request).filter(date=day):
            mode = (getattr(e, 'payment_mode', None) or 'Cash')
            if str(mode).lower() != 'cash':
                continue
            cat = getattr(e, 'category_name', None) or ''
            if not cat and getattr(e, 'category', None):
                cat = getattr(e.category, 'name', '') or ''
            rows.append({
                'id': f'ex-{e.pk}',
                'date': e.date.isoformat(),
                'note': cat or e.notes or 'Expense',
                'inAmt': 0,
                'outAmt': float(e.amount or 0),
                'source': 'expense',
            })

        rows.sort(key=lambda r: r['date'])
        cash_in = sum(r['inAmt'] for r in rows)
        cash_out = sum(r['outAmt'] for r in rows)
        return Response(
            {
                'success': True,
                'message': 'Cash book fetched successfully',
                'data': {
                    'date': day,
                    'rows': rows,
                    'cashIn': cash_in,
                    'cashOut': cash_out,
                    'net': cash_in - cash_out,
                },
            },
            status=status.HTTP_200_OK,
        )


class DayBookViewSet(viewsets.ModelViewSet):
    """All company entries for a selected day."""

    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        from purchase.models import PurchaseBill, PurchasePayment
        from expenses.models import Expense

        day = request.query_params.get('date') or date.today().isoformat()
        rows = []

        for t in scope_queryset(Transaction.objects.all(), request).filter(date=day):
            rows.append({
                'id': f't-{t.pk}',
                'time': t.date.isoformat(),
                'type': t.type,
                'ref': 'Txn',
                'amount': float(t.amount or 0),
                'note': t.notes or t.item_description,
            })
        for i in scope_queryset(Invoice.objects.all(), request).filter(date=day):
            rows.append({
                'id': f'i-{i.pk}',
                'time': i.date.isoformat(),
                'type': 'invoice',
                'ref': i.invoice_number,
                'amount': float(i.total or 0),
                'note': i.customer_business or i.customer_name,
            })
        for b in scope_queryset(PurchaseBill.objects.all(), request).filter(date=day):
            rows.append({
                'id': f'pb-{b.pk}',
                'time': b.date.isoformat(),
                'type': 'purchase',
                'ref': b.bill_no,
                'amount': float(b.total or 0),
                'note': b.supplier_name,
            })
        for p in scope_queryset(PurchasePayment.objects.all(), request).filter(date=day):
            rows.append({
                'id': f'pp-{p.pk}',
                'time': p.date.isoformat(),
                'type': 'purchase_payment',
                'ref': getattr(p, 'bill_no', None) or 'Pay',
                'amount': float(p.amount or 0),
                'note': getattr(p, 'supplier_name', '') or '',
            })
        for e in scope_queryset(Expense.objects.all(), request).filter(date=day):
            cat = getattr(getattr(e, 'category', None), 'name', None) or 'Expense'
            rows.append({
                'id': f'ex-{e.pk}',
                'time': e.date.isoformat(),
                'type': 'expense',
                'ref': cat,
                'amount': float(e.amount or 0),
                'note': e.notes or '',
            })

        rows.sort(key=lambda r: r['time'], reverse=True)
        return Response(
            {
                'success': True,
                'message': 'Day book fetched successfully',
                'data': {'date': day, 'rows': rows, 'count': len(rows)},
            },
            status=status.HTTP_200_OK,
        )


class ClosingBalanceViewSet(viewsets.ModelViewSet):
    """Company-level closing snapshot from live balances."""

    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        from purchase.models import PurchaseBill
        from expenses.models import Expense

        as_of = request.query_params.get('date') or date.today().isoformat()
        customers = scope_queryset(Customer.objects.all(), request)
        bills = scope_queryset(PurchaseBill.objects.all(), request)
        txs = scope_queryset(Transaction.objects.filter(date=as_of), request)
        expenses = scope_queryset(Expense.objects.filter(date=as_of), request)

        receivable = customers.aggregate(t=Sum('current_balance'))['t'] or 0
        payable = bills.aggregate(t=Sum('balance'))['t'] or 0
        today_in = txs.filter(type=Transaction.Type.PAYMENT).aggregate(t=Sum('amount'))['t'] or 0
        today_out = expenses.aggregate(t=Sum('amount'))['t'] or 0

        return Response(
            {
                'success': True,
                'message': 'Closing balance fetched successfully',
                'data': {
                    'asOf': as_of,
                    'receivable': float(receivable),
                    'payable': float(payable),
                    'todayIn': float(today_in),
                    'todayOut': float(today_out),
                    'customerCount': customers.count(),
                    'supplierBillCount': bills.filter(balance__gt=0).count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class ReportsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        user = data_owner(request.user)
        report_type = request.query_params.get('type', 'summary')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        today = date.today()

        if not date_from:
            date_from = (today - timedelta(days=30)).isoformat()
        if not date_to:
            date_to = today.isoformat()

        txs = scope_queryset(Transaction.objects.all(), request).filter(
            date__gte=date_from, date__lte=date_to
        )
        invoices = scope_queryset(Invoice.objects.all(), request).filter(
            date__gte=date_from, date__lte=date_to
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

        payload = {
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
        }

        if report_type == 'outstanding':
            due = list(
                scope_queryset(Customer.objects.filter(current_balance__gt=0), request)
                .order_by('-current_balance')
                .values('id', 'name', 'business_name', 'mobile', 'current_balance')
            )
            for row in due:
                row['businessName'] = row.pop('business_name')
                row['currentBalance'] = float(row.pop('current_balance') or 0)
            payload['rows'] = due
            payload['summary'] = {
                'partiesDue': len(due),
                'totalDue': sum(r['currentBalance'] for r in due),
            }

        elif report_type == 'payments':
            payload['summary'] = {
                'paymentIn': float(payment),
                'paymentOut': float(expense),
                'net': float(payment) - float(expense),
            }
            payload['rows'] = by_method

        elif report_type == 'inventory':
            from inventory.models import Product
            products = list(
                scope_queryset(Product.objects.all(), request)
                .order_by('name')
                .values(
                    'id', 'name', 'stock_qty', 'purchase_price',
                    'purchase_price_with_gst', 'selling_price', 'status',
                )[:100]
            )
            stock_value = 0
            low = 0
            out = 0
            for row in products:
                qty = float(row.pop('stock_qty') or 0)
                row['stockQty'] = qty
                row['purchasePrice'] = float(row.pop('purchase_price') or 0)
                row['purchasePriceWithGst'] = float(row.pop('purchase_price_with_gst') or 0)
                row['sellingPrice'] = float(row.pop('selling_price') or 0)
                stock_value += qty * (row['purchasePriceWithGst'] or row['purchasePrice'])
                if qty <= 0:
                    out += 1
                elif qty <= 5:
                    low += 1
            payload['rows'] = products
            payload['summary'] = {
                'products': len(products),
                'stockValue': stock_value,
                'lowStock': low,
                'outOfStock': out,
            }

        elif report_type == 'expenses':
            from expenses.models import Expense
            exps = scope_queryset(Expense.objects.all(), request).filter(
                date__gte=date_from, date__lte=date_to
            )
            by_cat = list(
                exps.values('category_name')
                .annotate(total=Sum('amount'), count=Count('id'))
                .order_by('-total')
            )
            for row in by_cat:
                row['categoryName'] = row.pop('category_name') or 'Uncategorized'
                row['total'] = float(row['total'] or 0)
            payload['rows'] = by_cat
            payload['summary'] = {
                'totalExpenses': float(exps.aggregate(t=Sum('amount'))['t'] or 0),
                'entries': exps.count(),
            }

        return Response(
            {
                'success': True,
                'message': 'Report fetched successfully',
                'data': payload,
            },
            status=status.HTTP_200_OK,
        )


class AnalyticsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        user = data_owner(request.user)
        today = date.today()
        months_back = int(request.query_params.get('months', 6))
        start = (today.replace(day=1) - timedelta(days=months_back * 30)).replace(day=1)

        txs = scope_queryset(Transaction.objects.all(), request).filter(date__gte=start)

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

        customers = scope_queryset(Customer.objects.all(), request)
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

        from invoices.models import InvoiceItem
        company = get_active_company(request)
        product_rows = (
            InvoiceItem.objects.filter(
                invoice__owner=user,
                invoice__company=company,
                invoice__date__gte=start,
            )
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

        return Response(
            {
                'success': True,
                'message': 'Analytics fetched successfully',
                'data': {
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
                },
            },
            status=status.HTTP_200_OK,
        )


class HealthViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = []
    serializer_class = EmptySerializer
    def get_queryset(self):
        return Customer.objects.none()

    def list(self, request, *args, **kwargs):
        return Response(
            {
                'success': True,
                'message': 'API is healthy',
                'data': {'status': 'ok', 'service': 'Daily Ledger API'},
            },
            status=status.HTTP_200_OK,
        )
