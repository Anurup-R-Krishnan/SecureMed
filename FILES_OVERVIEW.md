# SecureMed — Files Overview 📁

Date: 2026-02-07

This document provides a concise overview of the main files and folders in the two primary directories: `securemed-backend` (Django) and `securemed-frontend` (Next.js + TypeScript). Use this as a quick orientation guide when navigating the repository.

---

## securemed-backend (Django) 🔐

- `ENV` / Config & manifests
  - `.env.example` — example environment variables and secrets template to copy for local development.
  - `.gitignore` — backend-specific ignores (venv, caches, DB, logs).

- Project & apps
  - `manage.py` — Django management CLI helper (runserver, migrations, etc.).
  - `config/` — Django project config (settings, wsgi/asgi, urls).
  - `authentication/` — authentication app: models, views, serializers, permissions, middleware, migrations and management commands for user auth, MFA, invitations, roles, etc.
  - `consents/` — consent management app: models, views and serializers for user consents & audit records.

- Databases & data exports
  - `db.sqlite3` — development SQLite DB (committed in this workspace; treat as data snapshot).
  - `research_export_20260207_004448.csv` — exported research data snapshot (CSV).
  - `VERIFIED_CERTIFICATE.pdf` — included certificate or attestation document.

- Tests / verification utilities
  - `test_privacy_engine.py`, `test_rbac.py` — unit/integration tests for privacy engine and RBAC.
  - `verify_*.py` (e.g., `verify_invitations.py`, `verify_jwt.py`, `verify_lockout.py`, `verify_logout.py`, `verify_mfa.py`, `verify_password_policy.py`, `verify_rbac_roles.py`, `verify_roles.py`, `verify_user_management.py`) — scripts/tests used to validate authentication, MFA, RBAC, and other security flows.
  - `create_test_users.py` — helper script to populate test accounts.

- Dependencies & docs
  - `requirements.txt` — pinned Python dependencies for the backend.
  - `docs/` — project documentation (MFA, RBAC verification guides, other operational docs).
  - `privacy_audit.log` — audit log for privacy-related events.

---

## securemed-frontend (Next.js + TypeScript) 🧭

- Environment & metadata
  - `.env.local.example` — example frontend environment variables.
  - `.gitignore` — frontend ignores (node_modules, .next, caches, envs).
  - `README.md` — frontend README with setup/build notes.

- App structure
  - `app/` — Next.js App Router pages and layout (routes such as `doctor`, `portal`, `register`, `settings` and global layout files).
  - `components/` — reusable React components (UI pieces, auth components, portals, layout components, etc.).
  - `components.json` — UI component metadata/config used by the project.
  - `context/` — React contexts (e.g., authentication context used across the app).
  - `hooks/` — custom React hooks (e.g., `use-mobile.ts`, `use-toast.ts`).
  - `lib/` — shared utilities and API wrappers (e.g., `api.ts`, `utils.ts`).

- Tooling & configuration
  - `package.json` — npm metadata, scripts, and dependencies for the frontend.
  - `pnpm-lock.yaml` and `package-lock.json` — lockfiles (pnpm lock is the canonical lock used here; `pnpm-lock.yaml` is committed and kept).
  - `next.config.mjs` — Next.js configuration.
  - `tsconfig.json` — TypeScript compiler options.
  - `postcss.config.mjs` — PostCSS / Tailwind / CSS pipeline config.
  - `styles/` — global and shared CSS styles (e.g., `globals.css`).

---

> Note: This overview focuses on top-level files and primary application folders. For deeper navigation, open the targeted folder and inspect its `README` or the module files (e.g., `authentication/views.py`, `app/page.tsx`) for implementation details.

---

## Detailed: `authentication/` (per-file) 🔎

- `__init__.py` — package marker for the `authentication` Django app.
- `admin.py` — custom Django admin for the `User` model; includes actions to unlock accounts and reset failed attempts.
- `apps.py` — `AppConfig` for registration of the `authentication` app.
- `middleware.py` — `RoleMiddleware` that enforces role-based route restrictions and performs JWT authentication fallback.
- `middleware_logging.py` — `PrivacyLoggingMiddleware` that logs authenticated access (only user ID) to `privacy_audit.log` for compliance.
- `migrations/` — DB migration files (0001..0005) introducing `User`, invitations, MFA recovery codes, deletion timestamps, and policy acceptance fields.
- `models.py` — `User` (custom `AbstractUser` with email-username, role, MFA, lockout, deletion fields) and `Invitation` model.
- `permissions.py` — DRF permission classes (e.g., `IsAdminUser`, `IsDoctor`, `IsPatient`, `IsDoctorOrPatient`).
- `serializers.py` — DRF serializers for registration, login, MFA flows, user management, and role updates.
- `views.py` — auth endpoints: register, login, MFA setup/verify/login/deactivate, user profile, invite endpoints, account deletion and policy acceptance, plus admin user management views.
- `urls.py` — URL routing for the authentication API (register, login, user, mfa, logout, invite, user management router).
- `utils.py` — helper utilities to generate PDF receipts/certificates (account deletion certificate, policy acceptance receipt).
- `management/commands/seed_users.py` — seeds default admin/doctor/patient users for development (with a default password).
- `management/commands/scrub_deleted_users.py` — scrub/anonymize PII for users whose deletion period elapsed (permanent deletion workflow).
- `tests.py` — test module (placeholder / test cases for authentication behaviors).

---

## Detailed: `app/` (per-file) 🔎

