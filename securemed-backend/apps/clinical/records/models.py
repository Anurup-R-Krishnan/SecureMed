from django.conf import settings
from django.db import models

from apps.accounts.patients.models import Patient
from apps.scheduling.appointments.models import Appointment
from apps.scheduling.availability.models import Doctor


class MedicalRecord(models.Model):
    RECORD_TYPE_CHOICES = [
        ('consultation', 'Consultation'),
        ('lab_report', 'Lab Report'),
        ('prescription', 'Prescription'),
        ('imaging', 'Imaging'),
        ('surgery', 'Surgery'),
        ('discharge', 'Discharge Summary'),
    ]
    
    SOURCE_CHOICES = [
        ('provider', 'Healthcare Provider'),
        ('patient', 'Patient Reported'),
        ('device', 'Medical Device'),
        ('external', 'External System'),
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
    notes = models.TextField(blank=True)
    private_notes = models.TextField(blank=True, help_text="Private clinical notes (not visible to patients)")
    file = models.FileField(upload_to='medical_records/', null=True, blank=True)
    
    # Data Authority Fields
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='provider', db_index=True)
    is_attested = models.BooleanField(default=False, help_text="Whether this record has been clinically attested")
    attested_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='attested_records')
    attested_at = models.DateTimeField(null=True, blank=True)
    
    # Amendment Workflow
    parent_record = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='amendments', help_text="Original record if this is an amendment")
    amendment_reason = models.TextField(blank=True)
    
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
    override_reason = models.TextField(blank=True, help_text='Reason for overriding interaction warning')
    
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


class DrugInteraction(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    drug_a = models.CharField(max_length=200)
    drug_b = models.CharField(max_length=200)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'drug_interactions'
        indexes = [
            models.Index(fields=['drug_a']),
            models.Index(fields=['drug_b']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"{self.drug_a} + {self.drug_b} ({self.severity})"


class MedicationSideEffect(models.Model):
    SEVERITY_CHOICES = DrugInteraction.SEVERITY_CHOICES

    medication_name = models.CharField(max_length=200, db_index=True)
    side_effect = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    description = models.TextField(blank=True)
    source = models.CharField(max_length=100, default='HODDI')
    source_version = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'medication_side_effects'
        indexes = [
            models.Index(fields=['medication_name']),
            models.Index(fields=['severity']),
        ]
        unique_together = ('medication_name', 'side_effect', 'source_version')

    def __str__(self):
        return f"{self.medication_name}: {self.side_effect} ({self.severity})"


class MedicationReference(models.Model):
    """
    Links user-facing medication names to canonical identifiers (e.g. DrugBank IDs).
    """
    identifier = models.CharField(max_length=100, db_index=True)
    display_name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, db_index=True)
    source = models.CharField(max_length=100, default='HODDI')

    class Meta:
        db_table = 'medication_references'
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['identifier']),
        ]
        unique_together = ('identifier', 'normalized_name')

    def __str__(self):
        return f"{self.display_name} -> {self.identifier}"


class MedicationInteractionKnowledge(models.Model):
    """
    Higher-order interaction knowledge (2+ medications) imported from HODDI-like datasets.
    """
    SEVERITY_CHOICES = DrugInteraction.SEVERITY_CHOICES

    combination_signature = models.CharField(max_length=600, db_index=True)
    medications = models.JSONField(default=list)
    combination_size = models.IntegerField(default=2, db_index=True)
    side_effect = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='moderate')
    description = models.TextField(blank=True)
    source = models.CharField(max_length=100, default='HODDI')
    source_version = models.CharField(max_length=50, blank=True)
    evidence = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'medication_interaction_knowledge'
        indexes = [
            models.Index(fields=['combination_signature']),
            models.Index(fields=['combination_size']),
            models.Index(fields=['severity']),
        ]
        unique_together = ('combination_signature', 'side_effect', 'source_version')

    def __str__(self):
        return f"{self.combination_signature}: {self.side_effect} ({self.severity})"


class MedicationInteractionReport(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='interaction_reports')
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='generated_interaction_reports'
    )
    trigger_event = models.CharField(max_length=50, default='manual')
    medications = models.JSONField(default=list)
    total_medications = models.IntegerField(default=0)
    total_pairs_checked = models.IntegerField(default=0)
    total_triplets_checked = models.IntegerField(default=0)
    total_findings = models.IntegerField(default=0)
    critical_count = models.IntegerField(default=0)
    high_count = models.IntegerField(default=0)
    moderate_count = models.IntegerField(default=0)
    low_count = models.IntegerField(default=0)
    evaluated_combination_depth = models.IntegerField(default=3)
    max_supported_combination_size = models.IntegerField(default=3)
    not_evaluated_depths = models.JSONField(default=list, blank=True)
    coverage_gap = models.BooleanField(default=False)
    source_version = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'medication_interaction_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', 'created_at']),
        ]

    def __str__(self):
        return f"Report#{self.id} patient={self.patient_id} findings={self.total_findings}"


