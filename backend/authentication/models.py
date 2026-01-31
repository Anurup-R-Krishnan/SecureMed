from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Includes fields for email-based authentication, role management,
    MFA support, and account lockout mechanism.
    """
    
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('provider', 'Healthcare Provider'),
        ('admin', 'Administrator'),
    ]
    
    # Override email to make it unique and required
    email = models.EmailField(unique=True, blank=False, null=False)
    
    # Role-based access control
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='patient',
        help_text='User role in the system'
    )
    
    # MFA fields
    mfa_enabled = models.BooleanField(
        default=False,
        help_text='Whether MFA is enabled for this user'
    )
    mfa_secret = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text='TOTP secret key for MFA'
    )
    
    # Account lockout fields
    failed_login_attempts = models.IntegerField(
        default=0,
        help_text='Number of consecutive failed login attempts'
    )
    locked_until = models.DateTimeField(
        blank=True,
        null=True,
        help_text='Account locked until this timestamp'
    )
    
    # Authentication configuration
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.email})"
    
    def is_account_locked(self):
        """
        Check if the account is currently locked.
        
        Returns:
            bool: True if account is locked, False otherwise
        """
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False
    
    def unlock_account(self):
        """
        Manually unlock the account by clearing lockout fields.
        """
        self.locked_until = None
        self.failed_login_attempts = 0
        self.save(update_fields=['locked_until', 'failed_login_attempts'])
