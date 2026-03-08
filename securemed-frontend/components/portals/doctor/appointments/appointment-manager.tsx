'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/services/appointments';
import { Calendar } from 'lucide-react';

interface AppointmentManagerProps {
    appointments: Appointment[];
    loading: boolean;
    onOpenReferral: (appt: Appointment) => void;
    onAcceptAppointment: (appt: Appointment) => void;
    onVideoCall?: (appt: Appointment) => void;
    formatTime: (time: string) => string;
    getStatusBadge: (status: string) => React.ReactNode;
}

export default function AppointmentManager({
    appointments,
    loading,
    onOpenReferral,
    onAcceptAppointment,
    onVideoCall,
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
                                <p className="font-bold text-foreground text-lg">{apt.patient_name || `Patient #${apt.patient}`}</p>
                                <p className="text-sm text-muted-foreground mt-1">{apt.appointment_date} at {formatTime(apt.appointment_time)} • {apt.reason}</p>
                            </div>
                            <div className="flex gap-3 mt-4 md:mt-0">
                                {getStatusBadge(apt.status)}

                                {apt.status === 'scheduled' && (
                                    <Button
                                        size="sm"
                                        className="font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                                        onClick={() => onAcceptAppointment(apt)}
                                    >
                                        Accept
                                    </Button>
                                )}

                                {apt.status === 'confirmed' && (
                                    <>
                                        <Button
                                            size="sm"
                                            className="font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                                            onClick={() => onAcceptAppointment(apt)}
                                        >
                                            Start Consult
                                        </Button>
                                        {onVideoCall && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="font-bold rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                                                onClick={() => onVideoCall(apt)}
                                            >
                                                Video Call
                                            </Button>
                                        )}
                                    </>
                                )}




                                {apt.status === 'in_progress' && (
                                    <Button
                                        size="sm"
                                        className="font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
                                        onClick={() => onAcceptAppointment(apt)}
                                    >
                                        Complete
                                    </Button>
                                )}

                                <Button variant="outline" size="sm" className="font-bold rounded-xl" onClick={() => onOpenReferral(apt)}>
                                    Refer
                                </Button>
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
