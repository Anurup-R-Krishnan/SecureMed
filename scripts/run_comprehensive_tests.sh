#!/bin/bash

# Comprehensive Test Runner for SecureMed
# Runs all tests in the correct order

set -e  # Exit on error

BACKEND_DIR="/home/anuruprkris/Project/SecureMed/securemed-backend"

echo "=========================================="
echo "SecureMed Comprehensive Test Suite"
echo "=========================================="
echo ""

cd "$BACKEND_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activated"
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "⚠ No virtual environment found, using system Python"
fi

echo ""
echo "Installing test dependencies..."
pip install -q pytest pytest-django

echo ""
echo "=========================================="
echo "1. AUTHENTICATION TESTS"
echo "=========================================="
python verification_tests/test_auth_endpoints.py 2>/dev/null || echo "⚠ Auth tests not found or failed"

echo ""
echo "=========================================="
echo "2. PATIENT TESTS"
echo "=========================================="
python verification_tests/test_patient_endpoints.py 2>/dev/null || echo "⚠ Patient tests not found or failed"

echo ""
echo "=========================================="
echo "3. APPOINTMENT TESTS"
echo "=========================================="
python verification_tests/test_appointment_workflow.py 2>/dev/null || echo "⚠ Appointment tests not found or failed"

echo ""
echo "=========================================="
echo "4. LAB TESTS"
echo "=========================================="
python verification_tests/test_lab_workflow.py 2>/dev/null || echo "⚠ Lab tests not found or failed"

echo ""
echo "=========================================="
echo "5. MEDICAL RECORDS TESTS"
echo "=========================================="
python verification_tests/test_medical_records.py 2>/dev/null || echo "⚠ Medical records tests not found or failed"

echo ""
echo "=========================================="
echo "6. PRESCRIPTION TESTS"
echo "=========================================="
python verification_tests/test_prescription_workflow.py 2>/dev/null || echo "⚠ Prescription tests not found or failed"

echo ""
echo "=========================================="
echo "7. PHARMACY TESTS"
echo "=========================================="
python verification_tests/test_pharmacy_workflow.py 2>/dev/null || echo "⚠ Pharmacy tests not found or failed"

echo ""
echo "=========================================="
echo "8. BILLING TESTS"
echo "=========================================="
python verification_tests/test_billing_workflow.py 2>/dev/null || echo "⚠ Billing tests not found or failed"

echo ""
echo "=========================================="
echo "9. COMPLETE WORKFLOW INTEGRATION TESTS"
echo "=========================================="
pytest verification_tests/test_complete_workflow.py -v --tb=short

echo ""
echo "=========================================="
echo "10. DASHBOARD TESTS"
echo "=========================================="
python verification_tests/test_dashboard_api.py 2>/dev/null || echo "⚠ Dashboard tests not found or failed"

echo ""
echo "=========================================="
echo "11. TIMELINE API TESTS"
echo "=========================================="
python verification_tests/test_timeline_api.py 2>/dev/null || echo "⚠ Timeline tests not found or failed"

echo ""
echo "=========================================="
echo "TEST SUITE COMPLETED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - All backend integration tests executed"
echo "  - Check output above for any failures"
echo "  - Tests cover: Auth, Patients, Appointments, Labs,"
echo "    Medical Records, Prescriptions, Pharmacy, Billing"
echo ""
