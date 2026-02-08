from django.db import models
from django.conf import settings
from patients.models import Patient
from departments.models import Doctor


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    appointment_id = models.CharField(max_length=20, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField()
    duration = models.IntegerField(default=30, help_text="Duration in minutes")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', db_index=True)
    reason = models.TextField()
    notes = models.TextField(blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['-appointment_date', '-appointment_time']
        indexes = [
            models.Index(fields=['appointment_id']),
            models.Index(fields=['patient', 'appointment_date']),
            models.Index(fields=['doctor', 'appointment_date']),
            models.Index(fields=['status', 'appointment_date']),
        ]
        unique_together = ['doctor', 'appointment_date', 'appointment_time']
    
    def __str__(self):
        return f"{self.appointment_id} - {self.patient.patient_id} with Dr. {self.doctor.user.last_name}"


class AppointmentHistory(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='history')
    status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'appointment_history'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['appointment', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.appointment.appointment_id} - {self.status} at {self.timestamp}"


class Referral(models.Model):
    """
    Story 3.4: Patient Assignment
    Enables doctors to refer patients to specialists with temporary access grants.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]
    
    referral_id = models.CharField(max_length=20, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='referrals')
    
    # Referring doctor (who creates the referral)
    referring_doctor = models.ForeignKey(
        Doctor, 
        on_delete=models.CASCADE, 
        related_name='referrals_made'
    )
    
    # Specialist receiving the referral
    specialist = models.ForeignKey(
        Doctor, 
        on_delete=models.CASCADE, 
        related_name='referrals_received'
    )
    
    # Target department for the referral
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine')
    
    # Clinical notes for the referral
    reason = models.TextField(help_text="Reason for referral")
    clinical_notes = models.TextField(blank=True, help_text="Additional clinical notes")
    
    # Access control
    access_granted = models.BooleanField(default=False)
    access_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'referrals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['referral_id']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['referring_doctor', 'status']),
            models.Index(fields=['specialist', 'status']),
        ]
    
    def __str__(self):
        return f"{self.referral_id} - {self.patient.patient_id} referred to Dr. {self.specialist.user.last_name}"
    
    def grant_access(self, days=30):
        """Grant specialist access to patient records for specified days"""
        from django.utils import timezone
        from datetime import timedelta
        self.access_granted = True
        self.access_expires_at = timezone.now() + timedelta(days=days)
        self.save()
    
    def revoke_access(self):
        """Revoke specialist access when case is closed"""
        self.access_granted = False
        self.access_expires_at = None
        self.save()
    
    def close_case(self):
        """Mark referral as completed and revoke access"""
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.revoke_access()
        self.save()

