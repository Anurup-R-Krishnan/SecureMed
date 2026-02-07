import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from audit.models import AuditLog

def verify_audit_logs():
    print("--- Verifying Audit Logs ---")
    
    # Check for Break Glass logs
    break_glass_logs = AuditLog.objects.filter(action='BREAK_GLASS_ACCESS').order_by('-timestamp')[:5]
    print(f"\nBreak Glass Logs Found: {break_glass_logs.count()}")
    for log in break_glass_logs:
        print(f"- [{log.timestamp}] {log.user_name} accessed {log.resource_type} {log.resource_id}: {log.details}")

    # Check for Referral logs
    referral_logs = AuditLog.objects.filter(action='PATIENT_REFERRED').order_by('-timestamp')[:5]
    print(f"\nReferral Logs Found: {referral_logs.count()}")
    for log in referral_logs:
        print(f"- [{log.timestamp}] {log.user_name} referred {log.resource_type} {log.resource_id} to {log.details.get('toDoctorName')}")

if __name__ == '__main__':
    verify_audit_logs()
