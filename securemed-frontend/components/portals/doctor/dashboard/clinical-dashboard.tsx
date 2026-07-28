"use client";

import React, { useState } from "react";
import { DigitalTwin } from "@/components/features/patient/digital-twin";
import { TraumaMode } from "@/components/features/emergency/trauma-mode";
import { TimeTravelScrubber } from "@/components/features/timeline/clinical-timeline";
import { CountUp } from "@/components/ui/count-up";
import { Activity, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock Props interface to match what the page passes (subset)
interface ClinicalDashboardProps {
  todayAppts?: any[];
  totalPatients?: number;
  loading?: boolean;
  doctorName?: string;
}

export default function ClinicalDashboard({
  todayAppts,
  totalPatients,
  loading,
  doctorName,
}: ClinicalDashboardProps) {
  const [traumaModeActive, setTraumaModeActive] = useState(false);
  const [patientStatus, setPatientStatus] = useState<
    Record<string, any> | undefined
  >(undefined);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]); // New state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [overview, setOverview] = useState<any | null>(null);

  React.useEffect(() => {
    if (todayAppts && todayAppts.length > 0) {
      setSelectedPatientId(todayAppts[0].patient);
    }
  }, [todayAppts]);

  React.useEffect(() => {
    if (!selectedPatientId) return;

    const fetchPatientData = async () => {
      try {
        const { patientService } = await import("@/services/patients-new");

        const [overviewData, timelineData] = await Promise.all([
          patientService.getPatientOverview(selectedPatientId),
          patientService.getPatientTimeline(selectedPatientId),
        ]);

        if (timelineData) {
          setTimelineEvents(timelineData);
        }

        if (overviewData && overviewData.vitals) {
          setOverview(overviewData);
          const newStatus: any = {};

          newStatus["head"] = {
            id: "head",
            label: "Head & Neck",
            status: "normal",
            details: "No reported issues.",
          };
          newStatus["chest"] = {
            id: "chest",
            label: "Thorax / Heart",
            status: "normal",
            details: "Normal cardiac rhythm.",
            vitals: [],
          };
          newStatus["abdomen"] = {
            id: "abdomen",
            label: "Abdomen",
            status: "normal",
            details: "Soft, non-tender.",
          };

          if (overviewData.vitals.heart_rate) {
            newStatus["chest"].vitals.push({
              label: "HR",
              value: `${overviewData.vitals.heart_rate} bpm`,
            });
            if (
              overviewData.vitals.heart_rate > 100 ||
              overviewData.vitals.heart_rate < 50
            ) {
              newStatus["chest"].status = "warning";
              newStatus["chest"].details = "Abnormal Heart Rate detected.";
            }
          }
          if (overviewData.vitals.systolic_bp) {
            newStatus["chest"].vitals.push({
              label: "BP",
              value: `${overviewData.vitals.systolic_bp}/${overviewData.vitals.diastolic_bp}`,
            });
            if (overviewData.vitals.systolic_bp > 140) {
              newStatus["chest"].status = "warning";
              newStatus["chest"].details += " Hypertension detected.";
            }
          }

          if (overviewData.vitals.weight) {
            newStatus["abdomen"].vitals = [
              { label: "Weight", value: `${overviewData.vitals.weight} kg` },
            ];
          }

          setPatientStatus(newStatus);
        }
      } catch (e) {}
    };

    fetchPatientData();
  }, [selectedPatientId]);

  return (
    <div className="space-y-8 relative pb-24">
      {/* Global Trauma Mode Overlay */}
      <TraumaMode
        isActive={traumaModeActive}
        onDeactivate={() => setTraumaModeActive(false)}
      />

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-card p-6 rounded-[24px] border border-border/60 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-4 rounded-2xl ring-1 ring-primary/20 relative overflow-hidden group">
            <Activity className="h-7 w-7 text-primary relative z-10" />
            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              {new Date().getHours() < 12
                ? "Good Morning,"
                : new Date().getHours() < 18
                  ? "Good Afternoon,"
                  : "Good Evening,"}{" "}
              {doctorName || "Doctor"}
            </h2>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1">
              {selectedPatientId
                ? `Viewing Patient #${selectedPatientId}`
                : "Clinical Command Center Active"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          <Button
            variant={traumaModeActive ? "destructive" : "default"}
            className={`h-12 px-8 rounded-xl font-black shadow-lg transition-all gap-2 ${traumaModeActive ? "animate-pulse" : "hover:scale-105"}`}
            onClick={() => setTraumaModeActive(!traumaModeActive)}
          >
            <Siren className="h-4 w-4" />
            {traumaModeActive ? "DEACTIVATE TRAUMA" : "TRAUMA CODE PROTOCOL"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Patient Focus (Digital Twin) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
              <h3 className="font-bold">Active Patient Focus</h3>
              {patientStatus ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                  LIVE DATA
                </span>
              ) : (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-bold">
                  WAITING FOR DATA
                </span>
              )}
            </div>
            <DigitalTwin patientStatus={patientStatus} />
          </div>

          {/* Time Travel Scrubber Context */}
          <div className="bg-card border rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                History Playback
              </h3>
              <span className="text-xs text-muted-foreground">
                Reviewing last 24h events
              </span>
            </div>
            <div className="h-12 bg-muted/20 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
              (Scrubber is pinned to bottom of screen)
            </div>
          </div>
        </div>

        {/* Right Col: Live Status & Tasks */}
        <div className="lg:col-span-5 space-y-6">
          {/* Lab Tracker - Needs Real Data Logic or Removal if no data */}
          {/* For now, we only show it if we found lab data (future implementation) */}
          {/* Keeping static for layout but labeling it "Example" or similar would be better, 
                        or we can fetch lab status too. Let's keep it but maybe hide if no active lab. 
                        Actually user said "no mock data". So we should hide it if no data.
                        For this iteration, I'll comment it out to be safe unless I fetch lab data.
                        BUT avoiding empty UI is good. I will check for 'recent_lab_results' in data.
                    */}

          {/* LabTubeTracker currentStepIndex={3} testName="Urgent Cardiac Enzymes" / -- Removing Mock */}

          {/* Recent Activity */}
          <div className="bg-card border rounded-xl p-0 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Recent Activity</h3>
              {selectedPatientId ? (
                <Link
                  href={`/doctor/patients/${selectedPatientId}`}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  View Patient {"->"}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Select a patient
                </span>
              )}
            </div>

            <div className="p-4 bg-slate-50 min-h-[200px] relative">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              ></div>
              {timelineEvents.length > 0 ? (
                <div className="space-y-3 relative">
                  {timelineEvents.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border/60 bg-white/70 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-foreground">
                        {event.title}
                      </p>
                      <p className="text-muted-foreground">
                        {event.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-8 relative">
                  No recent activity for this patient.
                </div>
              )}
            </div>
          </div>

          {/* Recent Lab Results */}
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Recent Labs
              </h3>
              <span className="text-xs text-muted-foreground">
                {overview?.recent_lab_results?.length || 0} results
              </span>
            </div>
            {overview?.recent_lab_results?.length ? (
              <div className="space-y-2">
                {overview.recent_lab_results.map((lab: any) => (
                  <div
                    key={lab.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {lab.test_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lab.result_value} {lab.units || ""} •{" "}
                        {lab.flag || "Normal"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lab.date || "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No released lab results yet.
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl text-center">
              <CountUp
                end={todayAppts?.length || 0}
                duration={2000}
                className="text-3xl font-black text-primary block"
              />
              <div className="text-xs font-bold text-primary/70 uppercase">
                Appointments
              </div>
            </div>
            <div className="bg-card border p-4 rounded-xl text-center">
              <CountUp
                end={totalPatients || 0}
                duration={2500}
                className="text-3xl font-black text-zinc-700 dark:text-zinc-200 block"
              />
              <div className="text-xs font-bold text-muted-foreground uppercase">
                Active Patients
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Time Travel Scrubber Pinned to Bottom */}
      <TimeTravelScrubber events={timelineEvents} />
    </div>
  );
}
