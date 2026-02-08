import requests

# Test 1: Get doctor availability
print("Test 1: Getting doctor availability...")
import datetime
today = datetime.date.today()
next_monday = today + datetime.timedelta(days=(7 - today.weekday()))
print(f"Checking for date: {next_monday}")

response = requests.get(f'http://127.0.0.1:8000/api/appointments/doctors/1/availability/?date={next_monday}', headers={'X-User-Role': 'patient'})
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Slots found: {len(data)}")
    if len(data) > 0:
        print(f"Sample slot: {data[0]}")
    else:
        print("WARNING: No slots found (could be weekend?)")
else:
    print(f"Error: {response.text}")

# Test 2: Get patient timeline
print("\nTest 2: Getting patient timeline...")
response = requests.get('http://127.0.0.1:8000/api/patients/profiles/1/timeline/', headers={'X-User-Role': 'doctor'})
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Timeline events: {len(data)}")
    if len(data) > 0:
        print(f"Sample event types: {[e['type'] for e in data]}")
else:
    print(f"Error: {response.text}")

# Test 3: Book appointment
print("\nTest 3: Booking appointment...")
booking_data = {
    'patientId': '1',
    'patientName': 'Test Patient',
    'doctorId': '1',
    'date': '2026-02-10',
    'startTime': '10:00',
    'reason': 'Test booking'
}
response = requests.post('http://127.0.0.1:8000/api/appointments/booking/', 
                        json=booking_data,
                        headers={'X-User-Role': 'patient', 'Content-Type': 'application/json'})
print(f"Status: {response.status_code}")
if response.status_code in [200, 201]:
    print(f"Success: {response.json()}")
else:
    print(f"Error: {response.text}")
