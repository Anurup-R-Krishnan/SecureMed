#!/usr/bin/env python3
"""
Script to verify Strong Password Policy (Task 3 of Story 1.1)
Tests password validation rules: Min 12 chars + Special Characters + Regex check
"""

import requests
import json
import sys
import random
import string


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


def generate_unique_username():
    """Generate a unique username for testing."""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"testuser_{random_suffix}"


def test_registration(username, email, password, should_succeed=True):
    """
    Test user registration with given password.
    Returns (success, status_code, response_data)
    """
    url = "http://127.0.0.1:8000/api/auth/register/"
    
    data = {
        "username": username,
        "email": email,
        "password": password,
        "password_confirm": password,
        "role": "patient"
    }
    
    try:
        response = requests.post(
            url,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        response_data = response.json()
        
        return (response.status_code == 201, response.status_code, response_data)
        
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server")
        print_info("Make sure Django server is running:")
        print_info("   cd backend && python manage.py runserver")
        return (False, 0, {"error": "Connection failed"})
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return (False, 0, {"error": str(e)})


def verify_password_policy():
    """Verify password policy enforcement."""
    
    print("\n🔐 Testing Strong Password Policy (Task 3 of Story 1.1)")
    print("=" * 60)
    print(f"{Colors.YELLOW}Requirements:{Colors.RESET}")
    print("  • Minimum 12 characters")
    print("  • At least 1 special character")
    print("  • Regex validation active")
    print()
    
    all_tests_passed = True
    
    # Test Case 1: Too Short (should fail)
    print_step("Test Case 1: Password Too Short (< 12 chars)")
    username1 = generate_unique_username()
    email1 = f"{username1}@example.com"
    password1 = "Short1!"
    
    print_info(f"Username: {username1}")
    print_info(f"Password: '{password1}' (length: {len(password1)})")
    print_info(f"Expected: REJECT (too short)")
    
    success1, status1, data1 = test_registration(username1, email1, password1, should_succeed=False)
    
    if success1:
        print_error(f"FAIL: Weak password accepted (status {status1})")
        print(f"Response: {json.dumps(data1, indent=2)}")
        all_tests_passed = False
    elif status1 == 400:
        print_success(f"PASS: Correctly rejected (status {status1})")
        if 'password' in data1 or 'non_field_errors' in data1:
            error_msg = data1.get('password', data1.get('non_field_errors', ['Unknown error']))[0]
            print_info(f"Error message: {error_msg}")
        else:
            print_info(f"Response: {json.dumps(data1, indent=2)}")
    else:
        print_error(f"UNEXPECTED: Got status {status1}")
        print(f"Response: {json.dumps(data1, indent=2)}")
        all_tests_passed = False
    
    # Test Case 2: No Special Character (should fail)
    print_step("Test Case 2: No Special Character")
    username2 = generate_unique_username()
    email2 = f"{username2}@example.com"
    password2 = "LongPasswordNoSpecial123"
    
    print_info(f"Username: {username2}")
    print_info(f"Password: '{password2}' (length: {len(password2)})")
    print_info(f"Expected: REJECT (no special char)")
    
    success2, status2, data2 = test_registration(username2, email2, password2, should_succeed=False)
    
    if success2:
        print_error(f"FAIL: Weak password accepted (status {status2})")
        print(f"Response: {json.dumps(data2, indent=2)}")
        all_tests_passed = False
    elif status2 == 400:
        print_success(f"PASS: Correctly rejected (status {status2})")
        if 'password' in data2 or 'non_field_errors' in data2:
            error_msg = data2.get('password', data2.get('non_field_errors', ['Unknown error']))[0]
            print_info(f"Error message: {error_msg}")
        else:
            print_info(f"Response: {json.dumps(data2, indent=2)}")
    else:
        print_error(f"UNEXPECTED: Got status {status2}")
        print(f"Response: {json.dumps(data2, indent=2)}")
        all_tests_passed = False
    
    # Test Case 3: Valid Strong Password (should succeed)
    print_step("Test Case 3: Valid Strong Password")
    username3 = generate_unique_username()
    email3 = f"{username3}@example.com"
    password3 = "ValidP@ssw0rd12!"
    
    print_info(f"Username: {username3}")
    print_info(f"Password: '{password3}' (length: {len(password3)})")
    print_info(f"Expected: ACCEPT (meets all requirements)")
    
    success3, status3, data3 = test_registration(username3, email3, password3, should_succeed=True)
    
    if success3 and status3 == 201:
        print_success(f"PASS: Strong password accepted (status {status3})")
        print_info(f"User created: {data3.get('user', {}).get('username')}")
    elif status3 == 400:
        print_error(f"FAIL: Valid password rejected")
        print(f"Response: {json.dumps(data3, indent=2)}")
        all_tests_passed = False
    else:
        print_error(f"UNEXPECTED: Got status {status3}")
        print(f"Response: {json.dumps(data3, indent=2)}")
        all_tests_passed = False
    
    # Test Case 4: Edge Case - Exactly 12 chars with special char (should succeed)
    print_step("Test Case 4: Minimum Valid Password (12 chars + special)")
    username4 = generate_unique_username()
    email4 = f"{username4}@example.com"
    password4 = "TwelveChar1!"
    
    print_info(f"Username: {username4}")
    print_info(f"Password: '{password4}' (length: {len(password4)})")
    print_info(f"Expected: ACCEPT (exactly 12 chars with special)")
    
    success4, status4, data4 = test_registration(username4, email4, password4, should_succeed=True)
    
    if success4 and status4 == 201:
        print_success(f"PASS: Minimum valid password accepted (status {status4})")
        print_info(f"User created: {data4.get('user', {}).get('username')}")
    elif status4 == 400:
        print_error(f"FAIL: Valid password rejected")
        print(f"Response: {json.dumps(data4, indent=2)}")
        all_tests_passed = False
    else:
        print_error(f"UNEXPECTED: Got status {status4}")
        print(f"Response: {json.dumps(data4, indent=2)}")
        all_tests_passed = False
    
    # Final Summary
    print("\n" + "=" * 60)
    if all_tests_passed:
        print(f"{Colors.GREEN}✅ SUCCESS: Password Policy is Active{Colors.RESET}")
        print("=" * 60)
        print("\n📋 Summary:")
        print("   • Minimum 12 characters: ✅ ENFORCED")
        print("   • Special character required: ✅ ENFORCED")
        print("   • Regex validation: ✅ ACTIVE")
        print("   • Valid passwords accepted: ✅ WORKING")
        print(f"\n{Colors.GREEN}All password policy tests passed!{Colors.RESET}\n")
        return True
    else:
        print(f"{Colors.RED}❌ FAILURE: Weak passwords accepted!{Colors.RESET}")
        print("=" * 60)
        print("\n⚠️  Password policy is NOT working correctly")
        print("   Check backend/authentication/serializers.py")
        print(f"   Ensure password validation is implemented\n")
        return False


if __name__ == "__main__":
    success = verify_password_policy()
    sys.exit(0 if success else 1)
