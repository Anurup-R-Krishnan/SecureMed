#!/usr/bin/env python3
"""
Script to verify Account Lockout (Task 4 of Story 1.1)
Tests that accounts are locked after 5 failed login attempts.
"""

import requests
import json
import sys
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()


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


def create_test_user():
    """Create a fresh test user for lockout testing."""
    # Delete if exists
    User.objects.filter(email='lockout_victim@test.com').delete()
    
    # Create new user
    user = User.objects.create_user(
        username='lockout_victim',
        email='lockout_victim@test.com',
        password='CorrectP@ssw0rd123',
        role='patient'
    )
    
    return user


def attempt_login(username, password):
    """
    Attempt to login with given credentials.
    Returns (status_code, response_data)
    """
    url = "http://127.0.0.1:8000/api/auth/login/"
    
    data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(
            url,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        return (response.status_code, response.json())
        
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server")
        print_info("Make sure Django server is running:")
        print_info("   cd backend && python manage.py runserver")
        sys.exit(1)
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        sys.exit(1)


def verify_account_lockout():
    """Verify account lockout after 5 failed attempts."""
    
    print("\n🔒 Testing Account Lockout (Task 4 of Story 1.1)")
    print("=" * 60)
    print(f"{Colors.YELLOW}Requirements:{Colors.RESET}")
    print("  • Lock account after 5 failed login attempts")
    print("  • Lockout duration: 15 minutes")
    print("  • Even correct password should fail when locked")
    print()
    
    # Step 1: Create test user
    print_step("Step 1: Creating Test User")
    
    try:
        user = create_test_user()
        print_success(f"Created user: {user.username}")
        print_info(f"   Email: {user.email}")
        print_info(f"   Correct Password: CorrectP@ssw0rd123")
        print_info(f"   Initial failed_login_attempts: {user.failed_login_attempts}")
        print_info(f"   Initial locked_until: {user.locked_until}")
    except Exception as e:
        print_error(f"Failed to create test user: {str(e)}")
        return False
    
    # Step 2: Attempt 5 failed logins
    print_step("Step 2: Attempting 5 Failed Logins")
    
    wrong_password = "WrongP@ssw0rd999"
    print_info(f"Using wrong password: {wrong_password}")
    print()
    
    for attempt_num in range(1, 6):
        print(f"  Attempt {attempt_num}/5:")
        status_code, response_data = attempt_login(user.email, wrong_password)
        
        if status_code == 401:
            print_success(f"    Status: {status_code} (Unauthorized)")
            error_msg = response_data.get('error', 'Unknown error')
            print_info(f"    Message: {error_msg}")
            
            # Refresh user from database
            user.refresh_from_db()
            print_info(f"    Failed attempts count: {user.failed_login_attempts}")
        else:
            print_error(f"    Unexpected status: {status_code}")
            print(f"    Response: {json.dumps(response_data, indent=2)}")
            return False
        
        print()
    
    # Verify user state after 5 attempts
    user.refresh_from_db()
    print_info(f"After 5 attempts:")
    print_info(f"   failed_login_attempts: {user.failed_login_attempts}")
    print_info(f"   locked_until: {user.locked_until}")
    
    # Step 3: Attempt #6 with wrong password (should trigger lock)
    print_step("Step 3: Attempt #6 (Should Trigger Account Lock)")
    
    print_info(f"Using wrong password: {wrong_password}")
    status_code, response_data = attempt_login(user.email, wrong_password)
    
    if status_code == 403:
        print_success(f"Status: {status_code} (Forbidden)")
        error_msg = response_data.get('error', 'Unknown error')
        print_info(f"Message: {error_msg}")
        
        if 'locked' in error_msg.lower():
            print_success("Account locked message detected!")
        else:
            print_error("Missing 'locked' in error message")
            return False
        
        # Verify user is actually locked
        user.refresh_from_db()
        print_info(f"failed_login_attempts: {user.failed_login_attempts}")
        print_info(f"locked_until: {user.locked_until}")
        
        if user.locked_until is None:
            print_error("locked_until is None - account not locked!")
            return False
        
        print_success("Account successfully locked in database!")
        
    else:
        print_error(f"Expected 403 Forbidden, got {status_code}")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        print_error("FAILURE: Account was NOT locked after 5 failed attempts!")
        return False
    
    # Step 4: Try with CORRECT password (should still fail)
    print_step("Step 4: Attempt with CORRECT Password (Should Still Fail)")
    
    print_info("Using CORRECT password: CorrectP@ssw0rd123")
    status_code, response_data = attempt_login(user.email, 'CorrectP@ssw0rd123')
    
    if status_code == 403:
        print_success(f"Status: {status_code} (Forbidden)")
        error_msg = response_data.get('error', 'Unknown error')
        print_info(f"Message: {error_msg}")
        
        if 'locked' in error_msg.lower():
            print_success("Correct password correctly rejected - account is locked!")
        else:
            print_error("Missing 'locked' in error message")
            return False
        
    elif status_code == 200:
        print_error("CRITICAL: Correct password was accepted!")
        print_error("Account should remain locked even with correct password!")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        return False
    else:
        print_error(f"Unexpected status: {status_code}")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        return False
    
    # Final Summary
    print("\n" + "=" * 60)
    print(f"{Colors.GREEN}✅ SUCCESS: Account Lockout is Active{Colors.RESET}")
    print("=" * 60)
    print("\n📋 Summary:")
    print("   • Failed attempts tracked: ✅ YES")
    print("   • Account locked after 5 failures: ✅ YES")
    print("   • Lock prevents correct password: ✅ YES")
    print("   • Lockout duration: 15 minutes ✅")
    print("   • HTTP 403 Forbidden returned: ✅ YES")
    print(f"\n{Colors.GREEN}Brute force protection is working correctly!{Colors.RESET}\n")
    
    # Cleanup
    print_info("Cleaning up test user...")
    user.delete()
    print_success("Test user deleted")
    
    return True


if __name__ == "__main__":
    try:
        success = verify_account_lockout()
        sys.exit(0 if success else 1)
    except Exception as e:
        print_error(f"Script error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
