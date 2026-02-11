# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────
# SecureMed Backend Dockerfile
# Django 6.0 on Python 3.13-slim
# ──────────────────────────────────────────────

FROM python:3.13-slim

# Environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# System deps (PostgreSQL client lib + gcc for psycopg2)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Python deps (cached layer)
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-compile -r requirements.txt

# Application code
COPY . .

# Directories for static / media
RUN mkdir -p /app/staticfiles /app/media

# Entrypoint script (migrations, collectstatic, seed, gunicorn)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app /app/staticfiles /app/media
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/')" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