- `layout.tsx` — Root Next.js layout that wraps pages with `AuthProvider`, `SessionTimeout`, global fonts, `Toaster`, and `Analytics` metadata.
- `page.tsx` — Home/landing route; displays `LandingPage`, `LoginModal` for unauthenticated users and role-based `Patient`/`Doctor`/`Admin` portals when authenticated.
- `globals.css` — Global Tailwind + theme variables and CSS custom properties used across the frontend.
- `doctor/page.tsx` — Doctor-only route that enforces role-based redirect and renders `DoctorPortal` when authorized.
- `portal/page.tsx` — Patient portal route with redirects for role misalignment and renders `PatientPortal`.
- `register/page.tsx` — Registration route wrapper that renders `RegisterPage` and handles post-registration navigation.
- `settings/security/page.tsx` — Security settings UI: MFA setup, verification, deactivation, recovery codes management, with client-side calls to auth endpoints.

---

If you'd like, I can now:
1. Expand further into every file inside `components/` and `authentication/` submodules with short descriptions (more granular), or
2. Commit `FILES_OVERVIEW.md` to a branch and open a PR with the overview changes.

---

## Detailed: `authentication/` (migrations & management) 🔁

- `migrations/0001_initial.py` — initial migration creating `User` and related base tables.
- `migrations/0002_invitation.py` — adds the `Invitation` model and related fields.
- `migrations/0003_user_mfa_recovery_codes.py` — adds MFA recovery codes JSONField to `User`.
- `migrations/0004_user_deletion_requested_at.py` — adds `deletion_requested_at` for Right-to-be-Forgotten workflow.
- `migrations/0005_user_accepted_policy_version_user_policy_accepted_at.py` — adds policy acceptance tracking fields.
- `management/__init__.py` & `management/commands/__init__.py` — package markers for custom management commands.
- `management/commands/seed_users.py` — seeds default admin/provider/patient users for development and testing.
- `management/commands/scrub_deleted_users.py` — scrubs/anonymizes user PII after deletion grace period (production-safe cleanup).

---

## Detailed: `components/` (per-file) 🎛️

### `components/auth`
- `login-modal.tsx` — Login modal UI used across the site; handles credential submission, error states, and MFA flows.
- `mfa-setup.tsx` — Component for presenting TOTP QR codes and secret for MFA enrollment.
- `register-page.tsx` — Registration form that captures invite tokens, CAPTCHA, and handles client-side validation.
- `session-timeout.tsx` — Displays session expiration warnings and handles automatic logout/refresh.
- `terms-of-service-modal.tsx` — Terms of Service modal used during registration and policy acceptance flows.

### `components/layout`
- `header.tsx` — Global header/navigation component with login, portal switching and primary actions.

### `components/portals`
- `admin-portal.tsx` — Admin dashboard entry component and navigation for administrative tasks.
- `doctor-portal.tsx` — Wrapper for doctor-facing UI and navigation.
- `doctor-console.tsx` — Doctor console workspace (scheduling, patient triage interfaces).
- `patient-portal.tsx` — Wrapper for patient-facing UI and navigation.
- `doctor/emergency-access-modal.tsx` — Modal to handle emergency access workflows for clinicians.
- `doctor/my-patients-table.tsx` — Table component listing patients assigned to a provider.
- `doctor/patient-profile-view.tsx` — Detailed patient profile view used by doctors.
- `doctor/patient-timeline.tsx` — Event timeline of patient interactions and notes.
- `patient/appointment-booking.tsx` — UI for patients to book appointments.
- `patient/billing.tsx` — Billing and invoices UI for patients.
- `patient/dashboard.tsx` — Patient dashboard overview (appointments, messages, records).
- `patient/medical-records.tsx` — Medical records viewer and download/export actions.
- `patient/privacy-settings.tsx` — Patient privacy controls (consents, data deletion requests).

### `components/ui` (atomic & composite UI primitives)
- `accordion.tsx` — Collapsible accordion UI.
- `alert-dialog.tsx` — Confirmation / alert dialog wrapper.
- `alert.tsx` — Inline alert messaging component.
- `aspect-ratio.tsx` — Aspect ratio container component.
- `avatar.tsx` — User avatar component with fallback initials.
- `badge.tsx` — Small status/label badges.
- `breadcrumb.tsx` — Breadcrumb navigation component.
- `button-group.tsx` — Grouped buttons layout.
- `button.tsx` — Primary button component with variants.
- `calendar.tsx` — Calendar UI for date picking and scheduling.
- `card.tsx` — Card container component.
- `carousel.tsx` — Image/content carousel.
- `chart.tsx` — Lightweight chart wrapper (charting library integration).
- `checkbox.tsx` — Checkbox form control.
- `collapsible.tsx` — Collapsible content primitive.
- `command.tsx` — Command palette / quick actions UI.
- `context-menu.tsx` — Right-click context menu.
- `dialog.tsx` — Modal dialog wrapper.
- `drawer.tsx` — Slide-over drawer component.
- `dropdown-menu.tsx` — Dropdown menu primitive.
- `empty.tsx` — Empty state UI component.
- `field.tsx` — Form field wrapper with label/description.
- `form.tsx` — Form wrapper with validation helpers.
- `hover-card.tsx` — Card that appears on hover.
- `input-group.tsx` — Grouped input elements (prefixes/suffixes).
- `input-otp.tsx` — OTP input component for MFA codes.
- `input.tsx` — Text input component.
- `item.tsx` — Generic list item component for menus/lists.
- `kbd.tsx` — Keyboard key visual element.
- `label.tsx` — Form labels.
- `menubar.tsx` — Menubar / top navigation element.
- `navigation-menu.tsx` — Site navigation menu component.
- `pagination.tsx` — Pagination controls.
- `popover.tsx` — Popover primitive component.
- `progress.tsx` — Progress bar UI.
- `radio-group.tsx` — Radio button group component.
- `resizable.tsx` — Resizable container for panels.
- `scroll-area.tsx` — Custom scrollable area container.
- `select.tsx` — Select/dropdown control.
- `separator.tsx` — Visual separator line.
- `sheet.tsx` — Bottom sheet / panel UI.
- `sidebar.tsx` — Sidebar navigation layout.
- `skeleton.tsx` — Loading skeleton screens.
- `slider.tsx` — Range slider control.
- `sonner.tsx` — Sonner (toast system) wrapper/connector.
- `spinner.tsx` — Loading spinner.
- `switch.tsx` — Toggle switch control.
- `table.tsx` — Table/Datagrid primitive.
- `tabs.tsx` — Tabbed interface component.
- `textarea.tsx` — Multi-line text input.
- `toast.tsx` — Single toast message component.
- `toaster.tsx` — Toast manager / container (used in `layout.tsx`).
- `toggle-group.tsx` — Grouped toggle buttons.
- `toggle.tsx` — Toggle button primitive.
- `tooltip.tsx` — Tooltip primitive.
- `use-mobile.ts` — Hook to detect mobile viewport and behavior.
- `use-toast` — Hook wrapper around the toast/toaster system.

