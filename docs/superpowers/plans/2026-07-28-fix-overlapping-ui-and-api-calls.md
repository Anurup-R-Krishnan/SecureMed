# Fix: Overlapping UI, Duplicate API Calls, and Silent Data Loss

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate silent data loss caused by the `response.data` bug across all service files and components, unify the toast notification system (sonner only), and remove redundant API call patterns.

**Architecture:** The `UnifiedApiClient.get<T>()` returns `T` directly (unwrapped from Axios at `lib/unified-api-client.ts:410`). Every caller must access the result directly — NOT via `.data`. This plan fixes every site where `.data` is incorrectly accessed, then migrates the shadcn `useToast` system to `sonner`, then removes redundant manual auth headers.

**Tech Stack:** Next.js 15.0.7, TypeScript 5, Bun, Sonner (toast), TanStack Query

---

## Global Constraints

- Run from `/home/anuruprkris/Project/SecureMed/securemed-frontend` directory
- Use `bun run build` to verify — `npx tsc --noEmit` also works
- `apiClient.get<T>(url)` returns `T` directly (unwrapped Axios)
- `apiClient.post<T>()` and `apiClient.patch<T>()` also return `T` directly
- For blob downloads: `responseType: "blob"` → `apiClient.get()` returns the Blob directly (NOT `response.data`)
- DO NOT remove service files or `hooks/useApi.ts` — only fix what's broken

---

## File Structure

### Files to Modify

| File | Issue | Fix |
|------|-------|-----|
| `services/admin.ts` | 15× `response.data` (returns `undefined`) | Remove `.data` |
| `services/referrals.ts` | 8× `response.data` | Remove `.data` |
| `services/pharmacy.ts` | 4× `response.data` + redundant auth headers | Remove `.data` + remove manual auth |
| `services/messaging.ts` | 5× `response.data` | Remove `.data` |
| `components/ui/command-palette.tsx` | 2× `response.data` | Remove `.data` |
| `components/portals/lab-technician-portal.tsx` | 4× `response.data` | Remove `.data` |
| `components/portals/patient/settings/privacy-settings.tsx` | 3× `response.data` | Remove `.data` |
| 15 components | `useToast` import (wrong system) | Migrate to `sonner` |
| `app/layout.tsx` | Registers shadcn Toaster (not sonner) | Switch to sonner Toaster |

### Files to Delete

| File | Reason |
|------|--------|
| `components/ui/toast.tsx` | shadcn toast primitive — superseded by sonner |
| `components/ui/use-toast.ts` | shadcn hook — superseded by sonner |
| `components/ui/toaster.tsx` | shadcn Toaster — superseded by sonner |

---

## Task 1: Fix `response.data` Bug in Service Files

**Why:** `apiClient.get()` already returns `T` directly. Every `return response.data` in service files returns `undefined` because `response` IS already the data. All API data fetched via services is silently lost.

**Files:**
- Modify: `services/admin.ts:86,98,112,123,132,144,156,171-174,199,215,220,225,230,235`
- Modify: `services/referrals.ts:74,82,90,98,106,114,122,130`
- Modify: `services/pharmacy.ts:32-33,44,55`
- Modify: `services/messaging.ts:45-46,56,62-63,85`

**Interfaces:**
- Consumes: `apiClient` from `@/lib/unified-api-client` (returns `T` directly)
- Produces: Service functions that return correct data to calling components

---

### Task 1A: Fix `services/admin.ts`

- [ ] **Step 1: Read the current file**

Read `services/admin.ts` to confirm all 15 `response.data` occurrences.

- [ ] **Step 2: Fix all `response.data` → `response` in getDashboardStats**

Change line 86:
```typescript
// Before:
const response = await apiClient.get('/admin/dashboard/stats/');
return response.data;
// After:
const response = await apiClient.get('/admin/dashboard/stats/');
return response;
```

- [ ] **Step 3: Fix getHospitals (line 98)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 4: Fix createHospital (line 112)**

```typescript
// Before:
const response = await apiClient.post('/admin/hospitals/', payload);
return response.data;
// After:
const response = await apiClient.post('/admin/hospitals/', payload);
return response;
```

