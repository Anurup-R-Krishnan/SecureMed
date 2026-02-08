'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Beaker, FileText, Pill, Activity } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'lab' | 'prescription' | 'visit' | 'appointment';
  title: string;
  description: string;
  details?: string[];
}



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
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const response = await api.get('/medical-records/timeline/', {
          params: { patient_id: patientId }
        });
        setEvents(response.data);
      } catch (error) {
        console.error("Failed to fetch timeline", error);
      } finally {
        setLoading(false);
      }
    }

    if (patientId) {
      fetchTimeline();
    }
  }, [patientId]);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading timeline...</div>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Patient Timeline</h2>

      <div className="relative space-y-6">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline Events */}
        {events.length === 0 ? (
          <p className="pl-16 text-slate-500 py-4">No events found.</p>
        ) : (
          events.map((event, idx) => {
            const { icon: Icon, color } = typeIcons[event.type] || typeIcons.visit;

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

                      {event.details && event.details.length > 0 && (
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
          })
        )}
      </div>

      {/* Load More */}
      <button className="mt-6 w-full rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-muted transition-colors">
        Load More Events
      </button>
    </div>
  );
}
