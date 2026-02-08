'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Droplet,
    AlertTriangle,
    Phone,
    User,
    Calendar,
    Loader2
} from 'lucide-react';
import { getPatientProfile, referPatient } from '@/lib/services/clinical-service';
import { PatientQuickSummary as PatientSummaryType } from '@/lib/types/patient-summary';
import { Button } from '@/components/ui/button';

interface PatientQuickSummaryProps {
    patientId: string;
    doctorId: string;
    doctorName?: string;
}

export default function PatientQuickSummary({ patientId, doctorId, doctorName = 'Dr. Sarah Smith' }: PatientQuickSummaryProps) {
    const [summary, setSummary] = useState<PatientSummaryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSummary = async () => {
            setLoading(true);
            setError(null);
            try {
                const p = await getPatientProfile(patientId);
                if (p) {
                    setSummary({
                        patientId: p.id.toString(),
                        patientName: p.name,
                        bloodGroup: p.blood_group,
                        knownAllergies: p.known_allergies || [],
                        emergencyContact: p.emergency_contact,
                        lastUpdated: p.last_updated
                    });
                } else {
                    setError('Unable to access patient summary');
                }
            } catch (err) {
                setError('Failed to load patient summary');
                console.error('Error loading patient summary:', err);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            loadSummary();
        }
    }, [patientId, doctorId]);

    if (loading) {
        return (
            <Card className="p-4 bg-gradient-to-r from-card to-muted/30">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading patient summary...</span>
                </div>
            </Card>
        );
    }

    if (error || !summary) {
        return (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{error || 'Patient summary not available'}</span>
                </div>
            </Card>
        );
    }

    // Determine blood group color for visual emphasis
    const getBloodGroupColor = (bloodGroup: string) => {
        const negativeTypes = ['A-', 'B-', 'AB-', 'O-'];
        if (bloodGroup === 'O-') return 'bg-red-100 text-red-800 border-red-200'; // Universal donor - critical
        if (negativeTypes.includes(bloodGroup)) return 'bg-amber-100 text-amber-800 border-amber-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    // Determine allergy severity color
    const getAllergyColor = (allergy: string) => {
        const severeAllergens = ['Penicillin', 'Peanuts', 'Shellfish', 'Latex'];
        if (severeAllergens.some(a => allergy.toLowerCase().includes(a.toLowerCase()))) {
            return 'bg-red-100 text-red-800 border-red-200';
        }
        return 'bg-orange-100 text-orange-800 border-orange-200';
    };

    return (
        <Card className="p-4 bg-gradient-to-r from-card via-card to-muted/20 border-l-4 border-l-primary">
            <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Patient Name & ID */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{summary.patientName}</h3>
                        <p className="text-xs text-muted-foreground">ID: {summary.patientId}</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Blood Group */}
                    <div className="flex items-center gap-2">
                        <Droplet className="h-4 w-4 text-red-500" />
                        <Badge
                            variant="outline"
                            className={`font-bold ${getBloodGroupColor(summary.bloodGroup)}`}
                        >
                            {summary.bloodGroup}
                        </Badge>
                    </div>

                    {/* Allergies */}
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <div className="flex flex-wrap gap-1">
                            {summary.knownAllergies.length > 0 ? (
                                summary.knownAllergies.map((allergy, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className={getAllergyColor(allergy)}
                                    >
                                        {allergy}
                                    </Badge>
                                ))
                            ) : (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    No Known Allergies
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    {summary.emergencyContact && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {summary.emergencyContact}
                            </span>
                        </div>
                    )}

                    {/* Last Updated */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
                        <Calendar className="h-3 w-3" />
                        <span>Updated: {new Date(summary.lastUpdated).toLocaleDateString()}</span>
                    </div>

                </div>
            </div>
        </Card>
    );
}