- [ ] **Step 5: Fix updateHospital (line 123)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 6: Fix getStaff (line 132)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 7: Fix getAlerts (line 144)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 8: Fix getUsers (line 156)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 9: Fix getPatients (lines 171-175)**

```typescript
// Before:
if (response.data && Array.isArray(response.data)) {
    return response.data;
} else if (response.data && response.data.results) {
    return response.data.results;
}
return [];
// After:
if (Array.isArray(response)) {
    return response;
} else if (response && (response as any).results) {
    return (response as any).results;
}
return [];
```

- [ ] **Step 10: Fix getAuditLogs (line 199)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 11: Fix createUser (line 215)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 12: Fix updateUserRole (line 220)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 13: Fix deactivateUser (line 225)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 14: Fix activateUser (line 230)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 15: Fix resetUserPassword (line 235)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 16: Commit**

```bash
cd /home/anuruprkris/Project/SecureMed/securemed-frontend
git add services/admin.ts
git commit -m "fix: remove incorrect .data access from adminService responses

apiClient.get() already returns the response data directly (unwrapped
from Axios). Accessing .data again returned undefined, silently losing
all API data from admin service calls."
```

---

### Task 1B: Fix `services/referrals.ts`

- [ ] **Step 1: Fix getReferrals (line 74)**

```typescript
// Before:
return Array.isArray(response.data) ? response.data : response.data.results || [];
// After:
return Array.isArray(response) ? response : (response as any)?.results || [];
```

- [ ] **Step 2: Fix getPatientReferrals (line 82)**

```typescript
// Before:
return Array.isArray(response.data) ? response.data : [];
// After:
return Array.isArray(response) ? response : [];
```

- [ ] **Step 3: Fix createReferral (line 90)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 4: Fix getMyPatients (line 98)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 5: Fix acceptReferral (line 106)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 6: Fix declineReferral (line 114)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 7: Fix completeReferral (line 122)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 8: Fix extendAccess (line 130)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 9: Commit**

```bash
git add services/referrals.ts
git commit -m "fix: remove incorrect .data access from referralService responses

Same pattern as admin.ts — apiClient.get() already returns the parsed
response body. Accessing .data returned undefined, losing all referral
data."
```

---

### Task 1C: Fix `services/pharmacy.ts`

**Also:** Remove redundant `Authorization` headers — `unified-api-client.ts` already adds them automatically in the request interceptor (line 223).

- [ ] **Step 1: Fix getOrders (lines 29-33)**

```typescript
// Before:
const token = getAccessToken();
if (!token) return [];
const response = await apiClient.get('/medical-records/pharmacy-orders/', {
  headers: { Authorization: `Bearer ${token}` }
});
return Array.isArray(response.data) ? response.data :
  (response.data.results ? response.data.results : []);

// After:
const response = await apiClient.get<any>('/medical-records/pharmacy-orders/');
return Array.isArray(response) ? response : (response as any)?.results || [];
```

- [ ] **Step 2: Fix verifyOrder (lines 37-45)**

```typescript
// Before:
const token = getAccessToken();
if (!token) throw new Error('No auth token');
const response = await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/verify/`, {
  notes
}, {
  headers: { Authorization: `Bearer ${token}` }
});
return response.data;

// After:
return await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/verify/`, { notes });
```

- [ ] **Step 3: Fix fulfillOrder (lines 47-56)**

```typescript
// Before:
const token = getAccessToken();
if (!token) throw new Error('No auth token');
const response = await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/fulfill/`, {
  pickup_code: pickupCode || ''
}, {
  headers: { Authorization: `Bearer ${token}` }
});
return response.data;

// After:
return await apiClient.post(`/medical-records/pharmacy-orders/${orderId}/fulfill/`, {
  pickup_code: pickupCode || ''
});
```

- [ ] **Step 4: Remove unused import**

Remove `import { getAccessToken } from '@/lib/auth-utils';` from the top of the file (no longer needed).

- [ ] **Step 5: Commit**

```bash
git add services/pharmacy.ts
git commit -m "fix: remove .data bug and redundant auth headers from pharmacyService

