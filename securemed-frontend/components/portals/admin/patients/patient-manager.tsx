'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Patient, getColumns } from './columns';



interface PatientManagerProps {
    patients: Patient[];
    onViewPatient?: (patientId: number) => void;
}

export default function PatientManager({ patients, onViewPatient }: PatientManagerProps) {
    const columns = getColumns({ onViewPatient });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Patient Registry</h3>
                <div className="flex gap-2">
                    <Button variant="outline">Export Data</Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border">
                <DataTable columns={columns} data={patients} />
            </div>
        </div>
    );
}
