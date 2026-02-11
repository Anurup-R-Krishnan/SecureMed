"""
Service to automatically create invoices for completed medical services
"""
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import uuid


def create_lab_test_invoice(lab_order):
    """Create invoice for completed lab test"""
    from billing.models import Invoice, InvoiceItem
    from patients.models import Patient
    
    try:
        patient = Patient.objects.get(user=lab_order.patient)
    except Patient.DoesNotExist:
        return None
    
    # Check if invoice already exists
    existing = Invoice.objects.filter(
        patient=patient,
        appointment=lab_order.appointment,
        items__description__icontains=lab_order.sample_id
    ).first()
    
    if existing:
        return existing
    
    # Calculate costs
    lab_tests = lab_order.items.all()
    subtotal = Decimal('0.00')
    
    # Base price for lab tests (simplified pricing)
    test_prices = {
        'Hematology': Decimal('500.00'),
        'Chemistry': Decimal('800.00'),
        'Endocrine': Decimal('1200.00'),
        'Urinalysis': Decimal('300.00'),
        'Coagulation': Decimal('700.00'),
        'Microbiology': Decimal('900.00'),
        'Molecular': Decimal('1500.00'),
        'Other': Decimal('400.00'),
    }
    
    for test in lab_tests:
        subtotal += test_prices.get(test.category, Decimal('400.00'))
    
    tax_amount = subtotal * Decimal('0.05')  # 5% tax
    total = subtotal + tax_amount
    
    # Create invoice
    invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    invoice = Invoice.objects.create(
        invoice_id=invoice_id,
        patient=patient,
        appointment=lab_order.appointment,
        issue_date=timezone.now().date(),
        due_date=timezone.now().date() + timedelta(days=30),
        status='issued',
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total,
        notes=f"Lab tests - Sample ID: {lab_order.sample_id}"
    )
    
    # Create invoice items
    for test in lab_tests:
        price = test_prices.get(test.category, Decimal('400.00'))
        InvoiceItem.objects.create(
            invoice=invoice,
            item_type='lab_test',
            description=f"{test.name} ({test.code})",
            quantity=1,
            unit_price=price,
            total_price=price
        )
    
    return invoice


def create_pharmacy_invoice(pharmacy_order):
    """Create invoice for dispensed prescription"""
    from billing.models import Invoice, InvoiceItem
    from patients.models import Patient
    from pharmacy.models import Drug
    
    prescription = pharmacy_order.prescription
    medical_record = prescription.medical_record
    
    try:
        patient = Patient.objects.get(user=medical_record.patient.user)
    except Patient.DoesNotExist:
        return None
    
    # Check if invoice already exists
    existing = Invoice.objects.filter(
        patient=patient,
        items__description__icontains=prescription.medication_name
    ).first()
    
    if existing:
        return existing
    
    # Try to find drug price from pharmacy inventory
    try:
        drug = Drug.objects.filter(
            name__icontains=prescription.medication_name
        ).first()
        
        if drug:
            unit_price = drug.unit_price
        else:
            # Default pricing if drug not found
            unit_price = Decimal('150.00')
    except:
        unit_price = Decimal('150.00')
    
    # Calculate for a course of medication (e.g., 30 days)
    # Parse duration if possible
    duration_days = 30  # default
    if 'day' in prescription.duration.lower():
        try:
            duration_days = int(''.join(filter(str.isdigit, prescription.duration)))
        except:
            duration_days = 30
    
    # Estimate quantity based on frequency
    quantity = 1
    if 'twice' in prescription.frequency.lower() or '2' in prescription.frequency:
        quantity = 2
    elif 'three' in prescription.frequency.lower() or '3' in prescription.frequency:
        quantity = 3
    elif 'four' in prescription.frequency.lower() or '4' in prescription.frequency:
        quantity = 4
    
    total_quantity = quantity * duration_days
    subtotal = unit_price * Decimal(total_quantity)
    tax_amount = subtotal * Decimal('0.05')  # 5% tax
    total = subtotal + tax_amount
    
    # Create invoice
    invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    invoice = Invoice.objects.create(
        invoice_id=invoice_id,
        patient=patient,
        appointment=medical_record.appointment,
        issue_date=timezone.now().date(),
        due_date=timezone.now().date() + timedelta(days=30),
        status='issued',
        subtotal=subtotal,
        tax_amount=tax_amount,
        total_amount=total,
        notes=f"Prescription: {prescription.medication_name}"
    )
    
    # Create invoice item
    InvoiceItem.objects.create(
        invoice=invoice,
        item_type='medication',
        description=f"{prescription.medication_name} - {prescription.dosage} ({prescription.frequency} for {prescription.duration})",
        quantity=total_quantity,
        unit_price=unit_price,
        total_price=subtotal
    )
    
    return invoice


def create_consultation_invoice(appointment):
    """Create invoice for consultation"""
    from billing.models import Invoice, InvoiceItem
    from patients.models import Patient
    
    try:
        patient = Patient.objects.get(user=appointment.patient)
    except Patient.DoesNotExist:
        return None
    
    # Check if invoice already exists
    existing = Invoice.objects.filter(
        patient=patient,
        appointment=appointment
    ).first()
    
    if existing:
        return existing
    
    # Consultation fee
    consultation_fee = Decimal('1000.00')  # Base consultation
    
    # Specialist fees vary
    if appointment.doctor.specialization in ['Cardiology', 'Neurology', 'Oncology']:
        consultation_fee = Decimal('1500.00')
    
    tax_amount = consultation_fee * Decimal('0.05')
    total = consultation_fee + tax_amount
    
    # Create invoice
    invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
    invoice = Invoice.objects.create(
        invoice_id=invoice_id,
        patient=patient,
        appointment=appointment,
        issue_date=timezone.now().date(),
        due_date=timezone.now().date() + timedelta(days=15),
        status='issued',
        subtotal=consultation_fee,
        tax_amount=tax_amount,
        total_amount=total,
        notes=f"Consultation with Dr. {appointment.doctor.user.get_full_name()}"
    )
    
    # Create invoice item
    InvoiceItem.objects.create(
        invoice=invoice,
        item_type='consultation',
        description=f"Consultation - {appointment.doctor.specialization}",
        quantity=1,
        unit_price=consultation_fee,
        total_price=consultation_fee
    )
    
    return invoice
