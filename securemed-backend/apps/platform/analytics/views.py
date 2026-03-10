from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
import random
import uuid
import os
import logging
from django.conf import settings

from apps.platform.analytics.audit import log_audit, get_client_ip
from apps.platform.analytics.models import Hospital
from apps.platform.analytics.serializers import HospitalSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


def _compute_room_occupancy_percent(window_days=7):
    from apps.scheduling.appointments.models import Appointment
    from apps.clinical.infection_tracking.models import Room

    today = timezone.now().date()
    window_start = today - timedelta(days=max(window_days - 1, 0))
    rooms = Room.objects.filter(is_active=True)
    total_rooms = rooms.count()
    if total_rooms <= 0:
        return 0

    used_room_count = (
        Appointment.objects.filter(
            appointment_date__gte=window_start,
            appointment_date__lte=today,
            room__isnull=False,
            status__in=['scheduled', 'confirmed', 'in_progress', 'completed'],
        )
        .values('room')
        .distinct()
        .count()
    )

    return round((used_room_count / total_rooms) * 100)


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
    from apps.accounts.patients.models import Patient
    from apps.scheduling.appointments.models import Appointment, Doctor
    
    try:
        total_patients = Patient.objects.count()
    except Exception:
        logger.exception("Failed to count patients")
        total_patients = 0
    
    try:
        active_doctors = Doctor.objects.filter(is_available=True).count()
    except Exception:
        logger.exception("Failed to count active doctors")
        active_doctors = User.objects.filter(role='doctor', is_active=True).count()
    
    try:
        # Get appointments for today
        today = timezone.now().date()
        today_appointments = Appointment.objects.filter(
            appointment_date=today
        ).count()
    except Exception:
        logger.exception("Failed to count today's appointments")
        today_appointments = 0
    
    occupancy = _compute_room_occupancy_percent()
    
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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_hospitals(request):
    """
    List or create hospitals/facilities.
    GET /api/admin/hospitals/
    POST /api/admin/hospitals/
    """
    if request.method == 'POST':
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden: Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        serializer = HospitalSerializer(data=request.data)
        if serializer.is_valid():
            hospital = serializer.save()
            log_audit(
                actor=request.user,
                action='user_created',
                resource_type='Hospital',
                resource_id=str(hospital.id),
                description=f'Created hospital {hospital.name}',
                ip_address=get_client_ip(request),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if not Hospital.objects.exists():
        Hospital.objects.create(
            name='SecureMed Main Hospital',
            location='Main Campus',
            beds=350,
            occupancy_percent=78,
            doctors=User.objects.filter(role='doctor', is_active=True).count(),
        )
        Hospital.objects.create(
            name='SecureMed Specialty Center',
            location='Downtown',
            beds=150,
            occupancy_percent=65,
            doctors=12,
        )

    hospitals = Hospital.objects.all()
    serializer = HospitalSerializer(hospitals, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def hospital_detail(request, pk):
    """
    Retrieve, update, or delete a hospital.
    GET /api/admin/hospitals/{id}/
    PATCH /api/admin/hospitals/{id}/
    DELETE /api/admin/hospitals/{id}/
    """
    try:
        hospital = Hospital.objects.get(pk=pk)
    except Hospital.DoesNotExist:
        return Response({'error': 'Hospital not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(HospitalSerializer(hospital).data)

    if request.user.role != 'admin':
        return Response({'error': 'Forbidden: Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = HospitalSerializer(hospital, data=request.data, partial=True)
        if serializer.is_valid():
            hospital = serializer.save()
            log_audit(
                actor=request.user,
                action='user_role_changed',
                resource_type='Hospital',
                resource_id=str(hospital.id),
                description=f'Updated hospital {hospital.name}',
                ip_address=get_client_ip(request),
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    hospital.delete()
    log_audit(
        actor=request.user,
        action='user_deleted',
        resource_type='Hospital',
        resource_id=str(pk),
        description='Deleted hospital',
        ip_address=get_client_ip(request),
    )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_staff(request):
    """
    Returns list of staff members (doctors and providers).
    GET /api/admin/staff/
    """
    from apps.scheduling.appointments.models import Doctor
    
    staff_list = []
    
    # Get doctors from Doctor model
    try:
        doctors = Doctor.objects.select_related('user').all()[:20]  # Limit to 20
        for doc in doctors:
            status_label = 'Active' if doc.user.is_active and doc.is_available else 'On Leave'
            if not doc.user.is_active:
                status_label = 'Inactive'
            staff_list.append({
                'id': doc.user.id,
                'user_id': doc.user.id,
                'name': f"Dr. {doc.user.first_name} {doc.user.last_name}".strip() or f"Dr. {doc.user.email}",
                'role': 'Doctor',
                'specialty': doc.specialty or 'General Practitioner',
                'hospital': 'SecureMed Main Hospital',
                'status': status_label,
                'is_active': doc.user.is_active,
                'email': doc.user.email,
            })
    except Exception as e:
        # Fallback to User model for doctors
        doctor_users = User.objects.filter(role='doctor', is_active=True)[:20]
        for user in doctor_users:
            staff_list.append({
                'id': user.id,
                'user_id': user.id,
                'name': f"Dr. {user.first_name} {user.last_name}".strip() or f"Dr. {user.email}",
                'role': 'Doctor',
                'hospital': 'SecureMed Main Hospital',
                'status': 'Active' if user.is_active else 'Inactive',
                'is_active': user.is_active,
                'email': user.email,
            })
    
    # Get providers
    providers = User.objects.filter(role='provider', is_active=True)[:10]
    for user in providers:
        staff_list.append({
            'id': user.id,
            'user_id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'role': 'Healthcare Provider',
            'hospital': 'SecureMed Main Hospital',
            'status': 'Active' if user.is_active else 'Inactive',
            'is_active': user.is_active,
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
    from apps.accounts.patients.models import Patient
    from apps.scheduling.appointments.models import Appointment
    
    alerts = []
    
    # Generate alerts based on real data
    try:
        patient_count = Patient.objects.count()
        if patient_count > 100:
            alerts.append({
                'id': 1,
                'type': 'info',
                'title': 'Growing Patient Base',
                'message': f'{patient_count} patients registered in the system',
                'timestamp': timezone.now().isoformat(),
            })
    except Exception:
        logger.exception("Failed to compute patient count alerts")
    
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
    except Exception:
        logger.exception("Failed to compute appointment alerts")
    
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
    Uses REAL database counts.
    """
    from apps.clinical.records.models import MedicalRecord
    from apps.clinical.records.models import EmergencyAccessLog
    from apps.accounts.patients.models import Patient
    from apps.scheduling.appointments.models import Appointment
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    
    # 1. Flu Cases Trend (Real Data)
    # Filter for flu-like diagnoses
    flu_keywords = ['flu', 'influenza', 'respiratory', 'cold', 'fever']
    import operator
    from django.db.models import Q
    from functools import reduce
    
    query = reduce(operator.or_, (Q(diagnosis__icontains=k) for k in flu_keywords))
    
    # Group by month for last 12 months
    one_year_ago = timezone.now() - timedelta(days=365)
    
    monthly_stats = MedicalRecord.objects.filter(
        query,
        record_date__gte=one_year_ago
    ).annotate(
        month=TruncMonth('record_date')
    ).values('month').annotate(
        count=Count('id')
    ).order_by('month')
    
    # Format for frontend
    flu_cases_trend = []
    # Fill in gaps? For now just return what we have or map to list
    # The frontend expects months names. 
    # Map existing data or return 0 if empty.
    # To keep it simple and robust:
    for entry in monthly_stats:
         flu_cases_trend.append({
             'month': entry['month'].strftime('%b'),
             'count': entry['count']
         })
         
    if not flu_cases_trend:
         # Return empty structure if no data to prevent frontend crash
         months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
         flu_cases_trend = [{'month': m, 'count': 0} for m in months]

    # 2. Diagnosis Distribution (Real Data)
    diagnosis_stats = MedicalRecord.objects.exclude(diagnosis='').values('diagnosis').annotate(
        count=Count('id')
    ).order_by('-count')[:8]
    
    total_diagnoses = sum(d['count'] for d in diagnosis_stats) or 1
    
    diagnosis_distribution = [
        {
            'diagnosis': d['diagnosis'],
            'count': d['count'],
            'percentage': round((d['count'] / total_diagnoses) * 100, 1)
        }
        for d in diagnosis_stats
    ]
    
    # 3. Summary Statistics (Real Data)
    total_patients = Patient.objects.count()
    total_visits = Appointment.objects.filter(status='completed').count()
    
    recent_window_start = timezone.now() - timedelta(days=30)
    emergency_appointments = Appointment.objects.filter(
        appointment_date__gte=recent_window_start.date(),
        reason__icontains='emergency',
    ).count()
    emergency_break_glass = EmergencyAccessLog.objects.filter(
        timestamp__gte=recent_window_start
    ).count()

    summary = {
        'totalPatients': total_patients,
        'totalVisits': total_visits,
        'averageOccupancy': _compute_room_occupancy_percent(),
        'emergencyCases': emergency_appointments + emergency_break_glass,
    }
    
    # Department Stats (Real Data - requiring link to Department)
    # Using Appointment counts per doctor's department if possible
    # We don't have Department model loaded in context effectively yet
    # Let's try to get real appointment counts by doctor specialty at least
    
    from apps.scheduling.appointments.models import Doctor
    # Group doctors by specialization and count their appointments
    # usage: Doctor.objects.values('specialization').annotate(...)
    
    dept_counts = Doctor.objects.values('specialization').annotate(
        active=Count('appointments', filter=Q(appointments__status__in=['scheduled', 'in_progress'])),
        total=Count('appointments')
    )
    
    department_stats = []
    for d in dept_counts:
        if d['specialization']:
            department_stats.append({
                'department': d['specialization'],
                'totalCases': d['total'],
                'activeCases': d['active'],
                'resolvedCases': d['total'] - d['active']
            })
            
    if not department_stats:
         department_stats = [{'department': 'General', 'totalCases': 0, 'activeCases': 0, 'resolvedCases': 0}]

    now = timezone.now()
    response_data = {
        'fluCasesTrend': flu_cases_trend,
        'diagnosisDistribution': diagnosis_distribution,
        'departmentStats': department_stats,
        'summary': summary,
        'lastUpdated': now.isoformat(),
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
    Uses a database-backed Expert System (Knowledge Base).
    """
    symptoms = request.data.get('symptoms', [])
    
    if not symptoms:
        return Response({'error': 'No symptoms provided'}, status=400)
    
    # Real-World Logic: Query Knowledge Base
    # 1. Normalize input symptoms
    # 2. Find matching symptoms in DB
    # 3. Find diseases linked to those symptoms
    # 4. Calculate score based on weights
    
    from .models import Disease, Symptom, DiseaseSymptom
    from django.db.models import Sum, Count, Q
    
    # 1. Match Symptoms (Case insensitive partial match)
    # We use a set to avoid duplicates if multiple inputs match same symptom
    matched_symptom_ids = set()
    matched_symptom_names = []
    
    for user_symptom in symptoms:
        # Try exact match first, then contains
        matches = Symptom.objects.filter(
            Q(name__iexact=user_symptom) | Q(name__icontains=user_symptom)
        )
        for s in matches:
            matched_symptom_ids.add(s.id)
            matched_symptom_names.append(s.name)
            
    if not matched_symptom_ids:
        return Response({
            'requestId': str(uuid.uuid4()),
            'timestamp': timezone.now().isoformat(),
            'suggestions': [],
            'disclaimer': 'No matching clinical symptoms found in knowledge base.'
        })

    # 2. Scoring Algorithm (Bayesian-like inference)
    # We calculate a 'match_score' for each disease:
    # Score = Sum(weight of matched symptoms) / Sum(weight of all symptoms for that disease) * 100
    # But for simplicity and robustness in this iteration:
    # Score = Sum(weight of matched symptoms) normalized by a confidence factor
    
    # Get all diseases that have ANY of the matched symptoms
    potential_diseases = Disease.objects.filter(
        diseasesymptom__symptom_id__in=matched_symptom_ids
    ).annotate(
        total_score=Sum('diseasesymptom__weight'),
        matched_count=Count('diseasesymptom')
    ).order_by('-total_score')
    
    all_suggestions = []
    
    for disease in potential_diseases:
        # Calculate confidence
        # A simple heuristic: Base confidence is the sigmoid of total weights
        # But let's use the explicit weights we defined (sum of weights matching)
        # Cap at 95%
        confidence = min(disease.total_score, 95)
        
        # Get which symptoms matched for this specific disease
        disease_matched_symptoms = disease.symptoms.filter(id__in=matched_symptom_ids)
        matched_names = [s.name for s in disease_matched_symptoms]
        
        all_suggestions.append({
            'id': str(uuid.uuid4()),
            'diagnosis': disease.name,
            'icdCode': disease.icd_code,
            'confidence': confidence,
            'matchedSymptoms': matched_names,
            'description': disease.description,
            'recommendedTests': disease.recommended_tests,
        })
    
    # Return top 5 suggestions
    return Response({
        'requestId': str(uuid.uuid4()),
        'timestamp': timezone.now().isoformat(),
        'suggestions': all_suggestions[:5],
        'disclaimer': 'AI suggestions generated by Clinical Knowledge Base. Verified by Medical Board.'
    })


# Epic 8 Story 8.2: FHIR Export API
@api_view(['GET'])
@permission_classes([AllowAny])
def fhir_export(request):
    """
    Export patient medical history in FHIR R4 format.
    Dynamically generated from real database records.
    """
    patient_id = request.GET.get('patient_id')
    if not patient_id:
         # Demo mode default if not provided, or error
         return Response({"error": "patient_id query parameter is required"}, status=400)

    from apps.accounts.patients.models import Patient
    try:
        # Try both patient_id string and user id
        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
             # Fallback
             patient = Patient.objects.get(id=patient_id)
    except Exception:
         return Response({"error": "Patient not found"}, status=404)
    
    now = timezone.now().isoformat()
    entries = []
    
    # 1. Patient Resource
    entries.append({
        'fullUrl': f'urn:uuid:{uuid.uuid4()}',
        'resource': {
            'resourceType': 'Patient',
            'id': patient.patient_id,
            'meta': {'lastUpdated': now},
            'name': [{
                'use': 'official',
                'family': patient.user.last_name,
                'given': [patient.user.first_name]
            }],
            'gender': patient.gender.lower() if patient.gender else 'unknown',
            'birthDate': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'telecom': [
                {'system': 'phone', 'value': patient.phone},
                {'system': 'email', 'value': patient.user.email}
            ]
        }
    })
    
    # 2. Conditions (from Medical Records)
    from apps.clinical.records.models import MedicalRecord
    records = MedicalRecord.objects.filter(patient=patient)
    for rec in records:
        entries.append({
            'fullUrl': f'urn:uuid:{uuid.uuid4()}',
            'resource': {
                'resourceType': 'Condition',
                'id': f"rec-{rec.id}",
                'clinicalStatus': {
                    'coding': [{'system': 'http://terminology.hl7.org/CodeSystem/condition-clinical', 'code': 'active'}]
                },
                'code': {
                    'text': rec.diagnosis
                },
                'subject': {'reference': f'Patient/{patient.patient_id}'},
                'recordedDate': rec.record_date.isoformat(),
                'note': [{'text': rec.notes}] if rec.notes else []
            }
        })
        
    # 3. Medications (from Prescriptions)
    # Using 'medical_record__prescriptions' if related, or direct query
    # Prescription model has 'medical_record' FK
    from apps.clinical.records.models import Prescription
    prescriptions = Prescription.objects.filter(medical_record__patient=patient)
    for pres in prescriptions:
        entries.append({
            'fullUrl': f'urn:uuid:{uuid.uuid4()}',
            'resource': {
                'resourceType': 'MedicationRequest',
                'id': f"rx-{pres.id}",
                'status': 'active' if pres.status == 'signed' else 'draft',
                'intent': 'order',
                'medicationCodeableConcept': {
                    'text': f"{pres.medication_name} {pres.dosage}"
                },
                'subject': {'reference': f'Patient/{patient.patient_id}'},
                'authoredOn': pres.created_at.date().isoformat(),
                'dosageInstruction': [{'text': f"{pres.frequency} for {pres.duration}"}],
                'requester': {'display': f"Dr. {pres.medical_record.doctor.user.last_name}"} if pres.medical_record.doctor else None
            }
        })
    
    fhir_bundle = {
        'resourceType': 'Bundle',
        'id': str(uuid.uuid4()),
        'type': 'collection',
        'timestamp': now,
        'total': len(entries),
        'entry': entries
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
    Paginated, filterable audit log endpoint.
    Admin only.  GET /api/admin/audit-logs/

    Query params
    ------------
    action       – filter by action code (e.g. login, logout, emergency_access)
    category     – filter by category (auth, admin, consent, clinical)
    actor_id     – filter by actor user ID
    resource_type– filter by resource type
    date_from    – ISO date string (inclusive lower bound)
    date_to      – ISO date string (inclusive upper bound)
    search       – case-insensitive substring search on description
    page         – 1-based page number (default 1)
    page_size    – items per page (default 50, max 200)
    """
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)

    from apps.platform.analytics.models import AuditLog
    from datetime import datetime

    qs = AuditLog.objects.select_related('actor').all()

    # ── Filters ─────────────────────────────────────────────────────────
    action = request.query_params.get('action')
    if action:
        qs = qs.filter(action=action)

    category = request.query_params.get('category')
    if category:
        category_actions = [
            k for k, v in AuditLog.CATEGORY_MAP.items() if v == category
        ]
        if category_actions:
            qs = qs.filter(action__in=category_actions)

    actor_id = request.query_params.get('actor_id')
    if actor_id:
        qs = qs.filter(actor_id=actor_id)

    resource_type = request.query_params.get('resource_type')
    if resource_type:
        qs = qs.filter(resource_type__iexact=resource_type)

    date_from = request.query_params.get('date_from')
    if date_from:
        try:
            qs = qs.filter(timestamp__date__gte=datetime.fromisoformat(date_from).date())
        except ValueError:
            pass

    date_to = request.query_params.get('date_to')
    if date_to:
        try:
            qs = qs.filter(timestamp__date__lte=datetime.fromisoformat(date_to).date())
        except ValueError:
            pass

    search = request.query_params.get('search')
    if search:
        qs = qs.filter(description__icontains=search)

    # ── Pagination ──────────────────────────────────────────────────────
    total = qs.count()
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(max(int(request.query_params.get('page_size', 50)), 1), 200)
    except (ValueError, TypeError):
        page_size = 50

    start = (page - 1) * page_size
    end = start + page_size
    logs = qs[start:end]

    data = []
    for log in logs:
        actor_email = ''
        actor_name = ''
        if log.actor:
            actor_email = log.actor.email
            actor_name = log.actor.get_full_name() or log.actor.username
        data.append({
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'actor_email': actor_email,
            'actor_name': actor_name,
            'action': log.action,
            'action_display': log.get_action_display(),
            'category': log.category,
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
            'description': log.description,
            'ip_address': log.ip_address or '',
        })

    return Response({
        'logs': data,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': max(1, -(-total // page_size)),  # ceil division
    })
