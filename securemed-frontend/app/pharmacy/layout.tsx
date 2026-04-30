"use client";

import React from "react";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout userType="pharmacist" allowedRoles={["pharmacist"]}>
      {children}
    </PortalLayout>
  );
}
