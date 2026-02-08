from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Patient
def get_patient_profile(user):
    # Helper to get patient profile safely
    if hasattr(user, 'patient_profile'):
        return user.patient_profile
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_timeline(request):
    """
    Get aggregated timeline of events for a patient.
    Query Params: patient_id (optional, defaults to current user's patient profile)
    """
    user = request.user
    
    # If doctor/admin, allows fetching specific patient
    target_patient_id = request.query_params.get('patient_id')
    
    if target_patient_id:
        # Check permissions (doctors/admins can view valid patients)
        # For now assuming doctors can view any patient or strictly checking relationship
        patient = get_object_or_404(Patient, patient_id=target_patient_id)
    else:
        # Default to current user
        patient = get_patient_profile(user)
        if not patient:
             return Response({"error": "Patient profile not found"}, status=404)

    events = []

    # 1. Fetch Appointments with optimized query
    appointments = patient.appointments.select_related(
        'doctor__user',
        'doctor__department'
    ).all()
    
    for appt in appointments:
        events.append({
            'id': f"appt_{appt.id}",
            'date': f"{appt.appointment_date}T{appt.appointment_time}",
            'title': f"Appointment with Dr. {appt.doctor.user.last_name}",
            'description': appt.reason,
            'category': 'appointment',
            'doctor': f"Dr. {appt.doctor.user.last_name}",
            'location': appt.doctor.department.building if appt.doctor.department else 'Main Hospital',
            'status': 'completed' if appt.status == 'completed' else 'upcoming' if appt.status == 'scheduled' else appt.status
        })

    # 2. Fetch Medical Records (Diagnoses, Prescriptions, etc.) with optimized query
    records = patient.medical_records.select_related('doctor__user').all()
    for record in records:
        category_map = {
            'consultation': 'diagnosis',
            'lab_report': 'lab',
            'prescription': 'medication',
            'imaging': 'lab',
            'surgery': 'appointment',
            'discharge': 'admin'
        }
        
        events.append({
            'id': f"rec_{record.id}",
            'date': record.record_date.isoformat(),
            'title': record.get_record_type_display(),
            'description': record.diagnosis or record.notes or "Medical Record Entry",
            'category': category_map.get(record.record_type, 'admin'),
            'doctor': f"Dr. {record.doctor.user.last_name}" if record.doctor else "Hospital Staff",
            'status': 'completed'
        })

    # 3. Fetch Lab Tests
    # Assuming related_name='lab_tests' on Patient model
    if hasattr(patient, 'lab_tests'):
        labs = patient.lab_tests.all()
        for lab in labs:
             events.append({
                'id': f"lab_{lab.id}",
                'date': lab.ordered_date.isoformat(),
                'title': f"Lab: {lab.test_name}",
                'description': f"Status: {lab.get_status_display()}",
                'category': 'lab',
                'status': 'completed' if lab.status == 'completed' else 'pending'
            })

    # Sort by date descending
    events.sort(key=lambda x: x['date'], reverse=True)

    return Response(events)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_details(request):
    """
    Get or update the current user's patient profile.
    """
    user = request.user
    print(f"DEBUG: profile_details called for user: {user.username} (ID: {user.id})")
    patient = get_patient_profile(user)
    
    if not patient:
        print(f"DEBUG: Profile not found for {user.username}")
        return Response({"error": "Patient profile not found."}, status=404)

    if request.method == 'GET':
        from .serializers import PatientSerializer
        serializer = PatientSerializer(patient)
        return Response(serializer.data)

    elif request.method == 'PUT':
        from .serializers import PatientSerializer
        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
