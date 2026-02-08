# SecureMed - Product Requirements Document

## Overview
SecureMed is a secure healthcare management platform that connects patients with doctors for appointment booking, medical records management, and billing.

## User Roles
1. **Patient** - Can book appointments, view medical records, manage billing
2. **Doctor** - Can manage appointments, view patient records, update medical information
3. **Admin** - Can manage users, system settings, and access all features

## Core Features

### 1. Authentication
- User registration with email verification
- Login with username/password
- Multi-factor authentication (MFA) support
- JWT-based session management
- Role-based access control (RBAC)

### 2. Patient Portal
- **Dashboard**: Overview of upcoming appointments, recent records
- **Appointment Booking**: Search doctors by specialty, select date/time, book appointments
- **Medical Records**: View medical history, prescriptions, lab results
- **Billing**: View invoices, payment history

### 3. Doctor Portal
- View scheduled appointments
- Access patient medical records
- Update treatment notes

### 4. Admin Portal
- User management (create, edit, delete users)
- System configuration
- Audit logs

## Technical Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Django, Django REST Framework, PostgreSQL
- **Authentication**: JWT tokens with refresh mechanism

## Key User Flows

### Appointment Booking Flow
1. Patient logs in
2. Navigates to "Appointments" tab
3. Searches for doctors by specialty
4. Selects a doctor
5. Chooses available date and time slot
6. Confirms booking
7. Receives confirmation message

### Medical Records Flow
1. Patient logs in
2. Navigates to "Medical Records" tab
3. Views list of past records
4. Can download or view details of each record

## API Endpoints
- `POST /api/auth/login/` - User login
- `GET /api/appointments/doctors/` - List available doctors
- `POST /api/appointments/appointments/` - Create appointment
- `GET /api/medical-records/records/` - List medical records
