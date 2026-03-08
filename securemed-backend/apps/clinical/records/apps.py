from django.apps import AppConfig


class RecordsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinical.records'
    label = 'medical_records'
    verbose_name = 'Medical Records'

    def ready(self):
        from . import signals  # noqa: F401
