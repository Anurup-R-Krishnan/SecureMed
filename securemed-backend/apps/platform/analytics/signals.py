"""
Django signals that automatically mirror domain-specific events into the
central AuditLog table.

Connected in AnalyticsConfig.ready().
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ── Consent changes ──────────────────────────────────────────────────────

@receiver(post_save, sender='consents.ConsentHistory')
def audit_consent_change(sender, instance, created, **kwargs):
    """Mirror every ConsentHistory row into AuditLog."""
    if not created:
        return
    from apps.platform.analytics.audit import log_audit

    action_map = {
        'GRANTED': 'consent_granted',
        'REVOKED': 'consent_revoked',
        'EXPIRED': 'consent_revoked',
    }
    action = action_map.get(instance.action, 'consent_granted')

    consent = instance.consent
    log_audit(
        actor=instance.actor,
        action=action,
        resource_type='Consent',
        resource_id=str(consent.id),
        description=(
            f'{instance.get_action_display()} consent for '
            f'{consent.department} (patient {consent.patient_id})'
        ),
    )


# ── Emergency access ─────────────────────────────────────────────────────

@receiver(post_save, sender='medical_records.EmergencyAccessLog')
def audit_emergency_access(sender, instance, created, **kwargs):
    if not created:
        return
    from apps.platform.analytics.audit import log_audit

    log_audit(
        actor=instance.accessed_by,
        action='emergency_access',
        resource_type='Patient',
        resource_id=str(instance.patient_id),
        description=(
            f'Emergency access ({instance.emergency_type}): {instance.reason}'
        ),
        ip_address=instance.ip_address,
    )


# ── Medical record access ────────────────────────────────────────────────

@receiver(post_save, sender='medical_records.MedicalRecordAccess')
def audit_medical_record_access(sender, instance, created, **kwargs):
    if not created:
        return
    from apps.platform.analytics.audit import log_audit

    action_map = {
        'viewed': 'medical_record_viewed',
        'created': 'medical_record_created',
        'updated': 'medical_record_updated',
    }
    action = action_map.get(instance.action, 'medical_record_viewed')

    log_audit(
        actor=instance.accessed_by,
        action=action,
        resource_type='MedicalRecord',
        resource_id=str(instance.medical_record_id),
        description=(
            f'{instance.get_action_display()} record '
            f'{instance.medical_record.record_id}'
        ),
        ip_address=instance.ip_address,
    )
