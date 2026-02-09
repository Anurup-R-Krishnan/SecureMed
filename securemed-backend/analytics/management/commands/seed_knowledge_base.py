from django.core.management.base import BaseCommand
from analytics.models import Disease, Symptom, DiseaseSymptom

class Command(BaseCommand):
    help = 'Seeds the knowledge base for the AI Expert System'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding medical knowledge base...')
        
        # Data from the previous dictionary, structured for DB
        data = {
            'Fever': [
                ('Viral Infection', 'B34.9', 75, 'Common viral infection causing fever', ['CBC', 'Viral Panel']),
                ('Influenza', 'J11.1', 65, 'Seasonal flu virus infection', ['Rapid Flu Test', 'CBC']),
                ('COVID-19', 'U07.1', 60, 'SARS-CoV-2 coronavirus infection', ['PCR Test', 'Chest X-ray']),
            ],
            'Cough': [
                ('Upper Respiratory Infection', 'J06.9', 70, 'Common cold or URI', ['Throat Culture']),
                ('Bronchitis', 'J40', 55, 'Inflammation of bronchial tubes', ['Chest X-ray', 'Sputum Culture']),
                ('Pneumonia', 'J18.9', 45, 'Lung infection', ['Chest X-ray', 'CBC', 'Blood Culture']),
            ],
            'Headache': [
                ('Tension Headache', 'G44.2', 80, 'Stress-related headache', []),
                ('Migraine', 'G43.9', 60, 'Recurring severe headache', ['MRI if recurrent']),
                ('Sinusitis', 'J32.9', 50, 'Sinus inflammation causing headache', ['CT Scan of Sinuses']),
            ],
            'Chest pain': [
                ('Costochondritis', 'M94.0', 55, 'Chest wall inflammation', ['ECG', 'Chest X-ray']),
                ('Angina', 'I20.9', 45, 'Reduced blood flow to heart', ['ECG', 'Troponin', 'Exercise Stress Test']),
                ('GERD', 'K21.0', 50, 'Acid reflux causing chest discomfort', ['Endoscopy if recurrent']),
            ],
             'Fatigue': [
                ('Anemia', 'D64.9', 60, 'Low red blood cell count', ['CBC', 'Iron Studies', 'B12']),
                ('Hypothyroidism', 'E03.9', 55, 'Underactive thyroid', ['TSH', 'T3', 'T4']),
                ('Depression', 'F32.9', 50, 'Mental health condition', ['PHQ-9 Assessment']),
            ],
            'Shortness of breath': [
                ('Asthma', 'J45.9', 65, 'Chronic airway inflammation', ['Pulmonary Function Test', 'Peak Flow']),
                ('COPD', 'J44.9', 50, 'Chronic obstructive pulmonary disease', ['Spirometry', 'Chest X-ray']),
                ('Heart Failure', 'I50.9', 40, 'Heart not pumping effectively', ['BNP', 'Echocardiogram', 'Chest X-ray']),
            ],
            'Abdominal pain': [
                ('Gastritis', 'K29.7', 65, 'Stomach lining inflammation', ['H. pylori test']),
                ('Appendicitis', 'K35.8', 45, 'Appendix inflammation', ['CT Abdomen', 'CBC']),
                ('IBS', 'K58.9', 55, 'Irritable bowel syndrome', ['Stool test']),
            ],
            'Joint pain': [
                ('Osteoarthritis', 'M19.9', 70, 'Degenerative joint disease', ['X-ray of affected joint']),
                ('Rheumatoid Arthritis', 'M06.9', 50, 'Autoimmune joint condition', ['RF Factor', 'Anti-CCP', 'ESR']),
                ('Gout', 'M10.9', 55, 'Uric acid crystal buildup', ['Uric Acid Level', 'Joint Aspiration']),
            ],
            'Dizziness': [
                ('Vertigo', 'R42', 70, 'Spinning sensation', ['Dix-Hallpike Test']),
                ('Hypotension', 'I95.9', 55, 'Low blood pressure', ['Blood Pressure Monitoring']),
                ('Anemia', 'D64.9', 50, 'Low blood count causing dizziness', ['CBC']),
            ],
            'Nausea': [
                ('Gastroenteritis', 'A09', 70, 'Stomach flu', ['Stool Test']),
                ('Food Poisoning', 'A05.9', 60, 'Foodborne illness', ['Stool Culture']),
                ('Pregnancy', 'Z33.1', 40, 'Early pregnancy symptom', ['Beta-hCG']),
            ],
        }

        for symptom_name, diseases in data.items():
            symptom, _ = Symptom.objects.get_or_create(name=symptom_name)
            
            for d_info in diseases:
                d_name, d_code, d_weight, d_desc, d_tests = d_info
                
                disease, _ = Disease.objects.get_or_create(
                    icd_code=d_code,
                    defaults={
                        'name': d_name,
                        'description': d_desc,
                        'recommended_tests': d_tests
                    }
                )
                
                DiseaseSymptom.objects.get_or_create(
                    disease=disease,
                    symptom=symptom,
                    defaults={'weight': d_weight}
                )
                
        self.stdout.write(self.style.SUCCESS('Successfully seeded knowledge base'))
