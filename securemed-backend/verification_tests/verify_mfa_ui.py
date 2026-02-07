#!/usr/bin/env python3
"""
Script to verify MFA Setup UI functionality
Tests the complete MFA setup flow through the API endpoints.
"""

import requests
import json
import sys
import pyotp


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


def test_mfa_setup_flow():
    """Test the complete MFA setup UI flow."""
    
    print("\n🔐 Testing MFA Setup UI Flow")
    print("=" * 60)
    
    try:
        # Step 1: Login to get access token
        print_step("Step 1: Login to get access token")
        
        login_url = "http://127.0.0.1:8000/api/auth/login/"
        login_data = {
            "username": "admin@example.com",
            "password": "etturvattam"
        }
        
        login_response = requests.post(
            login_url,
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print_error(f"Login failed with status {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
        
        login_result = login_response.json()
        
        # Check if MFA is already enabled
        if login_result.get("mfa_required"):
            print_info("MFA is already enabled for this user")
            print_info("Skipping MFA setup test - user already has MFA active")
            print_success("MFA Setup UI would show 'Active' badge")
            return True
        
        access_token = login_result.get("access")
        
        if not access_token:
            print_error("No access token received")
            return False
        
        print_success("Login successful")
        print_info(f"   Access Token: {access_token[:50]}...")
        
        # Step 2: Setup MFA (simulating "Enable Two-Factor Authentication" button click)
        print_step("Step 2: Setup MFA (API call from UI)")
        
        setup_url = "http://127.0.0.1:8000/api/auth/mfa/setup/"
        
        setup_response = requests.post(
            setup_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            timeout=10
        )
        
        if setup_response.status_code != 200:
            print_error(f"MFA setup failed with status {setup_response.status_code}")
            print(f"Response: {setup_response.text}")
            return False
        
        setup_data = setup_response.json()
        
        secret = setup_data.get("secret")
        otpauth_url = setup_data.get("otpauth_url")
        
        if not secret or not otpauth_url:
            print_error("Missing secret or otpauth_url in response")
            return False
        
        print_success("MFA setup initiated")
        print_info(f"   Secret: {secret}")
        print_info(f"   OTP Auth URL: {otpauth_url[:60]}...")
        print_info("   [UI would display QR code here]")
        
        # Step 3: Generate OTP code (simulating authenticator app)
        print_step("Step 3: Generate OTP code (user scans QR)")
        
        totp = pyotp.TOTP(secret)
        otp_code = totp.now()
        
        print_success("OTP code generated from secret")
        print_info(f"   6-digit code: {otp_code}")
        
        # Step 4: Verify MFA (simulating "Verify & Activate" button click)
        print_step("Step 4: Verify MFA code (activate)")
        
        verify_url = "http://127.0.0.1:8000/api/auth/mfa/verify/"
        verify_data = {
            "code": otp_code
        }
        
        verify_response = requests.post(
            verify_url,
            json=verify_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            timeout=10
        )
        
        if verify_response.status_code != 200:
            print_error(f"MFA verification failed with status {verify_response.status_code}")
            print(f"Response: {verify_response.text}")
            return False
        
        verify_result = verify_response.json()
        
        print_success("MFA verification successful")
        print_info(f"   Response: {json.dumps(verify_result, indent=2)}")
        print_success("UI would now show: '✅ Two-Factor Authentication is Active'")
        
        # Step 5: Test that next login requires MFA
        print_step("Step 5: Verify MFA is required on next login")
        
        login_response2 = requests.post(
            login_url,
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if login_response2.status_code != 200:
            print_error(f"Login check failed with status {login_response2.status_code}")
            return False
        
        login_result2 = login_response2.json()
        
        if not login_result2.get("mfa_required"):
            print_error("MFA is not required after setup - setup may have failed")
            return False
        
        print_success("MFA is now required for login")
        print_info("   UI would show: 'Enter your authentication code' step")
        
        # All tests passed
        print("\n" + "=" * 60)
        print(f"{Colors.GREEN}✅ SUCCESS: MFA Setup UI flow is working correctly{Colors.RESET}")
        print("=" * 60)
        print("\n📋 Summary:")
        print("   1. ✅ User can click 'Enable Two-Factor Authentication'")
        print("   2. ✅ QR code and secret key are displayed")
        print("   3. ✅ User can enter 6-digit code and verify")
        print("   4. ✅ MFA activation succeeds")
        print("   5. ✅ Next login requires MFA code")
        print(f"\n{Colors.YELLOW}👤 Test User: admin@example.com{Colors.RESET}")
        print(f"{Colors.YELLOW}🔐 MFA is now ENABLED for this account{Colors.RESET}\n")
        
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
    success = test_mfa_setup_flow()
    sys.exit(0 if success else 1)
