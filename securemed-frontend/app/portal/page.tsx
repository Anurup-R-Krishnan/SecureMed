"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * Legacy route — redirects to /patient/dashboard for backwards compatibility.
 */
export default function PortalRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.PATIENT_DASHBOARD);
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">
        Redirecting to patient portal...
      </div>
    </div>
  );
}
