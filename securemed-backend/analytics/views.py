from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
import random
import uuid
import os
from django.conf import settings

User = get_user_model()


# ============================================
# Admin Dashboard API Endpoints
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """
    Returns admin dashboard statistics.
    GET /api/admin/dashboard/stats/
    """
    from patients.models import Patient
    from appointments.models import Appointment, Doctor
    
    # Get real counts from database
    try:
        total_patients = Patient.objects.count()
    except:
        total_patients = 0
    
    try:
        active_doctors = Doctor.objects.filter(is_available=True).count()
    except:
        active_doctors = User.objects.filter(role='doctor', is_active=True).count()
    
    try:
        # Get appointments for today
        today = timezone.now().date()
        today_appointments = Appointment.objects.filter(
            appointment_date=today
        ).count()
    except:
        today_appointments = 0
    
    # Calculate hospital occupancy (placeholder - would need beds/admissions model)
    occupancy = min(65 + (total_patients % 30), 95)  # Simulate occupancy 65-95%
    
    # Calculate revenue (placeholder - would need billing integration)
    avg_revenue_per_patient = 2500  # In INR
    total_revenue = total_patients * avg_revenue_per_patient
    if total_revenue >= 10000000:
        revenue_str = f"₹{total_revenue / 10000000:.1f}Cr"
    elif total_revenue >= 100000:
        revenue_str = f"₹{total_revenue / 100000:.1f}L"
    else:
        revenue_str = f"₹{total_revenue:,}"
    
    return Response({
        'totalPatients': total_patients,
        'hospitalOccupancy': f'{occupancy}%',
        'totalRevenue': revenue_str,
        'activeDoctors': active_doctors,
        'todayAppointments': today_appointments,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_hospitals(request):
    """
    Returns list of hospitals/facilities.
    GET /api/admin/hospitals/
    
    Note: In a real system, this would query a Hospital model.
    Currently returns static facility data.
    """
    # In production, this would come from a Hospital model
    # For now, return facility info based on departments
    hospitals = [
        {
            'id': 1,
            'name': 'SecureMed Main Hospital',
            'location': 'Main Campus',
            'beds': 350,
            'occupancy': '78%',
            'doctors': User.objects.filter(role='doctor', is_active=True).count(),
        },
        {
            'id': 2,
            'name': 'SecureMed Specialty Center',
            'location': 'Downtown',
            'beds': 150,
            'occupancy': '65%',
            'doctors': 12,
        },
    ]
    
    return Response(hospitals)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_staff(request):
    """
    Returns list of staff members (doctors and providers).
    GET /api/admin/staff/
    """
    from appointments.models import Doctor
    
    staff_list = []
    
    # Get doctors from Doctor model
    try:
        doctors = Doctor.objects.select_related('user').all()[:20]  # Limit to 20
        for doc in doctors:
            staff_list.append({
                'id': doc.id,
                'name': f"Dr. {doc.user.first_name} {doc.user.last_name}".strip() or f"Dr. {doc.user.email}",
                'role': doc.specialty or 'General Practitioner',
                'hospital': 'SecureMed Main Hospital',
                'status': 'Active' if doc.is_available else 'On Leave',
                'email': doc.user.email,
            })
    except Exception as e:
        # Fallback to User model for doctors
        doctor_users = User.objects.filter(role='doctor', is_active=True)[:20]
        for user in doctor_users:
            staff_list.append({
                'id': user.id,
                'name': f"Dr. {user.first_name} {user.last_name}".strip() or f"Dr. {user.email}",
                'role': 'Doctor',
                'hospital': 'SecureMed Main Hospital',
                'status': 'Active',
                'email': user.email,
            })
    
    # Get providers
    providers = User.objects.filter(role='provider', is_active=True)[:10]
    for user in providers:
        staff_list.append({
            'id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'role': 'Healthcare Provider',
            'hospital': 'SecureMed Main Hospital',
            'status': 'Active',
            'email': user.email,
        })
    
    return Response(staff_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_alerts(request):
    """
    Returns system alerts for admin dashboard.
    GET /api/admin/alerts/
    """
    from patients.models import Patient
    from appointments.models import Appointment
    
    alerts = []
    
    # Generate alerts based on real data
    try:
        patient_count = Patient.objects.count()
        if patient_count > 100:
            alerts.append({
                'id': 1,
                'type': 'info',
                'title': f'Growing Patient Base',
                'message': f'{patient_count} patients registered in the system',
                'timestamp': timezone.now().isoformat(),
            })
    except:
        pass
    
    try:
        today = timezone.now().date()
        pending = Appointment.objects.filter(
            appointment_date=today,
            status='scheduled'
        ).count()
        if pending > 0:
            alerts.append({
                'id': 2,
                'type': 'warning',
                'title': 'Pending Appointments Today',
                'message': f'{pending} appointments scheduled for today',
                'timestamp': timezone.now().isoformat(),
            })
    except:
        pass
    
    # Default alert if none
    if not alerts:
        alerts.append({
            'id': 0,
            'type': 'success',
            'title': 'System Operating Normally',
            'message': 'All systems are functioning correctly',
            'timestamp': timezone.now().isoformat(),
        })
    
    return Response(alerts)


# Epic 8 Story 8.1: Clinical Analytics Dashboard API
# Returns privacy-preserving aggregated data (no PII)


@api_view(['GET'])
@permission_classes([AllowAny])  # For now, can restrict to admin later
def get_analytics(request):
    """
    Returns aggregated clinical analytics data for the dashboard.
    All data is anonymized - no PII is exposed.
    """
    
    # Generate sample analytics data
    # In production, this would query actual medical records with GROUP BY
    
    # Flu Cases Trend (monthly data for last 12 months)
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    flu_cases_trend = [
        {'month': months[i], 'count': random.randint(20, 150)}
        for i in range(12)
    ]
    
    # Simulate seasonal flu pattern (higher in winter months)
    for i, item in enumerate(flu_cases_trend):
        if item['month'] in ['Dec', 'Jan', 'Feb']:
            item['count'] = random.randint(100, 150)
        elif item['month'] in ['Jun', 'Jul', 'Aug']:
            item['count'] = random.randint(20, 50)
    
    # Diagnosis Distribution
    diagnoses = [
        'Respiratory Infections',
        'Cardiovascular',
        'Diabetes Management',
        'Orthopedic',
        'Dermatology',
        'General Checkup',
        'Mental Health',
        'Pediatric Care',
    ]
    
    diagnosis_counts = [random.randint(50, 300) for _ in diagnoses]
    total_diagnoses = sum(diagnosis_counts)
    
    diagnosis_distribution = [
        {
            'diagnosis': diagnoses[i],
            'count': diagnosis_counts[i],
            'percentage': (diagnosis_counts[i] / total_diagnoses) * 100
        }
        for i in range(len(diagnoses))
    ]
    
    # Sort by count descending
    diagnosis_distribution.sort(key=lambda x: x['count'], reverse=True)
    
    # Department Statistics
    departments = [
        'Emergency',
        'Cardiology',
        'Neurology',
        'Pediatrics',
        'Orthopedics',
        'Oncology',
        'Internal Medicine',
        'Surgery',
    ]
    
    department_stats = []
    for dept in departments:
        total = random.randint(100, 500)
        active = random.randint(10, min(50, total))
        resolved = total - active
        department_stats.append({
            'department': dept,
            'totalCases': total,
            'activeCases': active,
            'resolvedCases': resolved
        })
    
    # Summary Statistics
    summary = {
        'totalPatients': random.randint(5000, 15000),
        'totalVisits': random.randint(20000, 50000),
        'averageOccupancy': random.randint(60, 95),
        'emergencyCases': random.randint(100, 500),
    }
    
    # Cache metadata
    now = timezone.now()
    cache_expires = now + timedelta(minutes=15)
    
    response_data = {
        'fluCasesTrend': flu_cases_trend,
        'diagnosisDistribution': diagnosis_distribution,
        'departmentStats': department_stats,
        'summary': summary,
        'lastUpdated': now.isoformat(),
        'cacheExpiresAt': cache_expires.isoformat(),
        'fromCache': False,
    }
    
    return Response(response_data)


# Epic 8 Story 8.3: AI Decision Support API
@api_view(['POST'])
@permission_classes([AllowAny])
def ai_suggestions(request):
    """
    AI Decision Support for doctors.
    Takes symptoms and returns diagnosis suggestions with confidence scores.
    """
    symptoms = request.data.get('symptoms', [])
    
    if not symptoms:
        return Response({'error': 'No symptoms provided'}, status=400)
    
    # Mock AI diagnosis suggestions based on symptoms
    # In production, this would call an actual AI/ML model
    
    symptom_diagnosis_map = {
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
    
    # Collect all possible diagnoses based on symptoms
    all_suggestions = []
    matched_symptoms_count = {}
    
    for symptom in symptoms:
        if symptom in symptom_diagnosis_map:
            for diag in symptom_diagnosis_map[symptom]:
                diag_name = diag[0]
                if diag_name not in matched_symptoms_count:
                    matched_symptoms_count[diag_name] = {
                        'data': diag,
                        'symptoms': [symptom],
                        'boost': 0
                    }
                else:
                    matched_symptoms_count[diag_name]['symptoms'].append(symptom)
                    matched_symptoms_count[diag_name]['boost'] += 10  # Boost confidence for multiple matching symptoms
    
    # Build final suggestions
    for diag_name, info in matched_symptoms_count.items():
        diag = info['data']
        confidence = min(diag[2] + info['boost'], 95)  # Cap at 95%
        all_suggestions.append({
            'id': str(uuid.uuid4()),
            'diagnosis': diag_name,
            'icdCode': diag[1],
            'confidence': confidence,
            'matchedSymptoms': info['symptoms'],
            'description': diag[3],
            'recommendedTests': list(diag[4]) if diag[4] else [],
        })
    
    # Sort by confidence descending
    all_suggestions.sort(key=lambda x: x['confidence'], reverse=True)
    
    # Return top 5 suggestions
    return Response({
        'requestId': str(uuid.uuid4()),
        'timestamp': timezone.now().isoformat(),
        'suggestions': all_suggestions[:5],
        'disclaimer': 'AI suggestions are for reference only and do not replace clinical judgment.'
    })


# Epic 8 Story 8.2: FHIR Export API
@api_view(['GET'])
@permission_classes([AllowAny])
def fhir_export(request):
    """
    Export patient medical history in FHIR R4 format.
    """
    patient_id = request.GET.get('patient_id', 'P12345')
    
    now = timezone.now().isoformat()
    
    # Generate FHIR Bundle with mock data
    # In production, this would query actual patient data
    fhir_bundle = {
        'resourceType': 'Bundle',
        'id': str(uuid.uuid4()),
        'type': 'collection',
        'timestamp': now,
        'total': 6,
        'entry': [
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'Patient',
                    'id': patient_id,
                    'meta': {
                        'lastUpdated': now
                    },
                    'name': [{
                        'use': 'official',
                        'family': 'Doe',
                        'given': ['John']
                    }],
                    'gender': 'male',
                    'birthDate': '1985-06-15',
                    'telecom': [
                        {'system': 'phone', 'value': '+1-555-123-4567'},
                        {'system': 'email', 'value': 'john.doe@example.com'}
                    ]
                }
            },
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'Condition',
                    'id': str(uuid.uuid4()),
                    'clinicalStatus': {
                        'coding': [{'system': 'http://terminology.hl7.org/CodeSystem/condition-clinical', 'code': 'active'}]
                    },
                    'code': {
                        'coding': [{'system': 'http://hl7.org/fhir/sid/icd-10', 'code': 'I10', 'display': 'Essential Hypertension'}],
                        'text': 'Hypertension'
                    },
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'recordedDate': '2024-01-15'
                }
            },
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'Encounter',
                    'id': str(uuid.uuid4()),
                    'status': 'finished',
                    'class': {'system': 'http://terminology.hl7.org/CodeSystem/v3-ActCode', 'code': 'AMB', 'display': 'Ambulatory'},
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'period': {'start': '2025-01-10T09:00:00Z', 'end': '2025-01-10T09:30:00Z'},
                    'reasonCode': [{'text': 'Regular checkup'}]
                }
            },
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'MedicationRequest',
                    'id': str(uuid.uuid4()),
                    'status': 'active',
                    'intent': 'order',
                    'medicationCodeableConcept': {
                        'coding': [{'system': 'http://www.nlm.nih.gov/research/umls/rxnorm', 'code': '197361', 'display': 'Lisinopril 10 MG'}],
                        'text': 'Lisinopril 10mg'
                    },
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'authoredOn': '2025-01-10',
                    'dosageInstruction': [{'text': 'Take once daily in the morning'}]
                }
            },
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'DiagnosticReport',
                    'id': str(uuid.uuid4()),
                    'status': 'final',
                    'category': [{'coding': [{'system': 'http://terminology.hl7.org/CodeSystem/v2-0074', 'code': 'LAB', 'display': 'Laboratory'}]}],
                    'code': {'coding': [{'display': 'Complete Blood Count'}], 'text': 'CBC'},
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'effectiveDateTime': '2025-01-10',
                    'conclusion': 'All values within normal limits'
                }
            },
            {
                'fullUrl': f'urn:uuid:{uuid.uuid4()}',
                'resource': {
                    'resourceType': 'Observation',
                    'id': str(uuid.uuid4()),
                    'status': 'final',
                    'category': [{'coding': [{'system': 'http://terminology.hl7.org/CodeSystem/observation-category', 'code': 'vital-signs'}]}],
                    'code': {'coding': [{'system': 'http://loinc.org', 'code': '85354-9', 'display': 'Blood pressure'}]},
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'effectiveDateTime': '2025-01-10',
                    'component': [
                        {'code': {'coding': [{'display': 'Systolic'}]}, 'valueQuantity': {'value': 128, 'unit': 'mmHg'}},
                        {'code': {'coding': [{'display': 'Diastolic'}]}, 'valueQuantity': {'value': 82, 'unit': 'mmHg'}}
                    ]
                }
            }
        ]
    }
    
    return Response(fhir_bundle)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring"""
    return Response({
        'status': 'healthy',
        'service': 'SecureMed Analytics',
        'timestamp': timezone.now().isoformat()
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    """
    Returns the content of privacy_audit.log.
    GET /api/admin/audit-logs/
    """
    log_file_path = os.path.join(settings.BASE_DIR, 'privacy_audit.log')
    logs = []
    try:
        if os.path.exists(log_file_path):
            with open(log_file_path, 'r') as f:
                # Read last 100 lines for performance
                lines = f.readlines()
                logs = [line.strip() for line in lines[-100:]]
                logs.reverse() # Newest first
    except Exception as e:
        print(f"Error reading audit log: {e}")
        
    return Response({'logs': logs})
