"""
Centralised audit-logging helper.

Usage from any view or signal handler:

    from apps.platform.analytics.audit import log_audit

    log_audit(
        actor=request.user,
        action='login',
        resource_type='User',
        resource_id=str(request.user.id),
        description='User logged in successfully',
        ip_address=get_client_ip(request),
    )
"""

import logging
from typing import Optional

from django.contrib.auth import get_user_model
from django.http import HttpRequest

logger = logging.getLogger(__name__)

User = get_user_model()


# ── IP helper ────────────────────────────────────────────────────────────

def get_client_ip(request: HttpRequest) -> Optional[str]:
    """Extract the real client IP, respecting X-Forwarded-For."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# ── Main writer ──────────────────────────────────────────────────────────

def log_audit(
    *,
    actor=None,
    action: str,
    resource_type: str = '',
    resource_id: str = '',
    description: str = '',
    ip_address: Optional[str] = None,
    extra: Optional[dict] = None,
):
    """
    Write a row to the AuditLog table.

    All parameters are keyword-only so call-sites are always explicit.
    Failures are swallowed (logged) so audit logging never breaks
    the request it is embedded in.
    """
    try:
        from apps.platform.analytics.models import AuditLog

        AuditLog.objects.create(
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            description=description,
            ip_address=ip_address,
            extra=extra or {},
        )
    except Exception:
        logger.exception('Failed to write audit log (action=%s)', action)
