from django.db import models
from django.conf import settings


class Department(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=10, unique=True, db_index=True)
    description = models.TextField(blank=True)
    floor = models.IntegerField()
    building = models.CharField(max_length=100)
    phone = models.CharField(max_length=17)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'departments'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Doctor(models.Model):
    SPECIALIZATION_CHOICES = [
        ('cardiology', 'Cardiology'),
        ('neurology', 'Neurology'),
        ('orthopedics', 'Orthopedics'),
        ('pediatrics', 'Pediatrics'),
        ('dermatology', 'Dermatology'),
        ('psychiatry', 'Psychiatry'),
        ('radiology', 'Radiology'),
        ('general', 'General Medicine'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    doctor_id = models.CharField(max_length=20, unique=True, db_index=True)
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES)
    license_number = models.CharField(max_length=100, unique=True)
    qualification = models.CharField(max_length=200)
    experience_years = models.IntegerField()
    
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='doctors')
    
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    phone = models.CharField(max_length=17)
    
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctors'
        ordering = ['doctor_id']
        indexes = [
            models.Index(fields=['doctor_id']),
            models.Index(fields=['specialization']),
            models.Index(fields=['is_available', 'is_active']),
        ]
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.specialization}"


class DoctorSchedule(models.Model):
    WEEKDAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=30, help_text="Duration in minutes")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'doctor_schedules'
        ordering = ['weekday', 'start_time']
        unique_together = ['doctor', 'weekday', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'weekday']),
        ]
    
    def __str__(self):
        return f"{self.doctor.user.get_full_name()} - {self.get_weekday_display()}"
