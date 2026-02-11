#!/usr/bin/env python
"""
SecureMed Comprehensive Test Runner
Runs all tests and generates a detailed report
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent.parent / 'securemed-backend'
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DEBUG'] = 'False'
os.environ['DB_NAME'] = 'test_securemed'
os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-only'

django.setup()

from django.core.management import call_command
from django.test.runner import DiscoverRunner

def main():
    print("=" * 80)
    print("SecureMed - Comprehensive Test Suite")
    print("=" * 80)
    print()
    
    # List of apps to test
    apps_to_test = [
        'authentication',
        'patients',
        'appointments',
        'medical_records',
        'labs',
        'pharmacy',
        'billing',
        'telemedicine',
        'consents',
        'departments',
        'analytics',
    ]
    
    print("Testing the following apps:")
    for app in apps_to_test:
        print(f"  - {app}")
    print()
    
    # Run tests
    test_runner = DiscoverRunner(verbosity=2, interactive=False, keepdb=False)
    
    failures = test_runner.run_tests(apps_to_test)
    
    print()
    print("=" * 80)
    if failures:
        print(f"FAILED: {failures} test(s) failed")
        sys.exit(1)
    else:
        print("SUCCESS: All tests passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()
