from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.platform.analytics'
    label = 'analytics'
    verbose_name = 'Analytics & Dashboards'

    def ready(self):
        # Register audit-trail signals
        import apps.platform.analytics.signals  # noqa: F401
