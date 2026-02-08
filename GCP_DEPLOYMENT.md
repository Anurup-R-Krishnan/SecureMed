# SecureMed GCP Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────┐  │
│  │ Cloud Run   │────▶│ Cloud Run   │────▶│ Cloud SQL    │  │
│  │ (Frontend)  │     │ (Backend)   │     │ (PostgreSQL) │  │
│  └─────────────┘     └─────────────┘     └──────────────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    │          │
│  ┌─────────────┐     ┌─────────────┐            │          │
│  │ Cloud CDN   │     │ Secret Mgr  │────────────┘          │
│  └─────────────┘     └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. GCP Project with billing enabled
2. `gcloud` CLI installed and authenticated
3. Enable required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## Step 1: Create Cloud SQL Instance

```bash
# Create PostgreSQL instance
gcloud sql instances create securemed-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_ROOT_PASSWORD

# Create database
gcloud sql databases create securemed --instance=securemed-db

# Create user
gcloud sql users create securemed_user \
  --instance=securemed-db \
  --password=YOUR_DB_PASSWORD
```

## Step 2: Configure Secrets

```bash
# Store secrets in Secret Manager
echo -n "your-secret-key" | gcloud secrets create django-secret-key --data-file=-
echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
echo -n "your-encryption-key" | gcloud secrets create encryption-key --data-file=-
```

## Step 3: Deploy Backend

```bash
cd securemed-backend

# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/securemed-backend

# Deploy to Cloud Run
gcloud run deploy securemed-backend \
  --image gcr.io/PROJECT_ID/securemed-backend \
  --platform managed \
  --region us-central1 \
  --add-cloudsql-instances PROJECT_ID:us-central1:securemed-db \
  --set-env-vars "DB_HOST=/cloudsql/PROJECT_ID:us-central1:securemed-db" \
  --set-secrets "SECRET_KEY=django-secret-key:latest,DB_PASSWORD=db-password:latest" \
  --allow-unauthenticated
```

## Step 4: Deploy Frontend

```bash
cd securemed-frontend

# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/securemed-frontend

# Deploy to Cloud Run
gcloud run deploy securemed-frontend \
  --image gcr.io/PROJECT_ID/securemed-frontend \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://securemed-backend-xxxx.run.app" \
  --allow-unauthenticated
```

## Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `SECRET_KEY` | Django secret | Secret Manager |
| `DB_PASSWORD` | Database password | Secret Manager |
| `DB_HOST` | Cloud SQL connection | Cloud SQL Proxy |
| `ENCRYPTION_KEY` | Field encryption | Secret Manager |

## Estimated Monthly Costs

| Service | Tier | Est. Cost |
|---------|------|-----------|
| Cloud Run (Backend) | 1 vCPU, 512Mi | ~$15-30 |
| Cloud Run (Frontend) | 1 vCPU, 256Mi | ~$10-20 |
| Cloud SQL | db-f1-micro | ~$10 |
| **Total** | | **~$35-60/mo** |
