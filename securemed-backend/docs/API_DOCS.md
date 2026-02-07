# API Endpoints Documentation

## Base URL
`http://localhost:8000/api/`

## Endpoints

### 1. List User's Consents
**GET** `/api/consents/`

Returns all consent records for the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "patient_username": "john_doe",
    "department": "Cardiology",
    "description": "Access to heart-related tests...",
    "is_granted": true,
    "expires_at": null,
    "created_at": "2026-01-30T10:00:00Z",
    "updated_at": "2026-01-30T10:00:00Z",
    "history": [
      {
        "id": 1,
        "action": "GRANTED",
        "timestamp": "2026-01-30T10:00:00Z",
        "actor_username": "john_doe"
      }
    ]
  }
]
```

### 2. Get Specific Consent
**GET** `/api/consents/{id}/`

Returns a single consent record.

### 3. Update Consent (Full)
**PUT** `/api/consents/{id}/`

Update all fields of a consent. Automatically creates history entry if `is_granted` changes.

**Request Body:**
```json
{
  "department": "Cardiology",
  "description": "Updated description",
  "is_granted": false,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

### 4. Partial Update Consent
**PATCH** `/api/consents/{id}/`

Update specific fields. Most commonly used to toggle `is_granted`.

**Request Body:**
```json
{
  "is_granted": false
}
```

**Response:** Same as GET, with new history entry added if `is_granted` changed.

### 5. Check Department Access
**GET** `/api/consents/check-access/{department}/`

Check if the authenticated user has active access to a specific department.

**Example:** `GET /api/consents/check-access/Cardiology/`

**Response:**
```json
{
  "department": "Cardiology",
  "has_access": true,
  "is_granted": true,
  "expires_at": null,
  "is_expired": false
}
```

### 6. Consent Summary
**GET** `/api/consents/summary/`

Get an overview of the user's consent status.

**Response:**
```json
{
  "total": 6,
  "granted": 5,
  "revoked": 1,
  "expired": 0,
  "active": 5
}
```

## Version Control Logic

When you update a consent's `is_granted` field:

1. The system automatically creates a `ConsentHistory` entry
2. Sets `action` to `'GRANTED'` or `'REVOKED'` based on the new state
3. Records the `actor` (user who made the change)
4. Timestamps the change

**Example Flow:**
```
1. User revokes Cardiology consent
   PATCH /api/consents/1/ { "is_granted": false }

2. System automatically:
   - Updates consent.is_granted = False
   - Creates history entry: action="REVOKED", actor=user

3. User re-grants consent later
   PATCH /api/consents/1/ { "is_granted": true }

4. System automatically:
   - Updates consent.is_granted = True
   - Creates history entry: action="GRANTED", actor=user
```

## Access Check Helper

The `check_access()` method returns `False` if:
- `is_granted` is `False`
- OR `expires_at` is in the past

Otherwise returns `True`.

This ensures expired consents are treated as denied even if `is_granted=True`.

## Authentication

All endpoints require authentication. Include session cookie or token in requests.
