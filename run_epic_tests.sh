#!/bin/bash
# Test Runner for EPIC 3, 4, 5, 6 Unit Tests

echo "=========================================="
echo "SecureMed - EPIC Unit Tests Runner"
echo "=========================================="
echo ""

cd securemed-backend

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests and report
run_test_suite() {
    local test_path=$1
    local test_name=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    python manage.py test $test_path --verbosity=2
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        echo ""
        return 1
    fi
}

# Track results
total_tests=0
passed_tests=0

echo "=========================================="
echo "EPIC 3: Clinical Patient Management"
echo "=========================================="

run_test_suite "appointments.tests.test_epic3_appointment_scheduling" "Story 3.1: Appointment Scheduling"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "appointments.tests.test_epic3_medical_history" "Story 3.2: Medical History Views"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "appointments.tests.test_epic3_break_glass" "Story 3.3: Break-Glass Protocol"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "appointments.tests.test_epic3_patient_assignment" "Story 3.4: Patient Assignment"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

echo "=========================================="
echo "EPIC 4: Laboratory Management"
echo "=========================================="

run_test_suite "labs.tests.test_epic4_test_ordering" "Story 4.1: Test Ordering"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "labs.tests.test_epic4_blinded_processing" "Story 4.2: Blinded Processing"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "labs.tests.test_epic4_secure_uploads" "Story 4.3: Secure Uploads"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

echo "=========================================="
echo "EPIC 5: Pharmacy & Prescription Management"
echo "=========================================="

run_test_suite "medical_records.tests.test_epic5_eprescribing" "Story 5.1: E-Prescribing"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

run_test_suite "medical_records.tests.test_epic5_medication_history" "Story 5.4: Medication History"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

echo "=========================================="
echo "EPIC 6: Security Infrastructure"
echo "=========================================="

run_test_suite "medical_records.tests.test_epic6_audit_logging" "Story 6.1: Audit Logging"
((total_tests++)); [ $? -eq 0 ] && ((passed_tests++))

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Test Suites: ${total_tests}"
echo -e "${GREEN}Passed: ${passed_tests}${NC}"
echo -e "${RED}Failed: $((total_tests - passed_tests))${NC}"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
