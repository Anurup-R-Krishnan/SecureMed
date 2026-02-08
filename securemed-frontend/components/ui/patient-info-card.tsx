"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Activity, Clock } from "lucide-react"

export interface PatientInfoProps {
    patient: {
        id: string | number;
        name: string;
        age?: number;
        gender?: string;
        dob?: string;
        bloodType?: string;
        status?: string;
        lastVisit?: string;
        condition?: string;
        allergies?: string[];
        mrn?: string;
    }
}

export function PatientInfoCard({ patient }: PatientInfoProps) {
    return (
        <div className="space-y-6">
            <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-bold">{patient.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                ID: {patient.mrn || `P${patient.id}`}
                            </p>
                        </div>
                        {patient.status && (
                            <Badge variant={patient.status === 'Admitted' ? 'destructive' : 'outline'}>
                                {patient.status}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Age/Gender</span>
                            <div className="flex items-center gap-2 font-medium">
                                <User className="h-4 w-4 text-primary" />
                                {patient.age ? `${patient.age} yrs` : 'N/A'}
                                {patient.gender ? ` / ${patient.gender}` : ''}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date of Birth</span>
                            <div className="flex items-center gap-2 font-medium">
                                <Calendar className="h-4 w-4 text-primary" />
                                {patient.dob || 'N/A'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Blood Type</span>
                            <div className="flex items-center gap-2 font-medium">
                                <Activity className="h-4 w-4 text-destructive" />
                                {patient.bloodType || 'N/A'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Last Visit</span>
                            <div className="flex items-center gap-2 font-medium">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {patient.lastVisit || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {patient.condition && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-2">Primary Condition</span>
                            <p className="font-medium text-foreground">{patient.condition}</p>
                        </div>
                    )}

                    {patient.allergies && patient.allergies.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-2">Allergies</span>
                            <div className="flex flex-wrap gap-2">
                                {patient.allergies.map((allergy, index) => (
                                    <Badge key={index} variant="secondary" className="text-destructive bg-destructive/10 border-destructive/20">
                                        {allergy}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
