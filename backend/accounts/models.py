from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role', 'owner')
        if extra.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        STAFF = 'staff', 'Staff'
        ACCOUNTANT = 'accountant', 'Accountant'

    username = None
    email = models.EmailField(unique=True)
    mobile = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.OWNER)
    shop_name = models.CharField(max_length=200, blank=True)
    business_owner = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_members',
        help_text='Null for shop owners; staff point at the shop owner.',
    )
    is_active_staff = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def name(self):
        full = f'{self.first_name} {self.last_name}'.strip()
        return full or self.email


class ShopRole(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shop_roles',
    )
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = [('owner', 'name')]

    def __str__(self):
        return self.name


class ShopPermission(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shop_permissions',
    )
    module = models.CharField(max_length=80)
    can_view = models.BooleanField(default=True)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        ordering = ['module']
        unique_together = [('owner', 'module')]

    def __str__(self):
        return f'{self.module} ({self.owner_id})'


class BusinessProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business')
    shop_name = models.CharField(max_length=200, default='My Shop')
    owner_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    gst = models.CharField(max_length=20, blank=True)
    invoice_prefix = models.CharField(max_length=20, default='INV')
    currency = models.CharField(max_length=10, default='INR')
    language = models.CharField(max_length=20, default='English')
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.shop_name


class BusinessSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    business_name = models.CharField(max_length=200, blank=True)
    gst_number = models.CharField(max_length=20, blank=True)
    invoice_prefix = models.CharField(max_length=20, default='INV')
    currency = models.CharField(max_length=10, default='INR')
    language = models.CharField(max_length=20, default='English')
    theme = models.CharField(max_length=10, default='light')
    accent_color = models.CharField(max_length=20, default='blue')
    fiscal_year_start = models.CharField(max_length=2, default='04')
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    default_payment_terms = models.PositiveIntegerField(default=15)
    low_stock_alert = models.BooleanField(default=True)
    payment_reminders = models.BooleanField(default=True)
    overdue_alerts = models.BooleanField(default=True)
    daily_summary = models.BooleanField(default=True)
    invoice_alerts = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=False)
    sms_notifications = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Settings ({self.user.email})'


class PasswordOTP(models.Model):
    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.email} · {self.otp}'