---

If you'd like, I can now:
1. Commit this expanded `FILES_OVERVIEW.md` to a branch and open a PR, or
2. Further expand each `components/ui/*` file with a 1–2 sentence note on where and how it's used in the app.

---

## Complete per-file index — securemed-backend 🧾

- `.env.example` — sample environment variables for local/dev configuration.
  - Purpose: Provides placeholders and example secrets used by `config/settings.py` to run locally.
  - Key usage: Copy to `.env` during local setup and fill in production values.
  - Notes: Contains sensitive keys; do not commit real secrets and rotate before production use.
  - Files referencing it: `config/settings.py`, management scripts.

- `.gitignore` — backend-specific ignore rules (venv, caches, DB files, logs).
  - Purpose: Prevents checked-in virtualenvs, compiled files, and sensitive artifacts.
  - Key entries: `env/`, `db.sqlite3`, `*.pyc`, `.pytest_cache/`.
  - Notes: Keep policies consistent with repo root `.gitignore` to avoid accidental commits.
  - Action: Review before adding new development artifacts.

- `manage.py` — Django CLI entrypoint for running server and management commands.
  - Purpose: Entrypoint to run `runserver`, `migrate`, `createsuperuser`, and custom commands.
  - Key usages: `python manage.py runserver`, `migrate`, `seed_users` command.
  - Notes: Uses `DJANGO_SETTINGS_MODULE` from environment; avoid running with production secrets locally.
  - Related: Management commands in `authentication/management/commands` and `consents/management/commands`.

- `requirements.txt` — Python package dependencies pinned for the backend.
  - Purpose: Lists exact package versions for reproducible environments.
  - Key packages: `Django`, `djangorestframework`, `djangorestframework-simplejwt`, `pyotp`, `reportlab`.
  - Notes: Use a virtual environment and pin updates carefully; run `pip install -r requirements.txt`.
  - Security: Regularly scan for vulnerable dependency versions.

- `db.sqlite3` — development SQLite DB snapshot (committed in repo).
  - Purpose: Local development database with seeded data for convenience.
  - Key content: Users, invitations, consents, and sample records.
  - Notes: Treat as test-only data; DO NOT use for production workloads.
  - Action: Consider adding to `.gitignore` if it contains sensitive samples.

- `privacy_audit.log` — privacy-focused access logs (generated by middleware).
  - Purpose: Stores privacy-conscious access logs (user ID & path) for audit and compliance.
  - Key usage: Written by `authentication/middleware_logging.py`.
  - Notes: Rotate and secure logs to avoid leakage of access patterns.
  - Compliance: Useful for GDPR/PDPA audits when combined with consent records.

- `VERIFIED_CERTIFICATE.pdf` — attestation or verification document included with the repo.
  - Purpose: Formal certificate or audit-proof artifact for compliance records.
  - Notes: Typically static; include in docs or disclosure as needed.
  - Usage: May be referenced in operational docs under `docs/`.
  - Security: Store securely if it contains sensitive data about audits.

- `research_export_20260207_004448.csv` — exported research data CSV.
  - Purpose: Snapshot of anonymized research/export data for analyses.
  - Key fields: pseudonymized patient IDs, consent status, minimal clinical fields.
  - Notes: Verify anonymization and consent before external sharing.
  - Action: Remove or redact if it contains PII before publishing.


Apps & core config

- `config/__init__.py` — package marker for Django project config (empty).
  - Purpose: Marks `config` as a Python package.
  - Notes: No runtime logic; safe to import.
  - Usage: `DJANGO_SETTINGS_MODULE` points to `config.settings`.
  - Best practice: Keep small and focused.

- `config/asgi.py` — ASGI entry for async servers.
  - Purpose: Exposes ASGI callable for servers like Daphne/Uvicorn.
  - Key values: Imports `get_asgi_application` and sets up middleware.
  - Notes: Setup for WebSocket or background async features.
  - Deploy: Required for async-capable deployments.

- `config/wsgi.py` — WSGI entry for synchronous deployments.
  - Purpose: Standard WSGI callable for Gunicorn/uwsgi deployments.
  - Notes: Keep it minimal, delegate heavy lifting to app code.
  - Usage: Commonly referenced by PaaS configurations.
  - Security: Ensure proper environment variables are used in production.

- `config/settings.py` — main Django settings (database, installed apps, middleware, security settings).
  - Purpose: Central config for databases, installed apps, middleware, static files, security headers.
  - Key settings: `AUTH_USER_MODEL`, `REST_FRAMEWORK`, JWT settings, `LATEST_POLICY_VERSION`.
  - Notes: Avoid committing secrets; prefer environment-driven overrides via `.env`.
  - Action: Review allowed hosts and CORS for production readiness.

