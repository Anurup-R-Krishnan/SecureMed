from django.apps import AppConfig


class InfectionTrackingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinical.infection_tracking'
    label = 'infection_tracking'
    verbose_name = 'Infection Tracking'

    def ready(self):
        import apps.clinical.infection_tracking.signals  # noqa: F401
