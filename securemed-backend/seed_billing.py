import os
import django
import random
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'securemed_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from patients.models import Patient
from billing.models import Invoice, InvoiceItem

User = get_user_model()

def seed_billing():
    try:
        user = User.objects.get(email='patient1@gmail.com')
        patient = user.patient_profile
        
        # Update Insurance Info
        patient.insurance_provider = "Fortis Health Shield"
        patient.insurance_number = "FH-99887766"
        patient.save()
        print(f"Updated insurance for {patient.patient_id}")

        # Create Invoices
        # 1. Paid Invoice
        inv1, created = Invoice.objects.get_or_create(
            invoice_id="INV-2024-001",
            patient=patient,
            defaults={
                "issue_date": date.today() - timedelta(days=30),
                "due_date": date.today() - timedelta(days=15),
                "status": "paid",
                "subtotal": Decimal("500.00"),
                "total_amount": Decimal("500.00"),
                "paid_amount": Decimal("500.00")
            }
        )
        if created:
            InvoiceItem.objects.create(
                invoice=inv1,
                item_type="consultation",
                description="General Checkup",
                quantity=1,
                unit_price=Decimal("500.00"),
                total_price=Decimal("500.00")
            )

        # 2. Pending Invoice
        inv2, created = Invoice.objects.get_or_create(
            invoice_id="INV-2024-002",
            patient=patient,
            defaults={
                "issue_date": date.today() - timedelta(days=5),
                "due_date": date.today() + timedelta(days=10),
                "status": "issued",
                "subtotal": Decimal("1200.00"),
                "total_amount": Decimal("1200.00"),
                "paid_amount": Decimal("0.00")
            }
        )
        if created:
            InvoiceItem.objects.create(
                invoice=inv2,
                item_type="lab_test",
                description="Blood Panel",
                quantity=1,
                unit_price=Decimal("1200.00"),
                total_price=Decimal("1200.00")
            )
            
        print("Seeded invoices successfully.")

    except User.DoesNotExist:
        print("patient1@gmail.com not found. Please create the user first.")
    except Exception as e:
        print(f"Error seeding billing: {e}")

if __name__ == '__main__':
    seed_billing()
