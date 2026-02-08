'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/services/appointments';
import {
    Calendar,
    Clock,
    UserPlus,
    CheckCircle,
    Activity
} from 'lucide-react';

interface DoctorDashboardProps {
    todayAppts: Appointment[];
    totalPatients: number;
    totalAppointments: number;
    loading: boolean;
    onOpenReferral: (item: any) => void;
    formatTime: (time: string) => string;
    getStatusBadge: (status: string) => React.ReactNode;
}

export default function DoctorDashboard({
    todayAppts,
    totalPatients,
    totalAppointments,
    loading,
    onOpenReferral,
    formatTime,
    getStatusBadge
}: DoctorDashboardProps) {

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Today's Appointments</p>
                    <p className="text-4xl font-black text-foreground mt-2">{todayAppts.length}</p>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Patients</p>
                    <p className="text-4xl font-black text-primary mt-2">{totalPatients}</p>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Appointments</p>
                    <p className="text-4xl font-black text-amber-500 mt-2">{totalAppointments}</p>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Completed Today</p>
                    <p className="text-4xl font-black text-green-500 mt-2">
                        {todayAppts.filter(a => a.status === 'completed').length}
                    </p>
                </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                <h3 className="text-xl font-black text-foreground mb-6">Today's Schedule</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
                    </div>
                ) : todayAppts.length > 0 ? (
                    <div className="space-y-4">
                        {todayAppts.map((apt) => (
                            <div
                                key={apt.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border/50 bg-muted/20 rounded-2xl hover:bg-muted/40 transition-colors gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        P
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-lg">Patient #{apt.patient}</p>
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-3 w-3" /> {formatTime(apt.appointment_time)} • {apt.reason || 'Consultation'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(apt.status)}
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-2" onClick={() => onOpenReferral(apt)}>
                                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground font-medium">No appointments scheduled for today</p>
                    </div>
                )}
            </div>
        </div>
    );
}
