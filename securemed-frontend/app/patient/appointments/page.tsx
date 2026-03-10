'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Calendar, Video } from 'lucide-react';
import AppointmentBooking from '@/components/portals/patient/appointments/appointment-booking';
import MyAppointments from '@/components/portals/patient/appointments/my-appointments';
import WaitingRoom from '@/components/telemedicine/waiting-room';
import VideoRoom from '@/components/telemedicine/video-room';
import { appointmentService } from '@/services/appointments';
import { videoService } from '@/services/telemedicine';
import { useToast } from '@/hooks/use-toast';

function AppointmentsContent() {
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialDoctorId = searchParams.get('doctorId') || undefined;
    const initialDoctorName = searchParams.get('doctorName') || undefined;
    const autoJoin = searchParams.get('join') === '1';

    const [nextAppointment, setNextAppointment] = useState<any>(null);

    // Telemedicine State
    const [showTelemed, setShowTelemed] = useState(false);
    const [telemedStatus, setTelemedStatus] = useState<'waiting' | 'in-call'>('waiting');
    const [activeRoomId, setActiveRoomId] = useState<string>('');

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchNextAppointment = async () => {
            try {
                const appts = await appointmentService.getAppointments();
                const now = new Date();
                const upcoming = appts
                    .filter((apt: any) => {
                        const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
                        return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
                    })
                    .sort((a: any, b: any) => {
                        const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
                        const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
                        return dateA.getTime() - dateB.getTime();
                    });
                if (upcoming.length > 0) {
                    const next = upcoming[0];
                    setNextAppointment(next);
                    try {
                        const room = await videoService.getActiveRoom(next.patient);
                        setActiveRoomId(room?.room_id || '');
                    } catch {
                        setActiveRoomId('');
                    }
                }
            } catch (e) {
                console.error('Failed to fetch upcoming appointment:', e);
            }
        };

        fetchNextAppointment();
    }, [isAuthenticated]);

    const handleJoinTelemed = useCallback(async () => {
        if (!nextAppointment) return;
        let roomId = activeRoomId;
        if (!roomId) {
            try {
                const room = await videoService.getActiveRoom(nextAppointment.patient);
                roomId = room?.room_id || '';
                setActiveRoomId(roomId);
            } catch {
                roomId = '';
            }
        }

        if (!roomId) {
            toast({
                title: 'Waiting room not ready',
                description: 'Your doctor has not started the room yet. Please try again shortly.',
                variant: 'destructive'
            });
            return;
        }

        setShowTelemed(true);
        setTelemedStatus('waiting');
    }, [activeRoomId, nextAppointment, toast]);

    useEffect(() => {
        if (autoJoin && nextAppointment) {
            handleJoinTelemed();
        }
    }, [autoJoin, nextAppointment, handleJoinTelemed]);

    if (showTelemed) {
        return (
            <div className="bg-card rounded-lg border border-border overflow-hidden h-[min(80vh,800px)]">
                {telemedStatus === 'waiting' ? (
                    <WaitingRoom
                        roomId={activeRoomId}
                        doctorName={nextAppointment?.doctor_name || 'Doctor'}
                        onAdmitted={() => setTelemedStatus('in-call')}
                        onCancel={() => setShowTelemed(false)}
                    />
                ) : (
                    <VideoRoom
                        roomId={activeRoomId}
                        userRole="patient"
                        onEndCall={() => setShowTelemed(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Teleconsultation Banner */}
            {nextAppointment && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 flex items-center justify-between flex-wrap gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Upcoming Teleconsultation</h3>
                            <p className="text-muted-foreground">
                                {nextAppointment.doctor_name || 'Doctor'} • {new Date(`${nextAppointment.appointment_date}T${nextAppointment.appointment_time}`).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleJoinTelemed}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                    >
                        Join Waiting Room
                    </Button>
                </div>
            )}

            {/* My Appointments List */}
            <MyAppointments />

            {/* Book New Appointment */}
            <div className="border-t border-border pt-8 mt-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Book New Appointment
                    </h3>
                    <p className="text-muted-foreground mt-1">Schedule a consultation with our specialists</p>
                </div>
                <AppointmentBooking
                    initialDoctorId={initialDoctorId}
                    initialDoctorName={initialDoctorName}
                />
            </div>
        </div>
    );
}

export default function AppointmentsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8">Loading...</div>}>
            <AppointmentsContent />
        </Suspense>
    );
}
