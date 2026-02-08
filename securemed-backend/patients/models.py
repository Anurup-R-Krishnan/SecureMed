from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator


class Patient(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_profile')
    patient_id = models.CharField(max_length=20, unique=True, db_index=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES, blank=True)
    
    phone_regex = RegexValidator(regex=r'^\+?1?\d{9,15}$')
    phone = models.CharField(validators=[phone_regex], max_length=17)
    emergency_contact = models.CharField(validators=[phone_regex], max_length=17)
    
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    country = models.CharField(max_length=100, default='India')
    
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_number = models.CharField(max_length=100, blank=True)
    
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient_id']),
            models.Index(fields=['phone']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.patient_id} - {self.user.get_full_name()}"


class EmergencyContact(models.Model):
    RELATIONSHIP_CHOICES = [
        ('spouse', 'Spouse'),
        ('parent', 'Parent'),
        ('child', 'Child'),
        ('sibling', 'Sibling'),
        ('friend', 'Friend'),
        ('other', 'Other'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=200)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    phone_regex = RegexValidator(regex=r'^\+?1?\d{9,15}$')
    phone = models.CharField(validators=[phone_regex], max_length=17)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'emergency_contacts'
        ordering = ['-is_primary', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.patient.patient_id}"


class WellnessTip(models.Model):
    """Model for rotating wellness tips shown on patient dashboard."""
    CATEGORY_CHOICES = [
        ('hydration', 'Hydration'),
        ('nutrition', 'Nutrition'),
        ('exercise', 'Exercise'),
        ('sleep', 'Sleep'),
        ('mental', 'Mental Health'),
        ('general', 'General'),
    ]
    
    title = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wellness_tips'
        ordering = ['category', '-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.category})"

