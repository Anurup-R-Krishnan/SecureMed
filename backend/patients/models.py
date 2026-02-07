from django.db import models
from appointments.models import Doctor

class Patient(models.Model):
    name = models.CharField(max_length=255)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    known_allergies = models.JSONField(default=list)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class TimelineEvent(models.Model):
    EVENT_TYPES = [
        ('VISIT', 'Visit'),
        ('LAB_RESULT', 'Lab Result'),
        ('MEDICATION', 'Medication'),
        ('IMAGING', 'Imaging'),
        ('PROCEDURE', 'Procedure'),
    ]
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='timeline')
    date = models.DateField()
    type = models.CharField(max_length=20, choices=EVENT_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    provider = models.CharField(max_length=255)
    facility = models.CharField(max_length=255)
    details = models.JSONField(default=dict)
    is_authorized_view = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.title} for {self.patient.name}"

class ClinicalNote(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='notes')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    content = models.TextField()
    category = models.CharField(max_length=100)
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Referral(models.Model):
    from_doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='referrals_sent')
    to_doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='referrals_received')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

class BreakGlassSession(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    justification = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
