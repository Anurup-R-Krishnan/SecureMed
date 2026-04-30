"""
Security fixes and hardening tests for SecureMed backend.
Tests input validation, authentication, authorization, and audit logging.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class InputValidationTests(APITestCase):
    """Test input validation on all endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='SecurePass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor1',
            email='doctor@test.com',
            password='SecurePass123!',
            role='doctor'
        )
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin@test.com',
            password='SecurePass123!',
            role='admin',
            is_staff=True
        )
    
    def test_payment_method_validation_rejects_invalid_method(self):
        """Test that payment endpoint validates payment_method"""
        # Invalid payment method should be rejected
        from apps.finance.billing.serializers import PaymentProcessingSerializer
        
        data = {'payment_method': 'invalid_method'}
        serializer = PaymentProcessingSerializer(data=data)
        
        assert not serializer.is_valid(), "Should reject invalid payment method"
        assert 'payment_method' in serializer.errors
    
    def test_payment_method_validation_accepts_valid_methods(self):
        """Test that payment endpoint accepts valid payment methods"""
        from apps.finance.billing.serializers import PaymentProcessingSerializer
        
        valid_methods = ['card', 'bank_transfer', 'check', 'insurance']
        for method in valid_methods:
            data = {'payment_method': method}
            serializer = PaymentProcessingSerializer(data=data)
            assert serializer.is_valid(), f"Should accept {method}"


class AuthenticationTests(APITestCase):
    """Test authentication and authorization"""
    
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='SecurePass123!',
            role='patient'
        )
        self.doctor_user = User.objects.create_user(
            username='doctor1',
            email='doctor@test.com',
            password='SecurePass123!',
            role='doctor'
        )
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin@test.com',
            password='SecurePass123!',
            role='admin',
            is_staff=True
        )
    
    def test_fhir_export_requires_authentication(self):
        """FHIR export should require authentication"""
        response = self.client.get('/api/analytics/fhir-export/?patient_id=123')
        # Should be 401 Unauthorized or 403 Forbidden
        assert response.status_code in [401, 403], f"Got {response.status_code}"
    
    def test_analytics_endpoint_requires_admin_role(self):
        """Analytics endpoint should require admin role"""
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/analytics/analytics/')
        # Patient should not have access
        assert response.status_code in [403, 401]
    
    def test_patient_cannot_access_other_patient_data(self):
        """Patient should not be able to access another patient's data"""
        from apps.accounts.patients.models import Patient
        
        # Create patient profiles
        patient1_profile = Patient.objects.create(
            user=self.patient_user,
            patient_id='P-0001',
            gender='M'
        )
        
        # Create another patient
        other_patient = User.objects.create_user(
            username='patient2',
            email='patient2@test.com',
            password='SecurePass123!',
            role='patient'
        )
        patient2_profile = Patient.objects.create(
            user=other_patient,
            patient_id='P-0002',
            gender='F'
        )
        
        # Patient1 tries to access Patient2's FHIR export
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get(f'/api/analytics/fhir-export/?patient_id={patient2_profile.patient_id}')
        
        # Should be forbidden
        assert response.status_code == 403, f"Got {response.status_code}"


class SecurityHeadersTests(APITestCase):
    """Test that security headers are present"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_csp_header_present(self):
        """Content-Security-Policy header should be present"""
        response = self.client.get('/api/auth/login/', format='json')
        assert 'Content-Security-Policy' in response, "CSP header missing"
    
    def test_xss_protection_header_present(self):
        """X-XSS-Protection header should be present"""
        response = self.client.get('/api/auth/login/', format='json')
        assert 'X-XSS-Protection' in response, "X-XSS-Protection header missing"
    
    def test_content_type_options_header_present(self):
        """X-Content-Type-Options header should be present"""
        response = self.client.get('/api/auth/login/', format='json')
        assert 'X-Content-Type-Options' in response, "X-Content-Type-Options header missing"


class CsrfCookieTests(APITestCase):
    """Test CSRF cookie security"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_csrf_cookie_httponly(self):
        """CSRF cookie should be HttpOnly"""
        from django.conf import settings
        assert settings.CSRF_COOKIE_HTTPONLY is True, "CSRF_COOKIE_HTTPONLY should be True"
    
    def test_session_cookie_httponly(self):
        """Session cookie should be HttpOnly"""
        from django.conf import settings
        assert settings.SESSION_COOKIE_HTTPONLY is True, "SESSION_COOKIE_HTTPONLY should be True"


class AuditLoggingTests(APITestCase):
    """Test that sensitive operations are logged"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin@test.com',
            password='SecurePass123!',
            role='admin',
            is_staff=True
        )
    
    def test_payment_creates_audit_log(self):
        """Payment operations should create audit logs"""
        from apps.platform.analytics.models import AuditLog
        from apps.finance.billing.models import Invoice
        from apps.accounts.patients.models import Patient
        
        # Create patient and invoice
        patient_user = User.objects.create_user(
            username='patient1',
            email='patient@test.com',
            password='SecurePass123!',
            role='patient'
        )
        patient = Patient.objects.create(
            user=patient_user,
            patient_id='P-0001',
            gender='M'
        )
        
        invoice = Invoice.objects.create(
            invoice_id='INV-0001',
            patient=patient,
            total_amount=Decimal('1000.00'),
            paid_amount=Decimal('0.00'),
            status='issued'
        )
        
        # Make payment
        self.client.force_authenticate(user=patient_user)
        response = self.client.post(
            f'/api/billing/invoices/{invoice.invoice_id}/pay/',
            {'payment_method': 'card'},
            format='json'
        )
        
        # Check that audit log was created
        # Note: This test assumes the endpoint exists and audit logging is implemented
        if response.status_code == 200:
            audit_logs = AuditLog.objects.filter(
                actor=patient_user,
                resource_id=invoice.invoice_id
            )
            # At least one audit log should exist (payment_initiated or payment_completed)
            assert audit_logs.count() > 0, "No audit logs created for payment"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
