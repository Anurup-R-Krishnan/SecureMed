"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export type Patient = {
    id: string | number;
    name: string;
    age?: number;
    status?: 'Admitted' | 'Outpatient' | 'Observation' | 'Referred';
    lastVisit?: string;
    condition?: string;
    referral_id?: string;
    referred_by?: string;
    priority?: string;
    access_expires_at?: string;
}

const statusColors: Record<string, string> = {
    Admitted: 'bg-destructive/20 text-destructive',
    Outpatient: 'bg-accent/20 text-accent',
    Observation: 'bg-yellow-500/20 text-yellow-600',
    Referred: 'bg-primary/20 text-primary',
};

const priorityColors: Record<string, string> = {
    routine: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    urgent: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    emergency: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};


interface PatientColumnsProps {
    onSelectPatient: (patient: Patient) => void;
}

export const getPatientsColumns = ({ onSelectPatient }: PatientColumnsProps): ColumnDef<Patient>[] => [
    {
        accessorKey: "name",
        header: "Patient",
        cell: ({ row }) => {
            const patient = row.original;
            return (
                <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.condition}</p>
                </div>
            )
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status || 'Referred']}`}>
                    {status}
                </span>
            )
        }
    },
    {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
            const priority = row.getValue("priority") as string;
            return priority ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[priority]}`}>
                    {priority}
                </span>
            ) : null;
        }
    },
    {
        accessorKey: "referred_by",
        header: "Referred By",
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("referred_by") || '-'}</span>
    },
    {
        accessorKey: "access_expires_at",
        header: "Access Expires",
        cell: ({ row }) => {
            const date = row.getValue("access_expires_at") as string;
            return (
                <span className="text-muted-foreground text-sm">
                    {date ? new Date(date).toLocaleDateString() : '-'}
                </span>
            )
        }
    },
    {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
            const patient = row.original
            return (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectPatient(patient)}
                >
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            )
        },
    },
]
