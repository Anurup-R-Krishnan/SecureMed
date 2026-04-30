"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { referralService, PatientReferral } from "@/services/referrals";

interface PatientReferralsProps {
  onBookAppointment?: (doctorId: number, doctorName: string) => void;
}

export default function PatientReferrals({
  onBookAppointment,
}: PatientReferralsProps) {
  const [referrals, setReferrals] = useState<PatientReferral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const data = await referralService.getPatientReferrals();
        setReferrals(data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string, statusDisplay: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      accepted: "bg-green-500/10 text-green-600 border-green-500/20",
      declined: "bg-red-500/10 text-red-600 border-red-500/20",
      completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[status] || "bg-gray-500/10 text-gray-600"}`}
      >
        {getStatusIcon(status)}
        {statusDisplay}
      </span>
    );
  };

  const getPriorityBadge = (priority: string, display: string) => {
    const styles: Record<string, string> = {
      routine: "bg-blue-500/10 text-blue-600",
      urgent: "bg-amber-500/10 text-amber-600",
      emergency: "bg-red-500/10 text-red-600",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${styles[priority] || "bg-gray-500/10 text-gray-600"}`}
      >
        {priority === "emergency" && <AlertTriangle className="h-3 w-3" />}
        {display}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium text-muted-foreground">
          No Referrals
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          You have no referrals from your doctors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        Your Referrals ({referrals.length})
      </h3>
      <div className="space-y-3">
        {referrals.map((ref) => (
          <div
            key={ref.id}
            className="p-5 border border-border bg-card rounded-xl shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                {/* Referral flow visualization */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="text-sm">
                    <span className="font-bold text-foreground">
                      {ref.referring_doctor_name}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({ref.referring_doctor_specialization})
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-primary">
                      {ref.specialist_name}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({ref.specialist_specialization})
                    </span>
                  </div>
                </div>

                {ref.specialist_department && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Department: {ref.specialist_department}
                  </p>
                )}

                <p className="text-sm text-foreground">
                  <span className="font-medium">Reason:</span> {ref.reason}
                </p>
                {ref.clinical_notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Notes:</span>{" "}
                    {ref.clinical_notes}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {getStatusBadge(ref.status, ref.status_display)}
                  {getPriorityBadge(ref.priority, ref.priority_display)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(ref.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Action: Book appointment with specialist */}
              {["pending", "accepted"].includes(ref.status) &&
                ref.specialist_id &&
                onBookAppointment && (
                  <Button
                    size="sm"
                    className="gap-2 flex-shrink-0"
                    onClick={() =>
                      onBookAppointment(ref.specialist_id!, ref.specialist_name)
                    }
                  >
                    <Calendar className="h-4 w-4" />
                    Book Appointment
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
