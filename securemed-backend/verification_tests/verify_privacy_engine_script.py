#!/usr/bin/env python
"""Test script for PrivacyEngine utility class."""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from consents.utils import PrivacyEngine
from authentication.models import User
from consents.models import Consent

print("=" * 60)
print("Testing PrivacyEngine - Story 2.2: Data Anonymization")
print("=" * 60)

# Test 1: anonymize_name() with various inputs
print("\n--- Test 1: anonymize_name() ---")
test_cases = [
    ("Varun Raj", "V**** R**"),
    ("John", "J***"),
    ("Mary Jane Watson", "M*** J*** W*****"),
    ("A", "A"),
    ("", "Anonymous"),
    (None, "Anonymous"),
]

for input_name, expected in test_cases:
    result = PrivacyEngine.anonymize_name(input_name)
    status = "✓" if result == expected else "✗"
    print(f"{status} Input: {repr(input_name):25} -> Output: {result:20} (Expected: {expected})")

# Test 2: get_patient_display_name() with real data
print("\n--- Test 2: get_patient_display_name() ---")

try:
    # Get a patient user
    patient = User.objects.filter(role='patient').first()
    
    if patient:
        print(f"\nTesting with patient: {patient.username}")
        print(f"Full name: {patient.first_name} {patient.last_name}")
        
        # Get all consents for this patient
        consents = Consent.objects.filter(patient=patient)
        
        if consents.exists():
            for consent in consents:
                display_name = PrivacyEngine.get_patient_display_name(patient, consent.department)
                status = "GRANTED" if consent.is_granted else "DENIED"
                expired = " (EXPIRED)" if consent.expires_at and consent.is_expired() else ""
                print(f"  {consent.department:20} [{status}{expired}] -> {display_name}")
        else:
            print("  No consent records found for this patient")
        
        # Test with non-existent department
        display_name = PrivacyEngine.get_patient_display_name(patient, "NonExistentDept")
        print(f"  {'NonExistentDept':20} [NO CONSENT] -> {display_name}")
    else:
        print("No patient users found in database")
        
except Exception as e:
    print(f"Error during testing: {e}")

print("\n" + "=" * 60)
print("Testing Complete!")
print("=" * 60)
