'use client';

import type { UserRole } from '@/lib/types';

// ---------------------------------------------------------------------------
// Named route constants
// ---------------------------------------------------------------------------
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PORTAL: '/portal',
  EMERGENCY: '/emergency',
  LAB_TESTS: '/lab-tests',

  // Patient
  PATIENT: '/patient',
  PATIENT_DASHBOARD: '/patient/dashboard',
  PATIENT_APPOINTMENTS: '/patient/appointments',

  // Doctor
  DOCTOR: '/doctor',
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  DOCTOR_PATIENTS: '/doctor/patients',
  DOCTOR_TRIAGE_INBOX: '/doctor/triage-inbox',

  // Admin
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',

  // Lab
  LAB: '/lab',
  LAB_WORKLIST: '/lab/worklist',

  // Pharmacy
  PHARMACY: '/pharmacy',
  PHARMACY_DASHBOARD: '/pharmacy/dashboard',
} as const;

// ---------------------------------------------------------------------------
// Valid URL tab segments per portal (must match portal component tab types)
// ---------------------------------------------------------------------------
export const VALID_TABS = {
  admin: ['dashboard', 'analytics', 'hospitals', 'staff', 'patients', 'billing', 'infection-tracking', 'audit-logs'] as const,
  lab: ['worklist', 'completed', 'reports', 'settings'] as const,
  pharmacy: ['dashboard', 'orders', 'inventory'] as const,
};

// ---------------------------------------------------------------------------
// Role → portal landing (dashboard) mapping
// ---------------------------------------------------------------------------
const ROLE_ROUTES: Record<string, string> = {
  patient: ROUTES.PATIENT_DASHBOARD,
  doctor: ROUTES.DOCTOR_DASHBOARD,
  admin: ROUTES.ADMIN_DASHBOARD,
  lab_technician: ROUTES.LAB_WORKLIST,
  pharmacist: ROUTES.PHARMACY_DASHBOARD,
};

/**
 * Returns the portal root route for a given user role.
 * Falls back to '/portal' for unknown roles.
 */
export function getPortalRouteForRole(role: UserRole | string): string {
  return ROLE_ROUTES[role] ?? ROUTES.PORTAL;
}
