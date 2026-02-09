# SecureMed 🏥

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yourusername/securemed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Django](https://img.shields.io/badge/Backend-Django%20Rest%20Framework-092E20?logo=django)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-2496ED?logo=docker)](https://www.docker.com/)

**SecureMed** is an enterprise-grade healthcare management platform designed with a "Security First" approach. It connects patients, doctors, and administrators through a secure, role-based environment, facilitating appointment scheduling, medical record management, and telemedicine services while ensuring data privacy and compliance.

---

## 📑 Table of Contents
- [Architecture & Security](#-architecture--security)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Setup (Recommended)](#option-1-docker-setup-recommended)
  - [Manual Setup](#option-2-manual-setup)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🛡 Architecture & Security

SecureMed is built as a decoupled application with a **Django REST Framework** backend and a **Next.js** frontend.

### Security Implementation
* **Authentication**: JWT (JSON Web Tokens) with automatic rotation and refresh mechanisms.
* **MFA (Multi-Factor Authentication)**: Integrated using `pyotp` for Time-based One-Time Passwords (TOTP).
* **RBAC (Role-Based Access Control)**: Strict permission enforcement via custom middleware to segregate Patient, Doctor, and Admin scopes.
* **Data Protection**:
    * Password hashing using PBKDF2.
    * Encrypted tokens for password resets (`secrets.token_urlsafe`).
    * Django Ratelimit to prevent brute-force attacks.
* **Compliance**: Designed with HIPAA-compliant data structures for medical records and consent management.

---

## 💻 Tech Stack

### Backend (Python/Django)
* **Framework**: Django 5.0+, Django REST Framework (DRF)
* **Auth**: `djangorestframework-simplejwt`, `pyotp`
* **Database**: PostgreSQL 15+ (via `psycopg2-binary`)
* **Task Queue**: Celery & Redis (for async notifications/emails)
* **Utilities**: `Pillow` (Imaging), `django-cors-headers`

### Frontend (TypeScript/Next.js)
* **Framework**: Next.js 14 (App Router)
* **Styling**: Tailwind CSS, generic CSS modules
* **UI Components**: Radix UI (Headless), Lucide React (Icons), Shadcn UI patterns
* **State & Forms**: `react-hook-form`, `zod` (Schema Validation)
* **Visualization**: `recharts`, `chart.js` (Medical analytics)
* **HTTP Client**: `axios`

---

## 🚀 Key Features

### 👤 Patient Portal
* **Dashboard**: Real-time health overview and "Health Score" tracking.
* **Appointments**: Book/Cancel slots based on doctor specialty and availability.
* **Records**: Securely view and download prescriptions and lab reports.
* **Consents**: Granular control over which departments can access medical data.

### 👨‍⚕️ Doctor Console
* **Worklist**: Manage daily appointment queues and patient triage.
* **EMR Access**: View patient history with active consent verification.
* **Prescription Writer**: Digital prescription generation with e-signatures.
* **Telemedicine**: Integrated chat/video consultation interface.

### 🛡 Admin Command Center
* **User Management**: Onboard staff and verify credentials.
* **Audit Logs**: Complete traceability of all system actions (Logins, Record Views).
* **Analytics**: Hospital-wide metrics on patient volume and revenue.

---

## ⚡ Getting Started

### Prerequisites
* Docker & Docker Compose (Recommended)
* **OR** Node.js v18+, Python 3.10+, PostgreSQL

### Option 1: Docker Setup (Recommended)
The project includes a `docker-compose.yml` for orchestrating the Backend, Frontend, Database, and Redis.

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/securemed.git](https://github.com/yourusername/securemed.git)
    cd securemed
    ```

2.  **Start Services**
    ```bash
    docker-compose up --build
    ```
    * Backend: `http://localhost:8000`
    * Frontend: `http://localhost:3000`

### Option 2: Manual Setup

#### Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd securemed-backend
    ```
2.  Create and activate virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure Database (in `.env`) and run migrations:
    ```bash
    python manage.py migrate
    ```
5.  Seed Initial Data (Roles, Admin):
    ```bash
    python manage.py runscript seed_data  # If using django-extensions
    # OR create superuser manually
    python manage.py createsuperuser
    ```
6.  Start Server:
    ```bash
    python manage.py runserver
    ```

#### Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd securemed-frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```
3.  Start Development Server:
    ```bash
    npm run dev
    ```

---