apiClient already handles auth automatically. The manual Bearer token
headers were redundant and potentially stale. Also fixed response.data
return pattern."
```

---

### Task 1D: Fix `services/messaging.ts`

- [ ] **Step 1: Fix getConversations (lines 44-46)**

```typescript
// Before:
return Array.isArray(response.data) ? response.data :
    (response.data.results ? response.data.results : []);
// After:
return Array.isArray(response) ? response : (response as any)?.results || [];
```

- [ ] **Step 2: Fix createConversation (line 56)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 3: Fix getMessages (lines 61-63)**

```typescript
// Before:
return Array.isArray(response.data) ? response.data :
    (response.data.results ? response.data.results : []);
// After:
return Array.isArray(response) ? response : (response as any)?.results || [];
```

- [ ] **Step 4: Fix sendMessage (line 85)**

```typescript
// Before:
return response.data;
// After:
return response;
```

- [ ] **Step 5: Commit**

```bash
git add services/messaging.ts
git commit -m "fix: remove incorrect .data access from messagingService responses"
```

---

## Task 2: Fix `response.data` Bug in Components

**Files:**
- Modify: `components/ui/command-palette.tsx:86-88`
- Modify: `components/portals/lab-technician-portal.tsx:138-140,158-160,203,229`
- Modify: `components/portals/patient/settings/privacy-settings.tsx:122-123,492,573`

---

### Task 2A: Fix `components/ui/command-palette.tsx`

- [ ] **Step 1: Fix doctor search result handling (lines 83-99)**

```typescript
// Before:
const response = await apiClient.get("/medical-records/records/", {
  params: { search: query },
});
const rows = Array.isArray(response.data)
  ? response.data
  : response.data.results || [];

// After:
const response = await apiClient.get<any>("/medical-records/records/", {
  params: { search: query },
});
const rows = Array.isArray(response)
  ? response
  : (response as any)?.results || [];
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/command-palette.tsx
git commit -m "fix: remove .data bug from command palette patient search"
```

---

### Task 2B: Fix `components/portals/lab-technician-portal.tsx`

This file has 3 components with the `.data` bug: `CompletedTestsView` (lines 138, 158), `handleView` (line 203), `handleDownload` (line 229), and `ReportsView` (line 413).

- [ ] **Step 1: Fix CompletedTestsView fetchHistory (lines 138-140)**

```typescript
// Before:
const response = await apiClient.get("/labs/results/");
const payload = Array.isArray(response.data)
  ? response.data
  : response.data?.results || [];

// After:
const response = await apiClient.get<any>("/labs/results/");
const payload = Array.isArray(response)
  ? response
  : (response as any)?.results || [];
```

- [ ] **Step 2: Fix CompletedTestsView refreshHistory (lines 158-160)**

Same fix as Step 1 (same pattern, different function).

- [ ] **Step 3: Fix handleView (line 203)**

```typescript
// Before:
const res = await apiClient.get(`/labs/results/${row.id}/presigned/`);
const url = res.data?.url as string | undefined;

// After:
const res = await apiClient.get<{ url?: string }>(`/labs/results/${row.id}/presigned/`);
const url = res?.url;
```

- [ ] **Step 4: Fix handleDownload (lines 226-229)**

```typescript
// Before:
const res = await apiClient.get(`/labs/results/${row.id}/download/`, {
  responseType: "blob",
});
const blob = new Blob([res.data]);

// After:
const res = await apiClient.get<Blob>(`/labs/results/${row.id}/download/`, {
  responseType: "blob",
});
const blob = new Blob([res as any]);
```

Note: `responseType: "blob"` means Axios returns the raw Blob. Since `apiClient` returns `response.data`, the result IS the Blob directly. Wrapping `Blob` in `new Blob([])` is redundant but harmless for compatibility.

- [ ] **Step 5: Fix ReportsView (lines 413-415)**

```typescript
// Before:
const response = await apiClient.get("/labs/results/");
const rows = Array.isArray(response.data)
  ? response.data
  : response.data?.results || [];

// After:
const response = await apiClient.get<any>("/labs/results/");
const rows = Array.isArray(response)
  ? response
  : (response as any)?.results || [];