- `config/urls.py` — top-level URL routing (includes app routes and admin).
  - Purpose: Registers app routes including `authentication`, `consents`, `appointments`, etc.
  - Key patterns: `api/`, `admin/`, health check endpoints.
  - Notes: Ensure sensitive admin endpoints are protected behind auth & network controls.
  - Testing: Useful to confirm route availability during integration tests.


Authentication app (files summarized earlier, expanded below)

- `authentication/__init__.py` — package marker.
  - Purpose: Marks `authentication` as an installed app package.
  - Notes: Import-safe; typically empty.
  - Usage: Referenced in `INSTALLED_APPS` in `config/settings.py`.
  - Best practice: Keep small and avoid side-effects.

- `authentication/admin.py` — admin customization for `User`.
  - Purpose: Adds admin list displays, filters, and admin actions for unlocking and resetting attempts.
  - Key features: `unlock_accounts` action, `is_locked_display` helper.
  - Notes: Admin actions must be audited; UI helps admins safely manage accounts.
  - Security: Restrict admin access and log changes.

- `authentication/apps.py` — `AppConfig` for authentication app.
  - Purpose: Provides app metadata and default auto field.
  - Notes: Minimal; used by Django automatically.
  - Usage: Included in `INSTALLED_APPS`.
  - Extensibility: Hook for app-ready signals if needed.

- `authentication/middleware.py` — `RoleMiddleware` enforcing route-level role checks.
  - Purpose: Parses JWT if necessary and blocks access depending on `request.user.role` and path prefixes.
  - Key checks: `/api/doctor/` => provider only; `/api/patient/` => patient only; `/api/admin/` => admin only.
  - Notes: Middleware logs checks; keep performance in mind for heavy traffic.
  - Testing: Cover role edge cases and Anonymous access.

- `authentication/middleware_logging.py` — `PrivacyLoggingMiddleware` for privacy-aware access logs.
  - Purpose: Logs authenticated access with minimal PII (user ID, path, method) to `privacy_audit.log`.
  - Key behavior: Only logs for authenticated users to preserve privacy.
  - Notes: Ensure that logs are rotated/encrypted per compliance policy.
  - Use case: Audit trails for compliance and incident investigation.

- `authentication/migrations/0001_initial.py` — creates `users` table and base auth schema.
  - Purpose: Initial schema for custom `User` model and related tables.
  - Important changes: `AUTH_USER_MODEL` referenced tables and indices.
  - Notes: Migration must be applied in all environments in order.
  - Rollbacks: Use with caution; test in staging.

- `authentication/migrations/0002_invitation.py` — adds `Invitation` model.
  - Purpose: Introduces invite-only registration tokens and fields for tracking usage.
  - Key columns: `token` (UUID), `expires_at`, `is_used`, `used_by` (FK to User).
  - Notes: Invitation expiry is set to 48 hours by default in model save.
  - Tests: Verify invite validation logic under edge cases.

- `authentication/migrations/0003_user_mfa_recovery_codes.py` — MFA recovery codes field.
  - Purpose: Adds JSONField to store hashed recovery codes per user.
  - Behavior: Stores one-time recovery codes used for MFA fallback.
  - Notes: Codes should be hashed and invalidated on use.
  - Security: Ensure field is not exposed via APIs.

- `authentication/migrations/0004_user_deletion_requested_at.py` — deletion request timestamp.
  - Purpose: Adds `deletion_requested_at` to support Right-to-be-Forgotten workflow.
  - Business logic: Triggers `scrub_deleted_users.py` after a 30-day grace period.
  - Notes: Deactivation vs permanent deletion are separate processes.
  - Compliance: Useful for retention and regulatory audits.

- `authentication/migrations/0005_user_accepted_policy_version_user_policy_accepted_at.py` — policy acceptance tracking.
  - Purpose: Stores the policy version a user accepted and a timestamp.
  - Usage: Used to enforce policy acceptance for login flows (forces acceptance if outdated).
  - Notes: Keep `LATEST_POLICY_VERSION` in `settings` to roll out updates.
  - Auditing: Policy receipts are generated by `utils.generate_policy_receipt`.

- `authentication/migrations/0006_user_users_email_4b85f2_idx_and_more.py` — index and cleanup patch.
  - Purpose: Adds indices and minor DB optimizations for `users.email`.
  - Notes: Improves lookup performance for email-based login.
  - Migration caution: Should be fast in production; monitor for lock time.
  - Testing: Verify queries use new index in profiling.

- `authentication/models.py` — `User` and `Invitation` models with full auth features.
  - Purpose: Implements a custom `User` with email-as-username, roles, MFA fields, lockout, and deletion flow.
  - Key methods: `is_account_locked`, `unlock_account`, `Invitation.is_valid`, `Invitation.mark_as_used`.
  - Notes: `USERNAME_FIELD = 'email'` and `REQUIRED_FIELDS` adjusted for registration.
  - Security: Ensure sensitive fields (`mfa_secret`) are not echoed to clients.

- `authentication/permissions.py` — DRF permission classes for role checks.
  - Purpose: `IsAdminUser`, `IsDoctor`, `IsPatient`, `IsDoctorOrPatient` used in views.
  - Behavior: `has_permission` checks `request.user.role` and authentication state.
  - Notes: Keep permission logic simple and test edge cases.
  - Usage: Applied on view-based endpoints requiring role restrictions.

- `authentication/serializers.py` — DRF serializers for registration, login, and MFA flows.
  - Purpose: Validate inputs (password policy, CAPTCHA), serialize user objects, and manage MFA flows.
  - Key validators: password strength, captcha server-side verification, OTP/recovery code validation.
  - Notes: Serializer errors are used directly in API responses.
  - Security: Do not include `mfa_secret` in responses; ensure write-only password fields.

