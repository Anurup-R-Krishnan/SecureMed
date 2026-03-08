#!/usr/bin/env python3
"""
Script to verify TOTP MFA (Task 2 - Story 1.1)
Tests the complete MFA setup and authentication flow.
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


def print_step(step_num, description):
    """Print a test step header."""
    print(f"\n{Colors.BLUE}{'=' * 60}")
    print(f"Step {step_num}: {description}")
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


def verify_mfa_flow():
    """Verify the complete MFA authentication flow."""
    
    base_url = "http://127.0.0.1:8000/api/auth"
    credentials = {
        "username": "admin@example.com",
        "password": "etturvattam"
    }
    
    print("\n🔐 Testing TOTP MFA Flow (Task 2)")
    print("=" * 60)
    
    try:
        # Step 1: Initial Login
        print_step(1, "Initial Login to Get Access Token")
        response = requests.post(
            f"{base_url}/login/",
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"Login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        login_data = response.json()
        access_token = login_data.get("access")
        
        if not access_token:
            print_error("No access token received")
            return False
        
        print_success("Login successful")
        print_info(f"Access Token: {access_token[:50]}...")
        
        # Step 2: Setup MFA
        print_step(2, "Setup MFA - Get TOTP Secret")
        response = requests.post(
            f"{base_url}/mfa/setup/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"MFA setup failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        mfa_setup = response.json()
        secret = mfa_setup.get("secret")
        provisioning_uri = mfa_setup.get("provisioning_uri")
        
        if not secret:
            print_error("No secret received from MFA setup")
            return False
        
        print_success("MFA setup successful")
        print_info(f"Secret: {secret}")
        print_info(f"Provisioning URI: {provisioning_uri[:60]}...")
        
        # Step 3: Generate TOTP Code
        print_step(3, "Generate TOTP Code using pyotp")
        totp = pyotp.TOTP(secret)
        otp_code = totp.now()
        
        print_success(f"Generated OTP Code: {otp_code}")
        
        # Step 4: Verify MFA
        print_step(4, "Verify MFA Code to Enable MFA")
        response = requests.post(
            f"{base_url}/mfa/verify/",
            json={"otp": otp_code},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"MFA verification failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        verify_data = response.json()
        print_success("MFA verification successful")
        print_info(f"Response: {json.dumps(verify_data, indent=2)}")
        
        # Step 5: Test MFA Required on Login
        print_step(5, "Test Login - Should Require MFA Now")
        response = requests.post(
            f"{base_url}/login/",
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"Login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        login_data = response.json()
        mfa_required = login_data.get("mfa_required")
        temp_token = login_data.get("temp_token")
        
        if not mfa_required:
            print_error("MFA should be required but wasn't")
            print(f"Response: {json.dumps(login_data, indent=2)}")
            return False
        
        if not temp_token:
            print_error("No temp_token received")
            return False
        
        print_success("MFA is correctly required")
        print_info(f"Temp Token: {temp_token[:50]}...")
        
        # Step 6: Generate New OTP Code for MFA Login
        print_step(6, "Generate New OTP Code for MFA Login")
        new_otp_code = totp.now()
        print_success(f"Generated OTP Code: {new_otp_code}")
        
        # Step 7: Complete MFA Login
        print_step(7, "Complete MFA Login with OTP")
        response = requests.post(
            f"{base_url}/mfa/login/",
            json={
                "temp_token": temp_token,
                "otp": new_otp_code
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"MFA login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        final_login = response.json()
        final_access_token = final_login.get("access")
        final_refresh_token = final_login.get("refresh")
        
        if not final_access_token or not final_refresh_token:
            print_error("Missing access or refresh token in final login")
            print(f"Response: {json.dumps(final_login, indent=2)}")
            return False
        
        print_success("MFA login successful")
        print_info(f"Final Access Token: {final_access_token[:50]}...")
        print_info(f"Final Refresh Token: {final_refresh_token[:50]}...")
        
        # All tests passed
        print("\n" + "=" * 60)
        print(f"{Colors.GREEN}✅ SUCCESS: Task 2 Completed. Backend MFA flow is perfect.{Colors.RESET}")
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
    success = verify_mfa_flow()
    sys.exit(0 if success else 1)