```

- [ ] **Step 6: Commit**

```bash
git add components/portals/lab-technician-portal.tsx
git commit -m "fix: remove .data bug from lab technician portal API calls

Fixed 5 occurrences across CompletedTestsView, handleView,
handleDownload, and ReportsView."
```

---

### Task 2C: Fix `components/portals/patient/settings/privacy-settings.tsx`

- [ ] **Step 1: Fix fetchAccessLogs (lines 121-123)**

```typescript
// Before:
const response = await apiClient.get("/medical-records/my-access-log/");
if (Array.isArray(response.data)) {
  setAccessLogs(response.data);
}

// After:
const response = await apiClient.get<any>("/medical-records/my-access-log/");
if (Array.isArray(response)) {
  setAccessLogs(response);
}
```

- [ ] **Step 2: Fix policy download (line 492)**

```typescript
// Before:
const response = await apiClient.get(
  "/auth/download-policy-receipt/",
  { responseType: "blob" },
);
const blob = new Blob([response.data], {
  type: "application/pdf",
});

// After:
const response = await apiClient.get<Blob>(
  "/auth/download-policy-receipt/",
  { responseType: "blob" },
);
const blob = new Blob([response as any], {
  type: "application/pdf",
});
```

- [ ] **Step 3: Fix deletion certificate (lines 573-574)**

```typescript
// Before:
const certificateResponse = await apiClient.get(
  "/auth/deletion-certificate/",
  { responseType: "blob" },
);
const certificateBlob = new Blob(
  [certificateResponse.data],
  { type: "application/pdf" },
);

// After:
const certificateResponse = await apiClient.get<Blob>(
  "/auth/deletion-certificate/",
  { responseType: "blob" },
);
const certificateBlob = new Blob(
  [certificateResponse as any],
  { type: "application/pdf" },
);
```

- [ ] **Step 4: Commit**

```bash
git add components/portals/patient/settings/privacy-settings.tsx
git commit -m "fix: remove .data bug from privacy settings API calls

Fixed access logs fetch, policy download, and deletion certificate
download — all were accessing .data on an already-unwrapped response."
```

---

## Task 3: Unify Toast System — Standardize on `sonner`

**Why:** The codebase has two competing toast systems:
- `useToast` from `@/components/ui/use-toast` (shadcn custom) —15 files
- `toast` from `sonner` —14 files

Only shadcn's `Toaster` is registered in `app/layout.tsx`. The `sonner` `Toaster` is NOT in the layout. This means **all `toast()` calls from sonner silently fail** — users never see notifications from those components.

**Fix:** Register sonner's `Toaster` in the layout, migrate all `useToast` consumers to `sonner`, then delete the shadcn toast files.

**sonner API reference:**
```typescript
import { toast } from "sonner";

toast("Message");
toast.success("Success!");
toast.error("Error!", { description: "Details here" });
toast("Loading...", { description: "Please wait", duration: Infinity });
```

**Files:**
- Modify: `app/layout.tsx` — replace shadcn Toaster with sonner Toaster
- Modify: 15 component files — migrate `useToast` → `sonner`
- Delete: `components/ui/toast.tsx`, `components/ui/use-toast.ts`, `components/ui/toaster.tsx`

---

### Task 3A: Register sonner Toaster in Layout

- [ ] **Step 1: Update `app/layout.tsx`**

```typescript
// Before:
import { Toaster } from "@/components/ui/toaster";

// After:
import { Toaster } from "sonner";
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "fix: register sonner Toaster in root layout

shadcn's Toaster was registered but sonner's was not. All toast()
calls from sonner were silently failing. Now both systems work —
sonner is the primary toast system."
```

---

### Task 3B: Migrate `useToast` Components to `sonner` (Batch 1 — UI primitives)

**Files:**
- Modify: `components/ui/copy-button.tsx`
- Modify: `components/auth/terms-of-service-modal.tsx`
- Modify: `components/auth/register-page.tsx`

**Migration pattern for each file:**
```typescript
// Before:
import { useToast } from "@/components/ui/use-toast";
// ...
const { toast } = useToast();
// ...
toast({
  title: "Title",
  description: "Description",
  variant: "destructive",
});