- `authentication/views.py` — list of auth endpoints and business logic.
  - Purpose: Implements registration, login, MFA setup/verify/login/deactivate, policy acceptance, user management.
  - Key functions/classes: `register_view`, `login_view`, `mfa_setup_view`, token generation helpers.
  - Notes: Includes detailed audit logging during registration and token verification with robust error handling.
  - Tests: Covered by `verify_*.py` scripts and unit tests.

- `authentication/urls.py` — register routes for authentication APIs.
  - Purpose: Maps endpoints like `register/`, `login/`, `mfa/*`, `invite/*`, and user management router.
  - Notes: Keep consistent naming and include versioning if necessary in future.
  - Integration: Included in `config/urls.py` under API path.
  - Testing: Route availability validated by integration tests.

- `authentication/utils.py` — PDF generation helpers for deletion certificates and policy receipts.
  - Purpose: Create downloadable PDF receipts using `reportlab` for legal/operational needs.
  - Key functions: `generate_deletion_certificate`, `generate_policy_receipt` with stylized templates.
  - Notes: Uses `user` object timestamps and hashes; ensure no PII leakage in PDFs beyond consented fields.
  - Action: Buffer returned as `BytesIO` for streaming downloads.

- `authentication/management/commands/seed_users.py` — seeds default users for dev/test.
  - Purpose: Create admin, doctor, and patient users with default passwords for local testing.
  - Behavior: Idempotent get_or_create semantics; prints credentials when created.
  - Notes: Default password should be rotated and not used in production.
  - Use: Run `python manage.py seed_users` during dev setup.

- `authentication/management/commands/scrub_deleted_users.py` — scrub/anonymize PII after deletion grace period.
  - Purpose: Permanently anonymize and disable accounts that passed deletion grace.
  - Actions: Rewrites username/email, removes password, clears MFA secrets and recovery codes.
  - Notes: Irreversible; ensure policy and notice procedures are followed before running.
  - Automation: Suitable for scheduled cron via management command.

- `authentication/tests.py` — placeholder for authentication unit tests.
  - Purpose: Host unit/integration tests for auth behaviors.
  - Notes: Keep tests fast and focused; cover edge cases like lockout, MFA, and invitation flows.
  - Action: Extend with fixtures and test cases as features grow.
  - Integration: Run via `pytest` or `manage.py test` depending on setup.


Consents app

- `consents/__init__.py` — package marker for the `consents` app.
  - Purpose: Marks module as a Django app package.
  - Notes: No side effects expected.
  - Usage: Included in `INSTALLED_APPS`.
  - Best practice: Keep lightweight.

- `consents/models.py` — models for consent records and audit.
  - Purpose: Store user consent versions, timestamps, and metadata for research exports.
  - Key fields: `user`, `policy_version`, `accepted_at`, `consent_id` (hash).
  - Notes: Ensure strict access controls for consent data and PII.
  - Audit: Tightly coupled with `utils.generate_policy_receipt`.

- `consents/serializers.py` — DRF serializers for consent endpoints.
  - Purpose: Validate consent acceptance payloads and serialize consent records.
  - Notes: Avoid exposing unnecessary PII in API responses.
  - Usage: Used by consent endpoints and admin exports.
  - Testing: Verify acceptance and receipt generation workflows.

- `consents/views.py` — API endpoints for consent capture, export, and management.
  - Purpose: Endpoints include accept policy, list consent history, export research-ready datasets.
  - Security: Ensure exports respect consent scopes and anonymization rules.
  - Notes: Use permission checks to restrict exports to admins/research roles.
  - Integration: Works with `consents/management/commands/export_research_data.py`.

- `consents/urls.py` — API routes for consent-related endpoints.
  - Purpose: Route mapping for consent acceptance and admin export actions.
  - Notes: Keep routes RESTful and versioned as needed.
  - Testing: End-to-end tests should assert routing and permissions.
  - Integration: Included in project API router.

- `consents/utils.py` — export helpers and CSV generation logic.
  - Purpose: Create safe, anonymized CSVs and metadata for research exports.
  - Key considerations: Pseudonymization, field selection, and consent filtering.
  - Notes: Use `management/commands/export_research_data.py` to drive exports.
  - Security: Ensure exports are written to secured storage.

- `consents/management/commands/export_research_data.py` — CLI job to export consent-filtered datasets.
  - Purpose: Generate CSVs for research teams while respecting consent flags and retention.
  - Behavior: Filters records based on consent and anonymization rules, outputs to project root.
  - Notes: Intended for scheduled or ad-hoc use by admins; ensure proper access control.
  - Testing: Validate outputs against expected pseudonymization rules.

- `consents/management/commands/seed_consents.py` — seed consents for dev/testing.
  - Purpose: Populate test consent records consistent with seeded users.
  - Notes: Useful when running local demos or smoke tests.
  - Action: Run after `seed_users` during development setup.
  - Integration: Ensures test research exports have consistent data.

- `consents/README.md` — documentation on consent model and compliance.
  - Purpose: Operational notes on consent handling, retention policies, and export procedures.
  - Notes: Contains links to `docs/` and verification guides.
  - Action: Keep updated as policies evolve.
  - Audience: Privacy engineers and compliance reviewers.


Appointments app

- `appointments/__init__.py` — package marker.
  - Purpose: Marks the appointments module as a package.
  - Notes: Minimal.
  - Usage: Registered in `INSTALLED_APPS`.
  - Testing: Module-level tests located in `appointments/tests.py`.

- `appointments/models.py` — appointment scheduling models.
  - Purpose: Define appointment slots, status, and relations to patients and providers.
  - Key fields: `patient`, `provider`, `start_time`, `end_time`, `status`.
  - Notes: Ensure timezone-aware datetimes and availability logic.
  - Validation: Enforce no-overlap and slot booking rules.

