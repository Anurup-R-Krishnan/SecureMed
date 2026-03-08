
import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api"
AUTH_URL = "http://localhost:8000/api/auth"

# Credentials (adjust as needed if you have a known user)
ADMIN_EMAIL = "admin@example.com"  # Assuming this exists or using test user
ADMIN_PASSWORD = "etturvattam"

def login():
    print(f"Logging in as {ADMIN_EMAIL}...")
    try:
        response = requests.post(f"{AUTH_URL}/login/", json={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            if 'access' in data:
                return data['access']
            elif 'temp_token' in data:
                 print("MFA required - skipping for automated test (requires interactive OTP)")
                 return None
        print(f"Login failed: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def verify_doctors(token):
    print("\nVerifying Doctors List...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/appointments/doctors/", headers=headers)
    
    if response.status_code == 200:
        doctors = response.json()
        print(f"✅ Success! Found {len(doctors)} doctors.")
        for doc in doctors:
            print(f" - Dr. {doc.get('name')} ({doc.get('specialization')})")
        return True
    else:
        print(f"❌ Failed to fetch doctors: {response.status_code} - {response.text}")
        return False

def verify_appointments(token):
    print("\nVerifying Appointments List...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/appointments/appointments/", headers=headers)
    
    if response.status_code == 200:
        appointments = response.json()
        print(f"✅ Success! Found {len(appointments)} appointments.")
        return True
    else:
        print(f"❌ Failed to fetch appointments: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("=== Appointment System Verification ===")
    
    # 1. Login
    # Note: If admin user doesn't exist or MFA enabled, this might fail in automated run.
    # In that case, we need to handle it or instruct user.
    # For now, let's try.
    
    try:
        # Check server first
        requests.get("http://localhost:8000/api/")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is NOT running. Please run 'python manage.py runserver'")
        sys.exit(1)

    token = login()
    if not token:
        print("⚠️  Could not log in to verify protected endpoints.")
        print("Skipping authenticated checks.")
    else:
        verify_doctors(token)
        verify_appointments(token)

    print("\n=== Verification Complete ===")
