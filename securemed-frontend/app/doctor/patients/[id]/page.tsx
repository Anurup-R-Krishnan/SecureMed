"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";
import PatientProfileView from "@/components/portals/doctor/patients/patient-profile-view";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !patientId) return;

    const fetchPatientData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/patients/${patientId}/`);
        const userData = response.data;
        const parseList = (value: string | null | undefined) => {
          if (!value) return [];
          return value
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean);
        };

        // Transform API data to Match Patient Interface expected by PatientProfileView
        setPatient({
          id: userData.id,
          name: `${userData.user_first_name} ${userData.user_last_name}`.trim(),
          age: calculateAge(userData.date_of_birth),
          status: "Outpatient", // Default or derive if available
          lastVisit: userData.last_visit || "N/A",
          condition: userData.chronic_conditions || "None listed",
          gender: userData.gender || "Unknown",
          dateOfBirth: userData.date_of_birth || "Unknown",
          bloodType: userData.blood_group || "Unknown",
          allergies: parseList(userData.allergies),
          medicalHistory: parseList(userData.chronic_conditions),
        });
      } catch (err: any) {
        setError("Failed to load patient details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [isAuthenticated, patientId]);

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground">Loading patient details...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h3 className="text-xl font-bold mb-2">Patient Not Found</h3>
        <p className="text-muted-foreground mb-6">
          {error || "Could not retrieve patient information."}
        </p>
        <Button onClick={() => router.push("/doctor/patients")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients List
        </Button>
      </div>
    );
  }

  return (
    <PatientProfileView
      patient={{
        id: String(patient.id),
        name: patient.name,
        age: patient.age,
        status: patient.status,
        lastVisit: patient.lastVisit,
        condition: patient.condition,
      }}
      onBack={() => router.push("/doctor/patients")}
    />
  );
}
