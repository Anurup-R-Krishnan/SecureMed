from django.test import TestCase
from rest_framework.test import APIClient
from analytics.models import Disease, Symptom, DiseaseSymptom

class AIDiagnosisTest(TestCase):
    def setUp(self):
        # Setup Data
        s1 = Symptom.objects.create(name="Test Fever")
        s2 = Symptom.objects.create(name="Test Cough")
        
        d1 = Disease.objects.create(name="Test Flu", icd_code="T00.1", description="Test Desc")
        DiseaseSymptom.objects.create(disease=d1, symptom=s1, weight=80)
        DiseaseSymptom.objects.create(disease=d1, symptom=s2, weight=50)
        
        d2 = Disease.objects.create(name="Test Cold", icd_code="T00.2", description="Test Desc 2")
        DiseaseSymptom.objects.create(disease=d2, symptom=s2, weight=90)
        
        self.client = APIClient()

    def test_ai_diagnosis_fever(self):
        # Test 1: Match "Test Fever" -> Should suggest Test Flu (80 match)
        response = self.client.post('/api/doctor/ai-suggestions/', {'symptoms': ['Test Fever']}, format='json')
        self.assertEqual(response.status_code, 200)
        suggestions = response.data['suggestions']
        self.assertTrue(len(suggestions) > 0)
        self.assertEqual(suggestions[0]['diagnosis'], 'Test Flu')
        
    def test_ai_diagnosis_cough(self):
        # Test 2: Match "Test Cough" -> Should suggest Test Cold (90) then Test Flu (50)
        response = self.client.post('/api/doctor/ai-suggestions/', {'symptoms': ['Test Cough']}, format='json')
        self.assertEqual(response.status_code, 200)
        suggestions = response.data['suggestions']
        self.assertTrue(len(suggestions) >= 2)
        self.assertEqual(suggestions[0]['diagnosis'], 'Test Cold')
        self.assertEqual(suggestions[1]['diagnosis'], 'Test Flu')

    def test_ai_diagnosis_partial_match(self):
        # Test 3: Partial Match
        response = self.client.post('/api/doctor/ai-suggestions/', {'symptoms': ['fever']}, format='json')
        # Should match "Test Fever" (contains "fever")
        self.assertEqual(response.status_code, 200)
        suggestions = response.data['suggestions']
        self.assertTrue(len(suggestions) > 0)
        self.assertEqual(suggestions[0]['diagnosis'], 'Test Flu')
