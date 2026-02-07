"""
README for Consent Dashboard Backend

## Overview
This Django app implements Story 2.1: Consent Dashboard - a system for managing patient consent
to access their medical data across different hospital departments.

## Structure
- `models.py`: Consent and ConsentHistory models with unique_together constraint
- `admin.py`: Django admin configuration for managing consents
- `management/commands/seed_consents.py`: Command to seed default departments

## Default Departments
The system seeds 6 default departments for each patient:
1. Radiology - X-rays, CT scans, MRI reports
2. Oncology - Cancer treatment records
3. Cardiology - Heart-related tests and reports
4. Neurology - Brain and nervous system evaluations
5. Orthopedics - Bone and musculoskeletal records
6. Dermatology - Skin condition records

## Usage

### 1. Run Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Create Superuser
```bash
python manage.py createsuperuser
```

### 3. Seed Consents
```bash
# Seed for all users
python manage.py seed_consents

# Seed for specific user
python manage.py seed_consents --user john_doe
```

### 4. Run Development Server
```bash
python manage.py runserver
```

### 5. Access Admin Panel
Navigate to: http://localhost:8000/admin

## Models

### Consent
- **patient**: ForeignKey to User
- **department**: CharField (unique with patient)
- **description**: TextField
- **is_granted**: BooleanField (default=True)
- **expires_at**: DateTimeField (optional, for temporary access)
- **updated_at**: DateTimeField (auto)

### ConsentHistory
- **consent**: ForeignKey to Consent
- **action**: CharField (GRANTED/REVOKED/EXPIRED)
- **timestamp**: DateTimeField (auto)
- **actor**: ForeignKey to User (who made the change)

## Next Steps
- Create API views and serializers for frontend integration
- Implement consent expiration checking
- Add signals to auto-create history entries on consent changes
- Add webhook notifications for consent changes
"""
