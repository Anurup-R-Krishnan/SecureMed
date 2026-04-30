"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, Biohazard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  infectionTrackingService,
  type GraphVisualization,
  type InfectionTrace,
  type GraphStats,
} from "@/services/infection-tracking";
import ForceGraph from "./force-graph";
import TraceTable from "./trace-table";
import GraphLegend from "./graph-legend";
import { NODE_COLORS } from "./constants";

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
const MIN_CONTACT_LINKS = 10;
const MIN_CONTACT_RATIO = 0.2;

export default function InfectionTrackingPortal({
  isActive = true,
  initialData = null,
  onDataLoaded,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
}: InfectionTrackingPortalProps) {
  const [graphData, setGraphData] = useState<GraphVisualization | null>(
    initialData?.graphData ?? null,
  );
  const [traces, setTraces] = useState<InfectionTrace[] | null>(
    initialData?.traces ?? null,
  );
  const [stats, setStats] = useState<GraphStats | null>(
    initialData?.stats ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<InfectionTrace | null>(
    null,
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [focusTrace, setFocusTrace] = useState(false);
  const activeTrace = selectedTrace ?? traces?.[0] ?? null;

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);
  const isCacheUsable = useCallback(
    (cache: InfectionTrackingCacheData | null) => {
      if (!cache) return false;
      const links = cache.graphData?.links ?? [];
      if (!links.length) return false;
      const contactLinks = links.filter(
        (link) =>
          link.relationship !== "PART_OF" && link.relationship !== "BELONGS_TO",
      );
      if (contactLinks.length < MIN_CONTACT_LINKS) return false;
      if (contactLinks.length / Math.max(links.length, 1) < MIN_CONTACT_RATIO)
        return false;
      if (!Array.isArray(cache.traces) || cache.traces.length === 0)
        return false;
      return true;
    },
    [],
  );

  useEffect(() => {
    if (!isActive) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchAll = async () => {
      const hasValidCache = Boolean(
        initialData &&
        Date.now() - initialData.fetchedAt <= cacheTtlMs &&
        refreshToken === 0 &&
        isCacheUsable(initialData),
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
          infectionTrackingService.getGraphVisualization(420, {
            signal: controller.signal,
          }),
          infectionTrackingService.getTraces({ signal: controller.signal }),
          infectionTrackingService.getGraphStats({ signal: controller.signal }),
        ]);

        if (cancelled) return;

        if (
          !Array.isArray(graphRes?.nodes) ||
          !Array.isArray(graphRes?.links)
        ) {
          throw new Error("Invalid graph visualization payload.");
        }

        if (!Array.isArray(tracesRes)) {
          throw new Error("Invalid traces payload.");
        }

        if (!statsRes || typeof statsRes !== "object") {
          throw new Error("Invalid graph stats payload.");
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
        setSelectedTrace((prev) => {
          if (prev) {
            return (
              nextData.traces.find(
                (trace) => trace.trace_id === prev.trace_id,
              ) ??
              nextData.traces[0] ??
              null
            );
          }
          return nextData.traces[0] ?? null;
        });
        setError(null);
        onDataLoaded?.(nextData);
      } catch {
        if (!cancelled) {
          setError("Unable to load infection tracking data right now.");
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
  }, [cacheTtlMs, initialData, isActive, onDataLoaded, refreshToken, isCacheUsable]);

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
        <p className="text-destructive font-medium">
          Infection tracking data is unavailable.
        </p>
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
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Infection Tracking
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Graph-Based Transmission Analysis
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          {stats && (
            <div className="flex gap-6 text-sm">
              <StatBadge label="Patients" value={stats.nodes?.Patient ?? 0} />
              <StatBadge label="Doctors" value={stats.nodes?.Doctor ?? 0} />
              <StatBadge label="Rooms" value={stats.nodes?.Room ?? 0} />
              <StatBadge label="Traces" value={traces.length} accent />
            </div>
          )}
        </div>
      </div>

      {graphData && (
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Contact Network Graph
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTrace
                    ? "Focused on the selected trace only, so the contact path and timing are easier to read."
                    : "Showing the full hospital contact network. Select a trace above to isolate its chain."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted-foreground">
                <Button
                  variant={focusTrace ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFocusTrace((prev) => !prev)}
                >
                  {focusTrace ? "Focused View" : "Full Network"}
                </Button>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <ForceGraph
            data={graphData}
            highlightTrace={activeTrace}
            isActive={isActive}
            focusTrace={focusTrace}
          />
        </div>
      )}

      <TraceTable
        traces={traces}
        selectedTrace={activeTrace}
        onSelectTrace={setSelectedTrace}
      />

      <GraphLegend />
    </div>
  );
}

function StatBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-2xl font-black ${accent ? "text-red-500" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground font-bold">{label}</p>
    </div>
  );
}
