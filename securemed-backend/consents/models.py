from django.db import models
from django.conf import settings
from django.utils import timezone


class Consent(models.Model):
    """Model for managing patient consent to access their medical data by different departments."""
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='consents')
    department = models.CharField(max_length=100, help_text="e.g., 'Cardiology', 'Radiology'")
    description = models.TextField(help_text="Description of what this consent allows")
    is_granted = models.BooleanField(default=True, help_text="Whether consent is currently active")
    expires_at = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text="When temporary access expires (null for permanent)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('patient', 'department')
        ordering = ['-updated_at']
        verbose_name = 'Consent'
        verbose_name_plural = 'Consents'

    def __str__(self):
        status = "Granted" if self.is_granted else "Revoked"
        return f"{self.patient.username} - {self.department} ({status})"
    
    def is_expired(self):
        """Check if the consent has expired."""
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at
    
    def check_access(self):
        """
        Check if access is currently allowed for this consent.
        
        Returns False if:
        - is_granted is False
        - OR expires_at is in the past (expired)
        
        Otherwise returns True.
        """
        if not self.is_granted:
            return False
        
        if self.expires_at and self.is_expired():
            return False
        
        return True


class ConsentHistory(models.Model):
    """Version control for consent changes - tracks all modifications."""
    ACTION_CHOICES = [
        ('GRANTED', 'Granted'),
        ('REVOKED', 'Revoked'),
        ('EXPIRED', 'Expired'),
    ]

    consent = models.ForeignKey(Consent, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='consent_actions',
        help_text="User who made this change"
    )

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Consent History'
        verbose_name_plural = 'Consent Histories'

    def __str__(self):
        actor_name = self.actor.username if self.actor else "System"
        return f"{self.consent.patient.username} - {self.consent.department} - {self.action} by {actor_name}"
