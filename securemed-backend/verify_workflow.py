import os
import django
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import sys

# Disable logging
logging.disable(logging.CRITICAL)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'securemed.settings')
django.setup()

from django.contrib.auth import get_user_model
from patients.models import Patient
from labs.models import LabOrder, LabTest, LabResult
from pharmacy.models import Prescription, Medication
from billing.models import Invoice
from appointments.models import Appointment

User = get_user_model()

def run_verification():
    print("Starting End-to-End Workflow Verification...")
    
    # 1. Setup Users
    print("\n[STEP 1] Setting up users...", end=" ")
    try:
        doctor, _ = User.objects.get_or_create(username='dr.workflow', email='dr.workflow@securemed.com', role='doctor')
        patient_user, _ = User.objects.get_or_create(username='pat.workflow', email='pat.workflow@securemed.com', role='patient')
        if not hasattr(patient_user, 'patient_profile'):
            Patient.objects.create(
                user=patient_user, 
                patient_id="P-WORKFLOW", 
                date_of_birth='1990-01-01', 
                gender='F', 
                phone='555-0199', 
                address='123 Flow St'
            )
        patient = patient_user.patient_profile
        print("PASS")
    except Exception as e:
        print(f"FAIL: {e}")
        return

    # 2. Create Appointment (Prerequisite)
    print("[STEP 2] Creating Appointment...", end=" ")
    appointment = Appointment.objects.create(
        patient=patient_user,
        doctor=doctor,
        date=timezone.now().date(),
        time=timezone.now().time(),
        status='confirmed',
        reason='Workflow Test'
    )
    print("PASS")

    # 3. Doctor Orders Lab
    print("[STEP 3] Doctor Orders Lab...", end=" ")
    test, _ = LabTest.objects.get_or_create(name='CBC', code='CBC001', category='Hematology', defaults={'cost': 50.00})
    lab_order = LabOrder.objects.create(
        patient=patient_user,
        doctor=doctor,
        appointment=appointment,
        status='ordered',
        priority='routine'
    )
    lab_order.items.add(test)
    print("PASS")

    # 4. Lab Tech Processes Order (Result Entry)
    print("[STEP 4] Lab Tech Enters Result & Completes Order...", end=" ")
    # Technician logic simulation
    LabResult.objects.create(
        order=lab_order,
        test=test,
        result_value='Normal',
        technician_name='Lab Tech 1'
    )
    # Mark order as completed
    lab_order.status = 'completed'
    lab_order.save()
    print("PASS")
    
    # 5. VERIFY AUTOMATED BILLING (Lab)
    print("[STEP 5] Verifying Lab Invoice Generation...", end=" ")
    lab_invoice = Invoice.objects.filter(patient=patient, appointment=appointment, notes__contains=f"Lab Order #{lab_order.id}").first()
    if lab_invoice:
        print(f"PASS (Invoice #{lab_invoice.invoice_id} created for ${lab_invoice.total_amount})")
    else:
        print("FAIL (No invoice generated for completed lab order)")

    # 6. Doctor Prescribes Medication
    print("[STEP 6] Doctor Prescribes Medication...", end=" ")
    med, _ = Medication.objects.get_or_create(name='Amoxicillin', code='AMOX500', defaults={'stock_quantity': 100})
    prescription = Prescription.objects.create(
        patient=patient_user,
        doctor=doctor,
        appointment=appointment,
        status='pending'
    )
    prescription.medications.add(med)
    print("PASS")

    # 7. Pharmacist Fills Prescription
    print("[STEP 7] Pharmacist Fills Prescription...", end=" ")
    prescription.status = 'filled'
    prescription.save()
    print("PASS")

    # 8. VERIFY AUTOMATED BILLING (Pharmacy)
    print("[STEP 8] Verifying Pharmacy Invoice Generation...", end=" ")
    pharm_invoice = Invoice.objects.filter(patient=patient, appointment=appointment, notes__contains=f"Pharmacy Order #{prescription.id}").first()
    if pharm_invoice:
        print(f"PASS (Invoice #{pharm_invoice.invoice_id} created for ${pharm_invoice.total_amount})")
    else:
        print("FAIL (No invoice generated for filled prescription)")

    # 9. Pay Invoice (Simulate API Call)
    print("[STEP 9] Simulating Patient Payment...", end=" ")
    from billing.views import pay_invoice
    from rest_framework.test import APIRequestFactory
    
    if pharm_invoice:
        factory = APIRequestFactory()
        request = factory.post(f'/api/billing/invoices/{pharm_invoice.invoice_id}/pay/')
        request.user = patient_user
        
        # Call view directly for simulation
        response = pay_invoice(request, invoice_id=pharm_invoice.invoice_id)
        
        if response.status_code == 200 and response.data.get('status') == 'paid':
            print("PASS")
        else:
            print(f"FAIL (Status: {response.status_code}, Data: {response.data})")
    else:
        print("SKIP (No invoice to pay)")

    # 10. Verify Timeline Update
    print("[STEP 10] Verifying Patient Timeline...", end=" ")
    from patients.views import patient_timeline
    
    request = factory.get('/api/patients/timeline/')
    request.user = patient_user
    response = patient_timeline(request)
    
    if response.status_code == 200:
        events = response.data
        # Check for Invoice event
        inv_event = next((e for e in events if 'Invoice Generated' in e['title']), None)
        # Check for Payment event
        pay_event = next((e for e in events if 'Payment Confirmed' in e['title']), None)
        
        if inv_event and pay_event:
            print("PASS (Found both Invoice and Payment events)")
        elif inv_event:
            print("PARTIAL PASS (Found Invoice but missing Payment event)")
            print(f"Events found: {[e['title'] for e in events]}")
        else:
            print("FAIL (Missing billing events in timeline)")
            print(f"Events found: {[e['title'] for e in events if e['category'] == 'billing']}")
    else:
        print(f"FAIL (API Error: {response.status_code})")

    # Summary
    print("\nVerification Complete.")

if __name__ == '__main__':
    run_verification()
