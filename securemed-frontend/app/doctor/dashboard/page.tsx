'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { appointmentService, Appointment } from '@/services/appointments';
import ClinicalDashboard from '@/components/portals/doctor/dashboard/clinical-dashboard';
import ReferralModal from '@/components/portals/doctor/shared/referral-modal';
import VideoRoom from '@/components/telemedicine/video-room';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Types
interface DoctorPatient {
    id: number;
    displayId: string;
    name: string;
    lastVisit: string;
    condition: string;
    status: string;
}

interface RawPatient {
    id: number;
    patient_id?: string;
    user_first_name: string;
    user_last_name: string;
    last_visit?: string;
    chronic_conditions?: string;
}

export default function DashboardPage() {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);

    // Modal States
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch doctor's appointments
                const appts = await appointmentService.getAppointments();
                setAppointments(appts);

                // Fetch patients
                try {
                    const patientsRes = await api.get('/patients/');
                    const patientData: RawPatient[] = Array.isArray(patientsRes.data) ? patientsRes.data :
                        (patientsRes.data.results || []);
                    setPatients(patientData.map((p) => ({
                        id: p.id,
                        displayId: p.patient_id || `P-${p.id}`,
                        name: `${p.user_first_name} ${p.user_last_name}`.trim(),
                        lastVisit: p.last_visit || '',
                        condition: p.chronic_conditions || '',
                        status: 'Active'
                    })));
                } catch {
                    // Fallback: derive patients from appointments
                    const uniquePatients = new Map<number, DoctorPatient>();
                    appts.forEach((apt) => {
                        if (!uniquePatients.has(apt.patient) && apt.patient_name) {
                            uniquePatients.set(apt.patient, {
                                id: apt.patient,
                                displayId: `P-${apt.patient}`,
                                name: apt.patient_name,
                                lastVisit: apt.appointment_date,
                                condition: '',
                                status: 'Active'
                            });
                        }
                    });
                    setPatients(Array.from(uniquePatients.values()));
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated]);

    const todayAppts = appointments.filter(apt => {
        const today = new Date().toISOString().split('T')[0];
        return apt.appointment_date === today;
    });

    return (
        <>
            <ClinicalDashboard
                todayAppts={todayAppts}
                totalPatients={patients.length}
                loading={loading}
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

            {activeRoomId && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-6xl h-[80vh] rounded-lg shadow-2xl overflow-hidden relative border border-border">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-white bg-black/20 hover:bg-black/40"
                            onClick={() => setActiveRoomId(null)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                        <VideoRoom
                            roomId={activeRoomId}
                            userRole="doctor"
                            onEndCall={() => setActiveRoomId(null)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
