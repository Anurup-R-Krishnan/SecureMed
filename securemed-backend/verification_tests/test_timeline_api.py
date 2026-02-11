"""
Simple test for Patient Timeline API
"""
import os
import sys
import django

sys.path.append('/home/anuruprkris/Project/SecureMed/securemed-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

def test_timeline_api():
    """Test that timeline API endpoint works"""
    client = APIClient()
    
    # Get or create patient user
    try:
        user = User.objects.get(email='patient1@gmail.com')
        print(f"Using existing user: {user.email}")
    except User.DoesNotExist:
        print("Patient not found, create one first")
        return
    
    client.force_authenticate(user=user)
    
    # Test Timeline
    print("\nFetching patient timeline...")
    response = client.get('/api/medical-records/timeline/')
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.data
        print(f"\n✓ Timeline API works!")
        print(f"  Total events: {data.get('summary', {}).get('total_events', 0)}")
        print(f"  Active prescriptions: {data.get('summary', {}).get('active_prescriptions', 0)}")
        print(f"  Pending invoices: {data.get('summary', {}).get('pending_invoices', 0)}")
        print(f"  Pending labs: {data.get('summary', {}).get('pending_labs', 0)}")
        
        if data.get('timeline'):
            print(f"\n  Recent events:")
            for event in data['timeline'][:5]:
                print(f"    - {event['type']}: {event['title']}")
    else:
        print(f"✗ Failed: {response.data}")

if __name__ == "__main__":
    test_timeline_api()
