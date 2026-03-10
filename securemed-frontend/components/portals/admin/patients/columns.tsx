"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Lock, UserX } from "lucide-react"

export type Patient = {
    id: number
    patient_id?: string
    user_id?: number
    user_email?: string
    user_first_name?: string
    user_last_name?: string
    user_is_active?: boolean
    date_of_birth: string
    phone?: string
    blood_group?: string
}

interface PatientColumnsProps {
    onViewPatient?: (patientId: number) => void;
    onResetPassword?: (patient: Patient) => void;
    onToggleActive?: (patient: Patient) => void;
}

export const getColumns = ({ onViewPatient, onResetPassword, onToggleActive }: PatientColumnsProps): ColumnDef<Patient>[] => [
    {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue("id")}</span>,
    },
    {
        accessorKey: "patient_id",
        header: "Patient ID",
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.patient_id || "N/A"}</span>,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const fullName = [row.original.user_first_name, row.original.user_last_name].filter(Boolean).join(" ").trim();
            const fallback = `Patient #${row.original.id}`;
            return (
                <span className="font-medium">
                    {fullName || fallback}
                </span>
            )
        },
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.user_email || "N/A",
    },
    {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.getValue("phone") || "N/A",
    },
    {
        accessorKey: "date_of_birth",
        header: "DOB",
        cell: ({ row }) => row.getValue("date_of_birth") || "N/A",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const patient = row.original

            return (
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
                        title={patient.user_is_active === false ? "Activate User" : "Deactivate User"}
                        onClick={() => onToggleActive && onToggleActive(patient)}
                        disabled={!patient.user_id}
                    >
                        <UserX className="h-4 w-4" />
                    </Button>
                </div>
            )
        },
    },
]
