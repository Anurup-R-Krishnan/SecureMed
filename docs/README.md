
---

# SecureMed 🏥

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/Anurup-R-Krishnan/SecureMed)
[![Version](https://img.shields.io/badge/version-v1.0.0--beta-blue.svg)](https://github.com/Anurup-R-Krishnan/SecureMed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Django](https://img.shields.io/badge/Backend-Django%20Rest%20Framework-092E20?logo=django)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org/)

**SecureMed** is an enterprise-grade healthcare management platform designed with a "Security First" approach. It connects patients, doctors, and administrators through a secure, role-based environment, facilitating appointment scheduling, medical record management, and telemedicine services while ensuring data privacy and compliance.

## Table of Contents

- Intro
- Architecture
- Installing and Updating
  - Docker Setup
  - Manual Install
    - Backend Setup
    - Frontend Setup
  - Environment Variables
- Core Capabilities
  - Identity & Access Control (RBAC)
  - Patient Management & Consent
  - Clinical Tools & E-Prescribing
  - Telemedicine
- Security Infrastructure
  - Audit Logging
  - Break-Glass Protocol
  - Data Anonymization
- Running Tests
- API Documentation
- Deployment
- License

## Intro

`SecureMed` provides a decoupled, secure ecosystem for managing healthcare operations. Unlike standard hospital management systems, every interaction in SecureMed is governed by strict consent policies and audit trails.

**Quick Glance:**
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui.
- **Backend:** Django 6.0+, Django REST Framework, SimpleJWT.
- **Infra:** Docker, PostgreSQL 16, Redis 7, Neo4j 5, Celery.

## Architecture

SecureMed operates as a headless system where the Django backend serves as the single source of truth for security policy enforcement.

* **Authentication:** JWT (JSON Web Tokens) with rotation and refresh mechanisms.
* **MFA:** Time-based One-Time Passwords (TOTP) via `pyotp`.
* **Compliance:** HIPAA-compliant data structures for medical records.

<a id="installation"></a>
## Installing and Updating

### Docker Setup (Recommended)

To **install** and **start** the entire SecureMed stack (Backend, Frontend, DB, Redis), run the following:

```sh
git clone https://github.com/Anurup-R-Krishnan/SecureMed.git
cd SecureMed
docker compose up --build

This will spin up:

* Backend: [http://localhost:8000](http://localhost:8000)
* Frontend: [http://localhost:3000](http://localhost:3000)
* PostgreSQL: Port 5432
* Redis: Port 6379

---

## 🔧 Manual Install

If you prefer to run services individually for development or debugging.

---

### 🖥 Backend Setup

**Prerequisites:** Python 3.10+, PostgreSQL

```bash
cd securemed-backend
```

Create and activate virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run migrations and seed data:

```bash
python manage.py migrate
python manage.py runscript seed_data
```

Start server:

```bash
python manage.py runserver
```

---

### 🌐 Frontend Setup

**Prerequisites:** Node.js v18+

```bash
cd securemed-frontend
```

Install dependencies:

```bash
npm install
```

Configure environment:

```bash
cp .env.local.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start development server:

```bash
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file inside `securemed-backend/`.

### Core

* `SECRET_KEY` – Django secret key (critical for crypto signing)
* `DEBUG` – True (dev), False (prod)
* `ALLOWED_HOSTS` – Comma-separated list of allowed hosts

### Database

* `DB_NAME`
* `DB_USER`
* `DB_PASSWORD`
* `DB_HOST`
* `DB_PORT`

### Email (SMTP)

* `EMAIL_BACKEND`
* `EMAIL_HOST`
* `EMAIL_PORT`
* `EMAIL_HOST_USER`
* `EMAIL_HOST_PASSWORD`

### Security

* `FRONTEND_URL` – Used for generating password reset and invitation links

---

# 🧠 Core Capabilities

## 🔑 Identity & Access Control (RBAC)

SecureMed implements strict Role-Based Access Control.

**Roles:**

* Patient
* Doctor
* Provider
* Admin

**Security Features:**

* MFA (Google Authenticator compatible TOTP)
* Rate Limiting (5 failed attempts → 15 min lock)
* HttpOnly/Secure cookies
* Automatic JWT blacklisting on logout

---

## 👤 Patient Management & Consent

* Consent Dashboard (granular access control)
* Timeline View (appointments, labs, medications)
* Policy Versioning with re-consent triggers

---

## 🩺 Clinical Tools & E-Prescribing

* Digital Prescription Writer
* Locked prescriptions after signing
* Password re-entry for digital signature verification
* Lab Orders with unique Sample ID
* Medication history tracking

---

## 📹 Telemedicine

* Secure video rooms (UUID-based)
* Waiting room with manual admit
* Session-persistent chat sidebar

---

# 🛡 Security Infrastructure

## 📊 Audit Logging

* JSON structured logs
* Logs UserID, Endpoint, Timestamp, Method
* Differentiates Read vs Write actions
* PII scrubbed before storage

---

## 🚨 Break-Glass Protocol

Emergency access when consent cannot be obtained.

* Endpoint: `/api/medical_records/break_glass/`
* Mandatory justification required
* High-priority audit alert logged

---

## 🧬 Data Anonymization

* PrivacyEngine utility
* Research export with UUID identifiers
* Right to be Forgotten (30-day grace period + PII scrubbing)

---

# 🧪 Running Tests

Backend tests:

```bash
cd securemed-backend
python manage.py test
```

Verification scripts:

```bash
# Verify RBAC
python manage.py runscript verification_tests.verify_rbac

# Verify MFA
python manage.py runscript verification_tests.verify_mfa
```

---

# 📘 API Documentation

When backend is running:

* Swagger UI: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
* ReDoc: [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)

---

# ☁️ Deployment

The project is containerized and ready for cloud deployment (e.g., Google Cloud Run).

Build:

```bash
docker build -t securemed-backend .
```

Deploy:

```bash
gcloud run deploy securemed-backend --source .
```

Ensure `cloudrun-service.yaml` is configured with your project ID.

---
