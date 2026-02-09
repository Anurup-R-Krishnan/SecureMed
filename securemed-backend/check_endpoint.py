import requests
import sys

try:
    print("Testing http://localhost:8000/api/appointments/doctors/")
    resp = requests.get("http://localhost:8000/api/appointments/doctors/", allow_redirects=True, timeout=5)
    print(f"Status: {resp.status_code}")
    print(f"Final URL: {resp.url}")
    print(f"History: {resp.history}")
    
    if resp.status_code == 200:
        print("SUCCESS: Endpoint reachable")
    else:
        print(f"FAILURE: Status {resp.status_code}")
        print(resp.text[:500])

except Exception as e:
    print(f"ERROR: {e}")
