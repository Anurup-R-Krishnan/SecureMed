'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Pill,
    Search,
    Plus,
    X,
    CheckCircle2,
    Loader2,
    History
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Patient {
    id: number;
    name: string;
    displayId: string;
}

interface PrescriptionWriterProps {
    patients: Patient[];
    onSuccess?: () => void;
}

export default function PrescriptionWriter({ patients, onSuccess }: PrescriptionWriterProps) {
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [medicationName, setMedicationName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [duration, setDuration] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Recent suggestions (could be fetched from API in full implementation)
    const commonMeds = [
        "Amoxicillin", "Lisinopril", "Metformin", "Atorvastatin", "Ibuprofen"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient || !medicationName || !dosage) return;

        setIsSubmitting(true);
        try {
            await api.post('/medical-records/prescriptions/', {
                patient_id: parseInt(selectedPatient),
                medication_name: medicationName,
                dosage,
                frequency,
                duration,
                instructions,
                status: 'draft'
            });

            setSubmitted(true);
            if (onSuccess) onSuccess();

            // Reset form but keep patient selected for multiple scripts
            setMedicationName('');
            setDosage('');
            setFrequency('');
            setDuration('');
            setInstructions('');

        } catch (error) {
            console.error('Error creating prescription:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card className="max-w-2xl mx-auto border-green-200 bg-green-50/30">
                <CardContent className="pt-12 pb-8 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Prescription Created</h2>
                    <p className="text-slate-600 mb-6">
                        The prescription has been saved as a draft. You can sign it later in the Patient's record.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setSubmitted(false)}>
                            Back to Writer
                        </Button>
                        <Button onClick={() => {
                            setSubmitted(false);
                            setSelectedPatient('');
                        }}>
                            New Patient
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-4xl mx-auto shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Pill className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle>Write Prescription</CardTitle>
                        <CardDescription>Create a new digital prescription for a patient</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Patient Selection */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Select Patient</Label>
                            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search or select patient..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>
                                            {p.name} <span className="text-muted-foreground ml-2">({p.displayId})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quick Add Common Meds */}
                        <div className="space-y-2">
                            <Label>Quick Select</Label>
                            <div className="flex flex-wrap gap-2">
                                {commonMeds.map(med => (
                                    <Button
                                        key={med}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setMedicationName(med)}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        {med}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Medication Details */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="medication">Medication Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="medication"
                                    placeholder="e.g. Amoxicillin"
                                    value={medicationName}
                                    onChange={(e) => setMedicationName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dosage">Dosage <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="dosage"
                                        placeholder="e.g. 500mg"
                                        value={dosage}
                                        onChange={(e) => setDosage(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration</Label>
                                    <Input
                                        id="duration"
                                        placeholder="e.g. 7 days"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="frequency">Frequency</Label>
                                <Select value={frequency} onValueChange={setFrequency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Once daily">Once daily (QD)</SelectItem>
                                        <SelectItem value="Twice daily">Twice daily (BID)</SelectItem>
                                        <SelectItem value="Three times daily">Three times daily (TID)</SelectItem>
                                        <SelectItem value="Four times daily">Four times daily (QID)</SelectItem>
                                        <SelectItem value="As needed">As needed (PRN)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="instructions">Instructions & Notes</Label>
                                <Textarea
                                    id="instructions"
                                    placeholder="Take with food..."
                                    className="h-[180px] resize-none"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <Button type="button" variant="ghost" onClick={() => setSelectedPatient('')}>
                            Reset Form
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !selectedPatient || !medicationName} className="min-w-[140px]">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Create Prescription
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
