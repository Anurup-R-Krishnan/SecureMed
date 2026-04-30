"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, Search, X, CheckCircle2, Loader2, History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Patient {
  id: number;
  name: string;
  displayId: string;
}

interface PrescriptionWriterProps {
  patients: Patient[];
  onSuccess?: () => void;
  initialPatientId?: string;
}

export default function PrescriptionWriter({
  patients,
  onSuccess,
  initialPatientId,
}: PrescriptionWriterProps) {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [patientSearch, setPatientSearch] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filteredPatients = patients.filter((patient) => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      patient.name.toLowerCase().includes(term) ||
      patient.displayId.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    if (!initialPatientId) return;
    setSelectedPatient(initialPatientId);
  }, [initialPatientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !medicationName || !dosage) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        patient_id: parseInt(selectedPatient),
        medication_name: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim() || "As directed",
        duration: duration.trim() || "As prescribed",
        instructions: instructions.trim() || "",
        override_reason: overrideReason.trim() || "",
      };

      await api.post("/medical-records/prescriptions/", payload);

      setSubmitted(true);
      if (onSuccess) onSuccess();

      setMedicationName("");
      setDosage("");
      setFrequency("");
      setDuration("");
      setInstructions("");
      setOverrideReason("");
    } catch (error: any) {
      const detail = error?.response?.data;
      const msg =
        typeof detail === "object"
          ? Object.values(detail).flat().join(", ")
          : detail || "Failed to create prescription";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto border-green-200 bg-green-50/30">
        <CardContent className="pt-12 pb-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Prescription Created
          </h2>
          <p className="text-slate-600 mb-6">
            The prescription has been saved as a draft. You can sign it later in
            the Patient&apos;s record.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Back to Writer
            </Button>
            <Button
              onClick={() => {
                setSubmitted(false);
                setSelectedPatient("");
              }}
            >
              New Patient
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-sm">
      <CardHeader className="bg-slate-50/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Pill className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Write Prescription</CardTitle>
            <CardDescription>
              Create a new digital prescription for a patient
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Select Patient</Label>
            <Input
              placeholder="Search patient by name or ID..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Search or select patient..." />
              </SelectTrigger>
              <SelectContent>
                {filteredPatients.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}{" "}
                    <span className="text-muted-foreground ml-2">
                      ({p.displayId})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Medication Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="medication">
                  Medication Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="medication"
                  placeholder="e.g. Amoxicillin"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  list="medications-list"
                  required
                />
                <datalist id="medications-list">
                  <option value="Amoxicillin" />
                  <option value="Lisinopril" />
                  <option value="Metformin" />
                  <option value="Atorvastatin" />
                  <option value="Ibuprofen" />
                  <option value="Aspirin" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">
                    Dosage <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dosage"
                    placeholder="e.g. 500mg"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="duration"
                    placeholder="e.g. 7 days"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">
                  Frequency <span className="text-red-500">*</span>
                </Label>
                <Select value={frequency} onValueChange={setFrequency} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Once daily">Once daily (QD)</SelectItem>
                    <SelectItem value="Twice daily">
                      Twice daily (BID)
                    </SelectItem>
                    <SelectItem value="Three times daily">
                      Three times daily (TID)
                    </SelectItem>
                    <SelectItem value="Four times daily">
                      Four times daily (QID)
                    </SelectItem>
                    <SelectItem value="As needed">As needed (PRN)</SelectItem>
                    <SelectItem value="As directed">As directed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions & Notes</Label>
                <Textarea
                  id="instructions"
                  placeholder="Take with food..."
                  className="h-[180px] resize-none"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override">
                  Interaction Override Reason (if needed)
                </Label>
                <Textarea
                  id="override"
                  placeholder="Provide justification if overriding an interaction warning..."
                  className="h-[90px] resize-none"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedPatient("")}
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedPatient ||
                !medicationName ||
                !dosage ||
                !frequency ||
                !duration
              }
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create Prescription
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
