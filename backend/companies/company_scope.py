"""Resolve active company from X-Company-Id (Munim-style multi-company)."""

from accounts.ownership import data_owner
from companies.models import Company

HEADER = 'HTTP_X_COMPANY_ID'


def get_company_id(request):
    raw = (
        request.META.get(HEADER)
        or getattr(request, 'query_params', {}).get('company')
        or getattr(request, 'query_params', {}).get('company_id')
    )
    if raw in (None, '', 'null', 'undefined'):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def get_active_company(request, required=False):
    owner = data_owner(request.user)
    cid = get_company_id(request)
    qs = Company.objects.filter(owner=owner)
    if cid:
        company = qs.filter(pk=cid).first()
        if company:
            return company
    company = (
        qs.filter(is_default=True).first()
        or qs.filter(is_primary=True).first()
        or qs.first()
    )
    if required and company is None:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'company': 'Create a company first.'})
    return company


def company_fk(**kwargs):
    """Standard nullable FK used during rollout; backfilled to primary company."""
    from django.db import models
    related = kwargs.pop('related_name', '+')
    return models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name=related,
        **kwargs,
    )


def scope_queryset(qs, request, owner_field='owner', company_field='company'):
    """Filter by shop owner + active company (Munim isolation)."""
    owner = data_owner(request.user)
    company = get_active_company(request)
    filtered = qs.filter(**{owner_field: owner})
    if company is not None:
        filtered = filtered.filter(**{company_field: company})
    else:
        filtered = filtered.none()
    return filtered


def assign_owner_company(request):
    """kwargs for serializer.save on create."""
    return {
        'owner': data_owner(request.user),
        'company': get_active_company(request, required=True),
    }
