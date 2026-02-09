import requests
import json
import os
import sys

# Constants
BASE_URL = "http://localhost:8000/api"

def get_token(username, password):
    url = f"{BASE_URL}/token/"
    data = {"username": username, "password": password}
    response = requests.post(url, json=data)
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def test_medical_record_creation(token):
    url = f"{BASE_URL}/medical-records/records/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "diagnosis": "Self-diagnosed Flu",
        "notes": "I feel sick",
        "record_type": "consultation",
        "record_date": "2026-02-09"
    }
    response = requests.post(url, headers=headers, json=data)
    print(f"Medical Record Creation Status: {response.status_code}")
    if response.status_code == 403:
        print("PASS: Patient prevented from creating medical record")
        return True
    else:
        print(f"FAIL: Patient response: {response.text}")
        return False

def test_vital_sign_creation(token):
    url = f"{BASE_URL}/medical-records/vitals/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "heart_rate": 80,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "temperature": 37.0,
        "weight": 70.0,
        "recorded_at": "2026-02-09T10:00:00Z"
    }
    response = requests.post(url, headers=headers, json=data)
    print(f"Vital Sign Creation Status: {response.status_code}")
    if response.status_code == 403:
        print("PASS: Patient prevented from recording vitals")
        return True
    else:
        print(f"FAIL: Patient response: {response.text}")
        return False

def main():
    print("Verifying Access Restrictions...")
    
    # Login as patient
    # Note: Using seeded patient 'patient1' with password 'Ballsacks@123'
    token = get_token("patient1", "Ballsacks@123")
    if not token:
        print("FAIL: Could not login as patient1")
        sys.exit(1)
    
    print("Logged in as patient1")
    
    success = True
    success &= test_medical_record_creation(token)
    success &= test_vital_sign_creation(token)
    
    if success:
        print("\nAll restriction tests passed!")
        sys.exit(0)
    else:
        print("\nSome tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
