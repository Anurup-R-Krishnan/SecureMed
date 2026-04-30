"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { ROUTES } from "@/lib/routes";
import { API_BASE_URL } from "@/lib/urls";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Loader2,
  Phone,
  Search,
  ShieldAlert,
  Siren,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function loginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

type IntakeStep = "FORM" | "SUBMITTING" | "SUBMITTED" | "STATUS";

interface CaseStatus {
  case_ref: string;
  patient_name: string;
  severity: string;
  severity_display: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
}

export default function EmergencyPage() {
  const { isAuthenticated, user } = useAuth();

  // Admins go to their own portal; doctors go to triage tools
  const clinicianQueueHref =
    isAuthenticated && user?.role === "admin"
      ? ROUTES.ADMIN
      : isAuthenticated && user?.role === "doctor"
        ? ROUTES.DOCTOR_TRIAGE_INBOX
        : loginHref(ROUTES.EMERGENCY);
  const clinicianRecordsHref =
    isAuthenticated && user?.role === "admin"
      ? ROUTES.ADMIN
      : isAuthenticated && user?.role === "doctor"
        ? ROUTES.DOCTOR_PATIENTS
        : loginHref(ROUTES.EMERGENCY);

  // --- Intake form state ---
  const [step, setStep] = useState<IntakeStep>("FORM");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [severity, setSeverity] = useState("urgent");
  const [knownConditions, setKnownConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  // --- Case tracking state ---
  const [caseRef, setCaseRef] = useState("");
  const [caseStatus, setCaseStatus] = useState<CaseStatus | null>(null);
  const [lookupRef, setLookupRef] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep("SUBMITTING");

    try {
      const res = await fetch(
        `${API_BASE_URL}/medical-records/emergency/intake/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_name: patientName,
            patient_age: patientAge ? Number(patientAge) : null,
            patient_phone: patientPhone,
            chief_complaint: chiefComplaint,
            severity,
            known_conditions: knownConditions,
            allergies,
            location_description: locationDesc,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit emergency case.");
      }

      const data = await res.json();
      setCaseRef(data.case_ref);
      setStep("SUBMITTED");
    } catch (err: any) {
      setError(err.message || "Submission failed.");
      setStep("FORM");
    }
  };

  const handleLookup = async () => {
    if (!lookupRef.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setCaseStatus(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/medical-records/emergency/status/${lookupRef.trim()}/`,
      );
      if (!res.ok) {
        throw new Error(
          res.status === 404 ? "Case not found." : "Lookup failed.",
        );
      }
      const data: CaseStatus = await res.json();
      setCaseStatus(data);
      setStep("STATUS");
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const severityColor: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    urgent: "bg-orange-100 text-orange-800",
    moderate: "bg-amber-100 text-amber-800",
    low: "bg-green-100 text-green-800",
  };

  const statusColor: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    triaging: "bg-amber-100 text-amber-800",
    in_treatment: "bg-purple-100 text-purple-800",
    discharged: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header banner */}
        <section className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                <Siren className="h-4 w-4" />
                Emergency Route
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground">
                Emergency intake and clinician escalation
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Submit an emergency intake case below. You will receive a case
                reference to track status. Clinicians: sign in to access triage
                tools directly.
              </p>
            </div>
            <div className="flex min-w-[220px] flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <a href="tel:+911124004444">
                  <Phone className="h-4 w-4" />
                  Call Emergency Desk
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={clinicianQueueHref}>
                  <ShieldAlert className="h-4 w-4" />
                  Clinician Emergency Access
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: Intake form / confirmation */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-red-500/10 p-3 text-red-600">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Emergency Intake
                </h2>
                <p className="text-sm text-muted-foreground">
                  Submit patient details for triage.
                </p>
              </div>
            </div>

            {step === "FORM" && (
              <form onSubmit={handleSubmitIntake} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="patientName">Patient Name *</Label>
                    <Input
                      id="patientName"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="patientAge">Age</Label>
                    <Input
                      id="patientAge"
                      type="number"
                      min={0}
                      max={150}
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="patientPhone">Phone</Label>
                    <Input
                      id="patientPhone"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">
                          Critical – Immediate
                        </SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="low">Low / Non-urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                  <textarea
                    id="chiefComplaint"
                    required
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Describe the emergency situation"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="knownConditions">Known Conditions</Label>
                    <Input
                      id="knownConditions"
                      value={knownConditions}
                      onChange={(e) => setKnownConditions(e.target.value)}
                      placeholder="e.g. Diabetes, Hypertension"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Input
                      id="allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Location / Notes</Label>
                  <Input
                    id="location"
                    value={locationDesc}
                    onChange={(e) => setLocationDesc(e.target.value)}
                    placeholder="e.g. Ward B, Room 204"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                >
                  Submit Emergency Intake
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {step === "SUBMITTING" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                <p className="font-medium">Submitting intake case...</p>
              </div>
            )}

            {step === "SUBMITTED" && (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Case Submitted
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Your emergency intake has been submitted and clinical staff
                  have been alerted.
                </p>
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Case Reference
                  </p>
                  <p className="text-3xl font-black tracking-wider text-foreground">
                    {caseRef}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save this reference to track your case status below.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLookupRef(caseRef);
                    setStep("FORM");
                  }}
                >
                  Submit another case
                </Button>
              </div>
            )}

            {step === "STATUS" && caseStatus && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Case {caseStatus.case_ref}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[caseStatus.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {caseStatus.status_display}
                    </span>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Patient:</span>{" "}
                      <span className="font-medium text-foreground">
                        {caseStatus.patient_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Severity:</span>{" "}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${severityColor[caseStatus.severity] ?? "bg-muted"}`}
                      >
                        {caseStatus.severity_display}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>{" "}
                      <span className="font-medium text-foreground">
                        {new Date(caseStatus.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Last update:
                      </span>{" "}
                      <span className="font-medium text-foreground">
                        {new Date(caseStatus.updated_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("FORM")}
                >
                  Back to intake form
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT: Case status lookup + clinician links */}
          <div className="space-y-6">
            {/* Case status lookup */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Track Case Status
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your case reference to check status.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g. A1B2C3D4E5"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  className="font-mono tracking-wider"
                />
                <Button
                  onClick={handleLookup}
                  disabled={lookupLoading || !lookupRef.trim()}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Look up"
                  )}
                </Button>
              </div>
              {lookupError && (
                <p className="mt-3 text-sm text-destructive">{lookupError}</p>
              )}
            </div>

            {/* Clinician panel */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    For Clinicians
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Direct paths into operational tools.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  href={clinicianQueueHref}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:bg-muted/30"
                >
                  <ClipboardList className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Open emergency queue
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review incoming emergency cases and active escalations.
                    </p>
                  </div>
                </Link>
                <Link
                  href={clinicianRecordsHref}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:bg-muted/30"
                >
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Open patient records for break-glass
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the patient profile flow to grant emergency chart
                      access with a reason.
                    </p>
                  </div>
                </Link>
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <p>
                    Break-glass remains fully audited. Do not use it as a
                    shortcut for non-emergency chart access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
