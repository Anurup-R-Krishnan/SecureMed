import requests
import sys

# Adjust URL if your server is on a different port
BASE_URL = "http://127.0.0.1:8000/api/auth"

def run_test():
    print("🔄 Starting Logout Security Test...")

    # 1. Login to get a fresh token
    print("\nStep 1: Logging in as 'admin'...")
    # Using the seeded admin credentials
    login_data = {"username": "admin@securemed.com", "password": "SecurePass123!@#"}
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data)
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server. Is Django running?")
        sys.exit(1)
    
    if response.status_code != 200:
        print(f"❌ Login Failed: {response.text}")
        return

    tokens = response.json()
    access_token = tokens.get("access")
    refresh_token = tokens.get("refresh")
    
    if not access_token or not refresh_token:
         print("❌ Error: Tokens not found in response.")
         return

    print("✅ Login Successful! Got Refresh Token.")

    # 2. Logout (Blacklist the token)
    print("\nStep 2: Requesting Logout (Blacklisting Token)...")
    headers = {"Authorization": f"Bearer {access_token}"}
    logout_data = {"refresh": refresh_token}
    
    logout_resp = requests.post(f"{BASE_URL}/logout/", json=logout_data, headers=headers)
    
    if logout_resp.status_code == 205:
        print("✅ Logout Successful (205 Reset Content). Token sent to blacklist.")
    else:
        print(f"❌ Logout Failed: {logout_resp.status_code} - {logout_resp.text}")
        return

    # 3. Verify Blacklist (Try to use the old token)
    print("\nStep 3: Attempting to use the DEAD refresh token...")
    # We try to use the blacklisted refresh token to get a new access token
    refresh_resp = requests.post(f"{BASE_URL}/token/refresh/", json={"refresh": refresh_token})

    if refresh_resp.status_code == 401: # Unauthorized
        print("✅ SUCCESS: The token was rejected! (401 Unauthorized)")
        print("\n🎉 SESSION SECURITY IS ACTIVE. Old tokens are destroyed forever.")
    else:
        print(f"❌ FAILURE: The token still works! Status: {refresh_resp.status_code}")
        print("⚠️  Security Risk: Blacklisting is NOT enabled correctly.")

if __name__ == "__main__":
    run_test()
