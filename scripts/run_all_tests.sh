#!/bin/bash

# SecureMed Test Runner Script
# Runs all tests for the SecureMed backend

set -e

cd "$(dirname "$0")/../securemed-backend"

echo "========================================="
echo "SecureMed - Running All Tests"
echo "========================================="
echo ""

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set test environment variables
export DJANGO_SETTINGS_MODULE=config.settings
export DEBUG=False
export SECRET_KEY=test-secret-key-for-testing-only

echo "Running Django Tests..."
echo "========================================="

# List of apps with tests
APPS="authentication patients billing telemedicine consents departments analytics appointments.tests medical_records.tests labs.tests pharmacy.tests"

# Run tests for specified apps
python manage.py test $APPS --verbosity=2 --keepdb

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "All tests completed!"
echo ""
