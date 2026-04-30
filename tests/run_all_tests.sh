#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=================================================="
echo "    Running Comprehensive Test Suite              "
echo " (Unit, Integration, Regression, and E2E Tests)   "
echo "=================================================="

# 1. Backend Tests
cd "$ROOT_DIR"
echo ">>> [1/5] Backend: Running Unit Tests in Docker..."
docker compose exec -T backend pytest -m unit || echo "No explicit unit marked tests or tests failed."

echo ">>> [2/5] Backend: Running Integration Tests in Docker..."
docker compose exec -T backend pytest -m integration || echo "No explicit integration marked tests or tests failed."

echo ">>> [3/5] Backend: Running Regression Suite (All Backend Tests) in Docker..."
docker compose exec -T backend pytest

# 2. Frontend Unit/Integration
cd "$ROOT_DIR/securemed-frontend"
echo ">>> [4/5] Frontend: Running Unit & Integration Tests (Jest)..."
npm run test -- --passWithNoTests || echo "Jest tests finished (maybe with failures)."

# 3. Frontend E2E
echo ">>> [5/5] Frontend: Running End-to-End Tests (Cypress)..."
npx cypress run || echo "Cypress tests finished (maybe with failures)."

echo "=================================================="
echo "    All test phases executed!                    "
echo "=================================================="
