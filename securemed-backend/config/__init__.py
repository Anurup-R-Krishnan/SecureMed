"""
Config package init — ensures the Celery app is loaded when Django starts.
"""
try:
    from .celery import app as celery_app
except Exception:  # pragma: no cover - fallback for minimal local/test environments
    celery_app = None

__all__ = ('celery_app',)
