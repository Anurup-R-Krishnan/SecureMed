"""
Telemedicine models for video consultations.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class VideoRoom(models.Model):
    """
    Represents a video consultation room between a doctor and patient.
    """
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),      # Patient waiting for doctor
        ('active', 'Active'),        # Call in progress
        ('ended', 'Ended'),          # Call completed
        ('cancelled', 'Cancelled'),  # Call was cancelled
    ]
    
    room_id = models.UUIDField(
        default=uuid.uuid4, 
        unique=True, 
        editable=False,
        help_text='Unique room identifier for joining'
    )
    
    # Participants
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_video_rooms',
        help_text='The doctor hosting this consultation'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_video_rooms',
        help_text='The patient for this consultation'
    )
    
    # Room state
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='waiting'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When the call actually started'
    )
    ended_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When the call ended'
    )
    
    # Scheduling (optional - for scheduled appointments)
    scheduled_for = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='Scheduled start time for the call'
    )
    
    # Notes
    reason = models.TextField(
        blank=True,
        help_text='Reason for the consultation'
    )
    
    class Meta:
        db_table = 'video_rooms'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room_id']),
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"Room {str(self.room_id)[:8]} - Dr. {self.doctor.last_name} & {self.patient.username}"
    
    def start_call(self):
        """Mark the call as started."""
        self.status = 'active'
        self.started_at = timezone.now()
        self.save()
    
    def end_call(self):
        """Mark the call as ended."""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save()
    
    @property
    def call_duration(self):
        """Get call duration in minutes."""
        if self.started_at and self.ended_at:
            delta = self.ended_at - self.started_at
            return int(delta.total_seconds() / 60)
        return None
    
    @property
    def join_url(self):
        """Generate the join URL for this room."""
        return f"/telemedicine/room/{self.room_id}"


class RoomParticipant(models.Model):
    """
    Tracks individual participant actions in a video room.
    """
    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('patient', 'Patient'),
    ]
    
    room = models.ForeignKey(
        VideoRoom, 
        on_delete=models.CASCADE, 
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='room_participations'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    
    # Timing
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # States
    is_in_waiting_room = models.BooleanField(
        default=True,
        help_text='Whether participant is in waiting room'
    )
    is_admitted = models.BooleanField(
        default=False,
        help_text='Whether participant has been admitted to call'
    )
    
    # Connection quality feedback
    connection_quality = models.IntegerField(
        null=True, 
        blank=True,
        help_text='1-5 rating of connection quality'
    )
    
    class Meta:
        db_table = 'room_participants'
        ordering = ['-joined_at']
        unique_together = ['room', 'user']
    
    def __str__(self):
        return f"{self.user.username} in Room {str(self.room.room_id)[:8]}"
    
    def admit(self):
        """Admit participant from waiting room to call."""
        self.is_in_waiting_room = False
        self.is_admitted = True
        self.save()
    
    def leave(self):
        """Record participant leaving the call."""
        self.left_at = timezone.now()
        self.save()


class Conversation(models.Model):
    """
    Represents a secure text conversation between a doctor and a patient.
    """
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations',
        help_text='Users participating in this conversation'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Conversation {self.id}"


class Message(models.Model):
    """
    A single message within a conversation.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    attachment = models.FileField(upload_to='message_attachments/', blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]
    
    def __str__(self):
        return f"Message {self.id} from {self.sender.username}"


class TriageRequest(models.Model):
    """
    Represents an AI triage handover request from a patient to a doctor.
    """
    STATUS_CHOICES = [
        ('PENDING', 'PENDING'),
        ('APPROVED', 'APPROVED'),
        ('DECLINED', 'DECLINED'),
    ]

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='triage_requests_as_patient',
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='triage_requests_as_doctor',
    )
    ai_summary = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='PENDING',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"TriageRequest {self.id} ({self.patient.username} → {self.doctor.username}) [{self.status}]"


class AnatomyRegionExplainer(models.Model):
    """Backend-managed educational content for anatomy regions."""

    region_id = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=200)
    summary = models.TextField()
    details = models.JSONField(default=list, blank=True)
    common_symptoms = models.JSONField(default=list, blank=True)
    related_condition_ids = models.JSONField(default=list, blank=True)
    warning_signals = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'anatomy_region_explainers'
        ordering = ['region_id']
        indexes = [
            models.Index(fields=['region_id', 'is_active']),
        ]

    def __str__(self):
        return f"{self.region_id}: {self.title}"


class ConditionCatalog(models.Model):
    """Backend-managed condition catalog for 3D body visualization."""

    condition_id = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    overview = models.TextField()
    regions = models.JSONField(default=list, blank=True)
    # Region pain profile used for condition -> body heatmap rendering.
    region_pain_levels = models.JSONField(default=dict, blank=True)
    # Region-level interpretation rules keyed by region_id.
    # Example: {"chest": [{"min": 8, "max": 10, "message": "...", "urgency": "emergency"}]}
    pain_interpretations = models.JSONField(default=dict, blank=True)
    typical_symptoms = models.JSONField(default=list, blank=True)
    seek_care_rules = models.JSONField(default=list, blank=True)
    scope = models.CharField(max_length=32, default='top20', db_index=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'condition_catalog'
        ordering = ['name']
        indexes = [
            models.Index(fields=['scope', 'is_active']),
            models.Index(fields=['condition_id', 'is_active']),
        ]

    def __str__(self):
        return f"{self.condition_id}: {self.name}"


class ConditionPin(models.Model):
    """Region-anchored annotation pin for condition visualization."""

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    condition = models.ForeignKey(
        ConditionCatalog,
        on_delete=models.CASCADE,
        related_name='pins',
    )
    pin_id = models.CharField(max_length=64)
    region_id = models.CharField(max_length=64)
    label = models.CharField(max_length=200)
    text = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='low')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'condition_pins'
        ordering = ['sort_order', 'id']
        unique_together = [('condition', 'pin_id')]
        indexes = [
            models.Index(fields=['condition', 'region_id']),
        ]

    def __str__(self):
        return f"{self.condition.condition_id}:{self.pin_id}"
