#!/bin/sh
set -e

echo "============================================"
echo "  SecureMed Backend — Starting up"
echo "============================================"

# -----------------------------------------------
# 1. Wait for PostgreSQL to be ready
# -----------------------------------------------
echo "[1/5] Waiting for database at ${DB_HOST:-db}:${DB_PORT:-5432}..."
while ! python -c "
import socket, sys, os
host = os.environ.get('DB_HOST', 'db')
port = int(os.environ.get('DB_PORT', '5432'))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.settimeout(2)
    s.connect((host, port))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    echo "  ...database not ready, retrying in 2s"
    sleep 2
done
echo "  ✓ Database is reachable"

# -----------------------------------------------
# 2. Apply database migrations
# -----------------------------------------------
echo "[2/5] Applying database migrations..."
python manage.py migrate --noinput
echo "  ✓ Migrations applied"

# -----------------------------------------------
# 3. Collect static files
# -----------------------------------------------
echo "[3/5] Collecting static files..."
python manage.py collectstatic --noinput
echo "  ✓ Static files collected"

# -----------------------------------------------
# 4. Seed data (only if SEED_DB=true)
# -----------------------------------------------
if [ "${SEED_DB:-false}" = "true" ]; then
    echo "[4/5] Seeding database..."
    python manage.py seed_db || echo "  ⚠ Seed command encountered an issue (may already be seeded)"
    echo "  ✓ Seed step complete"
else
    echo "[4/5] Skipping seed (set SEED_DB=true to seed)"
fi

# -----------------------------------------------
# 5. Start the application server
# -----------------------------------------------
echo "[5/5] Starting Gunicorn..."
echo "============================================"
echo "  SecureMed Backend is ready!"
echo "  Listening on 0.0.0.0:8000"
echo "============================================"

exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile - \
    config.wsgi:application
