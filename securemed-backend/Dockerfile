# ── Stage 1: Builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for psycopg2-binary, Pillow, ReportLab, cryptography
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc libpq-dev libjpeg62-turbo-dev zlib1g-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
COPY requirements/ requirements/

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Runtime native libs only (no compiler)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 libjpeg62-turbo && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r securemed && useradd -r -g securemed securemed

WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Create media directory
RUN mkdir -p /app/media && chown -R securemed:securemed /app/media

USER securemed

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
