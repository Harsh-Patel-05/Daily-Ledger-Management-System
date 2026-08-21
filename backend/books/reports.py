"""Company-scoped financial statements (Munim-style local accounting)."""

from decimal import Decimal
from collections import defaultdict

from django.db.models import Sum, Q

from .models import AccountGroup, LedgerAccount, JournalEntry, ContraEntry


def _d(v):
    return Decimal(str(v or 0))


def _f(v):
    return float(_d(v))


def _date_q(field, from_date=None, to_date=None):
    q = Q()
    if from_date:
        q &= Q(**{f'{field}__gte': from_date})
    if to_date:
        q &= Q(**{f'{field}__lte': to_date})
    return q


def _period_activity(company, from_date=None, to_date=None):
    """P&L period overlays: +debit / -credit on named ledgers."""
    from invoices.models import Invoice
    from purchase.models import PurchaseBill
    from expenses.models import Expense

    inv_qs = Invoice.objects.filter(company=company)
    if from_date or to_date:
        inv_qs = inv_qs.filter(_date_q('date', from_date, to_date))
    bill_qs = PurchaseBill.objects.filter(company=company)
    if from_date or to_date:
        bill_qs = bill_qs.filter(_date_q('date', from_date, to_date))
    exp_qs = Expense.objects.filter(company=company)
    if from_date or to_date:
        exp_qs = exp_qs.filter(_date_q('date', from_date, to_date))

    sales = _d(inv_qs.aggregate(t=Sum('subtotal'))['t']) - _d(inv_qs.aggregate(t=Sum('discount'))['t'])
    if sales <= 0:
        sales = _d(inv_qs.aggregate(t=Sum('total'))['t'])
    purchases = _d(bill_qs.aggregate(t=Sum('taxable_amount'))['t'])
    if purchases <= 0:
        purchases = _d(bill_qs.aggregate(t=Sum('total'))['t'])
    expenses = _d(exp_qs.aggregate(t=Sum('amount'))['t'])
    sales_gst = _d(inv_qs.aggregate(t=Sum('tax_amount'))['t'])
    purchase_gst = _d(bill_qs.aggregate(t=Sum('gst_amount'))['t'])

    # signed: + = debit movement, - = credit movement
    activity = {
        'Sales': -sales,
        'Purchase': purchases,
        'Indirect Expenses': expenses,
        'GST Output': -sales_gst,
        'GST Input': purchase_gst,
    }
    return {
        'activity': activity,
        'sales': sales,
        'purchases': purchases,
        'expenses': expenses,
        'sales_gst': sales_gst,
        'purchase_gst': purchase_gst,
    }


def _balance_sheet_snapshots(company):
    """Absolute closing debit balances for live BS accounts (replace CoA closing)."""
    from invoices.models import Invoice
    from purchase.models import PurchaseBill
    from inventory.models import Product
    from customers.models import Customer

    receivables = Customer.objects.filter(company=company).aggregate(t=Sum('current_balance'))['t']
    if receivables is None:
        receivables = Invoice.objects.filter(company=company).aggregate(t=Sum('balance'))['t'] or 0
    payables = PurchaseBill.objects.filter(company=company).aggregate(t=Sum('balance'))['t'] or 0
    stock = Decimal('0')
    for p in Product.objects.filter(company=company).exclude(status='discontinued'):
        stock += _d(getattr(p, 'stock_qty', 0)) * _d(getattr(p, 'purchase_price', 0) or getattr(p, 'avg_cost', 0))

    return {
        'Trade Receivables': ('Dr', _d(receivables)),
        'Trade Payables': ('Cr', _d(payables)),
        'Inventory': ('Dr', stock),
    }


