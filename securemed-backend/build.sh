#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Optional: Collect static files if you use Django Admin
python manage.py collectstatic --no-input
