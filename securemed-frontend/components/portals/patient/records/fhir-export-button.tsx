'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileJson, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

// Backend API URL
const API_BASE_URL = 'http://localhost:8000/api';

interface ExportState {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    resourceCount?: number;
}

export default function FHIRExportButton() {
    const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });

    const handleExport = async () => {
        setExportState({ status: 'loading' });

        try {
            // Call Django backend for FHIR export
            const response = await fetch(`${API_BASE_URL}/patient/export/fhir/?patient_id=P12345`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const fhirData = await response.json();

            // Create download
            const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/fhir+json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `medical-history-FHIR-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setExportState({
                status: 'success',
                message: 'Medical history exported successfully from backend',
                resourceCount: fhirData.total,
            });

            // Reset to idle after 5 seconds
            setTimeout(() => {
                setExportState({ status: 'idle' });
            }, 5000);
        } catch (error) {
            setExportState({
                status: 'error',
                message: error instanceof Error ? error.message : 'Export failed',
            });

            // Reset to idle after 5 seconds
            setTimeout(() => {
                setExportState({ status: 'idle' });
            }, 5000);
        }
    };

    return (
        <div className="space-y-3">
            <Button
                onClick={handleExport}
                disabled={exportState.status === 'loading'}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
            >
                {exportState.status === 'loading' ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exporting from backend...
                    </>
                ) : (
                    <>
                        <FileJson className="h-4 w-4" />
                        Download Medical History (FHIR)
                    </>
                )}
            </Button>

            {/* Export Status Message */}
            {exportState.status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                        {exportState.message}
                        {exportState.resourceCount && ` (${exportState.resourceCount} resources)`}
                    </span>
                </div>
            )}

            {exportState.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{exportState.message}</span>
                </div>
            )}

            {/* FHIR Info */}
            <p className="text-xs text-muted-foreground">
                Export your complete medical history in HL7 FHIR R4 format from Django backend.
                Includes visits, diagnoses, lab results, and medications.
            </p>
        </div>
    );
}
