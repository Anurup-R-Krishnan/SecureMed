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
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    AnatomySelectionPayload,
    REGION_LOOKUP,
    deriveSymptomsFromRegions,
} from '@/components/features/anatomy/region-map';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

export default function AnatomyEducationCard({
    role = 'patient',
    compact = false,
}: {
    role?: 'patient' | 'doctor';
    compact?: boolean;
}) {
    const [selection, setSelection] = useState<AnatomySelectionPayload>({
        selectedRegions: [],
        selectedSymptoms: [],
        intensityByRegion: {},
    });
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [explainer, setExplainer] = useState<AnatomyRegionExplainer | null>(null);
    const [explainerLoading, setExplainerLoading] = useState(false);

    const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
    const [activeConditionId, setActiveConditionId] = useState<string>('');
    const [visualization, setVisualization] = useState<ConditionVisualization | null>(null);
    const [visualRegion, setVisualRegion] = useState<string | null>(null);
    const [conditionMatches, setConditionMatches] = useState<ConditionMatchResult[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);

    const [loading, setLoading] = useState(false);
    const [matching, setMatching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardRegion, setWizardRegion] = useState('chest');
    const [wizardPain, setWizardPain] = useState(6);
    const [wizardConcern, setWizardConcern] = useState('pain');

    const hasSelection = selection.selectedRegions.length > 0;
    const canvasMode = activeConditionId && visualization ? 'condition' : 'selection';

    const avgPain = useMemo(() => {
        const values = Object.values(selection.intensityByRegion);
        if (!values.length) return null;
        const sum = values.reduce((acc, value) => acc + Math.min(value, 10), 0);
        return Math.round(sum / values.length);
    }, [selection.intensityByRegion]);

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

    const urgencyLabel = useMemo(() => {
        if (showEmergencyAlert) return 'Emergency';
        if (avgPain && avgPain >= 7) return 'High';
        if (avgPain && avgPain >= 4) return 'Moderate';
        if (avgPain && avgPain >= 1) return 'Mild';
        return null;
    }, [avgPain, showEmergencyAlert]);

    useEffect(() => {
        let mounted = true;
        setCatalogLoading(true);
        fetchConditionCatalog('top20', role)
            .then((data) => { if (mounted) { setConditions(data); setError(null); } })
            .catch((e: any) => { if (mounted) setError(e?.response?.data?.error || 'Unable to load conditions.'); })
            .finally(() => { if (mounted) setCatalogLoading(false); });
        return () => { mounted = false; };
    }, [role]);

    useEffect(() => {
        if (!activeRegion) { setExplainer(null); return; }
        let mounted = true;
        setExplainerLoading(true);
        fetchRegionExplainer(activeRegion, role)
            .then((data) => { if (mounted) { setExplainer(data); setError(null); } })
            .catch((e: any) => { if (mounted) { setExplainer(null); setError(e?.response?.data?.error || 'Unable to load explainer.'); } })
            .finally(() => { if (mounted) setExplainerLoading(false); });
        return () => { mounted = false; };
    }, [activeRegion, role]);

    useEffect(() => {
        if (!activeConditionId) { setVisualization(null); setVisualRegion(null); return; }
        let mounted = true;
        setLoading(true);
        fetchConditionVisualization(activeConditionId, role)
            .then((data) => { if (mounted) { setVisualization(data); setVisualRegion(data.regions[0] ?? null); setError(null); } })
            .catch((e: any) => { if (mounted) { setVisualization(null); setVisualRegion(null); setError(e?.response?.data?.error || 'Unable to load condition.'); } })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeConditionId, role]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
        if (payload.selectedRegions.length === 0) {
            setActiveConditionId('');
            setConditionMatches([]);
        }
    };

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

    const handleConditionRegionSelect = (regionId: string) => {
        setVisualRegion(regionId);
        setActiveRegion(regionId);
    };

    const handleClearSelection = () => {
        setSelection({ selectedRegions: [], selectedSymptoms: [], intensityByRegion: {} });
        setActiveRegion(null);
        setConditionMatches([]);
    };

    const applySelection = (regions: string[], intensity: Record<string, number>) => {
        const selectedSymptoms = deriveSymptomsFromRegions(regions);
        setSelection({ selectedRegions: regions, selectedSymptoms, intensityByRegion: intensity });
        setActiveRegion(regions[regions.length - 1] || null);
        setActiveConditionId('');
        setConditionMatches([]);
    };

    const updatePainLevel = (regionId: string, value: number) => {
        setSelection((prev) => ({
            ...prev,
            intensityByRegion: { ...prev.intensityByRegion, [regionId]: value },
        }));
    };

    return (
        <>
            <Card className={`${compact ? 'p-6' : 'p-8'} bg-white/5 backdrop-blur-md border-white/10`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <div>
                            <h3 className="font-semibold text-lg">Anatomy Education &amp; Condition Visualization</h3>
                            <p className="text-xs text-muted-foreground">Interactive guidance to understand symptoms and educational condition patterns.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                            Guided Start
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applySelection(['chest'], { chest: 7 })}
                        >
                            Example: Chest pain
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => applySelection(['head'], { head: 6 })}
                        >
                            Example: Headache
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                    <Badge variant="outline" className="gap-1.5 text-[11px]">
                        <MapPin className="h-3 w-3" />
                        {hasSelection
                            ? `${selection.selectedRegions.length} region${selection.selectedRegions.length > 1 ? 's' : ''} selected`
                            : 'Tap a region to begin'}
                    </Badge>
                    {avgPain && (
                        <Badge variant="outline" className="text-[11px]">
                            Avg pain {avgPain}/10
                        </Badge>
                    )}
                    {selection.selectedSymptoms.length > 0 && (
                        <Badge variant="outline" className="text-[11px]">
                            {selection.selectedSymptoms.length} symptom cues
                        </Badge>
                    )}
                    {urgencyLabel && (
                        <Badge className={showEmergencyAlert ? 'bg-red-500 text-white' : 'bg-amber-500/20 text-amber-700'}>
                            {urgencyLabel}
                        </Badge>
                    )}
                    {activeConditionId && visualization && (
                        <Badge variant="outline" className="gap-1.5 text-[11px]">
                            <Stethoscope className="h-3 w-3" />
                            {visualization.name}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[360px_360px_1fr] gap-6 items-start">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4">
                            <BodyExplorer3D
                                mode={canvasMode}
                                compact
                                showSliders={false}
                                selection={selection}
                                onSelectionChange={handleSelectionChange}
                                activeCondition={visualization}
                                activeConditionRegion={visualRegion}
                                onConditionRegionSelect={handleConditionRegionSelect}
                            />
                        </div>
                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Selected Regions</p>
                            {selection.selectedRegions.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {selection.selectedRegions.map((regionId) => (
                                        <span key={regionId} className="text-xs rounded-full px-2.5 py-1 bg-white/10 border border-border/50">
                                            {REGION_LOOKUP[regionId]?.label || regionId}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Tap a body region to begin.</p>
                            )}
                            {selection.selectedRegions.length > 0 && !activeConditionId && (
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Pain &amp; Symptom Profile</p>
                                {selection.selectedRegions.length > 0 && (
                                    <button
                                        onClick={handleClearSelection}
                                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {selection.selectedRegions.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/60 bg-white/5 p-6 text-center text-xs text-muted-foreground">
                                    Select one or more regions to rate pain.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selection.selectedRegions.map((regionId) => {
                                        const pain = selection.intensityByRegion[regionId] ?? 5;
                                        return (
                                            <div key={regionId} className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {REGION_LOOKUP[regionId]?.label || regionId}
                                                    </span>
                                                    <span className="text-xs font-bold" style={{ color: pain >= 7 ? '#ef4444' : pain >= 4 ? '#f97316' : '#fbbf24' }}>
                                                        {pain}/10
                                                    </span>
                                                </div>
                                                <Slider
                                                    value={[pain]}
                                                    min={1}
                                                    max={10}
                                                    step={1}
                                                    onValueChange={(value) => updatePainLevel(regionId, value?.[0] ?? 5)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Derived Symptom Cues</p>
                            {selection.selectedSymptoms.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {selection.selectedSymptoms.map((symptom) => (
                                        <span key={symptom} className="text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {symptom}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Select a region to auto-suggest symptom cues.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold text-foreground">Suggested Conditions</p>
                                </div>
                                {catalogLoading && (
                                    <span className="text-[10px] text-muted-foreground">Loading...</span>
                                )}
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

                            {hasSelection && !activeConditionId && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Matched from pain profile</p>
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
                                            {matching
                                                ? 'Generating matches from your selected regions...'
                                                : 'Select regions and rate pain to see educational condition suggestions.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-white/5 p-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-semibold text-foreground">Insights</p>
                                {(loading || explainerLoading) && (
                                    <span className="text-[10px] text-muted-foreground">Loading...</span>
                                )}
                            </div>

                            {visualization ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-border/50 space-y-2">
                                        <p className="text-sm font-semibold text-foreground">{visualization.name}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{visualization.overview}</p>
                                    </div>

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
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Select a suggested condition or keep exploring body regions to generate guidance.
                                </div>
                            )}

                            {activeRegion && explainer ? (
                                <div className="space-y-3">
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
                                <div className="text-xs text-muted-foreground">Select a body region to load anatomy education.</div>
                            )}
                        </div>
                    </div>
                </div>

                {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
            </Card>

            <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Guided Symptom Wizard</DialogTitle>
                        <DialogDescription>
                            Pick a region and pain level to generate educational suggestions. Not a diagnosis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Primary Concern</label>
                            <select
                                value={wizardConcern}
                                onChange={(e) => setWizardConcern(e.target.value)}
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="pain">Pain or discomfort</option>
                                <option value="swelling">Swelling</option>
                                <option value="weakness">Weakness / numbness</option>
                                <option value="other">Other symptoms</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Region</label>
                            <select
                                value={wizardRegion}
                                onChange={(e) => setWizardRegion(e.target.value)}
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {Object.values(REGION_LOOKUP).map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pain Level</label>
                            <Slider
                                value={[wizardPain]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={(value) => setWizardPain(value?.[0] ?? 5)}
                            />
                            <div className="text-xs text-muted-foreground">Selected: {wizardPain}/10</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                applySelection([wizardRegion], { [wizardRegion]: wizardPain });
                                setWizardOpen(false);
                            }}
                        >
                            Apply Selection
                        </Button>
                        <Button variant="outline" onClick={() => setWizardOpen(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
