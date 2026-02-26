import uuid

from django.db import models
from django.conf import settings
from apps.accounts.patients.models import Patient
from apps.scheduling.availability.models import Department


class Room(models.Model):
    """
    Physical locations within the hospital where patient encounters happen.
    Synced to Neo4j as graph nodes. Extensible via `metadata` JSONField.
    """
    ROOM_TYPE_CHOICES = [
        ('examination', 'Examination Room'),
        ('imaging', 'Imaging Suite'),
        ('icu', 'ICU'),
        ('ward', 'General Ward'),
        ('operating', 'Operating Theater'),
        ('lab', 'Laboratory'),
        ('emergency', 'Emergency Bay'),
        ('procedure', 'Procedure Room'),
        ('isolation', 'Isolation Room'),
        ('nicu', 'NICU'),
        ('dialysis', 'Dialysis Unit'),
        ('pharmacy', 'Pharmacy'),
        ('blood_bank', 'Blood Bank'),
        ('rehab', 'Rehabilitation'),
        ('radiology', 'Radiology Suite'),
        ('endoscopy', 'Endoscopy Suite'),
        ('cathlab', 'Catheterization Lab'),
    ]

    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    room_id = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='rooms'
    )
    floor = models.IntegerField()
    building = models.CharField(max_length=100)
    capacity = models.IntegerField(default=1, help_text="Max simultaneous patients")
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='low',
        help_text="Infection transmission risk level for this room type"
    )
    requires_sterilization = models.BooleanField(
        default=False,
        help_text="Whether room requires sterilization between patients"
    )
    # Extensible metadata for future attributes (e.g. ventilation type, UV-C equipped)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rooms'
        ordering = ['building', 'floor', 'room_id']
        indexes = [
            models.Index(fields=['room_id']),
            models.Index(fields=['room_type']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['building', 'floor']),
        ]

    def __str__(self):
        return f"{self.room_id} - {self.name} ({self.get_room_type_display()})"


class Equipment(models.Model):
    """
    Shared medical equipment that moves between rooms (e.g. portable X-ray,
    ventilator, wheelchair). These are tracked as graph nodes because shared
    equipment is a known infection vector.
    """
    EQUIPMENT_TYPE_CHOICES = [
        ('ventilator', 'Ventilator'),
        ('xray_portable', 'Portable X-Ray'),
        ('ultrasound', 'Ultrasound Machine'),
        ('ecg', 'ECG Machine'),
        ('infusion_pump', 'Infusion Pump'),
        ('wheelchair', 'Wheelchair'),
        ('stretcher', 'Stretcher'),
        ('defibrillator', 'Defibrillator'),
        ('monitor', 'Patient Monitor'),
        ('suction', 'Suction Machine'),
        ('other', 'Other'),
    ]

    equipment_id = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    equipment_type = models.CharField(max_length=30, choices=EQUIPMENT_TYPE_CHOICES)
    serial_number = models.CharField(max_length=100, blank=True)
    current_room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment'
    )
    requires_sterilization = models.BooleanField(default=True)
    last_sterilized_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment'
        ordering = ['equipment_id']
        indexes = [
            models.Index(fields=['equipment_id']),
            models.Index(fields=['equipment_type']),
            models.Index(fields=['current_room']),
        ]

    def __str__(self):
        return f"{self.equipment_id} - {self.name}"


class EquipmentUsageLog(models.Model):
    """
    Tracks when equipment is used with a patient in a room.
    Each usage creates graph edges: (Patient)-[:USED]->(Equipment) and
    (Equipment)-[:WAS_IN]->(Room) with timestamps.
    """
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='usage_logs'
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='equipment_usage'
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True,
        related_name='equipment_usage'
    )
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='equipment_usage'
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    sterilized_after = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'equipment_usage_logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['equipment', 'started_at']),
            models.Index(fields=['patient', 'started_at']),
            models.Index(fields=['room', 'started_at']),
        ]

    def __str__(self):
        return f"{self.equipment.equipment_id} used on {self.patient.patient_id} at {self.started_at}"


