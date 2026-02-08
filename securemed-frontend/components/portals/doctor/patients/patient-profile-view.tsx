'use client';

import { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import PatientTimeline from './patient-timeline';
import EmergencyAccessModal from './emergency-access-modal';
import { PatientInfoCard } from '@/components/ui/patient-info-card';

interface Patient {
  id: string;
  name: string;
  age: number;
  status: 'Admitted' | 'Outpatient' | 'Observation';
  lastVisit: string;
  condition: string;
}

interface PatientProfileViewProps {
  patient: Patient;
  onBack: () => void;
}

export default function PatientProfileView({ patient, onBack }: PatientProfileViewProps) {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Emergency Access */}
      <div className="border-b border-border bg-card p-8">
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Patients</span>
          </button>

          <button
            onClick={() => setShowEmergencyModal(true)}
            className="flex items-center gap-2 rounded-lg border-2 border-destructive bg-transparent px-4 py-2 font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <AlertTriangle className="h-5 w-5" />
            Break-Glass Access
          </button>
        </div>

        {/* Patient Info Card */}
        <PatientInfoCard patient={{
          id: patient.id,
          name: patient.name,
          age: patient.age,
          status: patient.status,
          lastVisit: patient.lastVisit,
          condition: patient.condition,
          mrn: 'MRN-2025-001234', // Mock data preservation
          dob: '1979-08-15',      // Mock data preservation
          bloodType: 'O+',        // Mock data preservation
          allergies: ['Penicillin', 'Shellfish'] // Mock data preservation
        }} />
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Patient Info */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 text-sm bg-accent/10 hover:bg-accent/20 rounded-md text-accent-foreground font-medium transition-colors">
                  Add Clinical Note
                </button>
                <button className="w-full text-left px-4 py-2 text-sm bg-accent/10 hover:bg-accent/20 rounded-md text-accent-foreground font-medium transition-colors">
                  Prescribe Medication
                </button>
                <button className="w-full text-left px-4 py-2 text-sm bg-accent/10 hover:bg-accent/20 rounded-md text-accent-foreground font-medium transition-colors">
                  Order Lab Test
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Current Medications</h2>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">Metformin 500mg</p>
                  <p className="text-xs text-muted-foreground">Twice daily - Diabetes</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">Lisinopril 10mg</p>
                  <p className="text-xs text-muted-foreground">Once daily - Hypertension</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">Aspirin 81mg</p>
                  <p className="text-xs text-muted-foreground">Once daily - Cardiovascular</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Timeline */}
          <div className="lg:col-span-2">
            <PatientTimeline patientId={patient.id} />
          </div>
        </div>
      </div>

      {/* Emergency Access Modal */}
      {showEmergencyModal && (
        <EmergencyAccessModal
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setShowEmergencyModal(false)}
          onSubmit={() => setShowEmergencyModal(false)}
        />
      )}
    </div>
  );
}
