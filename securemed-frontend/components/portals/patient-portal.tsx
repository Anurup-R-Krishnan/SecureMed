'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    FileText,
    Heart,
    BarChart3,
    LogOut,
    Menu,
    X,
    Settings,
    User,
    Loader2,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Video,
} from 'lucide-react';
import api from '@/lib/api';
import PatientDashboard from './patient/dashboard/dashboard';
import AppointmentBooking from './patient/appointments/appointment-booking';
import { AppointmentCalendar } from './patient/appointments/appointment-calendar';
import PatientTimeline from './patient/dashboard/patient-timeline';
import MedicalRecords from './patient/records/medical-records';
import { UploadRecordDialog } from './patient/records/upload-record-dialog';
import WaitingRoom from '@/components/telemedicine/waiting-room';
import VideoRoom from '@/components/telemedicine/video-room';
import PatientBilling from './patient/billing/billing';
import PrivacySettings from './patient/settings/privacy-settings';
import ProfileEditor from './patient/settings/profile-editor';
import { NotificationCenter } from '@/components/ui/notification-center';
import { MessagingInterface } from '@/components/telemedicine/MessagingInterface';
import { appointmentService, Doctor } from '@/services/appointments';

type PatientTab = 'dashboard' | 'appointments' | 'records' | 'billing' | 'messaging' | 'profile' | 'settings';

interface PatientPortalProps {
    onLogout: () => void;
    onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

export default function PatientPortal({ onLogout, onSwitchRole }: PatientPortalProps) {
    const [activeTab, setActiveTab] = useState<PatientTab>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [recordsKey, setRecordsKey] = useState(0);
    const [nextAppointment, setNextAppointment] = useState<any>(null);

    // Telemedicine State
    const [showTelemed, setShowTelemed] = useState(false);
    const [telemedStatus, setTelemedStatus] = useState<'waiting' | 'in-call'>('waiting');
    const [activeRoomId, setActiveRoomId] = useState<string>('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/patients/profile/');
                setPatient(response.data);
            } catch (error) {
                console.error('Failed to fetch patient profile:', error);
            } finally {
                setLoading(false);
            }
        };
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
                    setNextAppointment(upcoming[0]);
                    setActiveRoomId(`room-${upcoming[0].id}`);
                }
            } catch (e) {
                console.error('Failed to fetch upcoming appointment:', e);
            }
        };
        fetchProfile();
        fetchNextAppointment();
        appointmentService.getDoctors().then(setDoctors).catch(console.error);
    }, []);

    const tabs: { id: PatientTab; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <Heart className="h-5 w-5" /> },
        { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
        { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" /> },
        { id: 'billing', label: 'Billing', icon: <BarChart3 className="h-5 w-5" /> },
        { id: 'messaging', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
        { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
        { id: 'settings', label: 'Privacy & Security', icon: <Settings className="h-5 w-5" /> },
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
                className={`fixed inset-y-0 left-0 z-30 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out md:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
            >
                <div className="p-6 border-b border-sidebar-border flex items-center justify-between relative">
                    <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
                        <Heart className="h-6 w-6 text-sidebar-primary" />
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold text-sidebar-primary">Fortis</h1>
                                <p className="text-xs text-sidebar-foreground/70">Patient Portal</p>
                            </div>
                        )}
                    </div>
                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden md:flex absolute -right-3 top-8 bg-card border border-border rounded-full p-1 shadow-md hover:bg-muted transition-colors z-50"
                    >
                        {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </button>
                </div>

                {/* Patient Info */}
                <div className={`px-6 py-4 border-b border-sidebar-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
                    {loading ? (
                        sidebarCollapsed ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <div className="flex items-center gap-2 text-sidebar-foreground/70">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Loading...</span>
                            </div>
                        )
                    ) : patient ? (
                        sidebarCollapsed ? (
                            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
                                {patient.user?.first_name?.charAt(0)}
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-sidebar-foreground/70">Logged in as</p>
                                <p className="font-semibold text-sidebar-primary truncate">{patient.user?.first_name} {patient.user?.last_name}</p>
                                <p className="text-xs text-sidebar-foreground/60 truncate">ID: {patient.patient_id}</p>
                            </>
                        )
                    ) : null}
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (window.innerWidth < 768) setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                            title={sidebarCollapsed ? tab.label : undefined}
                        >
                            {tab.icon}
                            {!sidebarCollapsed && <span className="font-medium truncate min-w-0">{tab.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
                    <button
                        onClick={onLogout}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors ${sidebarCollapsed ? 'px-2' : ''}`}
                        title={sidebarCollapsed ? 'Logout' : undefined}
                    >
                        <LogOut className="h-4 w-4" />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`transition-all duration-300 ease-in-out min-h-screen
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
            >
                {/* Top Bar */}
                <div className="bg-card border-b border-border p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="min-w-0 flex-1 mr-4">
                            <h2 className="text-2xl font-bold text-foreground truncate">
                                {tabs.find((t) => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm truncate">
                                Manage your health and appointments
                            </p>
                        </div>
                        <NotificationCenter />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <div className="max-w-7xl mx-auto">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <PatientDashboard onNavigate={setActiveTab} />
                                <PatientTimeline patientId={patient?.patient_id} />
                            </div>
                        )}
                        {activeTab === 'appointments' && (
                            <div className="space-y-6">
                                {!showTelemed ? (
                                    <>
                                        {/* Teleconsultation - dynamic from backend */}
                                        {nextAppointment && (
                                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 flex items-center justify-between flex-wrap gap-4">
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
                                                    onClick={() => {
                                                        setShowTelemed(true);
                                                        setTelemedStatus('waiting');
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Join Waiting Room
                                                </Button>
                                            </div>
                                        )}

                                        <AppointmentBooking />
                                        <AppointmentCalendar
                                            doctors={doctors}
                                            onBookAppointment={(date, time, doctorId) => {
                                                const formattedDate = date.toISOString().split('T')[0];
                                                appointmentService.createAppointment({
                                                    doctor: doctorId,
                                                    appointment_date: formattedDate,
                                                    appointment_time: time,
                                                    reason: 'Online Booking'
                                                })
                                                    .then(() => console.log('Appointment booked via calendar'))
                                                    .catch(console.error);
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div className="bg-card rounded-lg border border-border overflow-hidden h-[600px]">
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
                                )}
                            </div>
                        )}
                        {activeTab === 'records' && (
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <UploadRecordDialog onRecordUploaded={() => setRecordsKey(k => k + 1)} />
                                </div>
                                <MedicalRecords key={recordsKey} patientId={patient?.patient_id} />
                            </div>
                        )}
                        {activeTab === 'billing' && <PatientBilling patient={patient} />}
                        {activeTab === 'messaging' && <MessagingInterface />}
                        {activeTab === 'profile' && <ProfileEditor />}
                        {activeTab === 'settings' && <PrivacySettings />}
                    </div>
                </div>
            </main>
        </div>
    );
}
