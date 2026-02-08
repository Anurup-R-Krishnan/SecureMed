"""
Test script for password reset functionality.
Run with: python manage.py shell < test_password_reset.py
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/auth"

def test_password_reset_flow():
    """Test the complete password reset flow."""
    
    print("\n" + "="*70)
    print("TESTING PASSWORD RESET FUNCTIONALITY")
    print("="*70)
    
    # Step 1: Request password reset
    print("\n1. Requesting password reset for test user...")
    reset_request_data = {
        "email": "admin@securemed.com"
    }
    
    response = requests.post(
        f"{BASE_URL}/password-reset/",
        json=reset_request_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✓ Password reset request successful")
        print("\nCheck your console for the reset token (email will be printed there)")
        print("\nTo complete the reset, use the token from the console output:")
        print("POST /api/auth/password-reset/confirm/")
        print(json.dumps({
            "token": "TOKEN_FROM_CONSOLE",
            "password": "NewSecurePass123!",
            "password_confirm": "NewSecurePass123!"
        }, indent=2))
    else:
        print("✗ Password reset request failed")
    
    # Step 2: Test with invalid email (should still return 200 to prevent enumeration)
    print("\n2. Testing with non-existent email...")
    reset_request_data = {
        "email": "nonexistent@example.com"
    }
    
    response = requests.post(
        f"{BASE_URL}/password-reset/",
        json=reset_request_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✓ Correctly returns 200 for non-existent email (prevents enumeration)")
    
    # Step 3: Test validation errors
    print("\n3. Testing validation errors...")
    
    # Missing email
    response = requests.post(
        f"{BASE_URL}/password-reset/",
        json={},
        headers={"Content-Type": "application/json"}
    )
    print(f"Missing email - Status: {response.status_code}")
    
    # Invalid token for confirm
    print("\n4. Testing password reset confirm with invalid token...")
    confirm_data = {
        "token": "invalid_token",
        "password": "NewSecurePass123!",
        "password_confirm": "NewSecurePass123!"
    }
    
    response = requests.post(
        f"{BASE_URL}/password-reset/confirm/",
        json=confirm_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 400:
        print("✓ Correctly rejects invalid token")
    
    # Weak password
    print("\n5. Testing with weak password...")
    confirm_data = {
        "token": "some_token",
        "password": "weak",
        "password_confirm": "weak"
    }
    
    response = requests.post(
        f"{BASE_URL}/password-reset/confirm/",
        json=confirm_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 400:
        print("✓ Correctly rejects weak password")
    
    # Mismatched passwords
    print("\n6. Testing with mismatched passwords...")
    confirm_data = {
        "token": "some_token",
        "password": "NewSecurePass123!",
        "password_confirm": "DifferentPass123!"
    }
    
    response = requests.post(
        f"{BASE_URL}/password-reset/confirm/",
        json=confirm_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 400:
        print("✓ Correctly rejects mismatched passwords")
    
    print("\n" + "="*70)
    print("TEST COMPLETE")
    print("="*70)

if __name__ == "__main__":
    test_password_reset_flow()
