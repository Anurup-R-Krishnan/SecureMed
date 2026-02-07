'use client';

import React from "react"

import { useState } from 'react';
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
} from 'lucide-react';
import MfaSetup from '@/components/auth/mfa-setup';

type DoctorTab = 'dashboard' | 'appointments' | 'patients' | 'records' | 'settings';

interface DoctorPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

const todayAppointments = [
  {
    id: 1,
    patient: 'John Doe',
    time: '10:00 AM',
    status: 'Completed',
    type: 'Follow-up',
  },
  {
    id: 2,
    patient: 'Jane Smith',
    time: '11:30 AM',
    status: 'In Progress',
    type: 'Consultation',
  },
  {
    id: 3,
    patient: 'Mike Johnson',
    time: '02:00 PM',
    status: 'Scheduled',
    type: 'Check-up',
  },
];

const patientsList = [
  { id: 1, name: 'John Doe', lastVisit: 'Jan 15, 2025', condition: 'Hypertension', status: 'Stable' },
  { id: 2, name: 'Jane Smith', lastVisit: 'Jan 10, 2025', condition: 'Diabetes', status: 'Controlled' },
  { id: 3, name: 'Mike Johnson', lastVisit: 'Jan 8, 2025', condition: 'Arrhythmia', status: 'Monitoring' },
  { id: 4, name: 'Sarah Lee', lastVisit: 'Dec 28, 2024', condition: 'High Cholesterol', status: 'Improved' },
];

export default function DoctorPortal({ onLogout, onSwitchRole }: DoctorPortalProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs: { id: DoctorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
    { id: 'patients', label: 'My Patients', icon: <Users className="h-5 w-5" /> },
    { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-primary">Fortis</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Doctor Console</p>
        </div>

        {/* Doctor Info */}
        <div className="px-6 py-4 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/70">Dr. Amit Patel</p>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
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
                    <p className="text-3xl font-bold text-foreground mt-2">3</p>
                  </div>
                  <div className="bg-card p-6 rounded-lg border border-border">
                    <p className="text-muted-foreground text-sm">Total Patients</p>
                    <p className="text-3xl font-bold text-primary mt-2">{patientsList.length}</p>
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
                    {todayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{apt.patient}</p>
                          <p className="text-sm text-muted-foreground">{apt.time} • {apt.type}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {apt.status === 'Completed' && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                          {apt.status === 'In Progress' && (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          )}
                          <span className="text-sm font-medium">{apt.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-xl font-bold text-foreground mb-6">My Appointments</h3>
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{apt.patient}</p>
                        <p className="text-sm text-muted-foreground">{apt.time} • {apt.type}</p>
                      </div>
                      <div className="flex gap-2 mt-4 md:mt-0">
                        <Button variant="outline" size="sm">View Patient</Button>
                        <Button size="sm">Update Status</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div className="bg-card p-6 rounded-lg border border-border overflow-x-auto">
                <h3 className="text-xl font-bold text-foreground mb-6">My Patients</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Patient Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Condition</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Last Visit</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientsList.map((patient) => (
                      <tr key={patient.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium text-foreground">{patient.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{patient.condition}</td>
                        <td className="py-3 px-4 text-muted-foreground">{patient.lastVisit}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                            {patient.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'records' && (
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-xl font-bold text-foreground mb-6">Medical Records</h3>
                <p className="text-muted-foreground">View and manage patient medical records here.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Security Settings</h3>
                  <p className="text-muted-foreground">Manage your account security and two-factor authentication</p>
                </div>
                <MfaSetup />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
