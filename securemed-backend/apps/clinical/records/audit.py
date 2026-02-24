from django.utils import timezone
from .models import MedicalRecordAccess

def log_medical_record_access(user, record, action_type='viewed', details=None, request=None):
    """
    Logs access to a medical record.
    action_type: 'viewed', 'created', 'updated', 'deleted', 'printed', 'exported', 'attested', 'amended'
    """
    if not user.is_authenticated:
        return

    # Extract IP if request provided
    ip = '0.0.0.0'
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

    MedicalRecordAccess.objects.create(
        medical_record=record,
        accessed_by=user,
        action=action_type,
        ip_address=ip,
        access_reason=details or f"User action: {action_type}"
    )
