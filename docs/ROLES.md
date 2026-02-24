# SecureMed User Roles & Test Credentials

The database is seeded via `python manage.py seed_db --flush` with the following accounts.

**Default Password for ALL users**: `SecureMed@123`

## Quick Access Accounts

| Role | Email | Username | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@securemed.com` | `admin` | Full system access (Superuser) |
| **Doctor** | `dr.smith@securemed.com` | `dr.smith` | Cardiologist |
| **Doctor** | `dr.johnson@securemed.com` | `dr.johnson` | Neurologist |
| **Patient** | `rahul.verma@example.com` | `rahul.verma` | Hypertension |
| **Pharmacist** | `pharmacist@securemed.com` | `pharm.user` | Pharmacy management access |

## Departmental Doctors

| Specialization | Email | Name |
|----------------|-------|------|
| Cardiology | `dr.smith@securemed.com` | Dr. John Smith |
| Neurology | `dr.johnson@securemed.com` | Dr. Sarah Johnson |
| Pediatrics | `dr.williams@securemed.com` | Dr. David Williams |
| Orthopedics | `dr.brown@securemed.com` | Dr. Lisa Brown |
| Dermatology | `dr.davis@securemed.com` | Dr. James Davis |
| Cardiology | `dr.wilson@securemed.com` | Dr. Emma Wilson |
| General Medicine | `dr.kumar@securemed.com` | Dr. Rajesh Kumar |
| Psychiatry | `dr.patel@securemed.com` | Dr. Priya Patel |
| Radiology | `dr.chen@securemed.com` | Dr. Michael Chen |
| Pediatrics | `dr.gupta@securemed.com` | Dr. Anita Gupta |

## Patients

| Name | Email | City | Chronic Conditions |
|------|-------|------|--------------------|
| Rahul Verma | `rahul.verma@example.com` | Mumbai | Hypertension |
| Priya Singh | `priya.singh@example.com` | Delhi | Asthma |
| Vikram Patil | `vikram.patil@example.com` | Bangalore | Diabetes Type 2 |
| Sneha Reddy | `sneha.reddy@example.com` | Hyderabad | -- |
| Amit Kumar | `amit.kumar@example.com` | Chennai | Arthritis, High Cholesterol |
| Anjali Desai | `anjali.desai@example.com` | Pune | Migraine |
| Rohan Mehta | `rohan.mehta@example.com` | Kolkata | COPD |
| Kavita Nair | `kavita.n@example.com` | Kochi | -- |

## How to Reset Data
To flush the database and re-seed with fresh data, run:
```bash
python manage.py seed_db --flush
```
