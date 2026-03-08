#!/usr/bin/env python3
"""
Script to verify JWT Authentication (Task 1)
Tests the authentication endpoint and validates JWT token generation.
"""

import requests
import json
import sys


def verify_jwt_authentication():
    """Verify that JWT authentication is working correctly."""
    
    # API endpoint
    url = "http://127.0.0.1:8000/api/auth/login/"
    
    # Test credentials
    credentials = {
        "username": "admin@example.com",  # Can use email as username
        "password": "etturvattam"
    }
    
    print("🔍 Testing JWT Authentication...")
    print(f"📡 Endpoint: {url}")
    print(f"👤 Credentials: {credentials['username']}")
    print("-" * 60)
    
    try:
        # Make POST request
        response = requests.post(
            url,
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        # Check response status
        if response.status_code == 200:
            data = response.json()
            
            # Verify required keys are present
            if "access" in data and "refresh" in data:
                print("✅ SUCCESS: Task 1 Completed. JWT Tokens received.")
                print()
                print("📦 Response Details:")
                print(f"   - Access Token: {data['access'][:50]}...")
                print(f"   - Refresh Token: {data['refresh'][:50]}...")
                
                if "user" in data:
                    print(f"   - User: {data['user'].get('username')} ({data['user'].get('role')})")
                
                return True
            else:
                print("❌ FAILURE: Response missing 'access' or 'refresh' tokens.")
                print(f"Response: {json.dumps(data, indent=2)}")
                return False
        else:
            print(f"❌ FAILURE: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ FAILURE: Cannot connect to server.")
        print("💡 Make sure Django server is running:")
        print("   cd backend && python manage.py runserver")
        return False
        
    except requests.exceptions.Timeout:
        print("❌ FAILURE: Request timed out.")
        return False
        
    except Exception as e:
        print(f"❌ FAILURE: Unexpected error - {str(e)}")
        return False


if __name__ == "__main__":
    success = verify_jwt_authentication()
    sys.exit(0 if success else 1)
