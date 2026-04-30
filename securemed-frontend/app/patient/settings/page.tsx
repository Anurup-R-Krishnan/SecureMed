"use client";

import React from "react";
import PrivacySettings from "@/components/portals/patient/settings/privacy-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black text-foreground tracking-tight">
        Privacy & Security
      </h3>
      <p className="text-muted-foreground">
        Manage data sharing consents and security logs
      </p>
      <PrivacySettings />
    </div>
  );
}
