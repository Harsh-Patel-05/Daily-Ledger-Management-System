"""Company bootstrap: primary company, fiscal years, CoA / masters."""

from datetime import date


def ensure_default_fiscal_years(company):
    from .models import FiscalYear

    today = date.today()
    years = []
    if today.month >= 4:
        y = today.year
    else:
        y = today.year - 1
    for offset in range(0, 3):
        start = y - offset
        years.append(f'{start}-{str(start + 1)[-2:]}')

    for i, label in enumerate(years):
        FiscalYear.objects.get_or_create(
            company=company,
            label=label,
            defaults={'is_active': i == 0},
        )


def seed_company_defaults(company):
    try:
        from books.seed import seed_chart_of_accounts, seed_masters
    except ImportError:
        return
    seed_chart_of_accounts(company)
    seed_masters(company)


def ensure_primary_company(owner):
    """
    Every shop owner has exactly one primary company (their login business).
    Created from BusinessProfile / shop_name when missing.
    Existing flat companies are attached under the primary as sub-companies.
    """
    from accounts.models import BusinessProfile
    from .models import Company

    primary = Company.objects.filter(owner=owner, is_primary=True).first()
    if primary:
        # Attach orphan companies (no parent, not primary) under primary
        Company.objects.filter(owner=owner, parent__isnull=True, is_primary=False).update(
            parent=primary
        )
        return primary

    profile = BusinessProfile.objects.filter(user=owner).first()
    name = (
        (profile.shop_name if profile else '')
        or getattr(owner, 'shop_name', '')
        or 'My Company'
    ).strip() or 'My Company'

    # Prefer existing default / first company as primary
    primary = (
        Company.objects.filter(owner=owner, is_default=True).first()
        or Company.objects.filter(owner=owner).order_by('id').first()
    )
    if primary:
        primary.is_primary = True
        primary.is_default = True
        primary.parent = None
        if profile:
            primary.gstin = primary.gstin or (profile.gst or '')
            primary.mobile = primary.mobile or (profile.mobile or '')
            primary.email = primary.email or (profile.email or '')
            primary.address_line1 = primary.address_line1 or (profile.address or '')
            primary.legal_name = primary.legal_name or (profile.owner_name or '')
        primary.save()
    else:
        primary = Company.objects.create(
            owner=owner,
            name=name,
            legal_name=(profile.owner_name if profile else '') or getattr(owner, 'name', ''),
            gstin=(profile.gst if profile else '') or '',
            mobile=(profile.mobile if profile else '') or getattr(owner, 'mobile', '') or '',
            email=(profile.email if profile else '') or getattr(owner, 'email', '') or '',
            address_line1=(profile.address if profile else '') or '',
            registration_type=(
                'Regular (With GST)' if (profile and profile.gst) else 'Unregistered'
            ),
            is_primary=True,
            is_default=True,
            ownership='own',
            subscription_status='Active',
        )
        ensure_default_fiscal_years(primary)
        seed_company_defaults(primary)

    Company.objects.filter(owner=owner, parent__isnull=True, is_primary=False).update(
        parent=primary
    )
    return primary
