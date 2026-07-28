"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/unified-api-client";
import { Beaker, FileText, Pill, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TimelineEvent {
  id: string;
  date: string;
  type: "lab" | "prescription" | "visit" | "appointment";
  title: string;
  description: string;
  details?: string[];
}

const typeIcons = {
  lab: { icon: Beaker, color: "text-accent" },
  prescription: { icon: Pill, color: "text-accent" },
  visit: { icon: FileText, color: "text-accent" },
  appointment: { icon: Activity, color: "text-accent" },
};

interface PatientTimelineProps {
  patientId: string;
  className?: string;
}

export default function PatientTimeline({
  patientId,
  className,
}: PatientTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTimeline = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const response = await apiClient.get("/patients/timeline/", {
          params: { patient_id: patientId },
        });
        // Map backend response to frontend format
        // Backend returns: category (diagnosis|lab|medication|appointment|admin)
        // Frontend expects: type (lab|prescription|visit|appointment)
        const categoryToType: Record<string, string> = {
          diagnosis: "visit",
          lab: "lab",
          medication: "prescription",
          appointment: "appointment",
          admin: "visit",
        };
        const mapped = (Array.isArray(response.data) ? response.data : []).map(
          (e: any) => ({
            id: e.id,
            date: e.date,
            type: categoryToType[e.category] || e.type || "visit",
            title: e.title,
            description: e.description,
            details: e.details,
          }),
        );
        setEvents(mapped);
      } catch (error) {
      } finally {
        if (showLoading) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [patientId],
  );

  useEffect(() => {
    if (patientId) {
      fetchTimeline(true);
    }
  }, [patientId, fetchTimeline]);

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">Loading timeline...</div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-6", className)}
    >
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Patient Timeline
      </h2>

      <div className="relative space-y-6">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline Events */}
        {events.length === 0 ? (
          <div className="pl-12 py-8">
            <div className="flex flex-col items-center justify-center p-8 bg-muted/10 rounded-2xl border border-dashed border-border/50 text-center">
              <div className="h-12 w-12 bg-muted/20 rounded-full flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <h4 className="text-sm font-bold text-foreground">
                No timeline events
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                No medical history or recent activities recorded for this
                patient.
              </p>
            </div>
          </div>
        ) : (
          events.map((event, idx) => {
            const { icon: Icon, color } =
              typeIcons[event.type] || typeIcons.visit;

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
                      <p className="text-xs text-muted-foreground">
                        {event.date}
                      </p>
                      <h3 className="mt-1 font-semibold text-foreground">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>

                      {event.details && event.details.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {event.details.map((detail, detailIdx) => (
                            <p
                              key={detailIdx}
                              className="text-xs text-muted-foreground"
                            >
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

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => fetchTimeline(false)}
        disabled={refreshing}
      >
        {refreshing ? "Refreshing..." : "Refresh Timeline"}
      </Button>
    </div>
  );
}
