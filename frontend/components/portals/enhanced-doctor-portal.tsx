'use client';

import React from "react"
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    Users,
    FileText,
    BarChart3,
    LogOut,
    Menu,
    X,
    Clock,
    CheckCircle,
    AlertCircle,
    Settings,
    Activity,
} from 'lucide-react';
import AvailabilityManager from './doctor/availability-manager';
import PatientDetailView from './doctor/patient-detail-view';
import MyPatientsTable from './doctor/my-patients-table';
import { getPatients } from '@/lib/services/clinical-service';
import { getDoctorAppointments } from '@/lib/services/appointment-service';

type DoctorTab = 'dashboard' | 'appointments' | 'patients' | 'availability' | 'timeline';

interface EnhancedDoctorPortalProps {
    onLogout: () => void;
    onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
    doctorId?: string;
    doctorName?: string;
}

const mockAppointments = []; // Legacy mock removed

export default function EnhancedDoctorPortal({
    onLogout,
    onSwitchRole,
    doctorId = '1',
    doctorName = 'Dr. Sarah Smith'
}: EnhancedDoctorPortalProps) {
    const [patients, setPatients] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Fetch live data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [patientsData, appointmentsData] = await Promise.all([
                    getPatients(),
                    getDoctorAppointments(doctorId, new Date().toISOString().split('T')[0])
                ]);
                setPatients(patientsData);
                setAppointments(appointmentsData);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [doctorId]);

    const handleViewPatient = (patientId: string) => {
        setSelectedPatientId(patientId);
        setActiveTab('timeline');
    };

    const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
        // Simple update logic
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/appointments/booking/${appointmentId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': 'doctor'
                },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                // Refresh data
                setAppointments(appointments.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
            }
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    // Map PatientQuickSummary to the Patient interface used by MyPatientsTable
    const tablePatients = patients.map(p => ({
        id: p.id.toString(),
        name: p.name,
        age: 35, // Mock age if not in profile
        status: (p.id === 1 ? 'Admitted' : p.id === 3 ? 'Observation' : 'Outpatient') as any,
        lastVisit: p.last_updated?.split('T')[0] || 'N/A',
        condition: p.id === 1 ? 'Cardiac Phase II' : p.id === 2 ? 'T2 Diabetes' : 'Post-Op Recovery',
        isReferred: false // Placeholder
    }));

    const tabs: { id: DoctorTab; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
        { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
        { id: 'availability', label: 'My Availability', icon: <Settings className="h-5 w-5" /> },
        { id: 'patients', label: 'My Patients', icon: <Users className="h-5 w-5" /> },
        { id: 'timeline', label: 'Patient Timeline', icon: <Activity className="h-5 w-5" /> },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-4 left-4 z-40 md:hidden p-2 bg-card border border-border rounded-lg"
            >
                {sidebarOpen ? (
                    <X className="h-6 w-6 text-foreground" />
                ) : (
                    <Menu className="h-6 w-6 text-foreground" />
                )}
            </button>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-6 border-b border-sidebar-border">
                    <h1 className="text-2xl font-bold text-sidebar-primary">Fortis</h1>
                    <p className="text-sm text-sidebar-foreground/70 mt-1">Doctor Console</p>
                </div>

                {/* Doctor Info */}
                <div className="px-6 py-4 border-b border-sidebar-border">
                    <p className="text-sm text-sidebar-foreground/70">{doctorName}</p>
                    <p className="font-semibold text-sidebar-primary">Cardiology</p>
                    <p className="text-xs text-sidebar-foreground/60">Fortis Hospital Delhi</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-2">
                    <button
                        onClick={() => onSwitchRole('patient')}
                        className="w-full px-4 py-2 rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/10 text-sm font-medium transition-colors"
                    >
                        Patient View
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen">
                {/* Top Bar */}
                <div className="bg-card border-b border-border p-6">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold text-foreground">
                            {tabs.find((t) => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-muted-foreground mt-1">Manage your practice and patients</p>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <div className="max-w-7xl mx-auto">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <div className="grid md:grid-cols-4 gap-4">
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <p className="text-muted-foreground text-sm">Today's Appointments</p>
                                        <p className="text-3xl font-bold text-foreground mt-2">{appointments.length}</p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <p className="text-muted-foreground text-sm">Total Patients</p>
                                        <p className="text-3xl font-bold text-primary mt-2">{patients.length}</p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <p className="text-muted-foreground text-sm">Pending Reviews</p>
                                        <p className="text-3xl font-bold text-accent mt-2">5</p>
                                    </div>
                                    <div className="bg-card p-6 rounded-lg border border-border">
                                        <p className="text-muted-foreground text-sm">Patient Satisfaction</p>
                                        <p className="text-3xl font-bold text-primary mt-2">4.8/5</p>
                                    </div>
                                </div>

                                {/* Today's Appointments */}
                                <div className="bg-card p-6 rounded-lg border border-border">
                                    <h3 className="text-xl font-bold text-foreground mb-6">Today's Appointments</h3>
                                    <div className="space-y-3">
                                        {appointments.length === 0 ? (
                                            <p className="text-muted-foreground italic">No appointments for today.</p>
                                        ) : (
                                            appointments.map((apt) => (
                                                <div
                                                    key={apt.id}
                                                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                                                >
                                                    <div>
                                                        <p className="font-semibold text-foreground">{apt.patientName}</p>
                                                        <p className="text-sm text-muted-foreground">{apt.startTime} • {apt.reasonForVisit || 'General'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {apt.status === 'COMPLETED' && (
                                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                                        )}
                                                        {apt.status === 'CONFIRMED' && (
                                                            <Clock className="h-5 w-5 text-blue-600" />
                                                        )}
                                                        <span className="text-sm font-medium">{apt.status}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Quick Links */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setActiveTab('availability')}
                                        className="p-6 bg-primary/5 rounded-lg border border-primary/20 hover:border-primary/50 transition-colors text-left"
                                    >
                                        <Settings className="h-8 w-8 text-primary mb-3" />
                                        <h4 className="font-semibold text-foreground">Manage Availability</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Set your available and unavailable time slots
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('timeline')}
                                        className="p-6 bg-primary/5 rounded-lg border border-primary/20 hover:border-primary/50 transition-colors text-left"
                                    >
                                        <Activity className="h-8 w-8 text-primary mb-3" />
                                        <h4 className="font-semibold text-foreground">Patient Timeline</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            View patient history and add clinical notes
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appointments' && (
                            <div className="bg-card p-6 rounded-lg border border-border">
                                <h3 className="text-xl font-bold text-foreground mb-6">My Appointments</h3>
                                <div className="space-y-3">
                                    {appointments.length === 0 ? (
                                        <p className="text-muted-foreground italic">No appointments found.</p>
                                    ) : (
                                        appointments.map((apt) => (
                                            <div
                                                key={apt.id}
                                                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-semibold text-foreground">{apt.patientName}</p>
                                                    <p className="text-sm text-muted-foreground">{apt.startTime} • {apt.reasonForVisit || 'General'}</p>
                                                </div>
                                                <div className="flex gap-2 mt-4 md:mt-0">
                                                    <Button variant="outline" size="sm" onClick={() => handleViewPatient(apt.patientId)}>View Patient</Button>
                                                    <Button size="sm" onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}>Complete</Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'availability' && (
                            <AvailabilityManager doctorId={doctorId} doctorName={doctorName} />
                        )}

                        {activeTab === 'patients' && (
                            <MyPatientsTable
                                patients={tablePatients}
                                onSelectPatient={(p) => setActiveTab('timeline')}
                            />
                        )}

                        {activeTab === 'timeline' && (
                            <PatientDetailView
                                doctorId={doctorId}
                                doctorName={doctorName}
                                initialPatientId={selectedPatientId || undefined}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
