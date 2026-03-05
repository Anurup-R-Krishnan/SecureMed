'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, AlertCircle, Loader2, FileArchive } from 'lucide-react';
import { API_BASE_URL } from '@/lib/urls';
import { PDFService, PatientSummaryData } from '@/lib/export/pdf-service';
import { ZIPService } from '@/lib/export/zip-service';

interface ExportState {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
}

interface FHIRExportButtonProps {
    patientId?: string;
}

export default function FHIRExportButton({ patientId }: FHIRExportButtonProps) {
    const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });

    const processFHIRToSummaryData = (fhirData: any): PatientSummaryData => {
        const entries = fhirData.entry || [];
        const patientEntry = entries.find((e: any) => e.resource.resourceType === 'Patient');
        const p = patientEntry?.resource || {};
        const name = p.name?.[0];

        let nextStepsData = { date: 'N/A', reason: 'N/A' };

        const conditions = entries
            .filter((e: any) => e.resource.resourceType === 'Condition')
            .map((e: any) => {
                const c = e.resource;
                let clarityData = null;
                const extension = c.extension?.find((ex: any) => ex.url === 'http://securemed.ai/fhir/StructureDefinition/clarity-summary');
                if (extension?.valueString) {
                    try {
                        clarityData = JSON.parse(extension.valueString);
                        // Extract next steps if found in any condition's clarity summary
                        if (clarityData?.next_visit && (nextStepsData.date === 'N/A' || nextStepsData.date === 'To be scheduled')) {
                            nextStepsData = {
                                date: clarityData.next_visit.date || 'To be scheduled',
                                reason: clarityData.next_visit.reason || 'Follow-up'
                            };
                        }
                    } catch (err) {
                        console.error("Failed to parse clarity summary", err);
                    }
                }

                return {
                    title: c.code?.text || 'Condition',
                    recordedDate: c.recordedDate || 'Unknown',
                    explanation: clarityData?.condition?.what_it_is,
                    lifestyle: clarityData?.lifestyle?.advice,
                    watchOut: clarityData?.watch_for?.warning_signs
                };
            });

        const medications = entries
            .filter((e: any) => e.resource.resourceType === 'MedicationRequest')
            .map((e: any) => {
                const m = e.resource;
                const dosageText = m.dosageInstruction?.[0]?.text || '';
                return {
                    name: m.medicationCodeableConcept?.text || 'Medication',
                    dosage: m.medicationCodeableConcept?.text.split(' ').pop() || '',
                    frequency: dosageText.split('for')[0]?.trim() || 'As directed',
                    duration: dosageText.split('for')[1]?.trim() || '',
                    purpose: 'Prescribed by ' + (m.requester?.display || 'Healthcare Provider')
                };
            });

        return {
            patientName: `${name?.given?.join(' ')} ${name?.family}`.trim() || 'Patient',
            dob: p.birthDate || 'N/A',
            conditions,
            medications,
            nextSteps: nextStepsData
        };
    };

    const handleExport = async () => {
        setExportState({ status: 'loading' });

        try {
            const requestUrl = patientId
                ? `${API_BASE_URL}/patient/export/fhir/?patient_id=${patientId}`
                : `${API_BASE_URL}/patient/export/fhir/`;

            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Technical failure (HTTP ${response.status})`);
            }

            const fhirData = await response.json();
            const summaryData = processFHIRToSummaryData(fhirData);

            // Generate PDFs
            const summaryBlob = PDFService.generateSummaryPDF(summaryData);
            const medsBlob = PDFService.generateMedicationPDF(summaryData);

            // Bundle in ZIP
            await ZIPService.generateAndDownloadArchive(summaryData.patientName, [
                { name: 'Your_Health_Summary.pdf', content: summaryBlob, folder: 'Summaries' },
                { name: 'Your_Medication_List.pdf', content: medsBlob, folder: 'Medications' },
                { name: 'Raw_FHIR_Report.json', content: new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' }) }
            ]);

            setExportState({
                status: 'success',
                message: 'Health archive downloaded successfully',
            });

            setTimeout(() => setExportState({ status: 'idle' }), 5000);
        } catch (error) {
            setExportState({
                status: 'error',
                message: error instanceof Error ? error.message : 'Download failed',
            });
            setTimeout(() => setExportState({ status: 'idle' }), 5000);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <Button
                onClick={handleExport}
                disabled={exportState.status === 'loading'}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-none shadow-lg w-fit transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
                {exportState.status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileArchive className="h-4 w-4" />
                )}
                Download Health Archive
            </Button>

            {exportState.status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-semibold animate-in fade-in slide-in-from-top-2 duration-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>Archive ready! Check your downloads</span>
                </div>
            )}

            {exportState.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>{exportState.message}</span>
                </div>
            )}
        </div>
    );
}
