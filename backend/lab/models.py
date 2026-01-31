import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Patient(models.Model):
    name = models.CharField(max_length=255)
    dob = models.DateField()
    mrn = models.CharField(max_length=50, unique=True, help_text="Medical Record Number")
    
    def __str__(self):
        return f"{self.name} ({self.mrn})"

class Doctor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    specialization = models.CharField(max_length=100)
    
    def __str__(self):
        return f"Dr. {self.name}"

class TestPanel(models.Model):
    name = models.CharField(max_length=100) # e.g., "Basic Metabolic Panel"
    description = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class LabOrder(models.Model):
    class Status(models.TextChoices):
        ORDERED = 'ORDERED', _('Ordered')
        COLLECTED = 'COLLECTED', _('Collected')
        PROCESSING = 'PROCESSING', _('Processing')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    class Priority(models.TextChoices):
        ROUTINE = 'ROUTINE', _('Routine')
        URGENT = 'URGENT', _('Urgent')
        STAT = 'STAT', _('STAT')

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_orders')
    ordering_doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='ordered_labs')
    panels = models.ManyToManyField(TestPanel)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ORDERED)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.ROUTINE)
    clinical_notes = models.TextField(blank=True, help_text="Reason for order")
    sample_id = models.CharField(max_length=50, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.sample_id:
            # Generate a unique sample ID (e.g., SMP-UUID-TIMESTAMP or just UUID)
            # Shortened UUID for readability, or use full UUID
            self.sample_id = f"SMP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.sample_id} - {self.patient.name}"

class LabResult(models.Model):
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    test_panel = models.ForeignKey(TestPanel, on_delete=models.CASCADE, null=True) # Result for which panel?
    technician = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='processed_results')
    result_data = models.JSONField(default=dict, blank=True) # Flexible storage for structured results
    file_upload = models.FileField(upload_to='lab_uploads/', blank=True, null=True) # To be encrypted
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash of original file")
    comments = models.TextField(blank=True)
    is_abnormal = models.BooleanField(default=False)
    verified_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.order.sample_id}"

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    related_order = models.ForeignKey(LabOrder, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Notification for {self.user.username}"