def compute_ledger_rows(company, from_date=None, to_date=None, include_zero=False):
    period = _period_activity(company, from_date, to_date)
    activity = period['activity']
    snapshots = _balance_sheet_snapshots(company)

    j_filter = Q(company=company)
    if from_date or to_date:
        j_filter &= _date_q('date', from_date, to_date)

    debit_map = defaultdict(lambda: Decimal('0'))
    credit_map = defaultdict(lambda: Decimal('0'))
    for r in (
        JournalEntry.objects.filter(j_filter)
        .exclude(debit_account='')
        .values('debit_account')
        .annotate(t=Sum('amount'))
    ):
        debit_map[r['debit_account']] = _d(r['t'])
    for r in (
        JournalEntry.objects.filter(j_filter)
        .exclude(credit_account='')
        .values('credit_account')
        .annotate(t=Sum('amount'))
    ):
        credit_map[r['credit_account']] = _d(r['t'])

    c_filter = Q(company=company)
    if from_date or to_date:
        c_filter &= _date_q('date', from_date, to_date)
    for c in ContraEntry.objects.filter(c_filter):
        if c.to_account:
            debit_map[c.to_account] += _d(c.amount)
        if c.from_account:
            credit_map[c.from_account] += _d(c.amount)

    for name, signed in activity.items():
        if signed > 0:
            debit_map[name] += signed
        elif signed < 0:
            credit_map[name] += abs(signed)

    rows = []
    for ledger in LedgerAccount.objects.filter(company=company, status='Active').select_related('group'):
        opening = _d(ledger.opening)
        open_dr = opening if ledger.side == 'Dr' else Decimal('0')
        open_cr = opening if ledger.side == 'Cr' else Decimal('0')
        mov_dr = debit_map.get(ledger.name, Decimal('0'))
        mov_cr = credit_map.get(ledger.name, Decimal('0'))
        total_dr = open_dr + mov_dr
        total_cr = open_cr + mov_cr
        net = total_dr - total_cr

        if ledger.name in snapshots:
            side, amt = snapshots[ledger.name]
            if side == 'Dr':
                close_dr, close_cr = amt, Decimal('0')
                net = amt
            else:
                close_dr, close_cr = Decimal('0'), amt
                net = -amt
            # Reflect snapshot in displayed totals for TB readability
            total_dr = open_dr + (amt if side == 'Dr' else Decimal('0'))
            total_cr = open_cr + (amt if side == 'Cr' else Decimal('0'))
        else:
            close_dr = net if net > 0 else Decimal('0')
            close_cr = abs(net) if net < 0 else Decimal('0')

        if not include_zero and close_dr == 0 and close_cr == 0 and total_dr == 0 and total_cr == 0:
            continue

        rows.append({
            'id': ledger.id,
            'account': ledger.name,
            'group': ledger.group.name if ledger.group_id else '',
            'nature': ledger.nature,
            'openingDebit': _f(open_dr),
            'openingCredit': _f(open_cr),
            'debit': _f(total_dr),
            'credit': _f(total_cr),
            'closingDebit': _f(close_dr),
            'closingCredit': _f(close_cr),
            'net': _f(net),
        })
    return rows, period


def compute_trial_balance(company, from_date=None, to_date=None):
    rows, _ = compute_ledger_rows(company, from_date, to_date, include_zero=False)
    # TB uses closing balances (Munim often shows closing Dr/Cr)
    tb_rows = [
        {
            'id': r['id'],
            'account': r['account'],
            'group': r['group'],
            'nature': r['nature'],
            'debit': r['closingDebit'],
            'credit': r['closingCredit'],
        }
        for r in rows
        if r['closingDebit'] or r['closingCredit']
    ]
    total_dr = sum(_d(r['debit']) for r in tb_rows)
    total_cr = sum(_d(r['credit']) for r in tb_rows)
    return {
        'rows': tb_rows,
        'totals': {
            'debit': _f(total_dr),
            'credit': _f(total_cr),
            'difference': _f(total_dr - total_cr),
        },
    }


