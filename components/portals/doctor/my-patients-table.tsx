'use client';

import { ChevronRight } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  age: number;
  status: 'Admitted' | 'Outpatient' | 'Observation';
  lastVisit: string;
  condition: string;
}

interface MyPatientsTableProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

const statusColors = {
  Admitted: 'bg-destructive/20 text-destructive',
  Outpatient: 'bg-accent/20 text-accent',
  Observation: 'bg-yellow-500/20 text-yellow-600',
};

export default function MyPatientsTable({ patients, onSelectPatient }: MyPatientsTableProps) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">My Patients</h1>
      <p className="text-muted-foreground mb-8">
        Manage and review your assigned patients
      </p>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 border-b border-border bg-muted p-4">
          <div className="font-semibold text-foreground">Patient Name</div>
          <div className="font-semibold text-foreground">Age</div>
          <div className="font-semibold text-foreground">Status</div>
          <div className="font-semibold text-foreground">Last Visit</div>
          <div className="font-semibold text-foreground">Action</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className="grid grid-cols-5 gap-4 p-4 hover:bg-muted/50 transition-colors text-left w-full"
            >
              <div>
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground">{patient.condition}</p>
              </div>
              <div className="text-foreground">{patient.age}</div>
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    statusColors[patient.status]
                  }`}
                >
                  {patient.status}
                </span>
              </div>
              <div className="text-muted-foreground">{patient.lastVisit}</div>
              <div className="flex items-center justify-end">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
