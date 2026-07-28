# Security Hardening & CI/CD Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all high-severity findings from the comprehensive codebase audit (26 findings across security, CI/CD, code quality, and infrastructure).

**Architecture:** Direct fixes to backend Django views/serializers/models, Docker configuration, CI/CD workflows, and frontend configuration — no new components needed.

**Tech Stack:** Django, DRF, Next.js, Docker, GitHub Actions, PostgreSQL, Redis, Neo4j

---
## Already Completed (do not redo)

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Backend container runs as root → added `USER app` | `securemed-backend/Dockerfile` |
| 2 | RoleMiddleware blocks `doctor` role → accept both `doctor` and `provider` | `middleware.py` |
| 3 | Patient timeline missing access control → role-based filtering | `records/views.py` |
| 4 | `CSRF_COOKIE_HTTPONLY` → set to `False` for SPA | `config/settings.py` |
| 5 | CORS localhost origins always appended → gated by `DEBUG` | `config/settings.py` |
| 6 | Password reset token stored in plaintext → hashed with `SECRET_KEY` | `serializers.py`, `views.py` |
| 7 | Admin password reset leaks temp password → added security note | `views.py` |
| 8 | `ignoreBuildErrors: true` → `false` | `next.config.mjs` |
| 9 | Frontend Dockerfile duplicate `--gid` → removed duplicate | `Dockerfile` |
| 10 | `.gitignore` dead rules (`frontend/` → `securemed-frontend/`) | `.gitignore` |
| 11 | `package.json` name `my-v0-project` → `securemed-frontend` | `package.json` |
| 12 | Neo4j credential on CI command line → moved to env var | `e2e-tests.yml` |
| 13 | Backend CI missing lint step → added `ruff check .` | `backend-ci.yml` |

---

### Task 1: Remove Stale Docs/Test Files from Working Tree

**Files:**
- Delete: `ANALYSIS.md`, `CHANGELOG.md`, `IMPLEMENTATION_GUIDE.md`, `INTEGRATION_COMPLETION_REPORT.md`, `PROJECT_COMPLETION_SUMMARY.md`, `QUICK_REFERENCE.md`, `SUMMARY_REPORT.md`, `VERIFICATION.md`, `WORK_COMPLETED.txt`, `test-changes.sh`, `tests/run_all_tests.sh`
- Modify: `.gitignore` (add patterns if needed)

**Why:** These files are staged for deletion and unrelated to the app codebase — they are stale docs that were checked in by accident.

- [ ] **Step 1: Verify deletions are staged**

Run: `git diff --cached --name-status | grep '^D'`
Expected: The files above show as staged for deletion.

- [ ] **Step 2: Commit the deletions**

```bash
git commit -m "chore: remove stale documentation and test scaffolding files"
```

---

### Task 2: Remove `.bak` File and Backup Artifacts

**Files:**
- Delete: `securemed-backend/apps/accounts/patients/views.py.bak`

**Why:** Backup files should not be in the repo.

- [ ] **Step 1: Add `.bak` to `.gitignore`**

Add to `.gitignore`:
```
# Backup files
*.bak
```

- [ ] **Step 2: Remove and commit**

```bash
git rm securemed-backend/apps/accounts/patients/views.py.bak
git commit -m "chore: remove backup file, add *.bak to gitignore"
```

---

### Task 3: Redis Authentication in Docker Compose

**Files:**
- Modify: `docker-compose.yml`

**Issue:** Redis runs with no password. Any process on the host network can connect.

- [ ] **Step 1: Add Redis password via environment variable**

In the `redis` service:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  command: redis-server --requirepass ${REDIS_PASSWORD:-securemed_redis}
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-securemed_redis}", "ping"]
```

- [ ] **Step 2: Update backend environment to include Redis password**

Add to `backend.environment`:
```yaml
REDIS_PASSWORD: ${REDIS_PASSWORD:-securemed_redis}
```

Update `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` lines (they use redis URLs — either use the password in the URL or use a sentinel).

Actually simpler: keep the URL format with embedded password:
```yaml
CELERY_BROKER_URL: redis://:${REDIS_PASSWORD:-securemed_redis}@redis:6379/0
```

- [ ] **Step 3: Verify docker compose up starts Redis with auth**

Run: `docker compose config | grep -A10 redis`
Expected: Redis starts with `--requirepass` flag.

---

### Task 4: Add Rate Limiting to Emergency Endpoints

**Files:**
- Modify: `securemed-backend/apps/clinical/records/views.py`

**Issue:** `EmergencyCaseCreateView` and `EmergencyCaseStatusView` use `AllowAny` with no rate limiting.

- [ ] **Step 1: Add rate limit decorators**

```python
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class EmergencyCaseCreateView(...):
    ...

