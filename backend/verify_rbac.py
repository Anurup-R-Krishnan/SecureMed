#!/usr/bin/env python
"""
RBAC Verification Script
Tests the Role-Based Access Control middleware implementation.

This script verifies that:
1. Doctors can access /api/doctor/* endpoints
2. Patients can access /api/patient/* endpoints
3. Admins can access /api/admin/* endpoints
4. Users with wrong roles get 403 Forbidden
"""

import requests
import sys
import json

# Configuration
BASE_URL = 'http://127.0.0.1:8000'
LOGIN_URL = f'{BASE_URL}/api/auth/login/'

# Test users (you need to create these users first)
TEST_USERS = {
    'doctor': {
        'username': 'test_doctor',
        'password': 'SecurePass123!@#',
        'expected_role': 'provider'
    },
    'patient': {
        'username': 'test_patient',
        'password': 'SecurePass123!@#',
        'expected_role': 'patient'
    },
    'admin': {
        'username': 'test_admin',
        'password': 'SecurePass123!@#',
        'expected_role': 'admin'
    }
}

# Test endpoints
TEST_ENDPOINTS = {
    'doctor': f'{BASE_URL}/api/doctor/test-dashboard/',
    'patient': f'{BASE_URL}/api/patient/test-dashboard/',
    'admin': f'{BASE_URL}/api/admin/test-dashboard/'
}


def login_user(username, password):
    """Login and return access token."""
    try:
        response = requests.post(LOGIN_URL, json={
            'username': username,
            'password': password
        })
        
        if response.status_code == 200:
            data = response.json()
            if 'access' in data:
                return data['access']
            else:
                print(f"❌ Login failed: MFA required (not supported in this test)")
                return None
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def test_endpoint(endpoint, token, expected_status):
    """Test an endpoint with given token and expected status code."""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(endpoint, headers=headers)
        return response.status_code == expected_status, response.status_code, response.text
    except Exception as e:
        return False, None, str(e)


def run_tests():
    """Run all RBAC tests."""
    print("=" * 60)
    print("RBAC MIDDLEWARE VERIFICATION")
    print("=" * 60)
    print()
    
    # Get tokens for all users
    tokens = {}
    print("📝 Logging in test users...")
    for role, credentials in TEST_USERS.items():
        token = login_user(credentials['username'], credentials['password'])
        if token:
            tokens[role] = token
            print(f"  ✅ {role.capitalize()} logged in successfully")
        else:
            print(f"  ❌ {role.capitalize()} login failed")
            print()
            print("⚠️  Please create test users first:")
            print("   python manage.py shell")
            print("   >>> from django.contrib.auth import get_user_model")
            print("   >>> User = get_user_model()")
            print("   >>> User.objects.create_user(username='test_doctor', password='SecurePass123!@#', role='provider', email='doctor@test.com')")
            print("   >>> User.objects.create_user(username='test_patient', password='SecurePass123!@#', role='patient', email='patient@test.com')")
            print("   >>> User.objects.create_user(username='test_admin', password='SecurePass123!@#', role='admin', email='admin@test.com')")
            return False
    
    print()
    print("🧪 Running RBAC tests...")
    print()
    
    all_passed = True
    test_results = []
    
    # Test 1: Doctor accessing doctor endpoint (should succeed)
    print("Test 1: Doctor accessing /api/doctor/test-dashboard/")
    success, status, response = test_endpoint(TEST_ENDPOINTS['doctor'], tokens['doctor'], 200)
    if success:
        print(f"  ✅ PASS - Status: {status}")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 200, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 2: Patient accessing doctor endpoint (should fail with 403)
    print("Test 2: Patient accessing /api/doctor/test-dashboard/ (should be forbidden)")
    success, status, response = test_endpoint(TEST_ENDPOINTS['doctor'], tokens['patient'], 403)
    if success:
        print(f"  ✅ PASS - Status: {status} (Forbidden as expected)")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 403, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 3: Patient accessing patient endpoint (should succeed)
    print("Test 3: Patient accessing /api/patient/test-dashboard/")
    success, status, response = test_endpoint(TEST_ENDPOINTS['patient'], tokens['patient'], 200)
    if success:
        print(f"  ✅ PASS - Status: {status}")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 200, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 4: Doctor accessing patient endpoint (should fail with 403)
    print("Test 4: Doctor accessing /api/patient/test-dashboard/ (should be forbidden)")
    success, status, response = test_endpoint(TEST_ENDPOINTS['patient'], tokens['doctor'], 403)
    if success:
        print(f"  ✅ PASS - Status: {status} (Forbidden as expected)")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 403, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 5: Admin accessing admin endpoint (should succeed)
    print("Test 5: Admin accessing /api/admin/test-dashboard/")
    success, status, response = test_endpoint(TEST_ENDPOINTS['admin'], tokens['admin'], 200)
    if success:
        print(f"  ✅ PASS - Status: {status}")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 200, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 6: Patient accessing admin endpoint (should fail with 403)
    print("Test 6: Patient accessing /api/admin/test-dashboard/ (should be forbidden)")
    success, status, response = test_endpoint(TEST_ENDPOINTS['admin'], tokens['patient'], 403)
    if success:
        print(f"  ✅ PASS - Status: {status} (Forbidden as expected)")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 403, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Test 7: Doctor accessing admin endpoint (should fail with 403)
    print("Test 7: Doctor accessing /api/admin/test-dashboard/ (should be forbidden)")
    success, status, response = test_endpoint(TEST_ENDPOINTS['admin'], tokens['doctor'], 403)
    if success:
        print(f"  ✅ PASS - Status: {status} (Forbidden as expected)")
        test_results.append(True)
    else:
        print(f"  ❌ FAIL - Expected: 403, Got: {status}")
        print(f"     Response: {response}")
        test_results.append(False)
        all_passed = False
    print()
    
    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(test_results)
    total = len(test_results)
    print(f"Tests Passed: {passed}/{total}")
    print()
    
    if all_passed:
        print("✅ RBAC SUCCESS - All tests passed!")
        print()
        print("Your Role Middleware is working correctly:")
        print("  • Doctors can access /api/doctor/* endpoints")
        print("  • Patients can access /api/patient/* endpoints")
        print("  • Admins can access /api/admin/* endpoints")
        print("  • Users with wrong roles get 403 Forbidden")
        return True
    else:
        print("❌ RBAC FAILED - Some tests failed")
        print()
        print("Please check:")
        print("  • RoleMiddleware is added to MIDDLEWARE in settings.py")
        print("  • Middleware is placed after AuthenticationMiddleware")
        print("  • Test users have correct roles (doctor='provider', patient='patient', admin='admin')")
        return False


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
