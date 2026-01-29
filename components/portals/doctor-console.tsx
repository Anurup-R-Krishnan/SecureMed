'use client';

import { useState } from 'react';
import MyPatientsTable from './doctor/my-patients-table';
import PatientProfileView from './doctor/patient-profile-view';

interface Patient {
  id: string;
  name: string;
  age: number;
  status: 'Admitted' | 'Outpatient' | 'Observation';
  lastVisit: string;
  condition: string;
}

const patientsData: Patient[] = [
  {
    id: '1',
    name: 'John Smith',
    age: 45,
    status: 'Admitted',
    lastVisit: '2025-01-25',
    condition: 'Hypertension',
  },
  {
    id: '2',
    name: 'Sarah Williams',
    age: 32,
    status: 'Outpatient',
    lastVisit: '2025-01-22',
    condition: 'Regular checkup',
  },
  {
    id: '3',
    name: 'Michael Johnson',
    age: 58,
    status: 'Admitted',
    lastVisit: '2025-01-25',
    condition: 'Post-surgery recovery',
  },
  {
    id: '4',
    name: 'Emily Brown',
    age: 28,
    status: 'Outpatient',
    lastVisit: '2025-01-20',
    condition: 'Migraine management',
  },
  {
    id: '5',
    name: 'David Lee',
    age: 62,
    status: 'Observation',
    lastVisit: '2025-01-24',
    condition: 'Diabetes monitoring',
  },
];

interface DoctorConsoleProps {
  onLogout: () => void;
}

export default function DoctorConsole({ onLogout }: DoctorConsoleProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-sidebar-primary">SecureMed</h2>
          <p className="mt-1 text-sm text-sidebar-foreground/60">Doctor Console</p>
        </div>

        <nav className="mt-8 space-y-2 px-4">
          <button className="w-full rounded-lg px-4 py-3 text-left font-medium bg-sidebar-primary text-sidebar-primary-foreground">
            My Patients
          </button>
          <button className="w-full rounded-lg px-4 py-3 text-left font-medium text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors">
            Schedule
          </button>
          <button className="w-full rounded-lg px-4 py-3 text-left font-medium text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors">
            Lab Results
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
          <button
            onClick={onLogout}
            className="w-full rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {!selectedPatient ? (
          <MyPatientsTable patients={patientsData} onSelectPatient={setSelectedPatient} />
        ) : (
          <PatientProfileView patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
        )}
      </div>
    </div>
  );
}
