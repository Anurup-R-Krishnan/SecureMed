'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Lock, UserX } from 'lucide-react';

interface Patient {
    id: number;
    user: {
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
    };
    date_of_birth: string;
    phone_number: string;
    blood_group?: string;
}

interface PatientManagerProps {
    patients: Patient[];
    onViewPatient?: (patientId: number) => void;
}

export default function PatientManager({ patients, onViewPatient }: PatientManagerProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Patient Registry</h3>
                <div className="flex gap-2">
                    <Button variant="outline">Export Data</Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Phone</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">DOB</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.length > 0 ? (
                            patients.map((patient) => (
                                <tr key={patient.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 text-muted-foreground font-mono">{patient.id}</td>
                                    <td className="py-3 px-4 font-medium text-foreground">
                                        {patient.user.first_name} {patient.user.last_name}
                                        {!patient.user.first_name && !patient.user.last_name && patient.user.username}
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">{patient.user.email}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{patient.phone_number || 'N/A'}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{patient.date_of_birth || 'N/A'}</td>
                                    <td className="py-3 px-4">
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
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="h-8 w-8 opacity-20" />
                                        <p>No patients found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
