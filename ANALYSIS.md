# SecureMed Frontend-Backend Integration Analysis

## Issue Summary

### 1. API Client Issues ❌
- **Multiple axios instances**: `api.ts` (uses localStorage with auth_tokens) and `api-client.ts` (separate implementation)
- **Inconsistent token storage**: api.ts uses `auth_tokens` (object), api-client.ts uses `access_token`/`refresh_token`
- **No retry logic**: Failed requests fail immediately
- **No request deduplication**: Duplicate requests hit the backend
- **Error handling inconsistency**: Different error extraction methods
- **No request/response logging**: Hard to debug issues

### 2. Endpoint Mismatches ⚠️
- `patients.ts` calls:
  - `/patients/` (exists ✓)
  - `/medical-records/timeline/` (exists ✓) 
  - `/patients/timeline/` (likely fallback, needs verification)
  - `/patients/profile/` (exists ✓)
  - `/medical-records/pharmacy-orders/` (exists ✓)
  - `/medical-records/dashboard/stats/` (exists ✓)
  
- `appointments.ts` calls:
  - `/appointments/doctors/` (exists ✓ - DoctorViewSet)
  - `/appointments/appointments/` (likely exists but double-nested?)
  - Various doctor availability endpoints

### 3. Frontend Performance Issues ❌
- **No caching**: Every request hits backend immediately
- **No lazy loading**: All list items load at once
- **No debouncing**: Search/filter requests sent on every keystroke
- **No request deduplication**: Duplicate requests possible
- **No React Query**: Manual state management only

### 4. Backend Issues ⚠️
- **Inconsistent response format**: Some paginated (with results), some plain arrays
- **No pagination metadata**: Missing total_count, page_count, etc.
- **Datetime format unclear**: May not all be ISO 8601
- **No response compression**: Could reduce payload size
- **Missing field filtering**: Clients fetch all fields

### 5. UX Issues ❌
- **No loading states**: Users don't know requests are pending
- **No error display**: Errors logged but not shown to users
- **No retry UI**: Failed requests can't be retried by user
- **No offline detection**: App doesn't handle offline mode

## Current Architecture

### Frontend API Client Stack
```
api.ts (primary - uses localStorage.auth_tokens)
├── Request interceptor: Add Bearer token
├── Response interceptor: Handle 401 + refresh token
└── getDashboardStats() exported

api-client.ts (secondary - uses localStorage access_token)
├── Request interceptor: Add Bearer token
├── Response interceptor: Handle 401 + log errors
└── Generic get/post/put/patch/delete methods
```

### Backend URL Structure
```
/api/
├── auth/ → apps.accounts.users
├── patients/ → apps.accounts.patients (DRF)
├── appointments/ → apps.scheduling.appointments (DRF)
├── medical-records/ → apps.clinical.records (DRF)
├── telemedicine/ → apps.clinical.telemedicine
├── labs/ → apps.clinical.diagnostics
├── pharmacy/ → apps.clinical.pharmacy
├── billing/ → apps.finance.billing
└── infection-tracking/ → apps.clinical.infection_tracking
```

## Plan of Action

### Phase 1: Create Unified API Client (CRITICAL)
✓ Create `lib/unified-api-client.ts` with:
  - Centralized error handling
  - Automatic retry logic (exponential backoff)
  - Request deduplication
  - Response logging
  - Type-safe methods

### Phase 2: Standardize Backend Responses
- Add pagination to all list endpoints
- Standardize response format
- Add field filtering support
- Ensure ISO 8601 datetime format

### Phase 3: Install React Query
- npm install @tanstack/react-query
- Configure QueryClientProvider

### Phase 4: Create React Query Hooks
- Create hooks for each service (usePatients, useAppointments, etc.)
- Implement caching
- Add loading/error states

### Phase 5: Update Frontend to Use New Client
- Replace api.ts calls with new client
- Replace api-client.ts calls with new client
- Update services to use React Query

### Phase 6: Add UI States
- Loading skeletons
- Error boundaries
- Retry buttons

## Specific Endpoint Issues Found

1. Services import both `api` and `api-client` inconsistently
2. Response format inconsistent (array vs paginated object)
3. Double endpoint nesting in appointments (appointments/appointments/)
4. Missing pagination metadata in responses
