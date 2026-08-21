from django.conf import settings
from django.db import models


class Company(models.Model):
    class Ownership(models.TextChoices):
        OWN = 'own', 'Own'
        SHARED = 'shared', 'Shared'

    class SubscriptionStatus(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        TRIAL = 'Trial', 'Trial'
        EXPIRED = 'Expired', 'Expired'
        SUSPENDED = 'Suspended', 'Suspended'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='companies',
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_companies',
        help_text='Null for the logged-in user’s primary company; set for sub-companies.',
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary company of the shop owner (one per owner).',
    )
    name = models.CharField(max_length=200)
    alias = models.CharField(max_length=100, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    registration_type = models.CharField(max_length=50, default='Regular (With GST)')
    party_type = models.CharField(max_length=50, default='Not Applicable')
    gst_applicable_from = models.DateField(null=True, blank=True)
    legal_name = models.CharField(max_length=200, blank=True)
    organization_type = models.CharField(max_length=80, blank=True)
    business_type = models.CharField(max_length=80, blank=True)
    industry_type = models.CharField(max_length=80, blank=True)
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=80, default='India')
    pincode = models.CharField(max_length=12, blank=True)
    state = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    fax = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    establish_date = models.DateField(null=True, blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    signature = models.ImageField(upload_to='company_signatures/', blank=True, null=True)
    custom_fields = models.JSONField(default=list, blank=True)
    ownership = models.CharField(
        max_length=20, choices=Ownership.choices, default=Ownership.OWN
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', 'name']
        unique_together = [('owner', 'name', 'alias')]
        indexes = [
            models.Index(fields=['owner', 'name']),
            models.Index(fields=['owner', 'gstin']),
            models.Index(fields=['owner', 'is_primary']),
            models.Index(fields=['parent']),
        ]
        verbose_name_plural = 'companies'

    def __str__(self):
        return self.name

    @property
    def has_gst(self):
        return bool(self.gstin) or (
            self.registration_type
            and 'unregistered' not in self.registration_type.lower()
            and 'without' not in self.registration_type.lower()
        )

    def save(self, *args, **kwargs):
        if self.is_primary:
            self.parent = None
        super().save(*args, **kwargs)
        if self.is_primary:
            Company.objects.filter(owner=self.owner, is_primary=True).exclude(pk=self.pk).update(
                is_primary=False
            )
        if self.is_default:
            Company.objects.filter(owner=self.owner).exclude(pk=self.pk).update(is_default=False)


class FiscalYear(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='fiscal_years',
    )
    label = models.CharField(max_length=20)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-label']
        unique_together = [('company', 'label')]
        indexes = [models.Index(fields=['company', 'label'])]

    def __str__(self):
        return f'{self.company.name} · {self.label}'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_active:
            FiscalYear.objects.filter(company=self.company).exclude(pk=self.pk).update(
                is_active=False
            )
