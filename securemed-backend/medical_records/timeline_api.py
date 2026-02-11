"""
Patient Timeline API - Comprehensive view of patient's medical journey
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_timeline(request):
    """
    Complete patient timeline including:
    - Lab orders and results
    - Prescriptions and pharmacy orders
    - Billing and payments
    - Medical records
    - Appointments
    """
    user = request.user
    
    # Get patient profile
    if hasattr(user, 'patient_profile'):
        patient = user.patient_profile
    else:
        # For doctors viewing a specific patient
        from patients.models import Patient
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({"error": "patient_id required for non-patient users"}, status=400)
        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=404)
    
    timeline_events = []
    
    # 1. LAB ORDERS AND RESULTS
    from labs.models import LabOrder, LabResult
    lab_orders = LabOrder.objects.filter(patient=patient.user).prefetch_related('items', 'results')
    
    for order in lab_orders:
        # Lab order event
        timeline_events.append({
            "id": f"lab-order-{order.id}",
            "date": order.created_at.isoformat(),
            "type": "lab_order",
            "category": "diagnostic",
            "title": f"Lab Tests Ordered",
            "description": f"{order.items.count()} test(s) - Sample: {order.sample_id}",
            "status": order.status,
            "priority": order.priority,
            "details": {
                "sample_id": order.sample_id,
                "tests": [{"name": t.name, "code": t.code} for t in order.items.all()],
                "doctor": order.doctor.get_full_name() if order.doctor else "Unknown",
                "clinical_notes": order.clinical_notes
            }
        })
        
        # Lab results events
        for result in order.results.all():
            if result.released_to_patient:
                timeline_events.append({
                    "id": f"lab-result-{result.id}",
                    "date": result.released_at.isoformat() if result.released_at else result.processed_at.isoformat(),
                    "type": "lab_result",
                    "category": "diagnostic",
                    "title": f"Lab Result: {result.test.name}",
                    "description": f"Result: {result.result_value} {result.units}",
                    "status": "released",
                    "flag": result.flag,
                    "details": {
                        "test_code": result.test.code,
                        "test_name": result.test.name,
                        "result_value": result.result_value,
                        "reference_range": result.reference_range,
                        "units": result.units,
                        "flag": result.flag,
                        "notes": result.notes,
                        "has_attachment": bool(result.file_attachment)
                    }
                })
    
    # 2. PRESCRIPTIONS AND PHARMACY ORDERS
    from medical_records.models import Prescription, PharmacyOrder
    prescriptions = Prescription.objects.filter(
        medical_record__patient=patient
    ).select_related('medical_record__doctor', 'pharmacy_order')
    
    for prescription in prescriptions:
        # Prescription event
        timeline_events.append({
            "id": f"prescription-{prescription.id}",
            "date": prescription.created_at.isoformat(),
            "type": "prescription",
            "category": "treatment",
            "title": f"Prescription: {prescription.medication_name}",
            "description": f"{prescription.dosage} - {prescription.frequency}",
            "status": prescription.status,
            "is_signed": prescription.is_signed,
            "details": {
                "medication": prescription.medication_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "duration": prescription.duration,
                "instructions": prescription.instructions,
                "doctor": prescription.medical_record.doctor.user.get_full_name() if prescription.medical_record.doctor else "Unknown",
                "signed_at": prescription.signed_at.isoformat() if prescription.signed_at else None,
                "signed_by": prescription.signed_by.get_full_name() if prescription.signed_by else None
            }
        })
        
        # Pharmacy order event (if exists)
        if hasattr(prescription, 'pharmacy_order'):
            pharmacy_order = prescription.pharmacy_order
            timeline_events.append({
                "id": f"pharmacy-{pharmacy_order.id}",
                "date": pharmacy_order.dispensed_at.isoformat() if pharmacy_order.dispensed_at else pharmacy_order.created_at.isoformat(),
                "type": "pharmacy_fulfillment",
                "category": "treatment",
                "title": f"Medication Dispensed: {prescription.medication_name}",
                "description": f"Pickup code: {pharmacy_order.pickup_code}",
                "status": pharmacy_order.status,
                "details": {
                    "pickup_code": pharmacy_order.pickup_code,
                    "status": pharmacy_order.status,
                    "verified_by": pharmacy_order.verified_by.get_full_name() if pharmacy_order.verified_by else None,
                    "fulfilled_by": pharmacy_order.fulfilled_by.get_full_name() if pharmacy_order.fulfilled_by else None,
                    "dispensed_at": pharmacy_order.dispensed_at.isoformat() if pharmacy_order.dispensed_at else None
                }
            })
    
    # 3. BILLING AND PAYMENTS
    from billing.models import Invoice
    invoices = Invoice.objects.filter(patient=patient).prefetch_related('items', 'payments')
    
    for invoice in invoices:
        timeline_events.append({
            "id": f"invoice-{invoice.id}",
            "date": invoice.issue_date.isoformat(),
            "type": "billing",
            "category": "financial",
            "title": f"Invoice {invoice.invoice_id}",
            "description": f"Total: ₹{invoice.total_amount} - Status: {invoice.status}",
            "status": invoice.status,
            "details": {
                "invoice_id": invoice.invoice_id,
                "subtotal": str(invoice.subtotal),
                "tax_amount": str(invoice.tax_amount),
                "total_amount": str(invoice.total_amount),
                "paid_amount": str(invoice.paid_amount),
                "balance": str(invoice.total_amount - invoice.paid_amount),
                "due_date": invoice.due_date.isoformat(),
                "items": [
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "total": str(item.total_price)
                    }
                    for item in invoice.items.all()
                ],
                "payments": [
                    {
                        "payment_id": payment.payment_id,
                        "amount": str(payment.amount),
                        "method": payment.payment_method,
                        "status": payment.status,
                        "date": payment.payment_date.isoformat()
                    }
                    for payment in invoice.payments.all()
                ]
            }
        })
    
    # 4. MEDICAL RECORDS (Consultations, etc.)
    from medical_records.models import MedicalRecord
    medical_records = MedicalRecord.objects.filter(patient=patient).select_related('doctor__user', 'appointment')
    
    for record in medical_records:
        timeline_events.append({
            "id": f"record-{record.id}",
            "date": record.record_date.isoformat(),
            "type": "medical_record",
            "category": "consultation",
            "title": f"{record.get_record_type_display()} - {record.diagnosis}",
            "description": record.symptoms[:100] if record.symptoms else "",
            "details": {
                "record_id": record.record_id,
                "record_type": record.record_type,
                "diagnosis": record.diagnosis,
                "symptoms": record.symptoms,
                "treatment": record.treatment,
                "notes": record.notes,
                "doctor": record.doctor.user.get_full_name() if record.doctor else "Unknown",
                "is_attested": record.is_attested,
                "has_file": bool(record.file)
            }
        })
    
    # 5. APPOINTMENTS
    from appointments.models import Appointment
    appointments = Appointment.objects.filter(patient=patient.user).select_related('doctor__user')
    
    for appointment in appointments:
        timeline_events.append({
            "id": f"appointment-{appointment.id}",
            "date": f"{appointment.appointment_date.isoformat()}T{appointment.appointment_time.isoformat()}",
            "type": "appointment",
            "category": "consultation",
            "title": f"Appointment with Dr. {appointment.doctor.user.last_name if appointment.doctor else 'Unknown'}",
            "description": f"Status: {appointment.status}",
            "status": appointment.status,
            "details": {
                "doctor": appointment.doctor.user.get_full_name() if appointment.doctor else "Unknown",
                "specialization": appointment.doctor.specialization if appointment.doctor else None,
                "appointment_type": appointment.appointment_type,
                "reason": appointment.reason,
                "notes": appointment.notes
            }
        })
    
    # Sort by date (most recent first)
    timeline_events.sort(key=lambda x: x['date'], reverse=True)
    
    # Summary statistics
    active_prescriptions = prescriptions.filter(status__in=['signed', 'dispensed']).count()
    pending_invoices = invoices.filter(status__in=['issued', 'partially_paid']).count()
    pending_labs = lab_orders.filter(status__in=['ordered', 'collected', 'processing']).count()
    
    return Response({
        "timeline": timeline_events,
        "summary": {
            "total_events": len(timeline_events),
            "active_prescriptions": active_prescriptions,
            "pending_invoices": pending_invoices,
            "pending_labs": pending_labs,
            "patient_name": patient.user.get_full_name(),
            "patient_id": patient.patient_id
        }
    })
