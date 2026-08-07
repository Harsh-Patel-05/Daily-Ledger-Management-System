"""Generate in-app notifications from live ledger state + user settings."""
from datetime import date, timedelta

from django.db.models import Sum

from accounts.models import BusinessSettings
from customers.models import Customer
from invoices.models import Invoice
from transactions.models import Transaction
from .models import Notification, ActivityLog


def _settings_for(user):
    obj, _ = BusinessSettings.objects.get_or_create(user=user)
    return obj


def _has_open(owner, ntype, title):
    return Notification.objects.filter(
        owner=owner,
        type=ntype,
        title=title,
        is_read=False,
    ).exists()


def _create(owner, ntype, title, message, customer=None, amount=None):
    if _has_open(owner, ntype, title):
        return None
    return Notification.objects.create(
        owner=owner,
        type=ntype,
        title=title,
        message=message,
        customer=customer,
        amount=amount,
    )


def refresh_statuses(user):
    """Mark overdue invoices / customers based on dates and balances."""
    today = date.today()

    Invoice.objects.filter(
        owner=user,
        due_date__lt=today,
        balance__gt=0,
    ).exclude(status=Invoice.Status.PAID).update(status=Invoice.Status.OVERDUE)

    for customer in Customer.objects.filter(owner=user, current_balance__gt=0):
        over_limit = bool(
            customer.credit_limit and customer.current_balance > customer.credit_limit
        )
        has_overdue_inv = Invoice.objects.filter(
            owner=user,
            customer=customer,
            status=Invoice.Status.OVERDUE,
            balance__gt=0,
        ).exists()
        if customer.status == Customer.Status.INACTIVE:
            continue
        new_status = (
            Customer.Status.OVERDUE
            if over_limit or has_overdue_inv
            else Customer.Status.ACTIVE
        )
        if customer.status != new_status:
            customer.status = new_status
            customer.save(update_fields=['status', 'updated_at'])


