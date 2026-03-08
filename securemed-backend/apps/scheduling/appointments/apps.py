from django.apps import AppConfig


class AppointmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scheduling.appointments'
    label = 'appointments'
    verbose_name = 'Appointments'