// After:
import { toast } from "sonner";
// ...
// (remove useToast() call)
// ...
toast.error("Title", { description: "Description" });
```

```typescript
// For success:
// Before:
toast({ title: "Copied!" });
// After:
toast.success("Copied!");
```

```typescript
// For default/info:
// Before:
toast({ title: "Info", description: "Some info" });
// After:
toast("Info", { description: "Some info" });
```

- [ ] **Step 1: Migrate `components/ui/copy-button.tsx`**

Change imports, remove `useToast()` call, replace `toast({...})` with `toast.success(...)` or `toast.error(...)`.

- [ ] **Step 2: Migrate `components/auth/terms-of-service-modal.tsx`**

Same pattern.

- [ ] **Step 3: Migrate `components/auth/register-page.tsx`**

Same pattern.

- [ ] **Step 4: Commit**

```bash
git add components/ui/copy-button.tsx components/auth/terms-of-service-modal.tsx components/auth/register-page.tsx
git commit -m "refactor: migrate useToast to sonner in UI primitives and auth components"
```

---

### Task 3C: Migrate `useToast` Components (Batch 2 — Patient portal)

**Files:**
- Modify: `components/portals/patient/appointments/my-appointments.tsx`
- Modify: `components/portals/patient/appointments/appointment-booking.tsx`
- Modify: `components/portals/patient/dashboard/lab-results-card.tsx`
- Modify: `components/portals/patient/dashboard/patient-timeline.tsx`
- Modify: `components/portals/patient/settings/profile-editor.tsx`
- Modify: `components/portals/patient/records/upload-record-dialog.tsx`

- [ ] **Step 1: Migrate `components/portals/patient/appointments/my-appointments.tsx`**

Replace `import { useToast } from "@/components/ui/use-toast"` with `import { toast } from "sonner"`. Remove `const { toast } = useToast();`. Replace all `toast({...})` calls with `toast.success(...)`, `toast.error(...)` as appropriate.

- [ ] **Step 2: Migrate `components/portals/patient/appointments/appointment-booking.tsx`**

Same pattern.

- [ ] **Step 3: Migrate `components/portals/patient/dashboard/lab-results-card.tsx`**

Same pattern.

- [ ] **Step 4: Migrate `components/portals/patient/dashboard/patient-timeline.tsx`**

Same pattern.

- [ ] **Step 5: Migrate `components/portals/patient/settings/profile-editor.tsx`**

Same pattern.

- [ ] **Step 6: Migrate `components/portals/patient/records/upload-record-dialog.tsx`**

Same pattern.

- [ ] **Step 7: Commit**

```bash
git add components/portals/patient/
git commit -m "refactor: migrate useToast to sonner in patient portal components"
```

---

### Task 3D: Migrate `useToast` Components (Batch 3 — Doctor/Admin/Lab)

**Files:**
- Modify: `components/portals/doctor/records/doctor-medical-records.tsx`
- Modify: `components/portals/doctor/dashboard/availability-manager.tsx`
- Modify: `components/portals/doctor/shared/referral-modal.tsx`
- Modify: `components/portals/admin/staff/staff-manager.tsx`
- Modify: `components/portals/admin/patients/patient-manager.tsx`
- Modify: `components/portals/lab-technician-portal.tsx`
- Modify: `components/telemedicine/video-room.tsx`

- [ ] **Step 1: Migrate `components/portals/doctor/records/doctor-medical-records.tsx`**

Replace import, remove `useToast()` call, update all `toast({...})` calls.

- [ ] **Step 2: Migrate `components/portals/doctor/dashboard/availability-manager.tsx`**

Same pattern.

- [ ] **Step 3: Migrate `components/portals/doctor/shared/referral-modal.tsx`**

Same pattern.

- [ ] **Step 4: Migrate `components/portals/admin/staff/staff-manager.tsx`**

Same pattern.

- [ ] **Step 5: Migrate `components/portals/admin/patients/patient-manager.tsx`**

Same pattern.

- [ ] **Step 6: Migrate `components/portals/lab-technician-portal.tsx`**

Same pattern. Note: this file already has `toast` from sonner being used in some functions — just remove the `useToast` import and the `useToast()` call in `CompletedTestsView`.

- [ ] **Step 7: Migrate `components/telemedicine/video-room.tsx`**

Same pattern.

- [ ] **Step 8: Commit**

```bash
git add components/portals/doctor/ components/portals/admin/ components/portals/lab-technician-portal.tsx components/telemedicine/video-room.tsx
git commit -m "refactor: migrate useToast to sonner in doctor, admin, lab, and telemedicine components"
```

---

### Task 3E: Delete shadcn Toast Files

**Prerequisite:** All 15 component files must have been migrated (Tasks 3B, 3C, 3D). Verify with:

```bash
grep -rn "from.*use-toast\|from.*components/ui/toast\b" --include="*.ts" --include="*.tsx" components/ | grep -v "sonner" | grep -v "toaster"
```

Expected: 0 results (only `components/ui/toaster.tsx` and `components/ui/use-toast.ts` themselves should appear).

- [ ] **Step 1: Verify no remaining imports of shadcn toast**

Run the grep above. If any files still import `useToast`, migrate them first before proceeding.

- [ ] **Step 2: Delete the shadcn toast files**

```bash
rm components/ui/toast.tsx components/ui/use-toast.ts components/ui/toaster.tsx
```

- [ ] **Step 3: Verify build passes**

```bash
bun run build
```

- [ ] **Step 4: Commit**

```bash
git add -A components/ui/
git commit -m "refactor: remove shadcn toast system — fully replaced by sonner

