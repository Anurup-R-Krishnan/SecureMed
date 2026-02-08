"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { Referral } from '@/services/referrals'

const priorityColors: Record<string, string> = {
    routine: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    urgent: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    emergency: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

interface ReferralColumnsProps {
    onAccept: (id: number) => void;
    onDecline: (id: number) => void;
}

export const getReferralsColumns = ({ onAccept, onDecline }: ReferralColumnsProps): ColumnDef<Referral>[] => [
    {
        accessorKey: "patient_name",
        header: "Patient",
        cell: ({ row }) => (
            <div>
                <p className="font-medium text-foreground">{row.original.patient_name}</p>
                <p className="text-xs text-muted-foreground">{row.original.patient_display_id}</p>
            </div>
        )
    },
    {
        accessorKey: "referring_doctor_name",
        header: "Referred By",
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("referring_doctor_name")}</span>
    },
    {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[row.original.priority]}`}>
                {row.original.priority_display}
            </span>
        )
    },
    {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => <span className="text-sm text-muted-foreground line-clamp-2">{row.getValue("reason")}</span>
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={() => onAccept(row.original.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDecline(row.original.id)}
                >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                </Button>
            </div>
        )
    }
]
