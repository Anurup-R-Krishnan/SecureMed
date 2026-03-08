from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.platform.notifications'
    label = 'notifications'
    verbose_name = 'Notifications (SMS, Email, Push)'
