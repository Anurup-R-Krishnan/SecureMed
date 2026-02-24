from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts.users'
    label = 'authentication'
    verbose_name = 'Users & Authentication'
