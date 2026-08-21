from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.ownership import data_owner
from .models import Company, FiscalYear
from .serializers import CompanySerializer, FiscalYearSerializer
from .services import (
    ensure_default_fiscal_years,
    ensure_primary_company,
    seed_company_defaults,
)


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    search_fields = ['name', 'alias', 'gstin', 'legal_name', 'city', 'mobile']
    ordering_fields = ['name', 'created_at', 'establish_date', 'is_primary']
    ordering = ['-is_primary', 'name']

    def get_queryset(self):
        owner = data_owner(self.request.user)
        ensure_primary_company(owner)
        return Company.objects.filter(owner=owner).prefetch_related('fiscal_years', 'sub_companies')

    def list(self, request, *args, **kwargs):
        ensure_primary_company(data_owner(request.user))
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        owner = data_owner(self.request.user)
        primary = ensure_primary_company(owner)
        data = serializer.validated_data
        data.pop('parent', None)
        data.pop('parent_id', None)
        data.pop('is_primary', None)

        raw_parent = (
            self.request.data.get('parentId')
            or self.request.data.get('parent_id')
            or self.request.data.get('parent')
        )
        parent_id = None
        if raw_parent not in (None, '', 'null'):
            try:
                parent_id = int(raw_parent)
            except (TypeError, ValueError):
                parent_id = None

        # New companies are always sub-companies under the primary (Munim-style).
        # Primary is auto-created from the user's shop profile on first login.
        parent = primary
        if parent_id and parent_id != primary.id:
            candidate = Company.objects.filter(owner=owner, pk=parent_id).first()
            if candidate and not candidate.parent_id:
                parent = candidate

        company = serializer.save(
            owner=owner,
            parent=parent,
            is_primary=False,
            is_default=False,
        )
        ensure_default_fiscal_years(company)
        seed_company_defaults(company)
        return company

    def perform_destroy(self, instance):
        owner = instance.owner
        if instance.is_primary:
            if instance.sub_companies.exists():
                raise ValidationError(
                    {'detail': 'Delete or move sub-companies before deleting the primary company.'}
                )
            raise ValidationError(
                {'detail': 'Primary company cannot be deleted. Edit it instead.'}
            )
        was_default = instance.is_default
        instance.delete()
        if was_default:
            nxt = (
                Company.objects.filter(owner=owner, is_primary=True).first()
                or Company.objects.filter(owner=owner).first()
            )
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=['is_default', 'updated_at'])

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        company = self.get_object()
        company.is_default = True
        company.save()
        return Response(CompanySerializer(company, context={'request': request}).data)

    @action(detail=False, methods=['get', 'post'], url_path='ensure-primary')
    def ensure_primary(self, request):
        company = ensure_primary_company(data_owner(request.user))
        return Response(CompanySerializer(company, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], url_path='fiscal-years')
    def fiscal_years(self, request, pk=None):
        company = self.get_object()
        if request.method == 'GET':
            qs = company.fiscal_years.all()
            return Response(FiscalYearSerializer(qs, many=True).data)

        label = str(request.data.get('label') or '').strip()
        if not label:
            return Response({'detail': 'label is required'}, status=status.HTTP_400_BAD_REQUEST)
        fy, created = FiscalYear.objects.get_or_create(
            company=company,
            label=label,
            defaults={
                'is_active': request.data.get('is_active', True),
                'start_date': request.data.get('start_date'),
                'end_date': request.data.get('end_date'),
            },
        )
        if not created and request.data.get('is_active'):
            fy.is_active = True
            fy.save()
        return Response(
            FiscalYearSerializer(fy).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        owner = data_owner(request.user)
        ensure_primary_company(owner)
        company = (
            Company.objects.filter(owner=owner, is_default=True).first()
            or Company.objects.filter(owner=owner, is_primary=True).first()
            or Company.objects.filter(owner=owner).first()
        )
        if not company:
            return Response(None)
        return Response(CompanySerializer(company, context={'request': request}).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Company created successfully',
                'data': serializer.data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(
            {
                'success': True,
                'message': 'Company updated successfully',
                'data': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                'success': True,
                'message': 'Company deleted successfully',
            },
            status=status.HTTP_200_OK,
        )
