from django.db import models
from django.conf import settings

class LabTest(models.Model):
    CATEGORY_CHOICES = [
        ('Hematology', 'Hematology'),
        ('Chemistry', 'Chemistry'),
        ('Endocrine', 'Endocrine'),
        ('Urinalysis', 'Urinalysis'),
        ('Coagulation', 'Coagulation'),
        ('Microbiology', 'Microbiology'),
        ('Molecular', 'Molecular'),
        ('Other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    turnaround_time = models.CharField(max_length=100, help_text="e.g., '24 hours', '2-3 days'")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class LabOrder(models.Model):
    PRIORITY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('stat', 'STAT'),
    ]
    STATUS_CHOICES = [
        ('ordered', 'Ordered'),
        ('collected', 'Collected'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending'),  # Backward compatibility
    ]

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lab_orders')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ordered_labs')
    appointment = models.ForeignKey('appointments.Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_orders')
    items = models.ManyToManyField(LabTest, related_name='orders')
    sample_id = models.CharField(max_length=32, unique=True, blank=True, db_index=True)
    
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ordered')
    
    clinical_notes = models.TextField(blank=True)
    fasting_required = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.patient.email}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.sample_id:
            self.sample_id = f"SAMPLE-{self.id:06d}"
            super().save(update_fields=['sample_id'])

class LabResult(models.Model):
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE)
    
    result_value = models.CharField(max_length=255)
    reference_range = models.CharField(max_length=255, blank=True)
    units = models.CharField(max_length=50, blank=True)
    flag = models.CharField(max_length=20, blank=True, help_text="e.g., 'High', 'Low', 'Critical'")
    
    notes = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='lab_results/', blank=True, null=True) # Encrypted file payload
    file_attachment_name = models.CharField(max_length=255, blank=True)
    file_attachment_content_type = models.CharField(max_length=100, blank=True)
    
    processed_at = models.DateTimeField(auto_now_add=True)
    technician_name = models.CharField(max_length=255, blank=True)
    technician = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='lab_results')
    released_to_patient = models.BooleanField(default=False)
    released_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Result for {self.test.code} - Order #{self.order.id}"


class LabResultNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lab_notifications')
    lab_result = models.ForeignKey(LabResult, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_result_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Lab notification for {self.user.email}"
