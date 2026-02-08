'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    ShieldAlert,
    UserPlus,
    Search,
    Filter
} from 'lucide-react';

export interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
    lastVisit: string;
    condition: string;
    status: string;
}

interface PatientManagerProps {
    patients: DoctorPatient[];
    loading: boolean;
    onEmergencyAccess: (patient: DoctorPatient) => void;
    onRefer: (patient: DoctorPatient) => void;
    onViewPatient?: (patient: DoctorPatient) => void;
}

export default function PatientManager({
    patients,
    loading,
    onEmergencyAccess,
    onRefer,
    onViewPatient
}: PatientManagerProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.displayId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-card p-8 rounded-[32px] border border-border overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-black text-foreground">Patient Directory</h3>
                    <p className="text-muted-foreground text-sm">Manage your assigned patients</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-sidebar-border"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="shrink-0">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" className="font-bold shrink-0" onClick={() => onEmergencyAccess({} as any)}>
                        {/* Note: onEmergencyAccess might expect a patient, but the global button passes empty/dummy to trigger modal with empty selection */}
                        <ShieldAlert className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Emergency Access</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
                </div>
            ) : filteredPatients.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left py-4 px-6 font-bold text-foreground uppercase tracking-wider text-xs">Patient ID</th>
                                <th className="text-left py-4 px-6 font-bold text-foreground uppercase tracking-wider text-xs">Name</th>
                                <th className="text-left py-4 px-6 font-bold text-foreground uppercase tracking-wider text-xs">Last Visit</th>
                                <th className="text-left py-4 px-6 font-bold text-foreground uppercase tracking-wider text-xs">Status</th>
                                <th className="text-left py-4 px-6 font-bold text-foreground uppercase tracking-wider text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="py-4 px-6 text-muted-foreground font-mono">{patient.displayId}</td>
                                    <td className="py-4 px-6 font-bold text-foreground">{patient.name}</td>
                                    <td className="py-4 px-6 text-muted-foreground">{patient.lastVisit}</td>
                                    <td className="py-4 px-6">
                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-500/10 text-green-700">
                                            {patient.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="font-bold text-primary hover:text-primary/80"
                                                onClick={() => onViewPatient && onViewPatient(patient)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => onEmergencyAccess(patient)}
                                                title="Emergency Access"
                                            >
                                                <ShieldAlert className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                onClick={() => onRefer(patient)}
                                                title="Refer Patient"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No patients found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );
}
