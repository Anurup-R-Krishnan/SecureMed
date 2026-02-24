"""
Verification Script for User Story 1.4: Invite-Only Registration

This script automates the testing of the invitation system:
1. Admin login (with MFA support)
2. Send invitation
3. Verify invitation token
4. Output registration URL

Usage:
    python verify_invitations.py
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/auth"
FRONTEND_URL = "http://localhost:3000"

# Admin credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "etturvattam"

# Test invitation email
TEST_EMAIL = "automated-test@example.com"

print("\n" + "="*70)
print("INVITATION SYSTEM VERIFICATION - Story 1.4")
print("="*70 + "\n")

# ============================================================================
# Step 1: Admin Authentication
# ============================================================================

print("Step 1: Authenticating as admin...")
print(f"   Email: {ADMIN_EMAIL}")

try:
    login_response = requests.post(
        f"{BASE_URL}/login/",
        json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        },
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed with status {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        sys.exit(1)
    
    login_data = login_response.json()
    
    # Check if MFA is required
    if login_data.get('requires_mfa') or login_data.get('mfa_required'):
        print("🔐 MFA is enabled for this account")
        temp_token = login_data.get('temp_token')
        
        if not temp_token:
            print("❌ No temporary token received for MFA")
            sys.exit(1)
        
        print(f"   Temporary token received: {temp_token[:30]}...")
        
        # Prompt for OTP
        print("\n📱 Please enter your 6-digit OTP code from your authenticator app:")
        otp_code = input("   OTP: ").strip()
        
        if len(otp_code) != 6 or not otp_code.isdigit():
            print("❌ Invalid OTP format. Must be 6 digits.")
            sys.exit(1)
        
        # Complete MFA login
        print("\n   Verifying OTP...")
        mfa_response = requests.post(
            f"{BASE_URL}/mfa/login/",
            json={
                "temp_token": temp_token,
                "otp": otp_code
            },
            headers={"Content-Type": "application/json"}
        )
        
        if mfa_response.status_code != 200:
            print(f"❌ MFA verification failed with status {mfa_response.status_code}")
            print(f"   Response: {mfa_response.text}")
            sys.exit(1)
        
        mfa_data = mfa_response.json()
        access_token = mfa_data.get('access')
        
        if not access_token:
            print("❌ No access token received after MFA")
            sys.exit(1)
        
        print("✅ MFA verification successful!")
        
    else:
        # No MFA required
        access_token = login_data.get('access')
        
        if not access_token:
            print("❌ No access token received")
            print(f"   Response: {json.dumps(login_data, indent=2)}")
            sys.exit(1)
        
        print("✅ Login successful (no MFA required)")
    
    print(f"   Access Token: {access_token[:40]}...")
    print()

except requests.exceptions.ConnectionError:
    print("❌ Connection error. Make sure the backend server is running:")
    print("   python manage.py runserver")
    sys.exit(1)
except Exception as e:
    print(f"❌ Login error: {str(e)}")
    sys.exit(1)

# ============================================================================
# Step 2: Send Invitation
# ============================================================================

print("Step 2: Sending invitation...")
print(f"   To: {TEST_EMAIL}")

try:
    invite_response = requests.post(
        f"{BASE_URL}/invite/send/",
        json={"email": TEST_EMAIL},
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    if invite_response.status_code == 400:
        # Check if invitation already exists
        error_data = invite_response.json()
        if "already exists" in error_data.get('error', '').lower():
            print("⚠️  An active invitation already exists for this email")
            existing_token = error_data.get('token')
            
            if existing_token:
                print(f"   Using existing token: {existing_token}")
                invitation_token = existing_token
                invitation_email = TEST_EMAIL
            else:
                print("❌ Could not retrieve existing token")
                sys.exit(1)
        else:
            print(f"❌ Failed to send invitation: {error_data.get('error')}")
            sys.exit(1)
    
    elif invite_response.status_code == 201:
        invite_data = invite_response.json()
        invitation = invite_data.get('invitation', {})
        invitation_token = invitation.get('token')
        invitation_email = invitation.get('email')
        expires_at = invitation.get('expires_at')
        
        if not invitation_token:
            print("❌ No invitation token received")
            print(f"   Response: {json.dumps(invite_data, indent=2)}")
            sys.exit(1)
        
        print("✅ Invitation sent successfully!")
        print(f"   Token: {invitation_token}")
        print(f"   Email: {invitation_email}")
        print(f"   Expires: {expires_at}")
    
    else:
        print(f"❌ Failed to send invitation with status {invite_response.status_code}")
        print(f"   Response: {invite_response.text}")
        sys.exit(1)
    
    print()

except Exception as e:
    print(f"❌ Invitation error: {str(e)}")
    sys.exit(1)

# ============================================================================
# Step 3: Verify Invitation Token
# ============================================================================

print("Step 3: Verifying invitation token...")
print(f"   Token: {invitation_token}")

try:
    verify_response = requests.post(
        f"{BASE_URL}/invite/verify/",
        json={"token": invitation_token},
        headers={"Content-Type": "application/json"}
    )
    
    if verify_response.status_code != 200:
        print(f"❌ Token verification failed with status {verify_response.status_code}")
        print(f"   Response: {verify_response.text}")
        sys.exit(1)
    
    verify_data = verify_response.json()
    
    if not verify_data.get('valid'):
        print(f"❌ Token is invalid: {verify_data.get('message')}")
        sys.exit(1)
    
    verified_email = verify_data.get('email')
    
    print("✅ Token verification successful!")
    print(f"   Valid: {verify_data.get('valid')}")
    print(f"   Email: {verified_email}")
    print(f"   Message: {verify_data.get('message')}")
    
    # Verify email matches
    if verified_email != invitation_email:
        print(f"⚠️  Warning: Email mismatch!")
        print(f"   Expected: {invitation_email}")
        print(f"   Received: {verified_email}")
    
    print()

except Exception as e:
    print(f"❌ Verification error: {str(e)}")
    sys.exit(1)

# ============================================================================
# Step 4: Output Registration URL
# ============================================================================

print("Step 4: Registration URL")
print("="*70)

registration_url = f"{FRONTEND_URL}/register?token={invitation_token}"

print(f"\n🔗 Registration Link:")
print(f"   {registration_url}")
print(f"\n📋 Instructions:")
print(f"   1. Click the link above (or copy-paste into your browser)")
print(f"   2. The registration form should load with email pre-filled")
print(f"   3. Email field should show: {verified_email}")
print(f"   4. Complete the form to test the full registration flow")

print("\n" + "="*70)
print("✅ VERIFICATION COMPLETE - All checks passed!")
print("="*70 + "\n")

# Summary
print("📊 Summary:")
print(f"   ✅ Admin authentication successful")
print(f"   ✅ Invitation created/retrieved")
print(f"   ✅ Token validation passed")
print(f"   ✅ Registration URL generated")
print(f"\n   Invitation Email: {verified_email}")
print(f"   Token: {invitation_token}")
print(f"   Status: Ready for registration\n")
