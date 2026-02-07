# SecureMed Backend

Django REST API backend for SecureMed healthcare platform.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and configure your settings.

## Database

```bash
python manage.py migrate
python manage.py createsuperuser
```

## Development

```bash
python manage.py runserver
```

API will be available at [http://localhost:8000](http://localhost:8000)

## Frontend Repository

This backend serves the SecureMed frontend application. Configure CORS settings to allow requests from your frontend URL.
