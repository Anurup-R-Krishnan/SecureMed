"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { MedicationSandbox } from "@/components/features/pharmacy/interaction-sandbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

export default function PatientMedicationInteractionPage() {
  const { user } = useAuth();
  const patientId = user?.patient_profile?.patient_id;
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/patient/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Medication Interactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Understand side effects of each medicine and risks from combining
            medicines.
          </p>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full shrink-0">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-sm text-blue-900/80">
          This is educational decision support. Always follow your doctor&apos;s
          advice and contact emergency services for severe symptoms.
        </p>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <MedicationSandbox
          mode="patient"
          patientId={patientId ? parseInt(patientId, 10) : undefined}
        />
      </div>
    </div>
  );
}
