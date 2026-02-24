from django.db import models

class Symptom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class Disease(models.Model):
    name = models.CharField(max_length=200, unique=True)
    icd_code = models.CharField(max_length=20, unique=True)
    description = models.TextField()
    recommended_tests = models.JSONField(default=list) # List of strings
    
    symptoms = models.ManyToManyField(Symptom, through='DiseaseSymptom')
    
    def __str__(self):
        return self.name

class DiseaseSymptom(models.Model):
    disease = models.ForeignKey(Disease, on_delete=models.CASCADE)
    symptom = models.ForeignKey(Symptom, on_delete=models.CASCADE)
    weight = models.IntegerField(default=50) # 0-100 probability/relevance
    
    class Meta:
        unique_together = ['disease', 'symptom']
