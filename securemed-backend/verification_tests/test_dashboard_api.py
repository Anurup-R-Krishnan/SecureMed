import os
import django
import sys
import json

# Setup Django environment BEFORE importing anything that uses settings
sys.path.append('/home/anuruprkris/Project/SecureMed/securemed-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from patients.models import Patient

User = get_user_model()

def test_dashboard_stats_endpoint():
    print("Setting up test...")
    client = APIClient()
    
    # Get or create patient user
    email = 'patient1@gmail.com'
    try:
        user = User.objects.get(email=email)
        print(f"Using existing user: {user.email}")
    except User.DoesNotExist:
        print("Creating test user...")
        user = User.objects.create_user(email=email, password='password123', role='patient')
        Patient.objects.create(user=user, patient_id="P-TEST")

    client.force_authenticate(user=user)
    
    # Test Dashboard Stats
    print("Requesting dashboard stats...")
    response = client.get('/api/medical-records/dashboard/stats/')
    
    print(f"\nStatus Code: {response.status_code}")
    # print(f"Response Data: {json.dumps(response.data, indent=2)}")
    
    if response.status_code == 200:
        print("SUCCESS: Endpoint works!")
        if 'health_score' in response.data:
            print(f"Health Score: {response.data['health_score']}")
            print(f"Vitals: {response.data.get('vitals')}")
        else:
             print("WARNING: health_score missing in response")
    else:
        print(f"FAILURE: Status code {response.status_code}")
        print(response.data)

if __name__ == "__main__":
    import os
    import django
    import sys
    sys.path.append('/home/anuruprkris/Project/SecureMed/securemed-backend')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    test_dashboard_stats_endpoint()
