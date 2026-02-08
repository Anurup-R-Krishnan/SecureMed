from django.db import models
from django.conf import settings
from patients.models import Patient
from departments.models import Doctor
from appointments.models import Appointment


class MedicalRecord(models.Model):
    RECORD_TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('lab_report', 'Lab Report'),
        ('prescription', 'Prescription'),
        ('imaging', 'Imaging'),
        ('surgery', 'Surgery'),
        ('discharge', 'Discharge Summary'),
    ]
    
    record_id = models.CharField(max_length=20, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='medical_records')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='medical_records')
    
    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES, db_index=True)
    record_date = models.DateField(db_index=True)
    
    diagnosis = models.TextField()
    symptoms = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    file = models.FileField(upload_to='medical_records/', null=True, blank=True)
    
    is_confidential = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medical_records'
        ordering = ['-record_date', '-created_at']
        indexes = [
            models.Index(fields=['record_id']),
            models.Index(fields=['patient', 'record_date']),
            models.Index(fields=['record_type', 'record_date']),
        ]
    
    def __str__(self):
        return f"{self.record_id} - {self.patient.patient_id} - {self.record_type}"


class Prescription(models.Model):
    """
    Prescription model with digital signing support.
    Once signed, a prescription becomes immutable (locked).
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('signed', 'Signed'),
        ('dispensed', 'Dispensed'),
        ('cancelled', 'Cancelled'),
    ]
    
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='prescriptions')
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    
    # Digital Signing Fields
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_signed = models.BooleanField(default=False, help_text='Whether this prescription has been digitally signed')
    signed_at = models.DateTimeField(null=True, blank=True, help_text='Timestamp when prescription was signed')
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='signed_prescriptions',
        help_text='Doctor who signed this prescription'
    )
    signature_hash = models.CharField(
        max_length=64, 
        blank=True, 
        help_text='SHA-256 hash of prescription content for integrity verification'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescriptions'
        ordering = ['-created_at', 'medication_name']
    
    def __str__(self):
        status_str = " [SIGNED]" if self.is_signed else ""
        return f"{self.medication_name} - {self.dosage}{status_str}"
    
    def generate_signature_hash(self):
        """Generate SHA-256 hash of prescription content for integrity verification."""
        import hashlib
        content = f"{self.medication_name}|{self.dosage}|{self.frequency}|{self.duration}|{self.instructions}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def sign(self, user):
        """
        Digitally sign the prescription, locking it from further edits.
        
        Args:
            user: The User (doctor) signing the prescription
        """
        from django.utils import timezone
        
        if self.is_signed:
            raise ValueError("Prescription is already signed")
        
        self.is_signed = True
        self.signed_at = timezone.now()
        self.signed_by = user
        self.signature_hash = self.generate_signature_hash()
        self.status = 'signed'
        self.save()
    
    def is_locked(self):
        """Check if prescription is locked (signed prescriptions cannot be modified)."""
        return self.is_signed


class LabTest(models.Model):
    STATUS_CHOICES = [
        ('ordered', 'Ordered'),
        ('sample_collected', 'Sample Collected'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    test_id = models.CharField(max_length=20, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_tests')
    ordered_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='ordered_tests')
    
    test_name = models.CharField(max_length=200)
    test_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ordered', db_index=True)
    
    ordered_date = models.DateTimeField(auto_now_add=True)
    sample_collected_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    
    results = models.TextField(blank=True)
    report_file = models.FileField(upload_to='lab_reports/', null=True, blank=True)
    
    class Meta:
        db_table = 'lab_tests'
        ordering = ['-ordered_date']
        indexes = [
            models.Index(fields=['test_id']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['status', 'ordered_date']),
        ]
    
    def __str__(self):
        return f"{self.test_id} - {self.test_name}"


class MedicalRecordAccess(models.Model):
    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='access_logs')
    accessed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    access_timestamp = models.DateTimeField(auto_now_add=True)
    access_reason = models.CharField(max_length=200)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'medical_record_access'
        ordering = ['-access_timestamp']
        indexes = [
            models.Index(fields=['medical_record', 'access_timestamp']),
            models.Index(fields=['accessed_by', 'access_timestamp']),
        ]
    
    def __str__(self):
        return f"{self.medical_record.record_id} accessed by {self.accessed_by}"

class EmergencyAccessLog(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='emergency_access_logs')
    accessed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # In a real system, we might need an expiration time for this access
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'emergency_access_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"EMERGENCY ACCESS: {self.accessed_by} -> {self.patient.patient_id}"
