'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import MedicalRecords from '@/components/portals/patient/records/medical-records';
import { UploadRecordDialog } from '@/components/portals/patient/records/upload-record-dialog';
import { Plus, FileText } from 'lucide-react';

export default function MedicalRecordsPage() {
    const { user, isLoading } = useAuth();
    const [recordsKey, setRecordsKey] = useState(0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    // We expect user to have a patient ID
    const patientId = user?.patient_profile?.patient_id || '';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">Medical Records</h3>
                    <p className="text-muted-foreground">View and manage your health history</p>
                </div>
                <div className="flex gap-2">
                    <UploadRecordDialog onRecordUploaded={() => setRecordsKey((prev) => prev + 1)} />
                </div>
            </div>

            <MedicalRecords key={recordsKey} patientId={patientId} />
        </div>
    );
}
