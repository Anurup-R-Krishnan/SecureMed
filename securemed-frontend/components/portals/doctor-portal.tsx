'use client';

import React, { useState, useEffect } from 'react';
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
  Settings,
  Brain,
  ShieldAlert,
  CheckCircle,
  Activity,
  Pill,
  FlaskConical
} from 'lucide-react';
import MfaSetup from '@/components/auth/mfa-setup';
import AIDecisionSupport from '@/components/portals/doctor/shared/ai-decision-support';
import PatientTimeline from '@/components/portals/doctor/patients/patient-timeline';
import PrescriptionWriter from '@/components/portals/doctor/prescriptions/prescription-writer';
import LabOrderForm from '@/components/portals/doctor/labs/lab-order-form';
import AvailabilityManager from '@/components/portals/doctor/dashboard/availability-manager';
import EmergencyAccessModal from '@/components/portals/doctor/shared/emergency-access-modal';
import ReferralModal from '@/components/portals/doctor/shared/referral-modal';
import PatientManager, { DoctorPatient } from '@/components/portals/doctor/patients/patient-manager';
import DoctorDashboard from '@/components/portals/doctor/dashboard/doctor-dashboard';
import AppointmentManager from '@/components/portals/doctor/appointments/appointment-manager';
import { appointmentService, Appointment } from '@/services/appointments';
import api from '@/lib/api';
import { NotificationCenter } from '@/components/ui/notification-center';

type DoctorTab = 'dashboard' | 'appointments' | 'patients' | 'records' | 'prescriptions' | 'labs' | 'ai-assistant' | 'availability' | 'settings';

interface DoctorPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

interface RawPatient {
  id: number;
  patient_id?: string;
  user?: {
    first_name: string;
    last_name: string;
  };
  last_visit?: string;
  chronic_conditions?: string[];
}

