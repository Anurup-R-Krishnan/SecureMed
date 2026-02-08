'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/services/appointments';
import { Calendar } from 'lucide-react';

interface AppointmentManagerProps {
    appointments: Appointment[];
    loading: boolean;
    onOpenReferral: (appt: Appointment) => void;
    formatTime: (time: string) => string;
    getStatusBadge: (status: string) => React.ReactNode;
}

export default function AppointmentManager({
    appointments,
    loading,
    onOpenReferral,
    formatTime,
    getStatusBadge
}: AppointmentManagerProps) {

    return (
        <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">All Appointments</h3>
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
                </div>
            ) : appointments.length > 0 ? (
                <div className="space-y-4">
                    {appointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between p-6 border border-border/50 bg-background rounded-2xl shadow-sm"
                        >
                            <div>
                                <p className="font-bold text-foreground text-lg">Patient #{apt.patient}</p>
                                <p className="text-sm text-muted-foreground mt-1">{apt.appointment_date} at {formatTime(apt.appointment_time)} • {apt.reason}</p>
                            </div>
                            <div className="flex gap-3 mt-4 md:mt-0">
                                {getStatusBadge(apt.status)}
                                <Button variant="outline" size="sm" className="font-bold rounded-xl" onClick={() => onOpenReferral(apt)}>
                                    Refer
                                </Button>
                                <Button size="sm" className="font-bold rounded-xl shadow-lg shadow-primary/20">Start Consultation</Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No appointments found</p>
                </div>
            )}
        </div>
    );
}
