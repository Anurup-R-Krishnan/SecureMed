"use client";

import React from "react";
import ProfileEditor from "@/components/portals/patient/settings/profile-editor";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black text-foreground tracking-tight">
        Edit Profile
      </h3>
      <p className="text-muted-foreground">
        Update your personal information and preferences
      </p>
      <ProfileEditor />
    </div>
  );
}
