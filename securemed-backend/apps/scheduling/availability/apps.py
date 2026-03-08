from django.apps import AppConfig


class AvailabilityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scheduling.availability'
    label = 'departments'
    verbose_name = 'Staff Availability & Departments'
