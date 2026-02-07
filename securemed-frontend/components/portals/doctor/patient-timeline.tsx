'use client';

import { Beaker, FileText, Pill, Activity } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'lab' | 'prescription' | 'visit' | 'appointment';
  title: string;
  description: string;
  details?: string[];
}

const mockTimeline: TimelineEvent[] = [
  {
    id: '1',
    date: '2025-01-25',
    type: 'visit',
    title: 'Visit Summary - Cardiology',
    description: 'Dr. Sarah Johnson',
    details: [
      'Blood pressure: 135/85 mmHg',
      'Heart rate: 72 bpm',
      'EKG performed - normal results',
      'Follow-up in 3 months',
    ],
  },
  {
    id: '2',
    date: '2025-01-20',
    type: 'lab',
    title: 'Blood Test - Lipid Panel',
    description: 'Lab Results',
    details: ['Total Cholesterol: 210 mg/dL', 'LDL: 130 mg/dL', 'HDL: 45 mg/dL', 'Status: Abnormal'],
  },
  {
    id: '3',
    date: '2025-01-18',
    type: 'prescription',
    title: 'Prescription - Amoxicillin',
    description: 'Antibiotic',
    details: [
      '500mg capsules',
      'Three times daily for 10 days',
      'For bacterial infection',
    ],
  },
  {
    id: '4',
    date: '2025-01-15',
    type: 'appointment',
    title: 'Appointment - Follow-up',
    description: 'General Checkup',
    details: ['Routine examination', 'Vital signs stable', 'Continue current medications'],
  },
  {
    id: '5',
    date: '2025-01-10',
    type: 'lab',
    title: 'Blood Test - Complete Panel',
    description: 'Lab Results',
    details: ['WBC: 7.5', 'RBC: 4.8', 'Hemoglobin: 14.2 g/dL', 'Status: Normal'],
  },
];

const typeIcons = {
  lab: { icon: Beaker, color: 'text-accent' },
  prescription: { icon: Pill, color: 'text-accent' },
  visit: { icon: FileText, color: 'text-accent' },
  appointment: { icon: Activity, color: 'text-accent' },
};

interface PatientTimelineProps {
  patientId: string;
}

export default function PatientTimeline({ patientId }: PatientTimelineProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Patient Timeline</h2>

      <div className="relative space-y-6">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline Events */}
        {mockTimeline.map((event, idx) => {
          const { icon: Icon, color } = typeIcons[event.type];

          return (
            <div key={event.id} className="relative pl-16">
              {/* Timeline Dot */}
              <div className="absolute left-0 top-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background bg-card">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>

              {/* Event Card */}
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                    <h3 className="mt-1 font-semibold text-foreground">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>

                    {event.details && (
                      <div className="mt-3 space-y-1">
                        {event.details.map((detail, detailIdx) => (
                          <p key={detailIdx} className="text-xs text-muted-foreground">
                            • {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      <button className="mt-6 w-full rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-muted transition-colors">
        Load More Events
      </button>
    </div>
  );
}
