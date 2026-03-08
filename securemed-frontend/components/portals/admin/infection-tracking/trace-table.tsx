'use client';

/**
 * Transmission traces table.
 * Lists detected infection traces with expandable path details.
 */

import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { InfectionTrace } from '@/services/infection-tracking';
import { NODE_COLORS, VECTOR_LABELS, NODE_EMOJI } from './constants';

interface TraceTableProps {
    traces: InfectionTrace[];
    selectedTrace: InfectionTrace | null;
    onSelectTrace: (trace: InfectionTrace | null) => void;
}

export default function TraceTable({ traces, selectedTrace, onSelectTrace }: TraceTableProps) {
    return (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm">
            {/* header */}
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="font-bold text-foreground">Detected Transmission Traces</h2>
                <span className="ml-auto text-xs font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                    {traces.length} traces
                </span>
            </div>

            {/* rows */}
            <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
                {traces.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No transmission traces detected yet.
                    </div>
                ) : (
                    traces.map((trace) => {
                        const isSelected = selectedTrace?.trace_id === trace.trace_id;
                        return (
                            <button
                                key={trace.trace_id}
                                onClick={() => onSelectTrace(isSelected ? null : trace)}
                                className={`w-full text-left px-6 py-4 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''
                                    }`}
                            >
                                {/* summary row */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-foreground text-sm">
                                                {trace.source_report?.patient_name || trace.source_report?.report_id}
                                            </span>
                                            <ArrowRight className="h-3 w-3 text-red-500 flex-shrink-0" />
                                            <span className="font-bold text-foreground text-sm">
                                                {trace.target_report?.patient_name || trace.target_report?.report_id}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-bold uppercase tracking-wide">{trace.infection_name}</span>
                                            <span>·</span>
                                            <span>{VECTOR_LABELS[trace.vector_type] || trace.vector_type}</span>
                                            <span>·</span>
                                            <span>{trace.path_length} hops</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span
                                            className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${trace.confidence_score >= 0.5
                                                    ? 'bg-red-500'
                                                    : trace.confidence_score >= 0.3
                                                        ? 'bg-amber-500'
                                                        : 'bg-gray-400'
                                                }`}
                                        >
                                            {(trace.confidence_score * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                                            {trace.status}
                                        </span>
                                    </div>
                                </div>

                                {/* expanded path detail */}
                                {isSelected && trace.transmission_path?.path && (
                                    <div className="mt-3 pt-3 border-t border-border/30">
                                        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                                            Transmission Path
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {trace.transmission_path.path.map((step, i) => (
                                                <React.Fragment key={i}>
                                                    {step.type ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold text-white"
                                                            style={{ backgroundColor: NODE_COLORS[step.type] || '#666' }}
                                                        >
                                                            {NODE_EMOJI[step.type] || ''}
                                                            {step.label || step.id}
                                                        </span>
                                                    ) : step.relationship ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold uppercase">
                                                            {step.relationship}
                                                        </span>
                                                    ) : null}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