@method_decorator(ratelimit(key='ip', rate='10/m', method='GET', block=True), name='get')
class EmergencyCaseStatusView(...):
    ...
```

- [ ] **Step 2: Verify import exists**

Check that `django_ratelimit` is in `requirements.txt` and importable.

---

### Task 5: Secure Docker Compose Defaults

**Files:**
- Modify: `docker-compose.yml`

**Issue:** Hardcoded weak passwords (`securemed_db_password`, `securemed_graph`) in docker-compose defaults.

- [ ] **Step 1: Add security hardening sections**

Add to each service:
```yaml
security_opt:
  - no-new-privileges:true
```

Add network isolation:
```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

- [ ] **Step 2: Add resource limits**

```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

---

### Task 6: Frontend API Client Consolidation

**Files:**
- Cleanup: `securemed-frontend/lib/api-client.ts`
- Cleanup: `securemed-frontend/lib/api.ts`
- Modify: `securemed-frontend/lib/unified-api-client.ts`

**Issue:** Three API clients with different token strategies. 29 files still import the old `lib/api.ts`.

- [ ] **Step 1: Remove unused `lib/api-client.ts`**

```bash
git rm securemed-frontend/lib/api-client.ts
```

- [ ] **Step 2: Remove unused `lib/logger.ts`**

```bash
git rm securemed-frontend/lib/logger.ts
```

- [ ] **Step 3: Migrate 29 remaining files from `lib/api.ts` to `lib/unified-api-client.ts`**

Each file needs its import changed from:
```typescript
import api from '@/lib/api';
```
to:
```typescript
import { unifiedApiClient } from '@/lib/unified-api-client';
```

And method calls from:
```typescript
api.get('/endpoint');
```
to:
```typescript
unifiedApiClient.get('/endpoint');
```

List of files to migrate:
- `app/doctor/patients/page.tsx`
- `app/doctor/settings/page.tsx`
- `app/doctor/dashboard/page.tsx`
- `app/doctor/triage-inbox/page.tsx`
- `app/doctor/prescriptions/page.tsx`
- `app/doctor/labs/page.tsx`
- `app/lab-tests/page.tsx`
- `components/ui/command-palette.tsx`
- Various `components/portals/` files
- `components/portals/lab-technician-portal.tsx`

---

### Task 7: Remove Duplicate/Stale Frontend Files

**Files:**
- Delete: `securemed-frontend/styles/globals.css` (duplicate of `app/globals.css`)
- Delete: `securemed-frontend/hooks/use-toast.ts` or `components/ui/use-toast.ts` (duplicates)
- Delete: `securemed-frontend/hooks/use-mobile.ts` (unused, duplicate of `components/ui/use-mobile.tsx`)
- Delete: `securemed-frontend/services/patients.ts` (stale, `patients-new.ts` is the active one)

- [ ] **Step 1: Remove each duplicate file**

```bash
git rm securemed-frontend/styles/globals.css
git rm securemed-frontend/hooks/use-toast.ts
git rm securemed-frontend/hooks/use-mobile.ts
git rm securemed-frontend/services/patients.ts
```

- [ ] **Step 2: Update any imports that referenced the removed files**

Check for imports of:
- `@/hooks/use-toast` → should use `@/components/ui/use-toast`
- `@/services/patients` → should use `@/services/patients-new`

---

### Task 8: Commit All Changes

- [ ] **Step 1: Stage all modified files**

```bash
git add -A
```

- [ ] **Step 2: Commit**

```bash
git commit -m "fix: comprehensive security hardening and CI/CD improvements

- Secure backend Dockerfile: run as non-root user
- Hash password reset tokens before storage (SHA-256 + SECRET_KEY)
- Add access control to patient timeline endpoint
- Fix RoleMiddleware to accept 'doctor' and 'provider' roles
- Set CSRF_COOKIE_HTTPONLY=False for SPA compatibility
- Gate CORS localhost origins behind DEBUG mode
- Add lint step (ruff) to backend CI workflow
- Fix Neo4j credential leak in CI (env var not cmdline)
- Remove ignoreBuildErrors from Next.js config
- Fix frontend Dockerfile duplicate --gid flag
- Fix .gitignore dead rules (wrong directory paths)
- Rename package.json from my-v0-project to securemed-frontend
"
```
