'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { appointmentService, Appointment } from '@/services/appointments';
import AppointmentManager from '@/components/portals/doctor/appointments/appointment-manager';
import ReferralModal from '@/components/portals/doctor/shared/referral-modal';
import { toast } from 'sonner';
import { Calendar, CheckCircle, Activity } from 'lucide-react';

export default function AppointmentsPage() {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    // Modal States
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchAppts = async () => {
            setLoading(true);
            try {
                const appts = await appointmentService.getAppointments();
                setAppointments(appts);
            } catch (error) {
                console.error('Error fetching appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppts();
    }, [isAuthenticated]);

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-black uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3" /> Completed
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-black uppercase tracking-wider">
                        <Activity className="h-3 w-3 animate-pulse" /> In Progress
                    </span>
                );
            case 'scheduled':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-black uppercase tracking-wider">
                        <Calendar className="h-3 w-3" /> Scheduled
                    </span>
                );
            case 'confirmed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-black uppercase tracking-wider">
                        <CheckCircle className="h-3 w-3" /> Confirmed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-slate-600 text-xs font-black uppercase tracking-wider">
                        {status}
                    </span>
                );
        }
    };

    const handleOpenReferral = (item: any) => {
        const patientId = item.patient || item.id;
        const patientName = item.patient_name || item.name || 'Patient';
        setSelectedPatient({ id: String(patientId), name: patientName });
        setShowReferralModal(true);
    };

    const handleAcceptAppointment = async (appt: Appointment) => {
        try {
            let message = '';

            if (appt.status === 'scheduled') {
                await appointmentService.acceptAppointment(appt.id);
                message = 'Appointment confirmed.';
            } else if (appt.status === 'confirmed') {
                await appointmentService.startConsultation(appt.id);
                message = 'Consultation started.';
            } else if (appt.status === 'in_progress') {
                await appointmentService.completeConsultation(appt.id);
                message = 'Consultation completed.';
            }

            // Refresh appointments
            const appts = await appointmentService.getAppointments();
            setAppointments(appts);
            toast.success(message);
        } catch (error: any) {
            console.error('Error updating appointment:', error);
            toast.error(error?.response?.data?.error || 'Failed to update appointment.');
        }
    };

    return (
        <>
            <AppointmentManager
                appointments={appointments}
                loading={loading}
                onOpenReferral={handleOpenReferral}
                onAcceptAppointment={handleAcceptAppointment}
                formatTime={formatTime}
                getStatusBadge={getStatusBadge}
            />

            {/* Modals */}
            {selectedPatient && (
                <ReferralModal
                    isOpen={showReferralModal}
                    onClose={() => { setShowReferralModal(false); setSelectedPatient(null); }}
                    patientId={selectedPatient.id}
                    patientName={selectedPatient.name}
                />
            )}
        </>
    );
}