class InfectionReport(models.Model):
    """
    Records when a patient is diagnosed with an infection.
    Creating one triggers the graph-based cluster detection via Celery.
    """
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('critical', 'Critical'),
    ]

    CATEGORY_CHOICES = [
        ('hai', 'Hospital-Acquired Infection'),
        ('cai', 'Community-Acquired Infection'),
        ('ssi', 'Surgical Site Infection'),
        ('uti', 'Urinary Tract Infection'),
        ('bsi', 'Bloodstream Infection'),
        ('pneumonia', 'Pneumonia'),
        ('gi', 'Gastrointestinal'),
        ('other', 'Other'),
    ]

    report_id = models.CharField(max_length=20, unique=True, db_index=True)
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='infection_reports'
    )
    infection_name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="e.g. MRSA, C. difficile, VRE, Klebsiella"
    )
    infection_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="ICD-10 code for the infection"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='hai',
        help_text="Classification of infection origin"
    )
    diagnosed_at = models.DateTimeField(
        help_text="Exact timestamp of diagnosis"
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='moderate'
    )
    specimen_source = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g. blood, urine, wound swab, sputum"
    )
    antibiotic_resistance = models.JSONField(
        default=list,
        blank=True,
        help_text="List of antibiotics the organism is resistant to"
    )
    notes = models.TextField(blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reported_infections'
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'infection_reports'
        ordering = ['-diagnosed_at']
        indexes = [
            models.Index(fields=['report_id']),
            models.Index(fields=['infection_name', 'diagnosed_at']),
            models.Index(fields=['patient', 'diagnosed_at']),
            models.Index(fields=['category']),
            models.Index(fields=['severity']),
        ]

    def __str__(self):
        return f"{self.report_id} - {self.patient.patient_id}: {self.infection_name}"


class InfectionTrace(models.Model):
    """
    Results of graph-based pathfinding between two infected patients.
    Stores the transmission chain discovered by Neo4j shortestPath.
    """
    STATUS_CHOICES = [
        ('detected', 'Detected'),
        ('investigating', 'Under Investigation'),
        ('confirmed', 'Confirmed'),
        ('dismissed', 'Dismissed'),
    ]
    VECTOR_TYPE_CHOICES = [
        ('shared_room', 'Shared Room'),
        ('shared_doctor', 'Shared Doctor'),
        ('shared_equipment', 'Shared Equipment'),
        ('indirect', 'Indirect Chain'),
        ('unknown', 'Unknown'),
    ]

    trace_id = models.CharField(max_length=20, unique=True, db_index=True)
    source_report = models.ForeignKey(
        InfectionReport,
        on_delete=models.CASCADE,
        related_name='source_traces'
    )
    target_report = models.ForeignKey(
        InfectionReport,
        on_delete=models.CASCADE,
        related_name='target_traces'
    )
    infection_name = models.CharField(max_length=200)
    transmission_path = models.JSONField(
        help_text="Serialized path from Neo4j: [{type, id, label, overlap_time}, ...]"
    )
    path_length = models.IntegerField(
        help_text="Number of hops in the transmission chain"
    )
    confidence_score = models.FloatField(
        default=0.0,
        help_text="0.0 to 1.0 — weighted by time proximity and path length"
    )
    vector_type = models.CharField(
        max_length=20,
        choices=VECTOR_TYPE_CHOICES,
        default='unknown'
    )
    detected_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='detected',
        db_index=True
    )
    investigated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='investigated_traces'
    )
    investigation_notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'infection_traces'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['trace_id']),
            models.Index(fields=['infection_name', 'status']),
            models.Index(fields=['detected_at']),
            models.Index(fields=['vector_type']),
        ]
        unique_together = ['source_report', 'target_report']

    def __str__(self):
        return (
            f"{self.trace_id}: {self.source_report.patient.patient_id} → "
            f"{self.target_report.patient.patient_id} ({self.infection_name})"
        )


class RoomRiskScore(models.Model):
    """
    Periodic snapshots of room infection risk computed from graph centrality.
    Calculated by Celery beat tasks. Enables trending and historical analysis.
    """
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='risk_scores'
    )
    score = models.FloatField(
        help_text="0.0 to 1.0 — higher means more cross-patient traffic"
    )
    patient_count = models.IntegerField(
        help_text="Number of unique patients in this room during the window"
    )
    doctor_count = models.IntegerField(
        help_text="Number of unique doctors working in this room during the window"
    )
    infection_count = models.IntegerField(
        default=0,
        help_text="Number of infections linked to this room during the window"
    )
    window_start = models.DateTimeField()
    window_end = models.DateTimeField()
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'room_risk_scores'
        ordering = ['-computed_at']
        indexes = [
            models.Index(fields=['room', 'computed_at']),
            models.Index(fields=['score']),
            models.Index(fields=['window_start', 'window_end']),
        ]

    def __str__(self):
        return f"{self.room.room_id}: score={self.score:.2f} ({self.computed_at})"