class MedicationInteractionReportJob(models.Model):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
    ]

    task_id = models.CharField(max_length=64, unique=True, db_index=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="interaction_report_jobs")
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_interaction_report_jobs",
    )
    trigger_event = models.CharField(max_length=50, default="manual_refresh")
    candidate_medications = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued", db_index=True)
    error_message = models.TextField(blank=True)
    report = models.ForeignKey(
        MedicationInteractionReport,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="jobs",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "medication_interaction_report_jobs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["task_id"]),
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"ReportJob#{self.id} patient={self.patient_id} status={self.status}"


class MedicationInteractionReportItem(models.Model):
    report = models.ForeignKey(MedicationInteractionReport, on_delete=models.CASCADE, related_name='items')
    finding_type = models.CharField(max_length=20, default='interaction')  # interaction | side_effect
    medications = models.JSONField(default=list)
    combination_size = models.IntegerField(default=1)
    side_effect = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=DrugInteraction.SEVERITY_CHOICES, default='moderate')
    description = models.TextField(blank=True)
    source = models.CharField(max_length=100, default='HODDI')
    source_reference = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'medication_interaction_report_items'
        indexes = [
            models.Index(fields=['severity']),
            models.Index(fields=['combination_size']),
        ]

    def __str__(self):
        meds = ', '.join(self.medications or [])
        return f"{self.finding_type}:{meds} -> {self.side_effect}"


class PharmacyOrder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
    ]

    prescription = models.OneToOneField(Prescription, on_delete=models.CASCADE, related_name='pharmacy_order')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    pickup_code = models.CharField(max_length=32, unique=True, db_index=True)
    verification_notes = models.TextField(blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_pharmacy_orders')
    fulfilled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='fulfilled_pharmacy_orders')
    dispensed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacy_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"PharmacyOrder #{self.id} ({self.status})"


class MedicationAdherenceLog(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='adherence_logs')
    taken_at = models.DateTimeField(auto_now_add=True)
    taken_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='medication_adherence')

    class Meta:
        db_table = 'medication_adherence_logs'
        ordering = ['-taken_at']

    def __str__(self):
        return f"Adherence for {self.prescription.medication_name} at {self.taken_at}"


class MedicationHistoryEvent(models.Model):
    EVENT_CHOICES = [
        ('started', 'Started'),
        ('stopped', 'Stopped'),
        ('dispensed', 'Dispensed'),
        ('cancelled', 'Cancelled'),
    ]

    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='history_events')
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    class Meta:
        db_table = 'medication_history_events'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.prescription.medication_name} {self.event_type}"


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
    
    ACTION_CHOICES = [
        ('viewed', 'Viewed'),
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('printed', 'Printed'),
        ('exported', 'Exported'),
        ('attested', 'Attested'),
        ('amended', 'Amended'),
    ]
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='viewed')
    access_reason = models.CharField(max_length=200, blank=True) # Reason is optional for routine views
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
    EMERGENCY_TYPE_CHOICES = [
        ('life_threatening', 'Life Threatening'),
        ('urgent_care', 'Urgent Care'),
        ('critical_lab', 'Critical Lab Result'),
        ('other', 'Other'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='emergency_access_logs')
    accessed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField()
    emergency_type = models.CharField(max_length=30, choices=EMERGENCY_TYPE_CHOICES, default='other')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # In a real system, we might need an expiration time for this access
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'emergency_access_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"EMERGENCY ACCESS: {self.accessed_by} -> {self.patient.patient_id}"


class VitalSign(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vitals')
    heart_rate = models.IntegerField(help_text="Beats per minute (bpm)")
    systolic_bp = models.IntegerField(help_text="Systolic Blood Pressure (mmHg)")
    diastolic_bp = models.IntegerField(help_text="Diastolic Blood Pressure (mmHg)")
    weight = models.FloatField(help_text="Weight in kg")
    
    # Data Authority
    SOURCE_CHOICES = [
        ('clinical', 'Clinical Measurement'),
        ('patient', 'Patient Reported'),
        ('device', 'Remote Monitoring Device'),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='clinical')
    is_verified = models.BooleanField(default=True) # Clinical are verified by default
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_vitals')
    
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'vital_signs'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['patient', 'recorded_at']),
        ]
    
    def __str__(self):
        return f"Vitals for {self.patient.patient_id} at {self.recorded_at}"


# ---------------------------------------------------------------------------
# Emergency Case – persists triage state from the public intake form
# ---------------------------------------------------------------------------
class EmergencyCase(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical – Immediate'),
        ('urgent', 'Urgent'),
        ('moderate', 'Moderate'),
        ('low', 'Low / Non-urgent'),
    ]

    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('triaging', 'Triaging'),
        ('in_treatment', 'In Treatment'),
        ('discharged', 'Discharged'),
        ('cancelled', 'Cancelled'),
    ]

    # Public reference code so the caller can track without auth
    case_ref = models.CharField(max_length=24, unique=True, db_index=True)

    # Caller-supplied info (may be unauthenticated)
    patient_name = models.CharField(max_length=200)
    patient_age = models.PositiveSmallIntegerField(null=True, blank=True)
    patient_phone = models.CharField(max_length=20, blank=True)
    chief_complaint = models.TextField()
    severity = models.CharField(max_length=12, choices=SEVERITY_CHOICES, default='urgent')
    known_conditions = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    location_description = models.CharField(max_length=255, blank=True)

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='submitted')

    # Linked records (populated later by staff)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='emergency_cases',
    )
    assigned_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_emergency_cases',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'emergency_cases'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case_ref']),
            models.Index(fields=['status', 'severity', 'created_at']),
        ]

    def __str__(self):
        return f"EMG-{self.case_ref} ({self.get_status_display()})"
