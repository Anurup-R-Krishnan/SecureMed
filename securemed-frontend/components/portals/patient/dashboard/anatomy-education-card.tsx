'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

        return () => {
            mounted = false;
        };
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

        return () => {
            mounted = false;
        };
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

        return () => {
            mounted = false;
        };
    }, [activeConditionId]);

    const handleSelectionChange = (payload: AnatomySelectionPayload) => {
        setSelection(payload);
        setActiveRegion(payload.selectedRegions[payload.selectedRegions.length - 1] || null);
    };

    return (
        <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold text-lg">Anatomy Education and Condition Visualization</h3>
                <span className="rounded-full px-2 py-1 text-xs font-semibold bg-primary/10 text-primary">
                    Active Patient Focus {patientFocusScore}%
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
                Select body regions to understand symptoms, warning signs, and condition patterns.
            </p>

            <Tabs defaultValue="explore" className="space-y-3">
                <TabsList>
                    <TabsTrigger value="explore">Explore</TabsTrigger>
                    <TabsTrigger value="explainers">Explainers</TabsTrigger>
                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                </TabsList>

                <TabsContent value="explore" className="space-y-3">
                    <BodyExplorer3D onSelectionChange={handleSelectionChange} compact />
                    {selection.selectedSymptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selection.selectedSymptoms.map((symptom) => (
                                <span key={symptom} className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {symptom}
                                </span>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="explainers" className="space-y-3">
                    {activeRegion && explainer ? (
                        <div className="rounded-lg border p-3 space-y-2">
                            <p className="text-sm font-semibold text-foreground">{explainer.title}</p>
                            <p className="text-sm text-muted-foreground">{explainer.summary}</p>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Warning Signals</p>
                                <div className="flex flex-wrap gap-1">
                                    {explainer.warning_signals.map((signal) => (
                                        <span key={signal} className="text-xs rounded-full px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                            {signal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Select a region from Explore to load guided anatomy education.</p>
                    )}
                </TabsContent>

                <TabsContent value="conditions" className="space-y-3">
                    <select
                        value={activeConditionId}
                        onChange={(e) => setActiveConditionId(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                            <div className="rounded-lg border p-3 space-y-2">
                                <p className="text-sm font-semibold text-foreground">{visualization.name}</p>
                                <p className="text-sm text-muted-foreground">{visualization.overview}</p>
                                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                                    {visualization.seek_care_rules.map((rule) => (
                                        <li key={rule}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {loading && <p className="mt-3 text-xs text-muted-foreground">Loading live anatomy education data...</p>}
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </Card>
    );
}
