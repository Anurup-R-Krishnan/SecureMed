'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, BookOpen, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

// ── Severity color map ───────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    medium: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    high: 'bg-red-500/15 text-red-300 border-red-500/20 animate-pulse',
};

// ── Animated card wrapper ────────────────────────────────────────────────────

const fadeIn = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: 'easeOut' as const },
};

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
            .then((data) => {
                if (!mounted) return;
                setConditions(data);
                setError(null);
            })
            .catch((e: any) => {
                if (!mounted) return;
                setError(e?.response?.data?.error || 'Unable to load condition education.');
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!activeRegion) {
            setExplainer(null);
            return;
        }
        let mounted = true;
        fetchRegionExplainer(activeRegion, 'patient')
            .then((data) => {
                if (!mounted) return;
                setExplainer(data);
                setError(null);
            })
            .catch((e: any) => {
                if (!mounted) return;
                setExplainer(null);
                setError(e?.response?.data?.error || 'Unable to load anatomy explainer.');
            });
        return () => { mounted = false; };
    }, [activeRegion]);

    useEffect(() => {
        if (!activeConditionId) {
            setVisualization(null);
            setVisualRegion(null);
            return;
        }
        let mounted = true;
        setLoading(true);
        fetchConditionVisualization(activeConditionId, 'patient')
            .then((data) => {
                if (!mounted) return;
                setVisualization(data);
                setVisualRegion(data.regions[0] ?? null);
                setError(null);
            })
            .catch((e: any) => {
                if (!mounted) return;
                setVisualization(null);
                setVisualRegion(null);
                setError(e?.response?.data?.error || 'Unable to load condition visualization.');
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, [activeConditionId]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
    };

    return (
        <Card className="overflow-hidden border-white/8 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 shadow-2xl">
            {/* Header */}
            <div className="px-6 pt-5 pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Activity className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white tracking-tight">Anatomy Education</h3>
                            <p className="text-[11px] text-slate-400">Interactive body mapping & condition visualization</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-white/10 px-3 flex items-center gap-1.5">
                            <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                    backgroundColor: patientFocusScore > 60 ? '#34d399' : patientFocusScore > 30 ? '#fbbf24' : '#64748b',
                                    boxShadow: patientFocusScore > 60 ? '0 0 8px rgba(52,211,153,0.5)' : 'none',
                                }}
                            />
                            <span className="text-[11px] font-bold text-white/80">{patientFocusScore}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="explore" className="px-5 pb-5">
                <TabsList className="w-full bg-slate-800/50 border border-white/5 p-0.5 mb-4">
                    <TabsTrigger value="explore" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20">
                        <Activity className="h-3.5 w-3.5" />
                        Explore
                    </TabsTrigger>
                    <TabsTrigger value="explainers" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20">
                        <BookOpen className="h-3.5 w-3.5" />
                        Explainers
                    </TabsTrigger>
                    <TabsTrigger value="conditions" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Conditions
                    </TabsTrigger>
                </TabsList>

                {/* ── Explore ──────────────────────────────────── */}
                <TabsContent value="explore" className="space-y-3 mt-0">
                    <BodyExplorer3D onSelectionChange={handleSelectionChange} compact />
                    <AnimatePresence>
                        {selection.selectedSymptoms.length > 0 && (
                            <motion.div {...fadeIn} className="flex flex-wrap gap-1.5">
                                {selection.selectedSymptoms.map((symptom) => (
                                    <span
                                        key={symptom}
                                        className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 backdrop-blur-sm"
                                    >
                                        {symptom}
                                    </span>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </TabsContent>

                {/* ── Explainers ───────────────────────────────── */}
                <TabsContent value="explainers" className="space-y-3 mt-0">
                    <AnimatePresence mode="wait">
                        {activeRegion && explainer ? (
                            <motion.div key={explainer.region_id} {...fadeIn} className="space-y-3">
                                {/* Title card */}
                                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                        <p className="text-sm font-bold text-white">{explainer.title}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">{explainer.summary}</p>
                                </div>

                                {/* Details */}
                                {explainer.details.length > 0 && (
                                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Clinical Details</p>
                                        <ul className="space-y-1.5">
                                            {explainer.details.map((detail, idx) => (
                                                <li key={idx} className="text-xs text-slate-300 leading-relaxed flex gap-2">
                                                    <span className="text-blue-400 mt-0.5 shrink-0">›</span>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Common symptoms */}
                                {explainer.common_symptoms.length > 0 && (
                                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Common Symptoms</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {explainer.common_symptoms.map((symptom) => (
                                                <span key={symptom} className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Warning signals */}
                                {explainer.warning_signals.length > 0 && (
                                    <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">⚠ Warning Signals</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {explainer.warning_signals.map((signal) => (
                                                <span key={signal} className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-red-500/15 text-red-300 border border-red-500/20">
                                                    {signal}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div {...fadeIn} className="rounded-xl border border-dashed border-white/10 p-8 flex flex-col items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-slate-800/80 flex items-center justify-center">
                                    <BookOpen className="h-5 w-5 text-slate-500" />
                                </div>
                                <p className="text-xs text-slate-500 text-center max-w-[200px]">
                                    Select a region from the <span className="text-slate-300">Explore</span> tab to load anatomy education
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </TabsContent>

                {/* ── Conditions ────────────────────────────────── */}
                <TabsContent value="conditions" className="space-y-4 mt-0">
                    <Select value={activeConditionId} onValueChange={setActiveConditionId}>
                        <SelectTrigger className="w-full bg-slate-800/50 border-white/10 text-white text-sm h-10">
                            <SelectValue placeholder="Select a condition to visualize" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                            {conditions.map((item) => (
                                <SelectItem key={item.condition_id} value={item.condition_id} className="text-slate-200 focus:bg-blue-600/20 focus:text-white">
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <AnimatePresence mode="wait">
                        {visualization && (
                            <motion.div key={visualization.condition_id} {...fadeIn} className="space-y-4">
                                <BodyExplorer3D
                                    mode="condition"
                                    compact
                                    activeCondition={visualization}
                                    activeConditionRegion={visualRegion}
                                    onConditionRegionSelect={setVisualRegion}
                                />

                                {/* Condition overview */}
                                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-blue-400" />
                                        <p className="text-sm font-bold text-white">{visualization.name}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">{visualization.overview}</p>

                                    {/* Typical symptoms */}
                                    {visualization.typical_symptoms.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {visualization.typical_symptoms.map((symptom) => (
                                                <span key={symptom} className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Seek care rules */}
                                {visualization.seek_care_rules.length > 0 && (
                                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">When to Seek Care</p>
                                        <ul className="space-y-1.5">
                                            {visualization.seek_care_rules.map((rule) => (
                                                <li key={rule} className="text-xs text-slate-300 leading-relaxed flex gap-2">
                                                    <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                                                    {rule}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Pins */}
                                {visualization.pins.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Condition Pins</p>
                                        {visualization.pins.map((pin) => (
                                            <div key={pin.id} className={`rounded-xl border p-3 space-y-1 ${SEVERITY_STYLES[pin.severity] || SEVERITY_STYLES.medium}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold">{pin.label}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{pin.severity}</span>
                                                </div>
                                                <p className="text-[11px] opacity-80 leading-relaxed">{pin.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </TabsContent>
            </Tabs>

            {/* Status bar */}
            {(loading || error) && (
                <div className="px-5 pb-3">
                    {loading && (
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full border border-blue-400/30 border-t-blue-400 animate-spin" />
                            <p className="text-[11px] text-slate-400">Loading anatomy data…</p>
                        </div>
                    )}
                    {error && (
                        <p className="text-[11px] text-red-400">{error}</p>
                    )}
                </div>
            )}
        </Card>
    );
}