The shadcn toast (use-toast.ts, toast.tsx, toaster.tsx) is fully
superseded by sonner. All consumers migrated, Toaster registered
in layout."
```

---

## Task 4: Remove Redundant Auth Headers from `services/pharmacy.ts`

This was already handled in Task 1C (pharmacy.ts fix included removing manual auth headers). **This task is a placeholder to confirm it was done.**

- [ ] **Step 1: Verify `services/pharmacy.ts` no longer imports `getAccessToken`**

```bash
grep "getAccessToken" services/pharmacy.ts
```

Expected: 0 results.

- [ ] **Step 2: If still present, remove the import**

Remove `import { getAccessToken } from '@/lib/auth-utils';` from `services/pharmacy.ts`.

---

## Task 5: Final Verification

- [ ] **Step 1: Run full build**

```bash
cd /home/anuruprkris/Project/SecureMed/securemed-frontend
bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verify no remaining `response.data` in services**

```bash
grep -rn "response\.data" services/ --include="*.ts" | grep -v "node_modules" | grep -v "\.d\.ts"
```

Expected: 0 results.

- [ ] **Step 4: Verify no remaining `useToast` imports**

```bash
grep -rn "from.*use-toast" --include="*.ts" --include="*.tsx" components/ app/
```

Expected: 0 results.

- [ ] **Step 5: Verify no remaining shadcn toast files**

```bash
ls components/ui/toast.tsx components/ui/use-toast.ts components/ui/toaster.tsx 2>&1
```

Expected: All three files should not exist.

---

## Task 6: Commit All Changes to Both Repos

**Note:** The `securemed-frontend/` directory has its own git repo nested inside the parent `SecureMed` repo. Both must be committed.

- [ ] **Step 1: Stage all changes in the nested frontend repo**

```bash
cd /home/anuruprkris/Project/SecureMed/securemed-frontend
git status
```

- [ ] **Step 2: Stage changes in the parent repo**

```bash
cd /home/anuruprkris/Project/SecureMed
git add securemed-frontend/
git status
```

- [ ] **Step 3: Create a combined commit in the parent repo**

```bash
git commit -m "fix: resolve response.data bug, unify toast system, remove redundant API patterns

- Fix response.data bug across 7 files: apiClient.get() already returns
  data directly, accessing .data returned undefined (silent data loss)
- Migrate all useToast consumers to sonner (15 files)
- Register sonner Toaster in root layout (was silently failing)
- Remove redundant manual auth headers from pharmacyService
- Delete shadcn toast files (use-toast.ts, toast.tsx, toaster.tsx)"
```

- [ ] **Step 4: Verify no uncommitted changes**

```bash
git status
```

Expected: clean working tree.
