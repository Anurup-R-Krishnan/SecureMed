from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Patient
from .serializers import PatientSerializer

def get_patient_profile(user):
    if hasattr(user, 'patient_profile'):
        return user.patient_profile
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_patients(request):
    """List all patients - for doctors and admins"""
    user = request.user
    if user.role in ['doctor', 'admin', 'provider']:
        patients = Patient.objects.select_related('user').all()
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data)
    return Response({"error": "Unauthorized"}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_detail(request, pk):
    """Get single patient detail - for doctors and admins"""
    user = request.user
    if user.role in ['doctor', 'admin', 'provider']:
        patient = get_object_or_404(Patient, pk=pk)
        serializer = PatientSerializer(patient)
        return Response(serializer.data)
    return Response({"error": "Unauthorized"}, status=403)

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
        # Support lookup by numeric PK or display patient_id (e.g., 'P-0008')
        if target_patient_id.isdigit():
            patient = get_object_or_404(Patient, pk=int(target_patient_id))
        else:
            patient = get_object_or_404(Patient, patient_id=target_patient_id)
        # Doctors/admins/providers can view any patient timeline
        # (consistent with list_patients and patient_detail views)
        if user.role not in ['doctor', 'admin', 'provider']:
            # Allow if they are requesting their own timeline
            user_patient = get_patient_profile(user)
            if not user_patient or (str(user_patient.id) != str(patient.id) and user_patient.patient_id != patient.patient_id):
                return Response({"error": "Access denied to this patient's timeline."}, status=403)
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

    # 4. Fetch Invoices and Payments
    if hasattr(patient, 'invoices'):
        invoices = patient.invoices.all()
        for inv in invoices:
            # Invoice Issued Event
            events.append({
                'id': f"inv_{inv.invoice_id}",
                'date': f"{inv.issue_date}T09:00:00", # Default time
                'title': f"Invoice Generated: ${inv.total_amount}",
                'description': inv.notes or "Medical Service Invoice",
                'category': 'billing',
                'status': 'pending' if inv.status != 'paid' else 'completed'
            })
            
            # Payment Event (if paid)
            if inv.status == 'paid':
                payment_date = inv.updated_at.isoformat()
                events.append({
                    'id': f"pay_{inv.invoice_id}",
                    'date': payment_date,
                    'title': f"Payment Confirmed: ${inv.paid_amount}",
                    'description': f"Payment for Invoice #{inv.invoice_id}",
                    'category': 'billing',
                    'status': 'completed'
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
    patient = get_patient_profile(user)
    
    if not patient:
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
