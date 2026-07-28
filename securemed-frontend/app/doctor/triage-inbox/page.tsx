"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Inbox,
  Clock,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/unified-api-client";
import { useToast } from "@/components/ui/use-toast";

interface TriageRequest {
  triage_id: number;
  patient_name: string;
  ai_summary: string;
  created_at: string;
}

export default function TriageInboxPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TriageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/telemedicine/triage/inbox/");
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({
        title: "Failed to load triage requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleAction = async (
    triageId: number,
    action: "APPROVED" | "DECLINED",
  ) => {
    setActioning(triageId);
    try {
      await apiClient.post("/telemedicine/triage/approve/", {
        triage_id: triageId,
        action,
      });
      setRequests((prev) => prev.filter((r) => r.triage_id !== triageId));
      toast({
        title: action === "APPROVED" ? "Request Approved" : "Request Declined",
        description:
          action === "APPROVED"
            ? "The patient will be notified and can book an appointment."
            : "The triage request has been declined.",
      });
    } catch {
      toast({
        title: "Action failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActioning(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Pending AI Triage Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review AI-generated patient summaries and approve or decline
            appointment requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <Badge
              variant="secondary"
              className="text-sm font-semibold px-3 py-1"
            >
              {requests.length} pending
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInbox}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-base font-medium">
            Loading triage requests…
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <Inbox className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-semibold">
            All clear — no pending requests
          </p>
          <p className="text-sm mt-1">
            New AI triage summaries from patients will appear here.
          </p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && requests.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {requests.map((req) => (
            <Card
              key={req.triage_id}
              className="flex flex-col border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl overflow-hidden"
            >
              <CardHeader className="pb-3 bg-muted/20 border-b border-border/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border border-primary/20">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">
                        {req.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatDate(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">
                    Pending
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-4 pb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  AI Summary
                </p>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-xl p-3 border border-border/30 max-h-52 overflow-y-auto">
                  {req.ai_summary}
                </div>
              </CardContent>

              <CardFooter className="pt-0 pb-4 px-4 gap-3 border-t border-border/30 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20 font-semibold"
                  disabled={actioning === req.triage_id}
                  onClick={() => handleAction(req.triage_id, "DECLINED")}
                >
                  {actioning === req.triage_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Decline
                </Button>
                <Button
                  className="flex-1 gap-2 font-semibold"
                  disabled={actioning === req.triage_id}
                  onClick={() => handleAction(req.triage_id, "APPROVED")}
                >
                  {actioning === req.triage_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve &amp; Invite to Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
