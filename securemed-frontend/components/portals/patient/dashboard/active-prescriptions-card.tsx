'use client';

import { Card } from '@/components/ui/card';
import { Pill, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Prescription {
    id: number;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    start_date: string | null;
    refills_remaining: number;
    prescribing_doctor: string;
    status: string;
}

interface ActivePrescriptionsCardProps {
    prescriptions: Prescription[];
    onNavigate: (tab: any) => void;
}

export default function ActivePrescriptionsCard({ prescriptions, onNavigate }: ActivePrescriptionsCardProps) {
    if (!prescriptions || prescriptions.length === 0) {
        return (
            <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Pill className="h-5 w-5 text-emerald-500" />
                        Active Prescriptions
                    </h3>
                </div>
                <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>No active prescriptions</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => onNavigate('records')}
                    >
                        View Medical Records
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5 text-emerald-500" />
                    Active Prescriptions
                </h3>
                <Button
                    variant="link"
                    className="text-primary text-sm h-auto p-0"
                    onClick={() => onNavigate('medical-records')}
                >
                    View all
                </Button>
            </div>

            <div className="space-y-3">
                {prescriptions.map((rx) => (
                    <div
                        key={rx.id}
                        className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <h4 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                                    {rx.medication_name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {rx.dosage} • {rx.frequency}
                                </p>
                            </div>
                            <Badge
                                variant={rx.status === 'signed' ? 'default' : 'secondary'}
                                className="ml-2"
                            >
                                {rx.status}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{rx.prescribing_doctor}</span>
                            </div>
                            {rx.refills_remaining > 0 && (
                                <span className="text-xs font-medium text-emerald-400">
                                    {rx.refills_remaining} refill{rx.refills_remaining > 1 ? 's' : ''} left
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
