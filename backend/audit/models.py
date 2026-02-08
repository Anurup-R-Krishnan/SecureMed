from django.db import models

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    user_id = models.CharField(max_length=100)
    user_name = models.CharField(max_length=255)
    user_role = models.CharField(max_length=50)
    action = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=255)
    resource_id = models.CharField(max_length=255)
    details = models.JSONField(default=dict)
    outcome = models.CharField(max_length=50) # SUCCESS, DENIED, FAILURE

    def __str__(self):
        return f"{self.timestamp} - {self.user_name} - {self.action}"
