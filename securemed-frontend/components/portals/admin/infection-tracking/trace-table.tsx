"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Microscope,
  Route,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import type { InfectionTrace } from "@/services/infection-tracking";
import { VECTOR_LABELS } from "./constants";

interface TraceTableProps {
  traces: InfectionTrace[];
  selectedTrace: InfectionTrace | null;
  onSelectTrace: (trace: InfectionTrace | null) => void;
}

type PathNode = {
  id?: string;
  type?: string;
  label?: string;
  specialization?: string;
  room_type?: string;
  risk_level?: string;
};

type PathRelationship = {
  relationship?: string;
  date?: string;
  start_time?: string;
  duration_minutes?: number;
  appointment_id?: string;
};

type PathStep = {
  from: PathNode;
  relationship: PathRelationship;
  to: PathNode;
  summary: string;
  timing: string | null;
};

type ContactNarrative = {
  title: string;
  detail: string;
};

export default function TraceTable({
  traces,
  selectedTrace,
  onSelectTrace,
}: TraceTableProps) {
  const rankedTraces = [...traces].sort((a, b) => {
    if (b.confidence_score !== a.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }
    return (
      new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
  });
  const activeTrace = selectedTrace ?? rankedTraces[0] ?? null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <h2 className="font-bold text-foreground">
            Detected Transmission Traces
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked by confidence so the most actionable cluster is visible
            first.
          </p>
        </div>
        <span className="ml-auto text-xs font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
          {rankedTraces.length} traces
        </span>
      </div>

      {rankedTraces.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          No transmission traces detected yet.
        </div>
      ) : (
        <div className="space-y-0">
          <div className="divide-y divide-border/40 max-h-[560px] overflow-y-auto">
            {rankedTraces.map((trace, index) => {
              const isSelected = activeTrace?.trace_id === trace.trace_id;
              const confidence = formatPercent(trace.confidence_score);
              const summary = buildExposureSummary(trace);

              return (
                <button
                  key={trace.trace_id}
                  onClick={() => onSelectTrace(trace)}
                  className={`w-full text-left px-6 py-5 transition-colors ${
                    isSelected
                      ? "bg-red-500/5 border-l-4 border-l-red-500 pl-5"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-black text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">
                          {trace.source_report?.patient_name ||
                            trace.source_patient_name ||
                            trace.source_report?.report_id}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span className="font-bold text-foreground">
                          {trace.target_report?.patient_name ||
                            trace.target_patient_name ||
                            trace.target_report?.report_id}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                        <Pill className="bg-red-500/10 text-red-600">
                          {trace.infection_name}
                        </Pill>
                        <Pill className="bg-amber-500/10 text-amber-700">
                          {VECTOR_LABELS[trace.vector_type] ||
                            trace.vector_type}
                        </Pill>
                        <Pill className="bg-slate-100 text-slate-700">
                          {trace.path_length} hops
                        </Pill>
                        <Pill className={confidence.className}>
                          {confidence.label}
                        </Pill>
                      </div>

                      <p className="mt-3 text-sm text-foreground leading-6">
                        {summary}
                      </p>

                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
                        <span>Detected {formatDate(trace.detected_at)}</span>
                        <span>Diagnosis gap {getDiagnosisGap(trace)}</span>
                        <span className="uppercase tracking-wide font-bold">
                          {trace.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/40 bg-muted/10">
            {activeTrace ? <TraceDetail trace={activeTrace} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function TraceDetail({ trace }: { trace: InfectionTrace }) {
  const pathSteps = buildPathSteps(trace);
  const contactNarratives = buildContactNarratives(trace);
  const anchor = getPrimaryAnchor(trace);
  const confidence = formatPercent(trace.confidence_score);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
          <Microscope className="h-4 w-4" />
          Trace Narrative
        </div>
        <h3 className="text-xl font-black tracking-tight text-foreground leading-tight">
          {trace.infection_name} likely moved from{" "}
          {trace.source_report?.patient_name || trace.source_patient_name} to{" "}
          {trace.target_report?.patient_name || trace.target_patient_name}
        </h3>
        <p className="text-sm text-muted-foreground leading-6">
          {buildExposureSummary(trace)}
        </p>
      </div>

      <div className="space-y-3">
        <PatientCard
          title="Source case"
          name={trace.source_report?.patient_name ?? trace.source_patient_name}
          diagnosedAt={trace.source_report?.diagnosed_at}
          severity={
            trace.source_report?.severity_display ||
            trace.source_report?.severity ||
            "Unknown"
          }
          infection={
            trace.source_report?.infection_name || trace.infection_name
          }
        />
        <PatientCard
          title="Linked case"
          name={trace.target_report?.patient_name || trace.target_patient_name}
          diagnosedAt={trace.target_report?.diagnosed_at}
          severity={
            trace.target_report?.severity_display ||
            trace.target_report?.severity ||
            "Unknown"
          }
          infection={
            trace.target_report?.infection_name || trace.infection_name
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
          label="Confidence"
          value={confidence.label}
          tone={confidence.textClassName}
        />
        <MetricCard
          icon={<Route className="h-4 w-4 text-amber-600" />}
          label="Likely vector"
          value={VECTOR_LABELS[trace.vector_type] || trace.vector_type}
        />
        <MetricCard
          icon={<CalendarClock className="h-4 w-4 text-slate-600" />}
          label="Diagnosis gap"
          value={getDiagnosisGap(trace)}
        />
        <MetricCard
          icon={<Stethoscope className="h-4 w-4 text-emerald-600" />}
          label="Primary link"
          value={anchor}
        />
      </div>

      {contactNarratives.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Encounter Detail
            </p>
          </div>
          <div className="p-4 space-y-3">
            {contactNarratives.map((item, index) => (
              <div
                key={`${trace.trace_id}-narrative-${index}`}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground leading-6">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-background">
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            What links these cases
          </p>
        </div>
        <div className="p-4 space-y-3">
          {pathSteps.map((step, index) => (
            <div
              key={`${trace.trace_id}-${index}`}
              className="rounded-xl border border-border/50 bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground leading-6">
                    {step.summary}
                  </p>
                  {step.relationship.duration_minutes ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contact window: {step.relationship.duration_minutes}{" "}
                      minutes
                    </p>
                  ) : null}
                </div>
                {step.timing ? (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {step.timing}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <NodeBadge node={step.from} />
                <span className="uppercase font-bold tracking-wide text-slate-500">
                  {formatRelationship(step.relationship.relationship)}
                </span>
                <NodeBadge node={step.to} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientCard({
  title,
  name,
  diagnosedAt,
  severity,
  infection,
}: {
  title: string;
  name: string;
  diagnosedAt?: string;
  severity: string;
  infection: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-base font-bold text-foreground">{name}</p>
      <div className="mt-2 space-y-1 text-sm">
        <p className="text-foreground">
          <span className="text-muted-foreground">Disease:</span> {infection}
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Diagnosed:</span>{" "}
          {formatDate(diagnosedAt)}
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Severity:</span> {severity}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-3 text-sm font-bold text-foreground ${tone ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function NodeBadge({ node }: { node: PathNode }) {
  const label = node.label || node.id || "Unknown";
  const tone =
    node.type === "Patient"
      ? "bg-blue-50 text-blue-700"
      : node.type === "Doctor"
        ? "bg-emerald-50 text-emerald-700"
        : node.type === "Room"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium ${tone}`}
    >
      {node.type || "Node"}: {label}
    </span>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function buildExposureSummary(trace: InfectionTrace) {
  const source =
    trace.source_report?.patient_name ||
    trace.source_report?.report_id ||
    "The source patient";
  const target =
    trace.target_report?.patient_name ||
    trace.target_report?.report_id ||
    "the linked patient";
  const vector = VECTOR_LABELS[trace.vector_type] || trace.vector_type;
  const anchor = getPrimaryAnchor(trace);
  const gap = getDiagnosisGap(trace);

  switch (trace.vector_type) {
    case "shared_room":
      return `${source} and ${target} are connected through ${anchor}, which points to room-based exposure. The two diagnoses were recorded ${gap} apart.`;
    case "shared_doctor":
      return `${source} and ${target} were both linked to ${anchor}, suggesting clinician-mediated contact or overlap in the same care pathway. The diagnoses were ${gap} apart.`;
    case "shared_equipment":
      return `${source} and ${target} intersect on ${anchor}, making shared equipment the most plausible transmission vector. The diagnoses were ${gap} apart.`;
    case "indirect":
      return `${source} and ${target} are not connected by a single direct overlap. Instead, the trace shows a ${trace.path_length}-hop chain through ${anchor} and related contacts.`;
    default:
      return `${source} and ${target} are linked by a ${vector.toLowerCase()} pattern with ${trace.path_length} hops. The strongest visible anchor is ${anchor}.`;
  }
}

function getPrimaryAnchor(trace: InfectionTrace) {
  const items = Array.isArray(trace.transmission_path?.path)
    ? trace.transmission_path.path
    : [];
  const preferredTypes =
    trace.vector_type === "shared_room"
      ? ["Room", "Equipment", "Doctor"]
      : trace.vector_type === "shared_doctor"
        ? ["Doctor", "Room", "Equipment"]
        : trace.vector_type === "shared_equipment"
          ? ["Equipment", "Room", "Doctor"]
          : ["Room", "Doctor", "Equipment"];

  for (const type of preferredTypes) {
    const match = items.find((item) => item?.type === type);
    if (match?.label || match?.id) {
      return `${match.label || match.id} (${type.toLowerCase()})`;
    }
  }

  const firstNode = items.find((item) => item?.type);
  return firstNode?.label || firstNode?.id || "multiple intermediate contacts";
}

function buildPathSteps(trace: InfectionTrace): PathStep[] {
  const items = Array.isArray(trace.transmission_path?.path)
    ? trace.transmission_path.path
    : [];
  const steps: PathStep[] = [];

  for (let index = 0; index < items.length - 2; index += 2) {
    const from = (items[index] || {}) as PathNode;
    const relationship = (items[index + 1] || {}) as PathRelationship;
    const to = (items[index + 2] || {}) as PathNode;
    steps.push({
      from,
      relationship,
      to,
      summary: describeStep(from, relationship, to),
      timing: formatStepTiming(relationship),
    });
  }

  return steps;
}

function buildContactNarratives(trace: InfectionTrace): ContactNarrative[] {
  const items = Array.isArray(trace.transmission_path?.path)
    ? trace.transmission_path.path
    : [];
  const narratives: ContactNarrative[] = [];

  for (let index = 0; index < items.length - 4; index += 2) {
    const firstNode = (items[index] || {}) as PathNode;
    const firstRel = (items[index + 1] || {}) as PathRelationship;
    const secondNode = (items[index + 2] || {}) as PathNode;
    const secondRel = (items[index + 3] || {}) as PathRelationship;
    const thirdNode = (items[index + 4] || {}) as PathNode;

    if (
      firstNode.type === "Patient" &&
      firstRel.relationship === "SAW" &&
      secondNode.type === "Doctor" &&
      secondRel.relationship === "WORKED_IN" &&
      thirdNode.type === "Room"
    ) {
      narratives.push({
        title: `${firstNode.label || firstNode.id} -> ${secondNode.label || secondNode.id} -> ${thirdNode.label || thirdNode.id}`,
        detail: `${firstNode.label || firstNode.id} saw ${doctorLabel(secondNode.label || secondNode.id || "the doctor")} in ${thirdNode.label || thirdNode.id} on ${formatStepTiming(firstRel) || "an unknown time"}. The same clinician was linked to that room on ${formatStepTiming(secondRel) || "an unknown time"}.`,
      });
      continue;
    }

    if (
      firstNode.type === "Patient" &&
      firstRel.relationship === "VISITED" &&
      secondNode.type === "Room" &&
      secondRel.relationship === "VISITED" &&
      thirdNode.type === "Patient"
    ) {
      narratives.push({
        title: `Shared room exposure in ${secondNode.label || secondNode.id}`,
        detail: `${firstNode.label || firstNode.id} visited ${secondNode.label || secondNode.id} on ${formatStepTiming(firstRel) || "an unknown time"}, and ${thirdNode.label || thirdNode.id} visited the same room on ${formatStepTiming(secondRel) || "an unknown time"}.`,
      });
      continue;
    }

    if (
      firstNode.type === "Patient" &&
      firstRel.relationship === "USED_EQUIPMENT" &&
      secondNode.type === "Equipment" &&
      secondRel.relationship === "USED_EQUIPMENT" &&
      thirdNode.type === "Patient"
    ) {
      narratives.push({
        title: `Shared equipment exposure via ${secondNode.label || secondNode.id}`,
        detail: `${firstNode.label || firstNode.id} used ${secondNode.label || secondNode.id} on ${formatStepTiming(firstRel) || "an unknown time"}, and ${thirdNode.label || thirdNode.id} later used the same equipment on ${formatStepTiming(secondRel) || "an unknown time"}.`,
      });
    }
  }

  return narratives;
}

function describeStep(
  from: PathNode,
  relationship: PathRelationship,
  to: PathNode,
) {
  const fromLabel = from.label || from.id || "Unknown node";
  const toLabel = to.label || to.id || "Unknown node";
  const when = formatStepTiming(relationship);
  const atTime = when ? ` at ${when}` : "";

  switch (relationship.relationship) {
    case "VISITED":
      if (from.type === "Room" && to.type === "Patient") {
        return `${toLabel} visited ${fromLabel}${atTime}.`;
      }
      return `${fromLabel} visited ${toLabel}${atTime}.`;
    case "SAW":
      if (from.type === "Doctor" && to.type === "Patient") {
        return `${toLabel} consulted ${doctorLabel(fromLabel)}${atTime}.`;
      }
      return `${fromLabel} consulted ${doctorLabel(toLabel)}${atTime}.`;
    case "WORKED_IN":
      if (from.type === "Room" && to.type === "Doctor") {
        return `${doctorLabel(toLabel)} worked in ${fromLabel}${atTime}.`;
      }
      return `${doctorLabel(fromLabel)} worked in ${toLabel}${atTime}.`;
    case "USED_EQUIPMENT":
      if (from.type === "Equipment" && to.type === "Patient") {
        return `${toLabel} used ${fromLabel}${atTime}.`;
      }
      return `${fromLabel} used ${toLabel}${atTime}.`;
    case "PART_OF":
      return `${fromLabel} belongs to ${toLabel}.`;
    default:
      return `${fromLabel} connected to ${toLabel} through ${formatRelationship(relationship.relationship)}${atTime}.`;
  }
}

function doctorLabel(label: string) {
  return label.startsWith("Dr.") ? label : `Dr. ${label}`;
}

function formatRelationship(value?: string) {
  if (!value) return "link";
  return value.toLowerCase().split("_").join(" ");
}

function formatPercent(score: number) {
  const label = `${Math.round(score * 100)}% confidence`;
  if (score >= 0.5) {
    return {
      label,
      className: "bg-red-500/10 text-red-600",
      textClassName: "text-red-600",
    };
  }
  if (score >= 0.3) {
    return {
      label,
      className: "bg-amber-500/10 text-amber-700",
      textClassName: "text-amber-700",
    };
  }
  return {
    label,
    className: "bg-slate-100 text-slate-700",
    textClassName: "text-slate-700",
  };
}

function getDiagnosisGap(trace: InfectionTrace) {
  const sourceTime = new Date(trace.source_report?.diagnosed_at || "");
  const targetTime = new Date(trace.target_report?.diagnosed_at || "");
  const diffMs = Math.abs(targetTime.getTime() - sourceTime.getTime());

  if (Number.isNaN(diffMs)) {
    return "unknown";
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "same day";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

function formatDate(value?: string) {
  if (!value) return "unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStepTiming(relationship: PathRelationship) {
  if (!relationship?.date && !relationship?.start_time) {
    return null;
  }

  const parts: string[] = [];
  if (relationship.date) {
    parts.push(formatDate(relationship.date));
  }
  if (relationship.start_time) {
    const normalized = relationship.start_time.match(/\d{2}:\d{2}/)?.[0];
    if (normalized) parts.push(normalized);
  }
  return parts.join(" at ");
}