- `appointments/views.py` — booking and listing endpoints.
  - Purpose: API endpoints for patients to book and providers to manage appointments.
  - Notes: Apply role-based permissions; doctors see their assigned appointments.
  - Security: Prevent unauthorized booking for others' slots.
  - Integration: Works with frontend booking UI components.

- `appointments/admin.py` — admin registrations for appointment models.
  - Purpose: Expose appointment models in Django admin for management and audits.
  - Notes: Provide filters by date, provider, and status.
  - Action: Admins can cancel or reschedule appointments.
  - Audit: Keep a clear history for patient-facing operations.


Patients app

- `patients/__init__.py` — package marker.
  - Purpose: Package indicator for patient-related models/views.
  - Notes: No runtime code.
  - Usage: Referenced in `INSTALLED_APPS`.
  - Tests: `patients/tests.py` contains behavior tests.

- `patients/models.py` — patient profile and PII-related models.
  - Purpose: Store demographic information, contact methods, emergency contacts.
  - Key fields: `user` FK, medical IDs, contact preferences.
  - Notes: Sensitive PII should be handled per retention policies and scrubbed when requested.
  - Integration: Ties into `medical_records` and `appointments`.

- `patients/views.py` — patient-facing APIs like profile retrieval and updates.
  - Purpose: Endpoints to view/update patient details and preferences.
  - Notes: Enforce `IsPatient` permission where required.
  - Security: Validate ownership and return minimal PII in responses.
  - Tests: Cover profile update, privacy settings, and deletion requests.

- `patients/admin.py` — admin registration for patient models.
  - Purpose: Admin interface for reviewing and managing patient records.
  - Notes: Sensitive fields protected by admin permissions.
  - Action: Auditable changes only via admin actions.


Medical Records app

- `medical_records/__init__.py` — package marker.
  - Purpose: Contains models and views for storing clinical documents.
  - Notes: Treat file attachments as sensitive and store them securely.
  - Integration: Linked to `patients` and consent checks.
  - Tests: `medical_records/tests.py` for privacy and access rules.

- `medical_records/models.py` — models for clinical notes, attachments, and metadata.
  - Purpose: Store medical records with audit timestamps and uploader references.
  - Key behavior: Attachments with content-type and size limits.
  - Notes: Implement strict access control and logging on access.
  - Compliance: Anonymize or redact as required for research exports.

- `medical_records/views.py` — retrieval and download endpoints with audit logging.
  - Purpose: APIs for clinicians to view records and download attachments.
  - Notes: Access logged via `middleware_logging` to `privacy_audit.log`.
  - Security: Enforce RBAC—doctors only for assigned patients; patients can view their records.
  - Testing: Ensure proper authorization and audit trail creation.

- `medical_records/admin.py` — admin interfaces for record oversight.
  - Purpose: Admin views for attachment moderation and retention management.
  - Notes: Limit who can permanently delete or export records.
  - Action: Provide conservative access controls for retention policies.


Billing app

- `billing/__init__.py` — package marker.
  - Purpose: Billing module for invoices and payments.
  - Notes: Integrate with payment processors through server-side services.
  - Testing: Ensure invoice calculations and status transitions are correct.
  - Audit: Keep payment logs secure.

- `billing/models.py` — invoice and payment models.
  - Purpose: Store invoice items, totals, status, and related patient/provider.
  - Notes: Ensure currency and precision handling is consistent.
  - Security: PCI data should never be stored raw in repo.
  - Integration: Expose minimal invoice queries to patient UIs.

- `billing/views.py` — endpoints to list and query invoices and payment status.
  - Purpose: Patient-facing invoices and admin billing dashboards.
  - Notes: Restrict access and ensure data consistency.
  - Testing: Verify transitions like `paid`/`disputed`.

- `billing/admin.py` — admin registration for invoices.
  - Purpose: Admin-side oversight of billing workflows and reconciliation.
  - Notes: Provide filters and exports for accounting.


Departments app

- `departments/__init__.py` — package marker.
  - Purpose: Grouping of provider specialties and departments.
  - Notes: Simple lookup tables used across scheduling UIs.
  - Tests: Validate list and CRUD behaviors.

- `departments/models.py` — department and specialty models.
  - Purpose: Store department names, slugs, and metadata for provider assignment.
  - Notes: Useful for filtering providers in booking flows.
  - Integration: Connected to provider profiles.

- `departments/views.py` — listing and admin CRUD for departments.
  - Purpose: APIs expose departments and specialties for UI selection.
  - Notes: Typically read-heavy and cached.

- `departments/admin.py` — admin interface for departments.
  - Purpose: Allow admins to maintain department lists.
  - Notes: Keep it limited to privileged roles.


Documentation & verification

- `docs/` — contains operational and developer docs (API_DOCS.md, INVITATION_VERIFICATION.md, MFA_* scripts, MIGRATION_COMMANDS.md, RBAC_VERIFICATION.md, RECOVERY_CODES_MIGRATION.md).
  - Purpose: Central place for developer and operational runbooks and migration notes.
  - Notes: Keep updated with breaking changes and migrations.
  - Action: Update docs when changing auth or data models.
  - Audience: developers, devops, privacy officers.

- `verify_*.py` scripts — various verification scripts for auth, MFA, lockout, RBAC, and logout flows.
  - Purpose: Quick scripts to exercise and validate critical security flows.
  - Notes: Useful during manual test runs and CI smoke tests.
  - Action: Integrate important verifications into CI if stable.
  - Security: Ensure scripts do not leak secrets when run.

- `create_test_users.py` — convenience script to create many test accounts.
  - Purpose: Generate bulk test users for simulations or load testing.
  - Notes: Use only in non-production environments and delete test accounts after use.
  - Integration: Useful for frontend demo datasets.

