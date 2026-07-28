from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .interaction_service import bump_safety_cache_namespace
from .models import (
    MedicationInteractionKnowledge,
    MedicationReference,
    MedicationSideEffect,
)


@receiver([post_save, post_delete], sender=MedicationInteractionKnowledge)
@receiver([post_save, post_delete], sender=MedicationSideEffect)
@receiver([post_save, post_delete], sender=MedicationReference)
def invalidate_safety_cache_on_knowledge_change(**kwargs):
    bump_safety_cache_namespace()
