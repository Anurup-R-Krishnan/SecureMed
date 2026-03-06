'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnatomySelectionPayload } from '@/components/features/anatomy/region-map';
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
        const intensityWeight = Object.values(selection.intensityByRegion).reduce((acc, value) => acc + Math.min(value, 10), 0) * 0.7;
        return Math.min(100, Math.round(regionWeight + symptomWeight + intensityWeight));
    }, [selection]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetchConditionCatalog('top20', 'patient')
            .then((data) => { if (mounted) { setConditions(data); setError(null); } })
            .catch((e: any) => { if (mounted) setError(e?.response?.data?.error || 'Unable to load condition education.'); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!activeRegion) { setExplainer(null); return; }
        let mounted = true;
        fetchRegionExplainer(activeRegion, 'patient')
            .then((data) => { if (mounted) { setExplainer(data); setError(null); } })
            .catch((e: any) => { if (mounted) { setExplainer(null); setError(e?.response?.data?.error || 'Unable to load anatomy explainer.'); } });
        return () => { mounted = false; };
    }, [activeRegion]);

    useEffect(() => {
        if (!activeConditionId) { setVisualization(null); setVisualRegion(null); return; }
        let mounted = true;
        setLoading(true);
        fetchConditionVisualization(activeConditionId, 'patient')
            .then((data) => { if (mounted) { setVisualization(data); setVisualRegion(data.regions[0] ?? null); setError(null); } })
            .catch((e: any) => { if (mounted) { setVisualization(null); setVisualRegion(null); setError(e?.response?.data?.error || 'Unable to load condition visualization.'); } })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeConditionId]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
    };

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            {/* Header — matches Health Insights, Upcoming Appointments headers */}
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Anatomy Education</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-primary font-semibold">
                        Focus {patientFocusScore}%
                    </span>
                    {selection.selectedRegions.length > 0 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-500 font-medium">
                            {selection.selectedRegions.length} regions
                        </span>
                    )}
                </div>
            </div>

            {/* Main content — single-view grid: 3D body left, info right */}
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
                {/* Left: 3D Body Explorer */}
                <div className="space-y-3">
                    <BodyExplorer3D onSelectionChange={handleSelectionChange} />

                    {/* Symptom badges from body selection */}
                    {selection.selectedSymptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selection.selectedSymptoms.map((symptom) => (
                                <span
                                    key={symptom}
                                    className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                    {symptom}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Info panels — explainer + condition */}
                <div className="space-y-4">
                    {/* Region Explainer */}
                    {activeRegion && explainer ? (
                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <p className="text-sm font-semibold text-foreground">{explainer.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{explainer.summary}</p>

                            {explainer.common_symptoms.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {explainer.common_symptoms.map((symptom) => (
                                        <span key={symptom} className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {symptom}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {explainer.warning_signals.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Warning Signals</p>
                                    <div className="flex flex-wrap gap-1">
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
                        <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                            <p className="text-sm">Click body regions to view anatomy education</p>
                        </div>
                    )}

                    {/* Condition Visualization */}
                    <div className="p-4 rounded-xl border border-border/50 bg-white/5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Condition Visualization
                        </p>
                        <select
                            value={activeConditionId}
                            onChange={(e) => setActiveConditionId(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Select condition</option>
                            {conditions.map((item) => (
                                <option key={item.condition_id} value={item.condition_id}>{item.name}</option>
                            ))}
                        </select>

                        {visualization && (
                            <>
                                <BodyExplorer3D
                                    mode="condition"
                                    compact
                                    activeCondition={visualization}
                                    activeConditionRegion={visualRegion}
                                    onConditionRegionSelect={setVisualRegion}
                                />

                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-foreground">{visualization.name}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{visualization.overview}</p>

                                    {visualization.typical_symptoms.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {visualization.typical_symptoms.map((symptom) => (
                                                <span key={symptom} className="text-[11px] rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {visualization.seek_care_rules.length > 0 && (
                                        <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">When to Seek Care</p>
                                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                                {visualization.seek_care_rules.map((rule) => (
                                                    <li key={rule}>{rule}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reset */}
                    {selection.selectedRegions.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectionChange({ selectedRegions: [], selectedSymptoms: [], intensityByRegion: {} })}
                            className="w-full"
                        >
                            Reset Selection
                        </Button>
                    )}
                </div>
            </div>

            {/* Status */}
            {loading && <p className="mt-4 text-xs text-muted-foreground">Loading anatomy education data...</p>}
            {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        </Card>
    );
}
