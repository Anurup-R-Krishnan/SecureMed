"use client";

import React from "react";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout userType="lab_technician" allowedRoles={["lab_technician"]}>
      {children}
    </PortalLayout>
  );
}
