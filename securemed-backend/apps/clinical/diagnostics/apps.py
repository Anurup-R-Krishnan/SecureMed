from django.apps import AppConfig


class DiagnosticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinical.diagnostics'
    label = 'labs'
    verbose_name = 'Lab Diagnostics'
