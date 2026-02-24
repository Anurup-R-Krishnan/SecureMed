from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Invoice, InvoiceItem
import uuid

@receiver(post_save, sender='labs.LabOrder')
def create_lab_invoice(sender, instance, created, **kwargs):
    """
    Auto-generate invoice when a LabOrder is completed.
    """
    if instance.status == 'completed' and not hasattr(instance, 'invoice_item'):
        # Check if an invoice already exists for this order to avoid duplicates
        # Logic: Find pending invoice for patient or create new
        
        # Get the Patient profile from the User
        try:
            from patients.models import Patient
            patient_profile = Patient.objects.get(user=instance.patient)
        except (AttributeError, Patient.DoesNotExist):
            # If no patient profile exists, skip invoice creation
            return
        
        # Check if invoice already exists for this lab order
        existing_invoice = Invoice.objects.filter(
            patient=patient_profile,
            appointment=instance.appointment,
            items__description__icontains=f"Lab Order #{instance.id}"
        ).first()
        
        if existing_invoice:
            return
        
        # Calculate cost (This could be dynamic based on tests)
        # Placeholder: $50 base + $10 per test
        test_count = instance.items.count()
        amount = 50.00 + (10.00 * test_count)
        
        invoice = Invoice.objects.create(
            invoice_id=f"INV-LAB-{uuid.uuid4().hex[:8].upper()}",
            patient=patient_profile,
            appointment=instance.appointment,
            status='issued',
            due_date=timezone.now().date() + timezone.timedelta(days=30),
            subtotal=amount,
            total_amount=amount,
            notes=f"Lab Order #{instance.id} - {test_count} tests"
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"Lab Services (Order #{instance.id})",
            quantity=1,
            unit_price=amount,
            total_price=amount,
            item_type='lab_test'
        )

@receiver(post_save, sender='medical_records.Prescription')
def create_pharmacy_invoice(sender, instance, created, **kwargs):
    """
    Auto-generate invoice when a Prescription is filled (completed).
    """
    if instance.status == 'filled':
        # Check if already invoiced (logic can be refined)
        existing_items = InvoiceItem.objects.filter(description__contains=f"Prescription #{instance.id}")
        if existing_items.exists():
            return

        # Placeholder cost: $20 per medication
        meds_count = instance.medications.count()
        amount = 20.00 * meds_count
        
        if amount > 0:
            invoice = Invoice.objects.create(
                invoice_id=f"INV-RX-{uuid.uuid4().hex[:8].upper()}",
                patient=instance.patient,
                appointment=instance.appointment,
                status='issued',
                due_date=timezone.now().date() + timezone.timedelta(days=30),
                subtotal=amount,
                total_amount=amount,
                notes=f"Pharmacy Order #{instance.id}"
            )
            
            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"Prescription #{instance.id} - {meds_count} medications",
                quantity=1,
                unit_price=amount,
                total_price=amount,
                item_type='medication'
            )
