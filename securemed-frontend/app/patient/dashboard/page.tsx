"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PatientDashboard from "@/components/portals/patient/dashboard/dashboard";
import PatientTimeline from "@/components/portals/patient/dashboard/patient-timeline";
import { appointmentService } from "@/services/appointments";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  // Fetch next appointment for dashboard summary
  useEffect(() => {
    if (!user) return;
    const fetchNext = async () => {
      try {
        const appts = await appointmentService.getAppointments();
        const now = new Date();
        const upcoming = appts
          .filter((apt: any) => {
            const aptDate = new Date(
              `${apt.appointment_date}T${apt.appointment_time}`,
            );
            return (
              aptDate >= now &&
              (apt.status === "scheduled" || apt.status === "confirmed")
            );
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(
              `${a.appointment_date}T${a.appointment_time}`,
            );
            const dateB = new Date(
              `${b.appointment_date}T${b.appointment_time}`,
            );
            return dateA.getTime() - dateB.getTime();
          });
        if (upcoming.length > 0) {
          setNextAppointment(upcoming[0]);
        }
      } catch (e) {}
    };
    fetchNext();
  }, [user]);

  // Simple navigation handler mapping tab names to routes
  const handleNavigate = (tab: string, params?: Record<string, string>) => {
    // Map legacy tab names to new routes
    const routeMap: Record<string, string> = {
      dashboard: "/patient/dashboard",
      appointments: "/patient/appointments",
      records: "/patient/records",
      referrals: "/patient/referrals",
      billing: "/patient/billing",
      messaging: "/patient/messaging",
      profile: "/patient/profile",
      settings: "/patient/settings",
    };

    const route = routeMap[tab] || `/patient/${tab}`;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams(params).toString();
      router.push(`${route}?${search}`);
      return;
    }
    router.push(route);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Appointment Banner */}
      {nextAppointment && (
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Next Visit
              </span>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(
                  `${nextAppointment.appointment_date}T${nextAppointment.appointment_time}`,
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Appointment with {nextAppointment.doctor_name}
            </h3>
            <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {new Date(nextAppointment.appointment_date).toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" },
              )}
            </p>
          </div>
          <Button
            onClick={() => router.push("/patient/appointments")}
            className="whitespace-nowrap shadow-lg shadow-primary/10"
          >
            View Details
          </Button>
        </div>
      )}

      <PatientDashboard
        onNavigate={handleNavigate}
        patientId={user?.patient_profile?.patient_id}
      />

      {user?.patient_profile?.patient_id && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Your Health Timeline</h3>
          <PatientTimeline patientId={user.patient_profile.patient_id} />
        </div>
      )}
    </div>
  );
}
