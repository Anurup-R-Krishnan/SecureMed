# Patient Data Access Guide

## Authentication Required
All endpoints require authentication. Include the JWT token in headers:
```
Authorization: Bearer <your_token>
```

## Patient Data Endpoints

### 1. Patient Profile
```
GET /api/patients/profile/
```
Returns: Patient demographics, contact info, insurance, allergies, chronic conditions

```
PUT /api/patients/profile/
```
Update patient profile information

### 2. Patient Timeline (Aggregated View)
```
GET /api/patients/timeline/
```
Returns: Combined view of appointments, medical records, and lab tests sorted by date

### 3. Vital Signs (Heart Rate, BP, Weight)
```
GET /api/medical-records/vitals/
```
Returns: All vital sign records including heart rate, blood pressure, weight

```
POST /api/medical-records/vitals/
```
Body:
```json
{
  "heart_rate": 75,
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "weight": 70.5,
  "source": "patient"
}
```

### 4. Appointments
```
GET /api/appointments/appointments/
```
Returns: All appointments with doctor details, status, date/time

```
GET /api/appointments/appointments/{id}/
```
Returns: Specific appointment details

```
POST /api/appointments/appointments/
```
Create new appointment

### 5. Medical Records
```
GET /api/medical-records/records/
```
Returns: Consultations, lab reports, prescriptions, imaging, surgery records

```
GET /api/medical-records/records/{id}/
```
Returns: Specific medical record with diagnosis, treatment, notes

### 6. Prescriptions
```
GET /api/medical-records/prescriptions/
```
Returns: All prescriptions with medication, dosage, frequency, duration

### 7. Lab Tests
```
GET /api/labs/tests/
```
Returns: Lab test orders and results

### 8. Chat/Messaging
```
GET /api/telemedicine/conversations/
```
Returns: All conversations with doctors

```
GET /api/telemedicine/messages/?conversation={id}
```
Returns: Messages in a specific conversation

```
POST /api/telemedicine/messages/
```
Body:
```json
{
  "conversation": 1,
  "content": "Your message here"
}
```

### 9. Video Consultations
```
GET /api/telemedicine/rooms/
```
Returns: Video consultation rooms

```
POST /api/telemedicine/rooms/
```
Create new video consultation room

### 10. Dashboard Statistics
```
GET /api/medical-records/dashboard/stats/
```
Returns: Summary statistics for patient dashboard

## Example Usage

### Get All Patient Data (Python)
```python
import requests

BASE_URL = "http://localhost:8000"
TOKEN = "your_jwt_token"
headers = {"Authorization": f"Bearer {TOKEN}"}

# Get profile
profile = requests.get(f"{BASE_URL}/api/patients/profile/", headers=headers).json()

# Get vitals (heart rate, etc.)
vitals = requests.get(f"{BASE_URL}/api/medical-records/vitals/", headers=headers).json()

# Get appointments
appointments = requests.get(f"{BASE_URL}/api/appointments/appointments/", headers=headers).json()

# Get timeline (everything combined)
timeline = requests.get(f"{BASE_URL}/api/patients/timeline/", headers=headers).json()

# Get conversations/chat
conversations = requests.get(f"{BASE_URL}/api/telemedicine/conversations/", headers=headers).json()
```

### Get All Patient Data (JavaScript/Fetch)
```javascript
const BASE_URL = "http://localhost:8000";
const TOKEN = "your_jwt_token";
const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json"
};

// Get all data
const [profile, vitals, appointments, timeline, conversations] = await Promise.all([
  fetch(`${BASE_URL}/api/patients/profile/`, { headers }).then(r => r.json()),
  fetch(`${BASE_URL}/api/medical-records/vitals/`, { headers }).then(r => r.json()),
  fetch(`${BASE_URL}/api/appointments/appointments/`, { headers }).then(r => r.json()),
  fetch(`${BASE_URL}/api/patients/timeline/`, { headers }).then(r => r.json()),
  fetch(`${BASE_URL}/api/telemedicine/conversations/`, { headers }).then(r => r.json())
]);
```

## Data Models Reference

### VitalSign Model
- `heart_rate`: Integer (bpm)
- `systolic_bp`: Integer (mmHg)
- `diastolic_bp`: Integer (mmHg)
- `weight`: Float (kg)
- `source`: 'clinical' | 'patient' | 'device'
- `recorded_at`: DateTime

### Appointment Model
- `appointment_id`: String
- `patient`: Patient reference
- `doctor`: Doctor reference
- `appointment_date`: Date
- `appointment_time`: Time
- `status`: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
- `reason`: Text

### Message Model
- `conversation`: Conversation reference
- `sender`: User reference
- `content`: Text
- `is_read`: Boolean
- `created_at`: DateTime

### MedicalRecord Model
- `record_type`: 'consultation' | 'lab_report' | 'prescription' | 'imaging' | 'surgery' | 'discharge'
- `diagnosis`: Text
- `symptoms`: Text
- `treatment`: Text
- `notes`: Text
- `record_date`: Date
