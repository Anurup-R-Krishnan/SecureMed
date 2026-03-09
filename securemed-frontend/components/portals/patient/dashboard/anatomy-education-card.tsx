'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    ChevronRight,
    MapPin,
    Stethoscope,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnatomySelectionPayload, REGION_LOOKUP } from '@/components/features/anatomy/region-map';
import {
    AnatomyRegionExplainer,
    ConditionCatalogItem,
    ConditionMatchResult,
    ConditionVisualization,
    fetchConditionCatalog,
    fetchConditionMatches,
    fetchConditionVisualization,
    fetchRegionExplainer,
} from '@/services/anatomy-content';

const BodyExplorer3D = dynamic(
    () => import('@/components/features/anatomy/body-explorer-3d'),
    { ssr: false }
);

const SEVERITY_BADGE: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
};

export default function AnatomyEducationCard() {
    // ── body selection state (left panel, explore mode) ─────────────────────
    const [selection, setSelection] = useState<AnatomySelectionPayload>({
        selectedRegions: [],
        selectedSymptoms: [],
        intensityByRegion: {},
    });
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [explainer, setExplainer] = useState<AnatomyRegionExplainer | null>(null);

    // ── condition state ─────────────────────────────────────────────────────
    const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
    const [activeConditionId, setActiveConditionId] = useState<string>('');
    const [visualization, setVisualization] = useState<ConditionVisualization | null>(null);
    const [visualRegion, setVisualRegion] = useState<string | null>(null);
    const [conditionMatches, setConditionMatches] = useState<ConditionMatchResult[]>([]);

    // ── ui state ────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derived: which mode does the canvas operate in?
    const canvasMode = activeConditionId && visualization ? 'condition' : 'selection';

    const patientFocusScore = useMemo(() => {
        const r = selection.selectedRegions.length * 20;
        const s = selection.selectedSymptoms.length * 8;
        const i = Object.values(selection.intensityByRegion).reduce((a, v) => a + Math.min(v, 10), 0) * 0.7;
        return Math.min(100, Math.round(r + s + i));
    }, [selection]);

    // Fetch condition catalog once
    useEffect(() => {
        let mounted = true;
        fetchConditionCatalog('top20', 'patient')
            .then((data) => { if (mounted) { setConditions(data); setError(null); } })
            .catch((e: any) => { if (mounted) setError(e?.response?.data?.error || 'Unable to load conditions.'); });
        return () => { mounted = false; };
    }, []);

    // Fetch region explainer when a region is clicked
    useEffect(() => {
        if (!activeRegion) { setExplainer(null); return; }
        let mounted = true;
        fetchRegionExplainer(activeRegion, 'patient')
            .then((data) => { if (mounted) { setExplainer(data); setError(null); } })
            .catch((e: any) => { if (mounted) { setExplainer(null); setError(e?.response?.data?.error || 'Unable to load explainer.'); } });
        return () => { mounted = false; };
    }, [activeRegion]);

    // Fetch condition visualization
    useEffect(() => {
        if (!activeConditionId) { setVisualization(null); setVisualRegion(null); return; }
        let mounted = true;
        setLoading(true);
        fetchConditionVisualization(activeConditionId, 'patient')
            .then((data) => { if (mounted) { setVisualization(data); setVisualRegion(data.regions[0] ?? null); setError(null); } })
            .catch((e: any) => { if (mounted) { setVisualization(null); setVisualRegion(null); setError(e?.response?.data?.error || 'Unable to load condition.'); } })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeConditionId]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
    };

    // When a condition is selected, clear body selection (canvas switches to condition mode)
    const handleConditionChange = (conditionId: string) => {
        setActiveConditionId(conditionId);
        if (conditionId) {
            setSelection({ selectedRegions: [], selectedSymptoms: [], intensityByRegion: {} });
            setActiveRegion(null);
            setConditionMatches([]);
        }
    };

    const runConditionMatch = useCallback(async () => {
        if (selection.selectedRegions.length === 0) {
            setConditionMatches([]);
            return;
        }
        setMatching(true);
        try {
            const matches = await fetchConditionMatches(selection.selectedRegions, selection.intensityByRegion);
            setConditionMatches(matches);
            setError(null);
        } catch (e: any) {
            setConditionMatches([]);
            setError(e?.response?.data?.error || 'Unable to match conditions from selected pain profile.');
        } finally {
            setMatching(false);
        }
    }, [selection.selectedRegions, selection.intensityByRegion]);

    useEffect(() => {
        if (selection.selectedRegions.length === 0 || activeConditionId) {
            setConditionMatches([]);
            return;
        }
        const timer = setTimeout(() => {
            runConditionMatch().catch(() => {});
        }, 450);
        return () => clearTimeout(timer);
    }, [activeConditionId, runConditionMatch, selection.selectedRegions.length]);

    // When a region is clicked in condition mode, show explainer for it
    const handleConditionRegionSelect = (regionId: string) => {
        setVisualRegion(regionId);
        setActiveRegion(regionId);
    };

    const currentConditionPain = visualization && visualRegion
        ? (visualization.region_pain_levels?.[visualRegion] ?? 5)
        : null;
    const currentInterpretation = visualization && visualRegion
        ? (visualization.pain_interpretations?.[visualRegion] || []).find((rule) => {
            const min = Number(rule.min ?? 1);
            const max = Number(rule.max ?? 10);
            const pain = currentConditionPain ?? 5;
            return pain >= min && pain <= max;
        }) || null
        : null;
    const showEmergencyAlert = Boolean(
        currentInterpretation?.urgency === 'emergency'
        || (visualRegion === 'chest' && (currentConditionPain ?? 0) >= 8)
    );

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Anatomy Education &amp; Condition Visualization</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {/* Mode indicator */}
                    {visualization ? (
                        <Badge variant="outline" className="gap-1.5 text-[11px]">
                            <Stethoscope className="h-3 w-3" />
                            {visualization.name}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1.5 text-[11px]">
                            <MapPin className="h-3 w-3" />
                            {selection.selectedRegions.length > 0
                                ? `${selection.selectedRegions.length} region${selection.selectedRegions.length > 1 ? 's' : ''} selected`
                                : 'Interactive Explore Mode'}
                        </Badge>
                    )}
                    {patientFocusScore > 0 && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary font-semibold">
                            Focus {patientFocusScore}%
                        </span>
                    )}
                </div>
            </div>

            {/* ── Layout: [Body SVG] | [Info panel] ──────────────── */}
            <div className="grid md:grid-cols-[280px_1fr] grid-cols-1 gap-6 items-start">

                {/* ── Left: Body SVG ──────────────────────── */}
                <div>
                    <BodyExplorer3D
                        mode={canvasMode}
                        compact
                        onSelectionChange={handleSelectionChange}
                        activeCondition={visualization}
                        activeConditionRegion={visualRegion}
                        onConditionRegionSelect={handleConditionRegionSelect}
                    />
                </div>

                {/* ── Right: Info panel ─────────────────────────────────── */}
                <div className="space-y-5">

                    {/* Condition selector always visible at top */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-semibold text-foreground">Condition Visualization</p>
                        </div>
                        <select
                            value={activeConditionId}
                            onChange={(e) => handleConditionChange(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">— or select a condition —</option>
                            {conditions.map((item) => (
                                <option key={item.condition_id} value={item.condition_id}>{item.name}</option>
                            ))}
                        </select>
                        {activeConditionId && (
                            <button
                                onClick={() => handleConditionChange('')}
                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Back to explore mode
                            </button>
                        )}
                    </div>

                    <hr className="border-border/30" />

                    {/* ── Condition panel ───────────────────── */}
                    {visualization && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-border/50 space-y-2">
                                <p className="text-sm font-semibold text-foreground">{visualization.name}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{visualization.overview}</p>
                            </div>

                            {/* Affected regions as selectable chips */}
                            {visualization.regions.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Affected Regions</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {visualization.regions.map((regionId) => (
                                            <button
                                                key={regionId}
                                                onClick={() => handleConditionRegionSelect(regionId)}
                                                className={`text-xs rounded-full px-2.5 py-1 border font-medium transition-all ${visualRegion === regionId
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-white/5 text-muted-foreground border-border/50 hover:bg-white/10 hover:text-foreground'
                                                    }`}
                                            >
                                                {REGION_LOOKUP[regionId]?.label || regionId}
                                                {typeof visualization.region_pain_levels?.[regionId] === 'number' && (
                                                    <span className="ml-1.5 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">
                                                        {visualization.region_pain_levels[regionId]}/10
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {visualRegion && currentInterpretation && (
                                <div className={`rounded-xl border p-3 ${showEmergencyAlert ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Pain interpretation</p>
                                    <p className="text-sm font-semibold text-foreground mb-1">
                                        {REGION_LOOKUP[visualRegion]?.label || visualRegion}: {currentConditionPain}/10
                                    </p>
                                    <p className="text-xs text-muted-foreground">{currentInterpretation.message}</p>
                                </div>
                            )}

                            {showEmergencyAlert && (
                                <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                                        <p className="text-xs text-red-200">
                                            High-intensity pain in this pattern may indicate an urgent condition. Seek emergency care immediately.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Typical symptoms */}
                            {visualization.typical_symptoms.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Typical Symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {visualization.typical_symptoms.map((s) => (
                                            <span key={s} className="text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Condition pins */}
                            {visualization.pins.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Condition Markers</p>
                                    {visualization.pins.map((pin) => (
                                        <div key={pin.id} className={`rounded-xl border p-3 space-y-0.5 ${SEVERITY_BADGE[pin.severity] || SEVERITY_BADGE.medium}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold">{pin.label}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{pin.severity}</span>
                                            </div>
                                            <p className="text-[11px] leading-relaxed opacity-80">{pin.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Seek care rules */}
                            {visualization.seek_care_rules.length > 0 && (
                                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">When to Seek Care</p>
                                    </div>
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                        {visualization.seek_care_rules.map((rule) => (
                                            <li key={rule}>{rule}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Region explainer panel (explore mode) ── */}
                    {!visualization && (
                        <>
                            {/* AI condition suggestions from body + pain input */}
                            {selection.selectedRegions.length > 0 && (
                                <div className="space-y-2 rounded-xl border border-border/50 p-3 bg-white/5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Suggested Conditions</p>
                                        <button
                                            onClick={runConditionMatch}
                                            disabled={matching}
                                            className="text-[11px] rounded-md border border-border/60 px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-60"
                                        >
                                            {matching ? 'Analyzing...' : 'Refresh'}
                                        </button>
                                    </div>
                                    {conditionMatches.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {conditionMatches.slice(0, 5).map((m) => (
                                                <button
                                                    key={m.condition_id}
                                                    onClick={() => handleConditionChange(m.condition_id)}
                                                    className="w-full rounded-lg border border-border/50 px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-foreground">{m.name}</span>
                                                        <span className="text-[10px] rounded-full bg-primary/15 px-1.5 py-0.5 text-primary font-semibold">
                                                            {m.confidence}%
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-muted-foreground">{m.reasoning}</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            {matching ? 'Generating AI matches...' : 'Select regions and pain levels to get AI-matched conditions.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Derived symptoms from selected regions */}
                            {selection.selectedSymptoms.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Region-Derived Symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selection.selectedSymptoms.map((symptom) => (
                                            <span key={symptom} className="text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                {symptom}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-semibold text-foreground">Region Explainer</p>
                            </div>

                            {activeRegion && explainer ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                        <p className="text-sm font-semibold text-foreground mb-1">{explainer.title}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{explainer.summary}</p>
                                    </div>

                                    {explainer.details.length > 0 && (
                                        <div className="space-y-1.5">
                                            {explainer.details.map((detail, i) => (
                                                <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                                                    <ChevronRight className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                                    <span className="leading-relaxed">{detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {explainer.common_symptoms.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Common Symptoms</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {explainer.common_symptoms.map((s) => (
                                                    <span key={s} className="text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {explainer.warning_signals.length > 0 && (
                                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Warning Signals</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {explainer.warning_signals.map((signal) => (
                                                    <span key={signal} className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        {signal}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                                    <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                                    <p className="text-sm text-muted-foreground">Click a body region<br />to read anatomy education</p>
                                    <p className="text-xs text-muted-foreground/60">or select a condition above</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        </Card>
    );
}
