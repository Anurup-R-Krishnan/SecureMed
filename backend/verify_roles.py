#!/usr/bin/env python3
"""
Script to verify Role-based Registration and Login
Tests that different user roles (Doctor/Provider and Patient) work correctly.
"""

import requests
import json
import sys
import time


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def print_step(description):
    """Print a test step header."""
    print(f"\n{Colors.BLUE}{'=' * 60}")
    print(f"{description}")
    print(f"{'=' * 60}{Colors.RESET}")


def print_success(message):
    """Print success message."""
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")


def print_error(message):
    """Print error message."""
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")


def print_info(message):
    """Print info message."""
    print(f"{Colors.YELLOW}📋 {message}{Colors.RESET}")


def register_user(username, email, password, role):
    """Register a new user with specified role."""
    url = "http://127.0.0.1:8000/api/auth/register/"
    
    data = {
        "username": username,
        "email": email,
        "password": password,
        "password_confirm": password,
        "role": role
    }
    
    response = requests.post(
        url,
        json=data,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    return response


def login_user(email, password):
    """Login a user and return the response."""
    url = "http://127.0.0.1:8000/api/auth/login/"
    
    data = {
        "username": email,  # Can use email as username
        "password": password
    }
    
    response = requests.post(
        url,
        json=data,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    return response


def test_role_flow(role_name, username, email, password, expected_role):
    """Test registration and login flow for a specific role."""
    
    print_step(f"Testing {role_name.upper()} Registration & Login")
    
    # Step 1: Register
    print(f"\n1️⃣  Registering {role_name}...")
    print_info(f"   Username: {username}")
    print_info(f"   Email: {email}")
    print_info(f"   Role: {expected_role}")
    
    register_response = register_user(username, email, password, expected_role)
    
    if register_response.status_code == 201:
        print_success(f"{role_name} registration successful")
        register_data = register_response.json()
        
        if "user" in register_data:
            user_data = register_data["user"]
            print_info(f"   User ID: {user_data.get('id')}")
            print_info(f"   Username: {user_data.get('username')}")
            print_info(f"   Role: {user_data.get('role')}")
    elif register_response.status_code == 400:
        # User might already exist, try to continue with login
        print_info(f"{role_name} might already exist, continuing to login test...")
    else:
        print_error(f"Registration failed with status {register_response.status_code}")
        print(f"Response: {register_response.text}")
        return False
    
    # Wait a moment for database to settle
    time.sleep(0.5)
    
    # Step 2: Login
    print(f"\n2️⃣  Logging in as {role_name}...")
    
    login_response = login_user(email, password)
    
    if login_response.status_code != 200:
        print_error(f"Login failed with status {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    login_data = login_response.json()
    
    # Check for tokens
    if "access" not in login_data or "refresh" not in login_data:
        print_error("Missing access or refresh token")
        print(f"Response: {json.dumps(login_data, indent=2)}")
        return False
    
    print_success("Login successful")
    print_info(f"   Access Token: {login_data['access'][:50]}...")
    
    # Step 3: Verify Role
    print(f"\n3️⃣  Verifying {role_name} role...")
    
    if "user" not in login_data:
        print_error("No user data in login response")
        return False
    
    user_data = login_data["user"]
    actual_role = user_data.get("role")
    
    if actual_role != expected_role:
        print_error(f"Role mismatch! Expected '{expected_role}', got '{actual_role}'")
        print(f"User Data: {json.dumps(user_data, indent=2)}")
        return False
    
    print_success(f"Role verified: {actual_role}")
    print_info(f"   Username: {user_data.get('username')}")
    print_info(f"   Email: {user_data.get('email')}")
    print_info(f"   Role: {user_data.get('role')}")
    print_info(f"   MFA Enabled: {user_data.get('mfa_enabled')}")
    
    print(f"\n{Colors.GREEN}✅ {role_name.capitalize()} Registration & Login Success{Colors.RESET}")
    
    return True


def verify_roles():
    """Verify role-based registration and login."""
    
    print("\n🎭 Testing Multi-Role Authentication")
    print("=" * 60)
    
    try:
        # Test 1: Doctor/Provider Flow
        doctor_success = test_role_flow(
            role_name="doctor",
            username="doctor_test",
            email="doctor_test@example.com",
            password="StrongPass1!@#",  # 14 chars with special chars
            expected_role="provider"  # Django uses 'provider' for healthcare providers
        )
        
        if not doctor_success:
            print_error("Doctor flow failed")
            return False
        
        # Test 2: Patient Flow
        patient_success = test_role_flow(
            role_name="patient",
            username="patient_test",
            email="patient_test@example.com",
            password="StrongPass1!@#",  # 14 chars with special chars
            expected_role="patient"
        )
        
        if not patient_success:
            print_error("Patient flow failed")
            return False
        
        # All tests passed
        print("\n" + "=" * 60)
        print(f"{Colors.GREEN}✅ SUCCESS: Multi-role authentication is working.{Colors.RESET}")
        print("=" * 60 + "\n")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server")
        print_info("Make sure Django server is running:")
        print_info("   cd backend && python manage.py runserver")
        return False
        
    except requests.exceptions.Timeout:
        print_error("Request timed out")
        return False
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = verify_roles()
    sys.exit(0 if success else 1)
