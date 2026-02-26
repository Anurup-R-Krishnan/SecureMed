'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw, Biohazard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    infectionTrackingService,
    type GraphVisualization,
    type InfectionTrace,
    type GraphStats,
} from '@/services/infection-tracking';
import ForceGraph from './force-graph';
import TraceTable from './trace-table';
import GraphLegend from './graph-legend';

type InfectionTrackingPortalProps = {
    isActive?: boolean;
};

export default function InfectionTrackingPortal({ isActive = true }: InfectionTrackingPortalProps) {
    const [graphData, setGraphData] = useState<GraphVisualization | null>(null);
    const [traces, setTraces] = useState<InfectionTrace[]>([]);
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [selectedTrace, setSelectedTrace] = useState<InfectionTrace | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);

    const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

    useEffect(() => {
        if (!isActive) return;

        const controller = new AbortController();
        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            setWarnings([]);

            try {
                const [graphRes, tracesRes, statsRes] = await Promise.allSettled([
                    infectionTrackingService.getGraphVisualization(180, { signal: controller.signal }),
                    infectionTrackingService.getTraces({ signal: controller.signal }),
                    infectionTrackingService.getGraphStats({ signal: controller.signal }),
                ]);

                if (cancelled) return;

                const sectionWarnings: string[] = [];

                if (graphRes.status === 'fulfilled') {
                    const data = graphRes.value;
                    setGraphData({
                        nodes: Array.isArray(data?.nodes) ? data.nodes : [],
                        links: Array.isArray(data?.links) ? data.links : [],
                    });
                } else {
                    setGraphData({ nodes: [], links: [] });
                    sectionWarnings.push('Graph visualization is currently unavailable.');
                }

                if (tracesRes.status === 'fulfilled') {
                    setTraces(Array.isArray(tracesRes.value) ? tracesRes.value : []);
                } else {
                    setTraces([]);
                    sectionWarnings.push('Transmission traces could not be loaded.');
                }

                if (statsRes.status === 'fulfilled') {
                    setStats(statsRes.value);
                } else {
                    setStats(null);
                    sectionWarnings.push('Graph stats could not be loaded.');
                }

                if (sectionWarnings.length === 3) {
                    setError('Unable to load infection tracking data right now.');
                } else if (sectionWarnings.length > 0) {
                    setWarnings(sectionWarnings);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [isActive, refreshToken]);

    if (!isActive) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="text-destructive font-medium">{error}</p>
                <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                    {warnings.join(' ')}
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-red-500/10 p-3 rounded-xl ring-1 ring-red-500/20">
                        <Biohazard className="h-7 w-7 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Infection Tracking</h1>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                            Graph-Based Transmission Analysis
                        </p>
                    </div>
                </div>
                {stats && (
                    <div className="flex gap-6 text-sm">
                        <StatBadge label="Patients" value={stats.nodes?.Patient ?? 0} />
                        <StatBadge label="Doctors" value={stats.nodes?.Doctor ?? 0} />
                        <StatBadge label="Rooms" value={stats.nodes?.Room ?? 0} />
                        <StatBadge label="Traces" value={traces.length} accent />
                    </div>
                )}
            </div>

            {graphData && (
                <ForceGraph data={graphData} highlightTrace={selectedTrace} isActive={isActive} />
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TraceTable traces={traces} selectedTrace={selectedTrace} onSelectTrace={setSelectedTrace} />
                </div>
                <GraphLegend />
            </div>
        </div>
    );
}

function StatBadge({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div className="text-center">
            <p className={`text-2xl font-black ${accent ? 'text-red-500' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-bold">{label}</p>
        </div>
    );
}
