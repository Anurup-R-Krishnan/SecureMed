"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PatientReferrals from "@/components/portals/patient/referrals/patient-referrals";

export default function ReferralsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-black text-foreground tracking-tight">
          Referrals
        </h3>
        <p className="text-muted-foreground">
          Manage ongoing referrals and specialist consultations
        </p>
      </div>

      <PatientReferrals
        onBookAppointment={(doctorId, doctorName) => {
          // Navigate to appointments page with query params to pre-select doctor
          const params = new URLSearchParams();
          params.set("doctorId", doctorId.toString());
          params.set("doctorName", doctorName);

          router.push(`/patient/appointments?${params.toString()}`);
        }}
      />
    </div>
  );
}
