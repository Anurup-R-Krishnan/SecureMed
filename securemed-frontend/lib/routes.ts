import type { UserRole } from '@/lib/types';

// ---------------------------------------------------------------------------
// Named route constants
// ---------------------------------------------------------------------------
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PORTAL: '/portal',

  // Patient
  PATIENT: '/patient',
  PATIENT_DASHBOARD: '/patient/dashboard',

  // Doctor
  DOCTOR: '/doctor',
  DOCTOR_DASHBOARD: '/doctor/dashboard',

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
// Role → portal root mapping
// ---------------------------------------------------------------------------
const ROLE_ROUTES: Record<string, string> = {
  patient: ROUTES.PATIENT,
  doctor: ROUTES.DOCTOR,
  admin: ROUTES.ADMIN,
  lab_technician: ROUTES.LAB,
  pharmacist: ROUTES.PHARMACY,
};

/**
 * Returns the portal root route for a given user role.
 * Falls back to '/portal' for unknown roles.
 */
export function getPortalRouteForRole(role: UserRole | string): string {
  return ROLE_ROUTES[role] ?? ROUTES.PORTAL;
}
