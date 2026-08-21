"""Seed default chart of accounts and masters for a new company."""

from decimal import Decimal

from .models import (
    AccountGroup,
    LedgerAccount,
    BankAccount,
    Unit,
    HsnCode,
    Godown,
    DocumentSeries,
    PrintTemplate,
)


# (name, nature, parent_name_or_None, is_primary, is_system, ledgers[(name, opening, side)])
CHART_SEED = [
    ('Capital Account', 'Liabilities', None, True, True, [
        ('Owner Capital', Decimal('250000'), 'Cr'),
    ]),
    ('Current Assets', 'Assets', None, True, True, []),
    ('Bank Accounts', 'Assets', 'Current Assets', False, True, [
        ('HDFC Bank — Current', Decimal('84210'), 'Dr'),
        ('SBI Current A/c', Decimal('12500'), 'Dr'),
    ]),
    ('Cash-in-Hand', 'Assets', 'Current Assets', False, True, [
        ('Cash', Decimal('15400'), 'Dr'),
    ]),
    ('Stock-in-Hand', 'Assets', 'Current Assets', False, True, [
        ('Inventory', Decimal('96000'), 'Dr'),
    ]),
    ('Sundry Debtors', 'Assets', 'Current Assets', False, True, [
        ('Trade Receivables', Decimal('48000'), 'Dr'),
    ]),
    ('Deposits (Asset)', 'Assets', 'Current Assets', False, False, [
        ('Rent Deposit', Decimal('20000'), 'Dr'),
    ]),
    ('Current Liabilities', 'Liabilities', None, True, True, []),
    ('Sundry Creditors', 'Liabilities', 'Current Liabilities', False, True, [
        ('Trade Payables', Decimal('31000'), 'Cr'),
    ]),
    ('Duties & Taxes', 'Liabilities', 'Current Liabilities', False, True, [
        ('GST Output', Decimal('8400'), 'Cr'),
        ('GST Input', Decimal('5200'), 'Dr'),
    ]),
    ('Fixed Assets', 'Assets', None, True, True, [
        ('Furniture & Fixtures', Decimal('45000'), 'Dr'),
        ('Computer Equipment', Decimal('28000'), 'Dr'),
    ]),
    ('Sales Accounts', 'Income', None, True, True, [
        ('Sales', Decimal('0'), 'Cr'),
    ]),
    ('Direct Incomes', 'Income', None, True, True, []),
    ('Indirect Incomes', 'Income', None, True, True, [
        ('Discount Received', Decimal('0'), 'Cr'),
    ]),
    ('Purchase Accounts', 'Expenses', None, True, True, [
        ('Purchase', Decimal('0'), 'Dr'),
    ]),
    ('Direct Expenses', 'Expenses', None, True, True, [
        ('Freight Inward', Decimal('0'), 'Dr'),
    ]),
    ('Indirect Expenses', 'Expenses', None, True, True, [
        ('Rent', Decimal('0'), 'Dr'),
        ('Salary', Decimal('0'), 'Dr'),
        ('Electricity', Decimal('0'), 'Dr'),
    ]),
]


def seed_chart_of_accounts(company):
    if AccountGroup.objects.filter(company=company).exists():
        return
    by_name = {}
    for i, (name, nature, parent_name, is_primary, is_system, ledgers) in enumerate(CHART_SEED):
        parent = by_name.get(parent_name) if parent_name else None
        group = AccountGroup.objects.create(
            company=company,
            name=name,
            nature=nature,
            parent=parent,
            is_primary=is_primary,
            is_system=is_system,
            sort_order=i,
        )
        by_name[name] = group
        for lname, opening, side in ledgers:
            LedgerAccount.objects.create(
                company=company,
                group=group,
                name=lname,
                opening=opening,
                side=side,
                status='Active',
            )


def seed_masters(company):
    if not BankAccount.objects.filter(company=company).exists():
        BankAccount.objects.create(
            company=company, name='HDFC Bank — Current', account_number='502000123456',
            ifsc='HDFC0001234', branch='Dabhoi', opening=84210, balance=84210,
        )
        BankAccount.objects.create(
            company=company, name='Cash', opening=15400, balance=15400,
        )

    if not Unit.objects.filter(company=company).exists():
        for name, formal in [('Nos', 'Numbers'), ('Kg', 'Kilogram'), ('Mtr', 'Meter'), ('Box', 'Box')]:
            Unit.objects.create(company=company, name=name, formal_name=formal)

    if not HsnCode.objects.filter(company=company).exists():
        for code, desc, rate in [
            ('8536', 'Electrical apparatus', 18),
            ('8544', 'Insulated wire / cable', 18),
            ('9405', 'Lamps and lighting', 12),
        ]:
            HsnCode.objects.create(company=company, code=code, description=desc, gst_rate=rate)

    if not Godown.objects.filter(company=company).exists():
        Godown.objects.create(company=company, name='Main Godown', address='Shop premises', in_charge='Owner')

    if not DocumentSeries.objects.filter(company=company).exists():
        for doc, prefix in [
            ('Sales Invoice', 'INV'), ('Quotation', 'QT'), ('Sales Order', 'SO'),
            ('Purchase Bill', 'PB'), ('Purchase Order', 'PO'), ('Credit Note', 'CN'),
            ('Debit Note', 'DN'), ('Journal', 'JV'), ('Contra', 'CT'),
        ]:
            DocumentSeries.objects.create(company=company, document=doc, prefix=prefix, next_number=1, fy='2026-27')

    if not PrintTemplate.objects.filter(company=company).exists():
        PrintTemplate.objects.create(
            company=company, name='Classic GST', document='Sales Invoice', paper='A4', copies=1, status='Default'
        )