- `test_privacy_engine.py`, `test_rbac.py` — automated tests validating core privacy and role behavior.
  - Purpose: Ensure privacy protections and RBAC constraints remain enforced.
  - Notes: Keep tests fast and deterministic.
  - Action: Run regularly in CI.



---

## Complete per-file index — securemed-frontend 🧾

Root & tooling

- `.env.local.example` — example .env for frontend runtime variables.
  - Purpose: Shows environment variables required for local dev (API endpoints, feature flags).
  - Usage: Copy to `.env.local` and fill values for local testing; kept out of version control.
  - Notes: Do not commit real secrets or production keys.
  - Integration: Read by `next` at runtime and build time.

- `.gitignore` — frontend-specific ignore rules (node_modules, .next, caches, envs).
  - Purpose: Keeps build artifacts, node modules, and caches out of the repo.
  - Important entries: `/node_modules`, `/.next/`, `pnpm-lock.yaml` kept (do NOT ignore).
  - Notes: Maintains consistency with monorepo root policies.
  - Action: Update when introducing new tooling that generates files.

- `package.json` — front-end metadata, scripts, and dependencies.
  - Purpose: Defines scripts like `dev`, `build`, `start`, and lists dependencies.
  - Key scripts: `dev` (local dev server), `build` (production bundle), `lint`, `format`.
  - Notes: Keep dependency versions compatible with the rest of the monorepo.
  - Action: Use `pnpm` for installs and prefer `pnpm-lock.yaml`.

- `pnpm-lock.yaml` — pnpm lockfile (canonical lock for this project).
  - Purpose: Ensures deterministic installs across machines and CI.
  - Notes: Commit this file; it is the single source of truth for frontend packages.
  - Security: Scan for vulnerable packages using `pnpm audit` or CI tools.
  - Action: Update lockfile when bumping deps.

- `package-lock.json` — secondary lock (may exist from npm installs).
  - Purpose: Legacy artifact if `npm` was used; not canonical here.
  - Notes: Prefer using `pnpm-lock.yaml`; consider removing stale `package-lock.json` if unused.
  - Action: Keep repo clean to avoid conflicting lockfiles.

- `next.config.mjs` — Next.js configuration.
  - Purpose: Customizes Next.js behavior: images, rewrites, and environment handling.
  - Notes: Add secure headers or redirects to support deployment platforms.
  - Action: Check builds after changes that affect routing.

- `postcss.config.mjs` — PostCSS/Tailwind configuration.
  - Purpose: Configures Tailwind and PostCSS plugins used in CSS pipeline.
  - Notes: Keep in sync with `tailwind.config` (if present) and design tokens.
  - Action: Update when adding CSS tooling or post-processing steps.

- `tsconfig.json` — TypeScript compiler options.
  - Purpose: Defines path aliases (`@/...`), strictness rules, and target settings.
  - Notes: Keep strict mode on where possible; update paths when adding new folders.
  - Action: Re-run type checks when modifying base options.

- `README.md` — frontend README with setup and development notes.
  - Purpose: Provides contributor setup, scripts, and common troubleshooting steps.
  - Notes: Keep updated when onboarding or adding CI steps.
  - Action: Link to root README for monorepo conventions.

- `components.json` — UI component metadata used by tooling or docs.
  - Purpose: Holds component registry or design system configuration.
  - Notes: Used by storybook-like tooling or component discovery scripts.
  - Action: Keep in sync with component changes.


App & lib

- `app/layout.tsx` — root layout wrapping pages and providing global context.
  - Purpose: Adds global providers (`AuthProvider`), `Toaster`, analytics and fonts.
  - Key components: `SessionTimeout`, `Toaster`, `AuthProvider`.
  - Notes: Keep layout minimal to avoid heavy client bundles.
  - Testing: Ensure providers behave correctly across nested routes.

- `app/page.tsx` — homepage / landing flow with auth-based routing.
  - Purpose: Shows landing page or role-based portal depending on auth state.
  - Behavior: Renders `LandingPage`, `LoginModal`, or role-specific portals (patient, provider, admin).
  - Notes: Avoid heavy data fetching on the root; prefer incremental loading.
  - Testing: Cover portal routing on role changes and logout.

- `app/doctor/page.tsx` — doctor-specific route and checks.
  - Purpose: Ensures only `provider` role can access doctor UI and redirects otherwise.
  - Behavior: Uses `useAuth` and `useRouter` for guard logic.
  - Notes: Keep redirects client-side or implement server guards for SSR if needed.
  - Testing: Validate redirect flows for unauthenticated and wrong-role users.

- `app/portal/page.tsx` — patient portal route wrapper.
  - Purpose: Enforces patient role routing and renders `PatientPortal`.
  - Behavior: Redirects doctors to `/doctor` and others to home.
  - Notes: Uses `isAuthenticated` to delay render until auth resolved.
  - Testing: Verify correct fallback behavior when auth is loading.

- `app/register/page.tsx` — registration route wrapper.
  - Purpose: Render `RegisterPage` and handle redirect on success.
  - Notes: Accepts invite tokens and validates client side before submission.
  - UX: Provide helpful errors for invite token mismatches.

- `app/settings/security/page.tsx` — security settings and MFA UI.
  - Purpose: Full client UI for MFA setup, verification, recovery codes and deactivation.
  - Key features: QR code display, copy/download recovery codes, regenerate codes flow.
  - Notes: CSRF and token handling must be secure when calling backend endpoints.
  - Testing: Simulate MFA flows and ensure proper UX for failures.

- `lib/api.ts` — central API client wrapper for backend communication.
  - Purpose: Standardize fetch/axios usage, add auth headers, and centralized error handling.
  - Notes: Handles token refresh, 401 retry logic and consistent response shapes.
  - Testing: Mock network and token expiry scenarios.

