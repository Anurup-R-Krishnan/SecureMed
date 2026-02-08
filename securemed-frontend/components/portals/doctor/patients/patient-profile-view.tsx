'use client';

import { useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import PatientTimeline from './patient-timeline';
import EmergencyAccessModal from './emergency-access-modal';

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

        {/* Patient Info */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-4">{patient.name}</h1>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-lg font-semibold text-foreground">{patient.age} years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold text-foreground">{patient.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Visit</p>
              <p className="text-lg font-semibold text-foreground">{patient.lastVisit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primary Condition</p>
              <p className="text-lg font-semibold text-foreground">{patient.condition}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Patient Info */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Vital Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">MRN (Medical Record Number)</p>
                  <p className="font-semibold text-foreground">MRN-2025-001234</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-semibold text-foreground">1979-08-15</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Type</p>
                  <p className="font-semibold text-foreground">O+</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allergies</p>
                  <p className="font-semibold text-foreground">Penicillin, Shellfish</p>
                </div>
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
