'use client';

import React from "react"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  FileText,
  Heart,
  BarChart3,
  LogOut,
  Menu,
  X,
  Clock,
  MapPin,
  DollarSign,
  Download,
  Plus,
  Settings,
} from 'lucide-react';
import PatientDashboard from './patient/dashboard';
import AppointmentBooking from './patient/appointment-booking';
import MedicalRecords from './patient/medical-records';
import PatientBilling from './patient/billing';
import PrivacySettings from './patient/privacy-settings';

type PatientTab = 'dashboard' | 'appointments' | 'records' | 'billing' | 'settings';

interface PatientPortalProps {
  onLogout: () => void;
  onSwitchRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
}

export default function PatientPortal({ onLogout, onSwitchRole }: PatientPortalProps) {
  const [activeTab, setActiveTab] = useState<PatientTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs: { id: PatientTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Heart className="h-5 w-5" /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" /> },
    { id: 'records', label: 'Medical Records', icon: <FileText className="h-5 w-5" /> },
    { id: 'billing', label: 'Billing', icon: <BarChart3 className="h-5 w-5" /> },
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
          <h1 className="text-2xl font-bold text-sidebar-primary flex items-center gap-2">
            <Heart className="h-6 w-6" />
            Fortis
          </h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Patient Portal</p>
        </div>

        {/* Patient Info */}
        <div className="px-6 py-4 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/70">Logged in as</p>
          <p className="font-semibold text-sidebar-primary">John Doe</p>
          <p className="text-xs text-sidebar-foreground/60">Patient ID: P12345</p>
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
            onClick={() => onSwitchRole('doctor')}
            className="w-full px-4 py-2 rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/10 text-sm font-medium transition-colors"
          >
            Doctor View
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
            <p className="text-muted-foreground mt-1">
              Manage your health and appointments
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <PatientDashboard />}
            {activeTab === 'appointments' && <AppointmentBooking />}
            {activeTab === 'records' && <MedicalRecords />}
            {activeTab === 'billing' && <PatientBilling />}
            {activeTab === 'settings' && <PrivacySettings />}
          </div>
        </div>
      </main>
    </div>
  );
}