- `lib/utils.ts` — shared utility helpers for formatting and small helpers.
  - Purpose: Date formatters, string helpers, and client utility functions.
  - Notes: Keep logic pure and covered by unit tests.
  - Action: Avoid adding heavyweight libs; keep utilities small and focused.

- `context/auth-context.tsx` — authentication context provider.
  - Purpose: Exposes `user`, `isAuthenticated`, `login`, `logout`, `refreshUserStatus` functions.
  - Behavior: Persists tokens to `localStorage`, handles token expiration and refresh logic.
  - Notes: Central point for auth state—keep it well-tested and documented.
  - Security: Clear tokens on logout and prevent XSS that could leak tokens.


Hooks

- `hooks/use-mobile.ts` — mobile detection and responsive helpers.
  - Purpose: Detect viewport and provide boolean flags for responsive behavior.
  - Notes: Useful for changing layout or behavior for small screens.
  - Testing: Unit test for resize and window matchMedia behaviors.

- `hooks/use-toast.ts` — hook wrapper around toast/toaster integration (`sonner`).
  - Purpose: Standardize toast creation and types (success, error, info) across app.
  - Notes: Use to ensure consistent UX and avoid duplicated toast configs.
  - Testing: Mock toast calls to assert message and lifecycle.


Components (selected entries with 4 lines each)

### components/auth

- `components/auth/login-modal.tsx` — Login modal handling credentials and MFA triggers.
  - Purpose: Presents login UI, handles submissions, shows MFA-required flow.
  - Behavior: Sets `auth_tokens` in `localStorage` and updates `AuthProvider` state on success.
  - Notes: Show helpful errors from backend and support role toggling.
  - Security: Avoid logging credentials and clear inputs after failures.

- `components/auth/register-page.tsx` — Registration form with client-side validations.
  - Purpose: Collect username, email, password, invite token and CAPTCHA response.
  - Behavior: Performs basic validation (password length & special char) before submit.
  - Notes: Displays friendly error messages returned by backend.
  - UX: Option to show `terms-of-service-modal` and link to privacy.

- `components/auth/mfa-setup.tsx` — UI for MFA enrollment and QR display.
  - Purpose: Fetch provisioning URI, show QR, and accept verification code to enable MFA.
  - Behavior: Calls `/api/auth/mfa/setup/` then `/api/auth/mfa/verify/` on confirm.
  - Notes: Shows recovery codes after successful setup and allows download.
  - Security: Prompt user to store recovery codes securely; do not display secrets in logs.

- `components/auth/session-timeout.tsx` — Session idle timeout and warning modal.
  - Purpose: Warn user before session expiration and optionally auto-logout.
  - Behavior: Listens for user activity and triggers `logout` after inactivity.
  - Notes: Good UX to auto-refresh token if possible for active users.
  - Testing: Simulate inactivity and confirm timeout behavior.

- `components/auth/terms-of-service-modal.tsx` — TOS modal used during registration and policy acceptance.
  - Purpose: Present terms, allow scroll/accept and optionally generate a receipt.
  - Notes: Integrate with `accept-policy` endpoint and show generated receipt link.
  - UX: Ensure acceptance is clear and logged with timestamps.
  - Legal: Store policy version accepted in backend for audit.

### components/layout

- `components/layout/header.tsx` — top navigation and login actions.
  - Purpose: Provides navigation, role switching, and quick access to login/register.
  - Behavior: Hooks into `useAuth` for user display and logout.
  - Notes: Keep it lightweight to avoid re-rendering heavy subtrees.
  - Accessibility: Ensure keyboard navigation and ARIA labels for menus.

### components/landing-page.tsx

- `components/landing-page.tsx` — unauthenticated marketing/first-time UX.
  - Purpose: Show product value, links to register and login, and role-specific CTAs.
  - Notes: Minimal client logic; static content favored for fast loads.
  - SEO: Render metadata and accessible content for search engines.
  - Integration: Hooks `LoginModal` open handlers.

### components/theme-provider.tsx

- `components/theme-provider.tsx` — theme and font configuration.
  - Purpose: Sets global CSS variables and provides theme context to app.
  - Behavior: Supports dark/light modes and persists preference.
  - Notes: Keep tokens in `globals.css` for consistent usage.
  - Testing: Ensure theme toggles do not break layout components.


Components / portals & UI primitives (summarized)

- `components/portals/*` (admin/doctor/patient) — portal wrappers and subcomponents.
  - Purpose: Organize role-specific pages and features; compose smaller UI primitives.
  - Notes: Portals import `components/ui/*` primitives for consistent look and feel.
  - Security: Each portal must validate role and handle sensitive data carefully.
  - Testing: End-to-end tests covering portal flows for each role.

- `components/ui/*` — atomic UI primitives (buttons, inputs, dialogs, table, toaster, etc.).
  - Purpose: Provide design-system components used throughout pages and portals.
  - Notes: Keep component APIs stable and document via `components.json` or storybook.
  - Action: Add unit tests for behavior and accessibility where appropriate.
  - Integration: `toaster.tsx` and `use-toast` used by many pages for UX notifications.


Styles & assets

- `styles/globals.css` — project-wide CSS variables, Tailwind imports, and theme definitions.
  - Purpose: Centralize design tokens and global styles for the frontend.
  - Notes: Import at top of `app/layout.tsx`; avoid large global selectors.
  - Action: Use component-scoped classes where possible to limit specificity issues.
  - Testing: Visual regression tests when theme variables change.


If you'd like, I can now commit this single updated `FILES_OVERVIEW.md` to a new branch and open a PR with a short description (recommended).

Generated by GitHub Copilot using repository scan. Raptor mini (Preview).