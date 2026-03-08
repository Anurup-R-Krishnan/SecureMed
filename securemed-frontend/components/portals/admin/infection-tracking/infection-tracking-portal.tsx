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

export type InfectionTrackingCacheData = {
    graphData: GraphVisualization;
    traces: InfectionTrace[];
    stats: GraphStats;
    fetchedAt: number;
};

type InfectionTrackingPortalProps = {
    isActive?: boolean;
    initialData?: InfectionTrackingCacheData | null;
    onDataLoaded?: (data: InfectionTrackingCacheData) => void;
    cacheTtlMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 60_000;

export default function InfectionTrackingPortal({
    isActive = true,
    initialData = null,
    onDataLoaded,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
}: InfectionTrackingPortalProps) {
    const [graphData, setGraphData] = useState<GraphVisualization | null>(initialData?.graphData ?? null);
    const [traces, setTraces] = useState<InfectionTrace[] | null>(initialData?.traces ?? null);
    const [stats, setStats] = useState<GraphStats | null>(initialData?.stats ?? null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [selectedTrace, setSelectedTrace] = useState<InfectionTrace | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);

    const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

    useEffect(() => {
        if (!isActive) return;

        const controller = new AbortController();
        let cancelled = false;

        const fetchAll = async () => {
            const hasValidCache = Boolean(
                initialData
                && Date.now() - initialData.fetchedAt <= cacheTtlMs
                && refreshToken === 0,
            );
            if (hasValidCache && initialData) {
                setGraphData(initialData.graphData);
                setTraces(initialData.traces);
                setStats(initialData.stats);
                setError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const [graphRes, tracesRes, statsRes] = await Promise.all([
                    infectionTrackingService.getGraphVisualization(180, { signal: controller.signal }),
                    infectionTrackingService.getTraces({ signal: controller.signal }),
                    infectionTrackingService.getGraphStats({ signal: controller.signal }),
                ]);

                if (cancelled) return;

                if (!Array.isArray(graphRes?.nodes) || !Array.isArray(graphRes?.links)) {
                    throw new Error('Invalid graph visualization payload.');
                }

                if (!Array.isArray(tracesRes)) {
                    throw new Error('Invalid traces payload.');
                }

                if (!statsRes || typeof statsRes !== 'object') {
                    throw new Error('Invalid graph stats payload.');
                }

                const nextData: InfectionTrackingCacheData = {
                    graphData: graphRes,
                    traces: tracesRes,
                    stats: statsRes,
                    fetchedAt: Date.now(),
                };

                setGraphData(nextData.graphData);
                setTraces(nextData.traces);
                setStats(nextData.stats);
                setError(null);
                onDataLoaded?.(nextData);
            } catch {
                if (!cancelled) {
                    setError('Unable to load infection tracking data right now.');
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
    }, [cacheTtlMs, initialData, isActive, onDataLoaded, refreshToken]);

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

    if (!graphData || !traces || !stats) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <p className="text-destructive font-medium">Infection tracking data is unavailable.</p>
                <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
