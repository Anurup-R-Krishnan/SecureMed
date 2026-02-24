from django.apps import AppConfig


class TelemedicineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinical.telemedicine'
    label = 'telemedicine'
    verbose_name = 'Telemedicine'
