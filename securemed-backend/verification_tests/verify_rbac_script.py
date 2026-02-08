"""
RBAC Test Script - Self-Contained Role-Based Access Control Verification

This script:
1. Creates a test user 'testdoc' with Doctor role (if it doesn't exist)
2. Logs in as the test user
3. Attempts to access an admin-only endpoint
4. Verifies that access is denied with 403 Forbidden

Expected Result: PASS if 403 Forbidden is returned (RBAC working)
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import requests
import json

User = get_user_model()

# Configuration
BASE_URL = "http://localhost:8000/api/auth"
LOGIN_URL = f"{BASE_URL}/login/"
ADMIN_TEST_URL = f"{BASE_URL}/admin-test/"

TEST_USERNAME = "testdoc"
TEST_PASSWORD = "password123"
TEST_ROLE = "Doctor"

print("\n" + "="*70)
print("RBAC VERIFICATION - Self-Contained Test")
print("="*70 + "\n")

# Step 0: Ensure test user exists
print(f"Step 0: Setting up test user '{TEST_USERNAME}'...")

try:
    # Check if user exists
    user, created = User.objects.get_or_create(
        username=TEST_USERNAME,
        defaults={
            'email': f'{TEST_USERNAME}@test.com',
            'first_name': 'Test',
            'last_name': 'Doctor',
        }
    )
    
    if created:
        user.set_password(TEST_PASSWORD)
        user.save()
        print(f"✅ Created new user: {TEST_USERNAME}")
    else:
        # Update password to ensure it's correct
        user.set_password(TEST_PASSWORD)
        user.save()
        print(f"✅ User already exists: {TEST_USERNAME}")
    
    # Ensure user has Doctor role
    doctor_group, _ = Group.objects.get_or_create(name=TEST_ROLE)
    
    if not user.groups.filter(name=TEST_ROLE).exists():
        user.groups.add(doctor_group)
        print(f"✅ Assigned '{TEST_ROLE}' role to user")
    else:
        print(f"✅ User already has '{TEST_ROLE}' role")
    
    # Remove any admin roles if present
    admin_group = Group.objects.filter(name='Admin').first()
    if admin_group and user.groups.filter(name='Admin').exists():
        user.groups.remove(admin_group)
        print(f"   Removed 'Admin' role (for testing purposes)")
    
    print()
    
except Exception as e:
    print(f"❌ Error setting up test user: {str(e)}\n")
    sys.exit(1)

# Step 1: Login with test account
print(f"Step 1: Logging in as '{TEST_USERNAME}' (Role: {TEST_ROLE})...")

try:
    login_response = requests.post(
        LOGIN_URL,
        json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        },
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code == 200:
        login_data = login_response.json()
        
        # Check if MFA is required
        if login_data.get('requires_mfa'):
            print("⚠️  MFA is required for this account.")
            print("   Disabling MFA for test user...")
            user.mfa_enabled = False
            user.save()
            
            # Try login again
            login_response = requests.post(LOGIN_URL, json={
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
            })
            login_data = login_response.json()
        
        access_token = login_data.get('access')
        user_data = login_data.get('user', {})
        user_role = user_data.get('role', 'Unknown')
        
        if not access_token:
            print(f"❌ Login succeeded but no access token received")
            print(f"   Response: {json.dumps(login_data, indent=2)}\n")
            sys.exit(1)
        
        print(f"✅ Login successful!")
        print(f"   Username: {TEST_USERNAME}")
        print(f"   Role: {user_role}")
        print(f"   Access Token: {access_token[:40]}...\n")
        
    elif login_response.status_code == 401:
        print(f"❌ Login failed with 401 Unauthorized")
        print(f"   This means authentication failed.")
        print(f"   Response: {login_response.text}\n")
        sys.exit(1)
        
    else:
        print(f"❌ Login failed with status {login_response.status_code}")
        print(f"   Response: {login_response.text}\n")
        sys.exit(1)
        
except requests.exceptions.ConnectionError:
    print("❌ Connection error. Make sure the backend server is running:")
    print("   python manage.py runserver\n")
    sys.exit(1)
except Exception as e:
    print(f"❌ Login error: {str(e)}\n")
    sys.exit(1)

# Step 2: Attempt to access admin-only endpoint
print(f"Step 2: Attempting to access admin-only endpoint...")
print(f"   Endpoint: {ADMIN_TEST_URL}")
print(f"   Expected: 403 Forbidden (non-admin user)\n")

try:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    admin_response = requests.get(ADMIN_TEST_URL, headers=headers)
    
    print(f"   Response Status: {admin_response.status_code}")
    
    # Step 3: Verify the response
    print("\nStep 3: Verifying RBAC enforcement...\n")
    
    if admin_response.status_code == 403:
        print("="*70)
        print("✅ TEST PASSED - RBAC IS WORKING CORRECTLY!")
        print("="*70)
        print("\nThe server correctly returned 403 Forbidden.")
        print("Non-admin users are successfully blocked from admin endpoints.")
        
        try:
            response_data = admin_response.json()
            print(f"\nServer Message: {response_data.get('error', 'Access denied')}")
        except:
            pass
        
    elif admin_response.status_code == 200:
        print("="*70)
        print("❌ TEST FAILED - RBAC IS NOT WORKING!")
        print("="*70)
        print("\nThe server returned 200 OK - access was GRANTED!")
        print("This means the RBAC middleware/decorators are NOT enforcing roles.")
        print(f"A {TEST_ROLE} user should NOT be able to access admin endpoints.")
        
        try:
            response_data = admin_response.json()
            print(f"\nResponse Data:")
            print(json.dumps(response_data, indent=2))
        except:
            print(f"\nResponse: {admin_response.text}")
            
    elif admin_response.status_code == 401:
        print("="*70)
        print("⚠️  TEST INCONCLUSIVE - Authentication Issue")
        print("="*70)
        print("\nThe server returned 401 Unauthorized.")
        print("This means the access token was rejected.")
        print("RBAC cannot be tested if authentication is failing.")
        
        try:
            response_data = admin_response.json()
            print(f"\nResponse: {json.dumps(response_data, indent=2)}")
        except:
            print(f"\nResponse: {admin_response.text}")
        
    else:
        print("="*70)
        print(f"⚠️  UNEXPECTED RESPONSE: {admin_response.status_code}")
        print("="*70)
        print(f"\nExpected: 403 Forbidden")
        print(f"Received: {admin_response.status_code}")
        
        try:
            response_data = admin_response.json()
            print(f"\nResponse: {json.dumps(response_data, indent=2)}")
        except:
            print(f"\nResponse: {admin_response.text}")
        
except Exception as e:
    print(f"❌ Request error: {str(e)}\n")
    sys.exit(1)

print("\n" + "="*70)
print("Test Complete")
print("="*70 + "\n")

# Cleanup suggestion
print("💡 Next Steps:")
print("   • To test admin access, run this script with an admin account")
print("   • To clean up, delete the test user from Django admin")
print(f"   • Test user credentials: {TEST_USERNAME} / {TEST_PASSWORD}\n")