export default function DoctorPortal({ onLogout, onSwitchRole }: DoctorPortalProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // API Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch doctor's appointments
        const appts = await appointmentService.getAppointments();
        setAppointments(appts);

        // Fetch patients - using a dedicated endpoint if available
        try {
          const patientsRes = await api.get('/patients/');
          const patientData: RawPatient[] = Array.isArray(patientsRes.data) ? patientsRes.data :
            (patientsRes.data.results || []);
          setPatients(patientData.map((p) => ({
            id: p.id,
            displayId: p.patient_id || `P-${p.id}`,
            name: p.user?.first_name ? `${p.user.first_name} ${p.user.last_name}` : 'Unknown Patient',
            lastVisit: p.last_visit || 'N/A',
            condition: p.chronic_conditions?.[0] || 'General',
            status: 'Active'
          })));
        } catch {
          // If patients endpoint fails, derive from appointments
          const uniquePatients = new Map<number, DoctorPatient>();
          appts.forEach((apt) => {
            if (!uniquePatients.has(apt.patient)) {
              uniquePatients.set(apt.patient, {
                id: apt.patient,
                displayId: `P-${apt.patient}`,
                name: apt.doctor_name ? `Patient of ${apt.doctor_name}` : `Patient #${apt.patient}`, // Fallback naming if no patient details
                lastVisit: apt.appointment_date,
                condition: 'N/A',
                status: 'Active'
              });
            }
          });
          setPatients(Array.from(uniquePatients.values()));
        }
      } catch (error) {
        console.error('Error fetching doctor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get today's appointments
  const todayAppts = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.appointment_date === today;
  });

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const tabs: { id: DoctorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
    { id: 'patients', label: 'My Patients', icon: <Users className="h-5 w-5" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="h-5 w-5" /> },
    { id: 'labs', label: 'Lab Orders', icon: <FlaskConical className="h-5 w-5" /> },
    { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" /> },
    { id: 'ai-assistant', label: 'AI Assistant', icon: <Brain className="h-5 w-5" /> },
    { id: 'availability', label: 'Availability', icon: <Clock className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleOpenReferral = (patient: any) => {
    setSelectedPatient({ id: patient.displayId || patient.patient || patient.id, name: patient.name || 'Patient' });
    setShowReferralModal(true);
  };

  const handleOpenEmergency = (patient: any) => {
    setSelectedPatient({ id: patient.displayId || patient.patient || patient.id, name: patient.name || 'Patient' });
    setShowEmergencyModal(true);
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
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-black uppercase tracking-wider">
            <Calendar className="h-3 w-3" /> Scheduled
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 bg-card border border-border rounded-lg shadow-sm"
      >
        {sidebarOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-black text-primary tracking-tight">SecureMed</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Doctor Console</p>
        </div>

        {/* Doctor Info */}
        <div className="px-6 py-6 border-b border-sidebar-border bg-sidebar-accent/5">
          <p className="text-lg font-bold text-foreground">Doctor</p>
          <p className="text-sm font-medium text-primary">General Medicine</p>
          <p className="text-xs text-muted-foreground mt-1">SecureMed Hospital</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {tab.icon}
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border space-y-2 bg-sidebar">
          <button
            onClick={() => onSwitchRole('patient')}
            className="w-full px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-sm font-bold transition-colors"
          >
            Switch to Patient View
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive hover:text-destructive-foreground font-bold transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen transition-all duration-300">
        {/* Top Bar */}
        <div className="bg-background/80 backdrop-blur-md border-b border-border p-6 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm font-medium text-muted-foreground">Manage your practice and patients</p>
            </div>
            <div className="flex gap-4 items-center">
              <NotificationCenter />
              <Button variant="outline" size="sm" className="hidden sm:flex border-destructive/30 hover:bg-destructive/10 text-destructive font-bold" onClick={() => setShowEmergencyModal(true)}>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Break Glass
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DoctorDashboard
                todayAppts={todayAppts}
                totalPatients={patients.length}
                totalAppointments={appointments.length}
                loading={loading}
                onOpenReferral={handleOpenReferral}
                formatTime={formatTime}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeTab === 'appointments' && (
              <AppointmentManager
                appointments={appointments}
                loading={loading}
                onOpenReferral={handleOpenReferral}
                formatTime={formatTime}
                getStatusBadge={getStatusBadge}
              />
            )}

            {activeTab === 'patients' && (
              <PatientManager
                patients={patients}
                loading={loading}
                onEmergencyAccess={handleOpenEmergency}
                onRefer={handleOpenReferral}
                onViewPatient={(p) => console.log('View patient', p)}
              />
            )}

            {activeTab === 'prescriptions' && (
              <PrescriptionWriter
                patients={patients}
                onSuccess={() => console.log("Prescription created")}
              />
            )}

            {activeTab === 'records' && (
              <div className="space-y-6">
                <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-foreground">Recent Patient Activity</h3>
                    <p className="text-muted-foreground">Live feed of patient updates, labs, and history.</p>
                  </div>
                  <PatientTimeline className="shadow-none border-none bg-transparent" />
                </div>
              </div>
            )}

            {activeTab === 'ai-assistant' && (
              <AIDecisionSupport />
            )}

            {activeTab === 'availability' && (
              <AvailabilityManager />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-foreground mb-2">Security Settings</h3>
                  <p className="text-muted-foreground font-medium">Manage your account security and two-factor authentication</p>
                </div>
                <MfaSetup />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedPatient && (
        <>
          <EmergencyAccessModal
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
            onClose={() => { setShowEmergencyModal(false); setSelectedPatient(null); }}
            onSubmit={() => { }}
            isOpen={showEmergencyModal && !!selectedPatient}
          />
          <ReferralModal
            isOpen={showReferralModal}
            onClose={() => { setShowReferralModal(false); setSelectedPatient(null); }}
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
          />
        </>
      )}

      {/* Global Emergency Modal if no patient selected */}
      {!selectedPatient && showEmergencyModal && (
        <EmergencyAccessModal
          isOpen={true}
          patientId=""
          patientName="Enter Patient ID"
          onClose={() => setShowEmergencyModal(false)}
          onSubmit={() => { }}
        />
      )}
    </div>
  );
}
