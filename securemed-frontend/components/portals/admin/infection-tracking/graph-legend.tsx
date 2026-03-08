'use client';

/**
 * Info panels for the infection tracking page:
 *  - "How It Works" explanation
 *  - Edge-type legend
 */

import React from 'react';
import { Building } from 'lucide-react';

export default function GraphLegend() {
    return (
        <div className="space-y-6">
            {/* How it works */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    How It Works
                </h3>
                <div className="space-y-3 text-xs text-muted-foreground">
                    <Step n={1} color="bg-blue-500">
                        Appointments create edges between <strong>Patients</strong>, <strong>Doctors</strong>, and{' '}
                        <strong>Rooms</strong> in Neo4j.
                    </Step>
                    <Step n={2} color="bg-amber-500">
                        When an infection is reported,{' '}
                        <code className="bg-muted px-1 rounded">shortestPath</code> queries find transmission chains.
                    </Step>
                    <Step n={3} color="bg-red-500">
                        Traces are scored by <strong>path length</strong> and <strong>time proximity</strong> between
                        diagnoses.
                    </Step>
                </div>
            </div>

            {/* Edge legend */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
                <h3 className="font-bold text-foreground mb-3">Edge Types</h3>
                <div className="space-y-2 text-xs">
                    <EdgeRow color="#3b82f6" name="SAW" desc="Patient visited Doctor" />
                    <EdgeRow color="#f59e0b" name="VISITED" desc="Patient was in Room" />
                    <EdgeRow color="#10b981" name="WORKED_IN" desc="Doctor practised in Room" />
                    <EdgeRow color="#8b5cf6" name="USED_EQUIPMENT" desc="Patient used Equipment" />
                </div>
            </div>
        </div>
    );
}

/* ── tiny helpers ── */

function Step({ n, color, children }: { n: number; color: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <span
                className={`w-5 h-5 rounded-full ${color} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}
            >
                {n}
            </span>
            <p>{children}</p>
        </div>
    );
}

function EdgeRow({ color, name, desc }: { color: string; name: string; desc: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 rounded" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground font-bold">{name}</span>
            <span className="text-muted-foreground">— {desc}</span>
        </div>
    );
}
