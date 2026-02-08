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
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lab_orders')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ordered_labs')
    items = models.ManyToManyField(LabTest, related_name='orders')
    
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='routine')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    clinical_notes = models.TextField(blank=True)
    fasting_required = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.patient.email}"

class LabResult(models.Model):
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name='results')
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE)
    
    result_value = models.CharField(max_length=255)
    reference_range = models.CharField(max_length=255, blank=True)
    units = models.CharField(max_length=50, blank=True)
    flag = models.CharField(max_length=20, blank=True, help_text="e.g., 'High', 'Low', 'Critical'")
    
    notes = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='lab_results/', blank=True, null=True) # For Epic 4.3 Secure Uploads
    
    processed_at = models.DateTimeField(auto_now_add=True)
    technician_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Result for {self.test.code} - Order #{self.order.id}"
