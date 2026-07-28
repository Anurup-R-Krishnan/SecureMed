"use client";

import { Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Lock, UserX } from "lucide-react";

export type Patient = {
  id: number;
  patient_id?: string;
  user_id?: number;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_is_active?: boolean;
  date_of_birth: string;
  phone?: string;
  blood_group?: string;
};

interface PatientColumnsProps {
  onViewPatient?: (patientId: number) => void;
  onResetPassword?: (patient: Patient) => void;
  onToggleActive?: (patient: Patient) => void;
}

export const getColumns = ({
  onViewPatient,
  onResetPassword,
  onToggleActive,
}: PatientColumnsProps): Column<Patient>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: (patient) => (
      <span className="font-mono text-muted-foreground">
        {patient.id}
      </span>
    ),
  },
  {
    accessorKey: "patient_id",
    header: "Patient ID",
    cell: (patient) => (
      <span className="font-mono text-muted-foreground">
        {patient.patient_id || "N/A"}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: (patient) => {
      const fullName = [
        patient.user_first_name,
        patient.user_last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const fallback = `Patient #${patient.id}`;
      return <span className="font-medium">{fullName || fallback}</span>;
    },
  },
  {
    accessorKey: "user_email",
    header: "Email",
    cell: (patient) => patient.user_email || "N/A",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: (patient) => patient.phone || "N/A",
  },
  {
    accessorKey: "date_of_birth",
    header: "DOB",
    cell: (patient) => patient.date_of_birth || "N/A",
  },
  {
    header: "Actions",
    cell: (patient) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewPatient && onViewPatient(patient.id)}
        >
          View Details
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          title="Reset Password"
          onClick={() => onResetPassword && onResetPassword(patient)}
          disabled={!patient.user_id}
        >
          <Lock className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          title={
            patient.user_is_active === false
              ? "Activate User"
              : "Deactivate User"
          }
          onClick={() => onToggleActive && onToggleActive(patient)}
          disabled={!patient.user_id}
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
