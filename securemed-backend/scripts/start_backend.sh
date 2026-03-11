#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/staticfiles /app/media

python manage.py migrate --noinput

if [ "${AUTO_SEED_INFECTION_TRACKING:-false}" = "true" ]; then
  # Never fail API startup if demo seeding dependencies (e.g. Neo4j warm-up) lag behind.
  if ! python manage.py ensure_infection_demo_data; then
    echo "WARN: Infection demo seeding failed; continuing backend startup."
  fi
fi

if [ "${DEV_SERVER:-false}" = "true" ]; then
  exec python manage.py runserver 0.0.0.0:8000
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --timeout 120 --workers 2
