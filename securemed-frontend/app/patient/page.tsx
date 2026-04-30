"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** /patient → redirects to /patient/dashboard */
export default function PatientIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.PATIENT_DASHBOARD);
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading patient portal...</div>
    </div>
  );
}
