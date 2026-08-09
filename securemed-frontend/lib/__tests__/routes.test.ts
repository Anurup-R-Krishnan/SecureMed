import { describe, expect, it } from "@jest/globals";
import { getPortalRouteForRole, ROUTES } from "../routes";

describe("getPortalRouteForRole", () => {
  it("maps each known role to its portal dashboard", () => {
    expect(getPortalRouteForRole("patient")).toBe("/patient/dashboard");
    expect(getPortalRouteForRole("doctor")).toBe("/doctor/dashboard");
    expect(getPortalRouteForRole("admin")).toBe("/admin/dashboard");
    expect(getPortalRouteForRole("lab_technician")).toBe("/lab/worklist");
    expect(getPortalRouteForRole("pharmacist")).toBe("/pharmacy/dashboard");
  });

  it("falls back to the generic portal for unknown roles", () => {
    expect(getPortalRouteForRole("unknown_role")).toBe("/portal");
    expect(getPortalRouteForRole("")).toBe("/portal");
    // @ts-expect-error - defensive: callers may pass unexpected values
    expect(getPortalRouteForRole(undefined)).toBe("/portal");
  });

  it("exposes the core route constants", () => {
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.EMERGENCY).toBe("/emergency");
    expect(ROUTES.PATIENT_DASHBOARD).toBe("/patient/dashboard");
    expect(ROUTES.DOCTOR_DASHBOARD).toBe("/doctor/dashboard");
    expect(ROUTES.ADMIN_DASHBOARD).toBe("/admin/dashboard");
    expect(ROUTES.LAB_WORKLIST).toBe("/lab/worklist");
    expect(ROUTES.PHARMACY_DASHBOARD).toBe("/pharmacy/dashboard");
  });
});
