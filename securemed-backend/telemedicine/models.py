"""
Telemedicine models for video consultations.
"""
import uuid
from django.db import models
from django.conf import settings
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
