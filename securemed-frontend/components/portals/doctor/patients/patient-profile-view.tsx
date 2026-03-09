'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Pill, MessageSquare, UserPlus } from 'lucide-react';
import PatientTimeline from './patient-timeline';
import PatientNotes from './patient-notes';
import PatientAnatomyCard from './patient-anatomy-card';
import EmergencyAccessModal from '@/components/portals/doctor/shared/emergency-access-modal';
import { PatientInfoCard } from '@/components/ui/patient-info-card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

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
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatientPrescriptions() {
      try {
        const res = await api.get(`/medical-records/prescriptions/`, {
          params: { patient_id: patient.id }
        });
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setPrescriptions(data);
      } catch (err) {
        console.error('Failed to fetch prescriptions', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatientPrescriptions();
  }, [patient.id]);

  return (
    <div className="space-y-6">
      {/* Header with Emergency Access */}
      <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Patients</span>
          </button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 hover:bg-destructive/10 text-destructive font-bold"
              onClick={() => setShowEmergencyModal(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Break-Glass Access
            </Button>
          </div>
        </div>

        {/* Patient Info Card */}
        <PatientInfoCard patient={{
          id: patient.id,
          name: patient.name,
          age: patient.age,
          status: patient.status,
          lastVisit: patient.lastVisit,
          condition: patient.condition,
        }} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Medications & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <PatientAnatomyCard />

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Current Medications
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
              </div>
            ) : prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium text-foreground">{rx.medication_name}</p>
                    <p className="text-xs text-muted-foreground">{rx.dosage} - {rx.frequency}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rx.duration} • <span className={rx.is_signed ? 'text-green-600' : 'text-amber-600'}>
                        {rx.is_signed ? 'Signed' : 'Draft'}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No prescriptions found.</p>
            )}
          </div>

          <PatientNotes patient={{
            id: patient.id,
            name: patient.name,
            age: patient.age,
            gender: 'Unknown', // Default as these aren't in the slim patient object
            dateOfBirth: 'Unknown',
            bloodType: 'Unknown',
            allergies: [],
            medicalHistory: []
          }} />
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-2">
          <PatientTimeline patientId={patient.id} />
        </div>
      </div>

      {/* Emergency Access Modal */}
      <EmergencyAccessModal
        isOpen={showEmergencyModal}
        patientId={patient.id}
        patientName={patient.name}
        onClose={() => setShowEmergencyModal(false)}
        onSubmit={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