def sync_notifications(user):
    """
    Create in-app alerts for the SHOP OWNER only.
    Never sends WhatsApp / SMS / Email to customers — that is manual via Send Reminder.
    """
    refresh_statuses(user)
    settings = _settings_for(user)
    today = date.today()
    created = []

    # Only this user's customers (owner=user) — in-app for owner, never auto-message customers
    if settings.overdue_alerts:
        for c in Customer.objects.filter(owner=user, status=Customer.Status.OVERDUE):
            title = f'Overdue — {c.name}'
            n = _create(
                user,
                Notification.Type.OVERDUE,
                title,
                f'{c.name} ({c.business_name}) has overdue dues of ₹{c.current_balance:.2f}.',
                customer=c,
                amount=c.current_balance,
            )
            if n:
                created.append(n)

    if settings.invoice_alerts:
        unpaid = Invoice.objects.filter(
            owner=user,
            balance__gt=0,
            status__in=[
                Invoice.Status.UNPAID,
                Invoice.Status.PARTIAL,
                Invoice.Status.OVERDUE,
            ],
        ).select_related('customer')

        for inv in unpaid.filter(status=Invoice.Status.OVERDUE):
            title = f'Overdue invoice — {inv.invoice_number}'
            n = _create(
                user,
                Notification.Type.OVERDUE,
                title,
                f'Invoice {inv.invoice_number} for {inv.customer_name} is overdue. Balance ₹{inv.balance:.2f}.',
                customer=inv.customer,
                amount=inv.balance,
            )
            if n:
                created.append(n)

        for inv in unpaid.exclude(status=Invoice.Status.OVERDUE)[:20]:
            title = f'Pending bill — {inv.invoice_number}'
            n = _create(
                user,
                Notification.Type.PENDING_BILL,
                title,
                f'Invoice {inv.invoice_number} for {inv.customer_name} has unpaid balance ₹{inv.balance:.2f}.',
                customer=inv.customer,
                amount=inv.balance,
            )
            if n:
                created.append(n)

        soon = today + timedelta(days=7)
        upcoming = Invoice.objects.filter(
            owner=user,
            balance__gt=0,
            due_date__gte=today,
            due_date__lte=soon,
        ).exclude(status=Invoice.Status.PAID).select_related('customer')
        for inv in upcoming:
            title = f'Upcoming due — {inv.invoice_number}'
            n = _create(
                user,
                Notification.Type.UPCOMING_DUE,
                title,
                f'Invoice {inv.invoice_number} is due on {inv.due_date.isoformat()}. Balance ₹{inv.balance:.2f}.',
                customer=inv.customer,
                amount=inv.balance,
            )
            if n:
                created.append(n)

    if settings.payment_reminders:
        debtors = (
            Customer.objects.filter(owner=user, current_balance__gt=0)
            .exclude(status=Customer.Status.INACTIVE)
            .order_by('-current_balance')[:15]
        )
        for c in debtors:
            if Notification.objects.filter(
                owner=user,
                customer=c,
                type=Notification.Type.OVERDUE,
                is_read=False,
            ).exists():
                continue
            title = f'Payment due — {c.name}'
            n = _create(
                user,
                Notification.Type.PAYMENT_REMINDER,
                title,
                f'{c.name} owes ₹{c.current_balance:.2f}. Consider sending a reminder.',
                customer=c,
                amount=c.current_balance,
            )
            if n:
                created.append(n)

    if settings.daily_summary:
        title = f'Daily summary — {today.isoformat()}'
        if not Notification.objects.filter(owner=user, title=title).exists():
            today_pay = (
                Transaction.objects.filter(
                    owner=user, date=today, type=Transaction.Type.PAYMENT
                ).aggregate(t=Sum('amount'))['t']
                or 0
            )
            today_credit = (
                Transaction.objects.filter(
                    owner=user, date=today, type=Transaction.Type.CREDIT
                ).aggregate(t=Sum('amount'))['t']
                or 0
            )
            receivable = (
                Customer.objects.filter(owner=user).aggregate(t=Sum('current_balance'))['t']
                or 0
            )
            n = Notification.objects.create(
                owner=user,
                type=Notification.Type.PAYMENT_REMINDER,
                title=title,
                message=(
                    f'Today: credit ₹{float(today_credit):.0f}, collection ₹{float(today_pay):.0f}. '
                    f'Total receivable ₹{float(receivable):.0f}.'
                ),
            )
            created.append(n)

    if created:
        ActivityLog.objects.create(
            owner=user,
            type='system',
            message=f'{len(created)} new notification(s) generated',
        )
        from .owner_channels import dispatch_owner_channels
        channels = dispatch_owner_channels(user, created, settings)
    else:
        channels = {'email': None, 'sms': None}

    return {
        'created': len(created),
        'notifications': created,
        'ownerChannels': channels,
    }


def notify_invoice_created(user, invoice):
    settings = _settings_for(user)
    if not settings.invoice_alerts or invoice.balance <= 0:
        return None
    title = f'Pending bill — {invoice.invoice_number}'
    n = _create(
        user,
        Notification.Type.PENDING_BILL,
        title,
        f'New invoice {invoice.invoice_number} for {invoice.customer_name} · ₹{invoice.balance:.2f} due.',
        customer=invoice.customer,
        amount=invoice.balance,
    )
    if n:
        from .owner_channels import dispatch_owner_channels
        dispatch_owner_channels(user, [n], settings)
    return n


def notify_credit_transaction(user, tx):
    settings = _settings_for(user)
    if not settings.payment_reminders or not tx.customer:
        return None
    if tx.type != Transaction.Type.CREDIT:
        return None
    day = tx.date.isoformat() if tx.date else date.today().isoformat()
    title = f'Credit given — {tx.customer.name} ({day})'
    n = _create(
        user,
        Notification.Type.PAYMENT_REMINDER,
        title,
        f'Credit of ₹{tx.amount:.2f} recorded for {tx.customer.name}. Outstanding ₹{tx.customer.current_balance:.2f}.',
        customer=tx.customer,
        amount=tx.amount,
    )
    if n:
        from .owner_channels import dispatch_owner_channels
        dispatch_owner_channels(user, [n], settings)
    return n
