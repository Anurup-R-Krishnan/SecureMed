from django.apps import AppConfig


class IntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.platform.integration'
    label = 'integration'
    verbose_name = 'External Integrations (HL7/FHIR)'
