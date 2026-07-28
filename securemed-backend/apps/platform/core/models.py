import uuid

from django.db import models


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class BaseSecureModel(UUIDModel, TimeStampedModel):
    """
    Base model for all SecureMed entities providing UUIDs and timestamps.
    Enforces basic audit fields automatically.
    """
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
