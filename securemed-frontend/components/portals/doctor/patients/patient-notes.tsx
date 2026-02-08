'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    User,
    Calendar,
    Clock,
    FileText,
    Save,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import AIDecisionSupport from './ai-decision-support';
import { AIDiagnosisSuggestion } from '@/lib/types';

interface PatientNotesProps {
    patient: {
        id: string;
        name: string;
        age: number;
        gender: string;
        dateOfBirth: string;
        bloodType: string;
        allergies: string[];
        medicalHistory: string[];
    };
}

export default function PatientNotes({ patient }: PatientNotesProps) {
    const [notes, setNotes] = useState('');
    const [finalDiagnosis, setFinalDiagnosis] = useState('');
    const [acceptedSuggestions, setAcceptedSuggestions] = useState<AIDiagnosisSuggestion[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    if (!patient) {
        return (
            <Card className="p-6 text-center text-muted-foreground">
                <p>No patient selected. Please select a patient to view notes.</p>
            </Card>
        );
    }

    const handleAcceptSuggestion = (suggestion: AIDiagnosisSuggestion) => {
        if (!acceptedSuggestions.find(s => s.id === suggestion.id)) {
            setAcceptedSuggestions([...acceptedSuggestions, suggestion]);
            // Optionally auto-fill diagnosis
            if (!finalDiagnosis) {
                setFinalDiagnosis(suggestion.diagnosis);
            }
        }
    };

    const handleRejectSuggestion = (suggestion: AIDiagnosisSuggestion) => {
        setAcceptedSuggestions(acceptedSuggestions.filter(s => s.id !== suggestion.id));
    };

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-6">
            {/* AI Disclaimer Banner */}
            <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">
                            Important Notice
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            This consultation screen includes AI-assisted decision support.
                            AI suggestions are for reference only and do not replace clinical judgment.
                            The final diagnosis must always be determined by the attending physician.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Patient Information */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Patient Information
                </h3>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Patient Name</p>
                        <p className="font-medium text-foreground">{patient.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Patient ID</p>
                        <p className="font-medium text-foreground">{patient.id}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Age / Gender</p>
                        <p className="font-medium text-foreground">{patient.age} years / {patient.gender}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Blood Type</p>
                        <p className="font-medium text-foreground">{patient.bloodType}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Known Allergies</p>
                        <div className="flex flex-wrap gap-1">
                            {patient.allergies.map((allergy: string) => (
                                <span
                                    key={allergy}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded"
                                >
                                    {allergy}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Medical History</p>
                        <div className="flex flex-wrap gap-1">
                            {patient.medicalHistory.map((condition: string) => (
                                <span
                                    key={condition}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                                >
                                    {condition}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Consultation Details */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Current Consultation
                </h3>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium text-foreground">Follow-up Consultation</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium text-foreground">Cardiology</p>
                    </div>
                </div>
            </Card>

            {/* AI Decision Support */}
            <AIDecisionSupport
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
            />

            {/* Notes and Final Diagnosis */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Clinical Notes & Diagnosis
                </h3>

                {/* Accepted AI Suggestions */}
                {acceptedSuggestions.length > 0 && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                            Accepted AI Suggestions (for reference):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {acceptedSuggestions.map((suggestion) => (
                                <span
                                    key={suggestion.id}
                                    className="text-xs px-2 py-1 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 rounded"
                                >
                                    {suggestion.diagnosis} ({suggestion.icdCode})
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Clinical Notes */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Observations & Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter clinical observations, symptoms, examination findings..."
                        className="w-full h-32 px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                </div>

                {/* Final Diagnosis */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Final Diagnosis (Doctor's Decision)
                    </label>
                    <input
                        type="text"
                        value={finalDiagnosis}
                        onChange={(e) => setFinalDiagnosis(e.target.value)}
                        placeholder="Enter final diagnosis here..."
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        The final diagnosis is always under your control. AI suggestions are only for reference.
                    </p>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving || !finalDiagnosis}
                        className="flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Clock className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Consultation
                            </>
                        )}
                    </Button>

                    {saved && (
                        <span className="text-sm text-green-600 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle className="h-4 w-4" />
                            Saved successfully
                        </span>
                    )}
                </div>
            </Card>
        </div>
    );
}
