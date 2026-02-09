#!/bin/bash
# SecureMed Post-Docker Setup Script
# Run this after docker compose up completes successfully

set -e

echo "================================================="
echo "SecureMed Post-Docker Setup"
echo "================================================="

# Step 1: Wait for database
echo
echo "[1/5] Waiting for database to be ready..."
sleep 5

# Step 2: Apply migrations
echo
echo "[2/5] Applying database migrations..."
docker compose exec -T backend python manage.py migrate

# Step 3: Create superuser if needed
echo
echo "[3/5] Creating superuser (if not exists)..."
docker compose exec -T backend python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@securemed.com').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@securemed.com',
        password='admin',
        first_name='Admin',
        last_name='User',
        role='admin'
    )
    print("✓ Superuser created")
else:
    print("✓ Superuser already exists")
EOF

# Step 4: Create pharmacist user
echo
echo "[4/5] Creating pharmacist user..."
docker compose exec -T backend python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='pharmacist@securemed.com').exists():
    pharmacist = User.objects.create_user(
        username='pharmacist',
        email='pharmacist@securemed.com',
        password='SecurePharm@2026!',
        first_name='Pharmacy',
        last_name='Staff',
        role='pharmacist'
    )
    print(f"✓ Pharmacist user created (ID: {pharmacist.id})")
    print("  Email: pharmacist@securemed.com")
    print("  Password: SecurePharm@2026!")
else:
    print("✓ Pharmacist user already exists")
EOF

# Step 5: Display service URLs
echo
echo "[5/5] Setup complete!"
echo
echo "================================================="
echo "Service URLs:"
echo "================================================="
echo "Backend API:    http://localhost:8000"
echo "Frontend:       http://localhost:3000"
echo "Django Admin:   http://localhost:8000/admin"
echo
echo "================================================="
echo "Credentials:"
echo "================================================="
echo "Admin:"
echo "  Email:    admin@securemed.com"
echo "  Password: admin"
echo
echo "Pharmacist:"
echo "  Email:    pharmacist@securemed.com"
echo "  Password: SecurePharm@2026!"
echo "================================================="
