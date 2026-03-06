'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BookOpen, ChevronRight, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AnatomySelectionPayload, REGION_LOOKUP } from '@/components/features/anatomy/region-map';
import {
    AnatomyRegionExplainer,
    ConditionCatalogItem,
    ConditionVisualization,
    fetchConditionCatalog,
    fetchConditionVisualization,
    fetchRegionExplainer,
} from '@/services/anatomy-content';

const BodyExplorer3D = dynamic(
    () => import('@/components/features/anatomy/body-explorer-3d'),
    { ssr: false }
);

export default function AnatomyEducationCard() {
    const [selection, setSelection] = useState<AnatomySelectionPayload>({
        selectedRegions: [],
        selectedSymptoms: [],
        intensityByRegion: {},
    });
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [explainer, setExplainer] = useState<AnatomyRegionExplainer | null>(null);

    const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
    const [activeConditionId, setActiveConditionId] = useState<string>('');
    const [visualization, setVisualization] = useState<ConditionVisualization | null>(null);
    const [visualRegion, setVisualRegion] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patientFocusScore = useMemo(() => {
        const regionWeight = selection.selectedRegions.length * 20;
        const symptomWeight = selection.selectedSymptoms.length * 8;
        const intensityWeight = Object.values(selection.intensityByRegion)
            .reduce((acc, v) => acc + Math.min(v, 10), 0) * 0.7;
        return Math.min(100, Math.round(regionWeight + symptomWeight + intensityWeight));
    }, [selection]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetchConditionCatalog('top20', 'patient')
            .then((data) => { if (mounted) { setConditions(data); setError(null); } })
            .catch((e: any) => { if (mounted) setError(e?.response?.data?.error || 'Unable to load conditions.'); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!activeRegion) { setExplainer(null); return; }
        let mounted = true;
        fetchRegionExplainer(activeRegion, 'patient')
            .then((data) => { if (mounted) { setExplainer(data); setError(null); } })
            .catch((e: any) => { if (mounted) { setExplainer(null); setError(e?.response?.data?.error || 'Unable to load explainer.'); } });
        return () => { mounted = false; };
    }, [activeRegion]);

    useEffect(() => {
        if (!activeConditionId) { setVisualization(null); setVisualRegion(null); return; }
        let mounted = true;
        setLoading(true);
        fetchConditionVisualization(activeConditionId, 'patient')
            .then((data) => { if (mounted) { setVisualization(data); setVisualRegion(data.regions[0] ?? null); setError(null); } })
            .catch((e: any) => { if (mounted) { setVisualization(null); setVisualRegion(null); setError(e?.response?.data?.error || 'Unable to load visualization.'); } })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeConditionId]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
    };

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Anatomy Education & Condition Visualization</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {patientFocusScore > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary font-semibold">
                            Focus {patientFocusScore}%
                        </span>
                    )}
                    {selection.selectedRegions.length > 0 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-500 font-medium">
                            {selection.selectedRegions.length} {selection.selectedRegions.length === 1 ? 'region' : 'regions'} selected
                        </span>
                    )}
                </div>
            </div>

            {/* ── 3-column grid ───────────────────────────────────────────────── */}
            <div className="grid xl:grid-cols-[1.5fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr] grid-cols-1 gap-6 items-start">

                {/* Col 1: 3D Body Explorer — full height, tall canvas */}
                <div className="space-y-4">
                    <BodyExplorer3D onSelectionChange={handleSelectionChange} />

                    {/* Symptom chips from selected regions */}
                    {selection.selectedSymptoms.length > 0 && (
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Region-Derived Symptoms
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {selection.selectedSymptoms.map((symptom) => (
                                    <span key={symptom} className="text-xs rounded-full px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {symptom}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected region intensity list */}
                    {selection.selectedRegions.length > 0 && (
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Selected Regions
                            </p>
                            <div className="space-y-1.5">
                                {selection.selectedRegions.map((regionId) => (
                                    <div key={regionId} className="flex items-center justify-between rounded-lg border border-border/50 bg-white/5 px-3 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-400" />
                                            <span className="font-medium text-foreground">{REGION_LOOKUP[regionId]?.label || regionId}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            intensity {selection.intensityByRegion[regionId] ?? 5}/10
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Col 2: Region Explainer */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Region Explainer</p>
                    </div>

                    {activeRegion && explainer ? (
                        <div className="space-y-4">
                            {/* Title + summary */}
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                <p className="text-sm font-semibold text-foreground mb-1">{explainer.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{explainer.summary}</p>
                            </div>

                            {/* Details */}
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

                            {/* Common symptoms */}
                            {explainer.common_symptoms.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Common Symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {explainer.common_symptoms.map((s) => (
                                            <span key={s} className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warning signals */}
                            {explainer.warning_signals.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Warning Signals</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {explainer.warning_signals.map((signal) => (
                                            <span key={signal} className="text-[11px] rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Click a body region<br />to load anatomy education</p>
                        </div>
                    )}
                </div>

                {/* Col 3: Condition Visualization */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Condition Visualization</p>
                    </div>

                    <select
                        value={activeConditionId}
                        onChange={(e) => setActiveConditionId(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="">Select a condition…</option>
                        {conditions.map((item) => (
                            <option key={item.condition_id} value={item.condition_id}>{item.name}</option>
                        ))}
                    </select>

                    {loading && !visualization && (
                        <div className="flex items-center gap-2 py-2">
                            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                            <span className="text-xs text-muted-foreground">Loading…</span>
                        </div>
                    )}

                    {visualization ? (
                        <div className="space-y-4">
                            {/* Condition body view */}
                            <BodyExplorer3D
                                mode="condition"
                                compact
                                activeCondition={visualization}
                                activeConditionRegion={visualRegion}
                                onConditionRegionSelect={setVisualRegion}
                            />

                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-white/5 border border-border/50">
                                    <p className="text-sm font-semibold text-foreground mb-1">{visualization.name}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{visualization.overview}</p>
                                </div>

                                {visualization.typical_symptoms.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Typical Symptoms</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {visualization.typical_symptoms.map((s) => (
                                                <span key={s} className="text-[11px] rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {visualization.seek_care_rules.length > 0 && (
                                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-2">When to Seek Care</p>
                                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                            {visualization.seek_care_rules.map((rule) => (
                                                <li key={rule}>{rule}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Affected regions */}
                                {visualization.regions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {visualization.regions.map((regionId) => (
                                            <button
                                                key={regionId}
                                                onClick={() => setVisualRegion(regionId)}
                                                className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors font-medium ${visualRegion === regionId
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-white/5 text-muted-foreground border-border/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                {REGION_LOOKUP[regionId]?.label || regionId}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : !loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
                            <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Select a condition above<br />to see body visualization</p>
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        </Card>
    );
}