def compute_profit_loss(company, from_date=None, to_date=None):
    rows, period = compute_ledger_rows(company, from_date, to_date, include_zero=True)
    income, expenses = [], []
    for r in rows:
        if r['nature'] == 'Income':
            amt = _d(r['closingCredit']) - _d(r['closingDebit'])
            if amt:
                income.append({
                    'id': r['id'], 'account': r['account'], 'group': r['group'], 'amount': _f(amt),
                })
        elif r['nature'] == 'Expenses':
            amt = _d(r['closingDebit']) - _d(r['closingCredit'])
            if amt:
                expenses.append({
                    'id': r['id'], 'account': r['account'], 'group': r['group'], 'amount': _f(amt),
                })

    # Fallback if CoA not seeded yet
    if not income and period['sales']:
        income.append({
            'id': 'sales', 'account': 'Sales', 'group': 'Sales Accounts',
            'amount': _f(period['sales']),
        })
    if not any(e['account'] == 'Purchase' for e in expenses) and period['purchases']:
        expenses.append({
            'id': 'purchase', 'account': 'Purchase', 'group': 'Purchase Accounts',
            'amount': _f(period['purchases']),
        })
    if period['expenses'] and not any(
        e['account'] in ('Indirect Expenses', 'Operating Expenses', 'Rent', 'Salary')
        for e in expenses
    ):
        expenses.append({
            'id': 'opex', 'account': 'Operating Expenses', 'group': 'Indirect Expenses',
            'amount': _f(period['expenses']),
        })

    total_income = sum(_d(i['amount']) for i in income)
    total_expense = sum(_d(e['amount']) for e in expenses)
    return {
        'income': income,
        'expenses': expenses,
        'totals': {
            'income': _f(total_income),
            'expenses': _f(total_expense),
            'grossProfit': _f(period['sales'] - period['purchases']),
            'netProfit': _f(total_income - total_expense),
        },
    }


def compute_balance_sheet(company, as_of=None):
    rows, _ = compute_ledger_rows(company, from_date=None, to_date=as_of, include_zero=True)
    pl = compute_profit_loss(company, from_date=None, to_date=as_of)
    net_pl = _d(pl['totals']['netProfit'])

    assets, liabilities = [], []
    for r in rows:
        if r['nature'] == 'Assets':
            amt = _d(r['closingDebit']) - _d(r['closingCredit'])
            if amt:
                assets.append({
                    'id': r['id'], 'head': r['account'], 'group': r['group'],
                    'side': 'Assets', 'amount': _f(amt),
                })
        elif r['nature'] == 'Liabilities':
            amt = _d(r['closingCredit']) - _d(r['closingDebit'])
            if amt:
                liabilities.append({
                    'id': r['id'], 'head': r['account'], 'group': r['group'],
                    'side': 'Liabilities', 'amount': _f(amt),
                })

    if net_pl >= 0:
        liabilities.append({
            'id': 'pl', 'head': 'Profit & Loss A/c', 'group': 'Capital Account',
            'side': 'Liabilities', 'amount': _f(net_pl),
        })
    elif net_pl < 0:
        assets.append({
            'id': 'pl-loss', 'head': 'Profit & Loss A/c (Dr)', 'group': 'Capital Account',
            'side': 'Assets', 'amount': _f(abs(net_pl)),
        })

    # Group summaries
    group_totals = defaultdict(lambda: {'Assets': Decimal('0'), 'Liabilities': Decimal('0')})
    for a in assets:
        gname = a.get('group') or 'Other Assets'
        group_totals[gname]['Assets'] += _d(a['amount'])
    for a in liabilities:
        gname = a.get('group') or 'Other Liabilities'
        group_totals[gname]['Liabilities'] += _d(a['amount'])

    groups = []
    gid = 1
    for gname, sides in sorted(group_totals.items()):
        for side, amt in sides.items():
            if amt:
                groups.append({
                    'id': gid, 'head': gname, 'side': side, 'amount': _f(amt),
                })
                gid += 1

    total_assets = sum(_d(a['amount']) for a in assets)
    total_liab = sum(_d(a['amount']) for a in liabilities)
    return {
        'assets': assets,
        'liabilities': liabilities,
        'groups': groups,
        'totals': {
            'assets': _f(total_assets),
            'liabilities': _f(total_liab),
            'difference': _f(total_assets - total_liab),
            'netProfit': _f(net_pl),
        },
    }
