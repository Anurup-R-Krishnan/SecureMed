# RBAC Verification Guide

This guide provides instructions for verifying that Role-Based Access Control (RBAC) is functioning correctly in the SecureMed application.

## Task 1: Verify Seeded Roles

### Option A: Using the Verification Script

Run the verification script in Django shell:

```bash
cd backend
python manage.py shell < verify_rbac_roles.py
```

### Option B: Manual Shell Commands

Open Django shell and run commands manually:

```bash
cd backend
python manage.py shell
```

Then paste this code:

```python
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*60)
print("RBAC VERIFICATION - Seeded Roles and User Counts")
print("="*60 + "\n")

groups = Group.objects.all()

if not groups.exists():
    print("❌ No groups found! Database seeding may have failed.\n")
else:
    print(f"✅ Found {groups.count()} role(s):\n")
    
    for group in groups:
        user_count = group.user_set.count()
        users = group.user_set.all()
        
        print(f"📋 Role: {group.name}")
        print(f"   Users: {user_count}")
        
        if user_count > 0:
            print("   Members:")
            for user in users:
                print(f"      - {user.username} ({user.email})")
        else:
            print("   Members: None")
        print()

total_users = User.objects.count()
print(f"👥 Total users in system: {total_users}")

users_without_roles = User.objects.filter(groups__isnull=True).count()
if users_without_roles > 0:
    print(f"⚠️  Users without roles: {users_without_roles}")
else:
    print(f"✅ All users have assigned roles")

print("\n" + "="*60 + "\n")
```

### Expected Output

You should see output similar to:

```
============================================================
RBAC VERIFICATION - Seeded Roles and User Counts
============================================================

✅ Found 4 role(s):

📋 Role: Admin
   Users: 2
   Members:
      - admin1 (admin1@example.com)
      - admin2 (admin2@example.com)

📋 Role: Doctor
   Users: 3
   Members:
      - doctor1 (doctor1@example.com)
      - doctor2 (doctor2@example.com)
      - doctor3 (doctor3@example.com)

📋 Role: Nurse
   Users: 2
   Members:
      - nurse1 (nurse1@example.com)
      - nurse2 (nurse2@example.com)

📋 Role: Patient
   Users: 5
   Members:
      - patient1 (patient1@example.com)
      - patient2 (patient2@example.com)
      ...

👥 Total users in system: 12
✅ All users have assigned roles

============================================================
```

---

## Task 2: Test Role-Based Middleware

### Step 1: Update Test Credentials

Edit `backend/test_rbac.py` and update the credentials:

```python
TEST_CREDENTIALS = {
    "username": "doctor1",  # Use an actual doctor/nurse username from your database
    "password": "SecurePass123!"  # Use the actual password
}
```

### Step 2: Run the RBAC Test Script

Make sure the backend server is running, then:

```bash
cd backend
python test_rbac.py
```

### Expected Output (Success - RBAC Working)

```
======================================================================
RBAC VERIFICATION - Testing Role-Based Access Control
======================================================================

Step 1: Logging in as 'doctor1'...
✅ Login successful!
   User: doctor1
   Role: Doctor
   Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...

Step 2: Attempting to access admin-only endpoint...
   URL: http://localhost:8000/api/auth/admin-test/
   Response Status: 403

Step 3: Verifying RBAC enforcement...
✅ RBAC IS WORKING CORRECTLY!
   The server correctly returned 403 Forbidden.
   Non-admin users are blocked from accessing admin endpoints.

   Server Message: Access denied. Admin role required.

======================================================================
Test Complete
======================================================================

💡 To test admin access:
   1. Update TEST_CREDENTIALS to use an admin account
   2. Run this script again
   3. You should receive 200 OK with admin access granted
```

### Expected Output (Failure - RBAC Not Working)

```
❌ RBAC FAILURE!
   The server returned 200 OK - access was granted!
   This means the RBAC middleware is NOT working.
   Non-admin users should NOT be able to access this endpoint.
```

### Step 3: Test with Admin Account (Optional)

Update `test_rbac.py` credentials to use an admin account:

```python
TEST_CREDENTIALS = {
    "username": "admin1",
    "password": "SecurePass123!"
}
```

Run the script again. You should now see:

```
✅ Login successful!
   User: admin1
   Role: Admin
   ...

Step 2: Attempting to access admin-only endpoint...
   Response Status: 200

✅ Admin access granted!
```

---

## Test Endpoint Details

### Admin Test Endpoint

- **URL**: `http://localhost:8000/api/auth/admin-test/`
- **Method**: GET
- **Authentication**: Required (Bearer token)
- **Authorization**: Admin role only
- **Success Response** (200 OK):
  ```json
  {
    "message": "Admin access granted",
    "user": "admin1",
    "role": "Admin"
  }
  ```
- **Failure Response** (403 Forbidden):
  ```json
  {
    "error": "Access denied. Admin role required."
  }
  ```

---

## Cleanup (After Testing)

Once you've verified RBAC is working, you can optionally remove the test endpoint:

1. Remove `admin_test_view` function from `backend/authentication/views.py`
2. Remove the `admin-test/` URL from `backend/authentication/urls.py`
3. Delete `backend/test_rbac.py` and `backend/verify_rbac_roles.py`

---

## Troubleshooting

### No Groups Found

If the shell script shows "No groups found":
- Run database migrations: `python manage.py migrate`
- Run the seeding script to create roles and users
- Check that the `Group` model is properly configured

### Login Failed

If the test script shows "Login failed":
- Verify the username and password are correct
- Check that the user exists in the database
- Ensure the backend server is running on `localhost:8000`

### MFA Required

If login requires MFA:
- Use a test account without MFA enabled
- Or extend the script to handle the MFA flow

### Connection Error

If you see "Connection error":
- Make sure the Django backend is running: `python manage.py runserver`
- Verify the server is accessible at `http://localhost:8000`
