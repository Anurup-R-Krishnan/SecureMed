from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.accounts.patients.models import Patient
from apps.finance.billing.models import Invoice

User = get_user_model()

class BillingTestCase(TestCase):
    def test_invoice_creation(self):
        user = User.objects.create_user(
            username='billing1',
            email='billing@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=user,
            date_of_birth='1990-01-01',
            blood_group='O+'
        )
        invoice = Invoice.objects.create(
            invoice_id='INV001',
            patient=patient,
            due_date=date.today() + timedelta(days=30),
            subtotal=100.00,
            total_amount=100.00
        )
        self.assertEqual(invoice.total_amount, 100.00)
        self.assertEqual(invoice.patient, patient)
        
    def test_invoice_status(self):
        user = User.objects.create_user(
            username='billing2',
            email='billing2@example.com',
            password='TestPass123!@#',
            role='patient'
        )
        patient = Patient.objects.create(
            user=user,
            date_of_birth='1990-01-01'
        )
        invoice = Invoice.objects.create(
            invoice_id='INV002',
            patient=patient,
            due_date=date.today() + timedelta(days=30),
            subtotal=200.00,
            total_amount=200.00
        )
        self.assertEqual(invoice.status, 'draft')
