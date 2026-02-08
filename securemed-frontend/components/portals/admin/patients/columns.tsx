"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Lock, UserX, MoreHorizontal } from "lucide-react"

export type Patient = {
    id: number
    user: {
        username: string
        email: string
        first_name?: string
        last_name?: string
    }
    date_of_birth: string
    phone_number: string
    blood_group?: string
}

interface PatientColumnsProps {
    onViewPatient?: (patientId: number) => void;
}

export const getColumns = ({ onViewPatient }: PatientColumnsProps): ColumnDef<Patient>[] => [
    {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.getValue("id")}</span>,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const user = row.original.user;
            return (
                <span className="font-medium">
                    {user.first_name} {user.last_name}
                    {!user.first_name && !user.last_name && user.username}
                </span>
            )
        },
    },
    {
        accessorKey: "user.email",
        header: "Email",
    },
    {
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row }) => row.getValue("phone_number") || "N/A",
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Reset Password">
                        <Lock className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Deactivate User">
                        <UserX className="h-4 w-4" />
                    </Button>
                </div>
            )
        },
    },
]
