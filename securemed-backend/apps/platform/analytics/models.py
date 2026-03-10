from django.db import models
from django.conf import settings
from django.utils import timezone


class AuditLog(models.Model):
    """
    Centralised audit trail for all security-relevant events.
    Every authentication action, consent change, admin CRUD operation,
    medical-record access, and emergency break-glass event is recorded here
    so the Admin Audit Logs portal has a single queryable source of truth.
    """

    # ── Action categories ────────────────────────────────────────────────
    ACTION_CHOICES = [
        # Auth
        ('login', 'Login'),
        ('login_failed', 'Login Failed'),
        ('logout', 'Logout'),
        ('register', 'Register'),
        ('password_reset', 'Password Reset'),
        # MFA
        ('mfa_enabled', 'MFA Enabled'),
        ('mfa_disabled', 'MFA Disabled'),
        # Admin CRUD
        ('user_created', 'User Created'),
        ('user_role_changed', 'User Role Changed'),
        ('user_deactivated', 'User Deactivated'),
        ('user_activated', 'User Activated'),
        ('user_password_reset', 'User Password Reset'),
        ('user_deleted', 'User Deleted'),
        # Consent
        ('consent_granted', 'Consent Granted'),
        ('consent_revoked', 'Consent Revoked'),
        # Clinical
        ('medical_record_viewed', 'Medical Record Viewed'),
        ('medical_record_created', 'Medical Record Created'),
        ('medical_record_updated', 'Medical Record Updated'),
        ('emergency_access', 'Emergency Access'),
    ]

    CATEGORY_MAP = {
        'login': 'auth', 'login_failed': 'auth', 'logout': 'auth',
        'register': 'auth', 'password_reset': 'auth',
        'mfa_enabled': 'auth', 'mfa_disabled': 'auth',
        'user_created': 'admin', 'user_role_changed': 'admin',
        'user_deactivated': 'admin', 'user_activated': 'admin',
        'user_password_reset': 'admin',
        'user_deleted': 'admin',
        'consent_granted': 'consent', 'consent_revoked': 'consent',
        'medical_record_viewed': 'clinical',
        'medical_record_created': 'clinical',
        'medical_record_updated': 'clinical',
        'emergency_access': 'clinical',
    }

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text='User who performed the action (null for anonymous / system)',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(
        max_length=50, blank=True, default='',
        help_text='Model / entity type affected, e.g. User, MedicalRecord',
    )
    resource_id = models.CharField(
        max_length=100, blank=True, default='',
        help_text='PK or identifier of the affected resource',
    )
    description = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    extra = models.JSONField(default=dict, blank=True, help_text='Arbitrary metadata')

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        actor_label = self.actor.email if self.actor else 'system'
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {actor_label} → {self.action}'

    @property
    def category(self):
        return self.CATEGORY_MAP.get(self.action, 'other')


class Symptom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class Disease(models.Model):
    name = models.CharField(max_length=200, unique=True)
    icd_code = models.CharField(max_length=20, unique=True)
    description = models.TextField()
    recommended_tests = models.JSONField(default=list) # List of strings
    
    symptoms = models.ManyToManyField(Symptom, through='DiseaseSymptom')
    
    def __str__(self):
        return self.name

class DiseaseSymptom(models.Model):
    disease = models.ForeignKey(Disease, on_delete=models.CASCADE)
    symptom = models.ForeignKey(Symptom, on_delete=models.CASCADE)
    weight = models.IntegerField(default=50) # 0-100 probability/relevance
    
    class Meta:
        unique_together = ['disease', 'symptom']


class Hospital(models.Model):
    name = models.CharField(max_length=200, unique=True)
    location = models.CharField(max_length=200)
    beds = models.PositiveIntegerField(default=0)
    occupancy_percent = models.PositiveSmallIntegerField(default=0)
    doctors = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hospitals'
        ordering = ['name']

    def __str__(self):
        return self.name
