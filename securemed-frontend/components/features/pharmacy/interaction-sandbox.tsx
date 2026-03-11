import React, { useMemo, useState } from 'react';
import { AlertOctagon, CheckCircle2, ChevronDown, Download, Pill, Plus, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { drugInteractionService, type InteractionCheckResult, type InteractionReport } from '@/services/drug-interactions';

interface MedicationSandboxProps {
    mode: 'doctor' | 'patient';
    patientId?: number;
}

type FindingGroup = {
    title: string;
    severity: InteractionCheckResult['findings'][number]['severity'];
    medications: string[];
    combinationSize: number;
    count: number;
    effects: string[];
    sourceLabel: string;
};

export function MedicationSandbox({ mode, patientId }: MedicationSandboxProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [checking, setChecking] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [checkResult, setCheckResult] = useState<InteractionCheckResult | null>(null);
    const [latestReport, setLatestReport] = useState<InteractionReport | null>(null);
    const [reportHistory, setReportHistory] = useState<InteractionReport[]>([]);
    const [error, setError] = useState<string>('');
    const [reportNotice, setReportNotice] = useState<string>('');
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [autoReportRequested, setAutoReportRequested] = useState(false);
    const [pollingActive, setPollingActive] = useState(false);
    const [pollingSeconds, setPollingSeconds] = useState(0);
    const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(['critical']));

    const toggleTier = (severity: string) => {
        setExpandedTiers(prev => {
            const next = new Set(prev);
            if (next.has(severity)) next.delete(severity);
            else next.add(severity);
            return next;
        });
    };

    const reloadReports = async () => {
        try {
            setReportLoading(true);
            setReportNotice('');
            const [report, history] = await Promise.all([
                drugInteractionService.getLatestReport(patientId),
                drugInteractionService.getReportHistory(patientId),
            ]);
            setLatestReport(report);
            setReportHistory(history.slice(0, 5));
            if (!report) {
                setReportNotice('No interaction report yet. Generating a new report now.');
                if (!autoReportRequested) {
                    setAutoReportRequested(true);
                    await handleRegenerateReport();
                }
            }
        } catch (e: any) {
            setLatestReport(null);
            setReportHistory([]);
            if (e?.response?.status === 404) {
                setReportNotice('No interaction report yet. Generating a new report now.');
                if (!autoReportRequested) {
                    setAutoReportRequested(true);
                    await handleRegenerateReport();
                }
            }
        } finally {
            setReportLoading(false);
        }
    };

    React.useEffect(() => {
        setAutoReportRequested(false);
        setReportNotice('');
        reloadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    React.useEffect(() => {
        const handle = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            try {
                setLoadingSearch(true);
                setError('');
                const names = await drugInteractionService.searchMedications(query.trim(), patientId);
                setResults(names);
            } catch {
                setError('Search failed. Please try again.');
            } finally {
                setLoadingSearch(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [query, patientId]);

    React.useEffect(() => {
        const runCheck = async () => {
            if (selected.length === 0) {
                setCheckResult(null);
                return;
            }
            try {
                setChecking(true);
                setError('');
                const result = await drugInteractionService.checkInteractions(selected, patientId);
                setCheckResult(result);
            } catch {
                setError('Interaction check failed.');
            } finally {
                setChecking(false);
            }
        };
        runCheck();
    }, [selected, patientId]);

    const severityTone = useMemo(() => ({
        critical: 'bg-red-100 text-red-800 border-red-200',
        high: 'bg-orange-100 text-orange-800 border-orange-200',
        moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        low: 'bg-blue-100 text-blue-800 border-blue-200',
    }), []);

    const findings = checkResult?.findings ?? [];
    const interactionFindings = findings.filter((f) => f.combination_size >= 2);
    const singleDrugFindings = findings.filter((f) => f.combination_size < 2);
    const visibleFindings = interactionFindings.length > 0 ? interactionFindings : singleDrugFindings;
    const maxVisibleFindings = 30;
    const truncatedFindings = visibleFindings.length > maxVisibleFindings;
    const limitedVisibleFindings = visibleFindings.slice(0, maxVisibleFindings);
    const summary = useMemo(() => {
        if (checkResult?.summary) {
            return {
                totalFindings: checkResult.summary.total_findings,
                totalCombos: checkResult.summary.total_combinations,
                topEffects: checkResult.summary.top_effects,
            };
        }
        const effectCounts = new Map<string, number>();
        const combos = new Set<string>();
        for (const finding of limitedVisibleFindings) {
            if (finding.side_effect) {
                const key = finding.side_effect.trim();
                effectCounts.set(key, (effectCounts.get(key) || 0) + 1);
            }
            const meds = [...finding.medications].sort().join(' + ');
            combos.add(`${finding.combination_size}|${meds}`);
        }
        const topEffects = Array.from(effectCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([effect, count]) => `${effect} (${count})`);

        return {
            totalFindings: limitedVisibleFindings.length,
            totalCombos: combos.size,
            topEffects,
        };
    }, [limitedVisibleFindings]);
    const hasInteractions = interactionFindings.length > 0;
    const groupedInteractionFindings = useMemo(
        () => buildFindingGroups(limitedVisibleFindings.filter((f) => f.combination_size >= 2)),
        [limitedVisibleFindings]
    );
    const groupedSingleDrugFindings = useMemo(
        () => buildFindingGroups(limitedVisibleFindings.filter((f) => f.combination_size < 2)),
        [limitedVisibleFindings]
    );

    const addMedication = (name: string) => {
        if (selected.some((s) => s.toLowerCase() === name.toLowerCase())) {
            return;
        }
        setSelected((prev) => [...prev, name]);
        setQuery('');
        setResults([]);
    };

    const removeMedication = (name: string) => {
        setSelected((prev) => prev.filter((m) => m !== name));
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloadingPdf(true);
            const blob = await drugInteractionService.downloadReportPDFWithGeneration(patientId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `interaction_report_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            if (error?.message?.includes('timed out')) {
                setError('Report generation is taking longer than expected. Try again in a moment.');
            } else {
                setError('Could not download interaction report.');
            }
        } finally {
            setDownloadingPdf(false);
        }
    };

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleRegenerateReport = async () => {
        try {
            setReportLoading(true);
            setError('');
            setReportNotice('');
            const job = await drugInteractionService.regenerateReport(patientId);

            if (!job?.task_id) {
                await reloadReports();
                return;
            }

            setPollingActive(true);
            setPollingSeconds(0);
            const start = Date.now();
            for (;;) {
                await wait(1500);
                setPollingSeconds((prev) => prev + 1.5);
                const status = await drugInteractionService.getReportJobStatus(job.task_id);
                if (status.status === 'succeeded') {
                    await reloadReports();
                    setReportNotice('Report generated successfully.');
                    setPollingActive(false);
                    return;
                }
                if (status.status === 'failed') {
                    setError(status.error_message || 'Report generation failed.');
                    setPollingActive(false);
                    return;
                }
                if (Date.now() - start > 45000) {
                    setReportNotice('Report generation is taking longer than expected. Try again in a moment.');
                    setPollingActive(false);
                    return;
                }
            }
        } catch {
            setError('Could not regenerate report.');
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold">Medication Safety Checker</h3>
                        <p className="text-xs text-muted-foreground">
                            {mode === 'doctor'
                                ? 'Search medications and evaluate side effects and interaction risk.'
                                : 'See side effects of each medicine and extra risks from combinations.'}
                        </p>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.length} selected</div>
                </div>

                <div className="mt-4 relative flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query.trim().length > 0) {
                                    addMedication(query.trim());
                                }
                            }}
                            placeholder="Search or type any drug name, press Enter to add…"
                            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => { if (query.trim()) addMedication(query.trim()); }}
                        disabled={!query.trim()}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg border bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Add drug to checker"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </button>
                </div>

                {(loadingSearch || results.length > 0) && (
                    <div className="mt-2 rounded-lg border bg-background max-h-40 overflow-auto shadow-sm">
                        {loadingSearch ? (
                            <div className="p-3 text-xs text-muted-foreground">Searching…</div>
                        ) : (
                            <>
                                {results.map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => addMedication(name)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                    >
                                        <Pill className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        {name}
                                    </button>
                                ))}
                                {query.trim().length > 0 && !results.some(r => r.toLowerCase() === query.trim().toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={() => addMedication(query.trim())}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 border-t border-dashed"
                                    >
                                        <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span>Add <span className="font-medium">&quot;{query.trim()}&quot;</span> as custom drug</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                    {selected.map((name) => (
                        <span key={name} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
                            <Pill className="h-3.5 w-3.5 text-primary" />
                            {name}
                            <button type="button" onClick={() => removeMedication(name)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {latestReport ? (
                <div className="rounded-xl border bg-blue-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-sm">Latest Patient Report</h4>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleRegenerateReport}
                                className="text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
                            >
                                Regenerate
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={downloadingPdf}
                                className="text-xs px-2 py-1 rounded border bg-background hover:bg-muted disabled:opacity-60"
                            >
                                <span className="inline-flex items-center gap-1">
                                    <Download className="h-3.5 w-3.5" />
                                    {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                                </span>
                            </button>
                            <span className="text-xs text-muted-foreground">
                                {new Date(latestReport.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Findings: {latestReport.total_findings} | Critical: {latestReport.critical_count} | High: {latestReport.high_count}
                    </div>
                    {reportHistory.length > 1 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium mb-2">Recent Reports</p>
                            <div className="space-y-1">
                                {reportHistory.slice(1).map((r) => (
                                    <div key={r.id} className="text-xs text-muted-foreground">
                                        #{r.id} - {new Date(r.created_at).toLocaleString()} - findings {r.total_findings}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border bg-amber-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-sm">Patient Report</h4>
                        <button
                            type="button"
                            onClick={handleRegenerateReport}
                            className="text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
                        >
                            Generate Report
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {reportNotice || 'No interaction report found yet for this patient.'}
                    </p>
                </div>
            )}
            {reportNotice && latestReport && (
                <div className="text-xs text-muted-foreground">{reportNotice}</div>
            )}
            {reportLoading && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Loading latest report...</span>
                    {pollingActive && (
                        <>
                            <span>Elapsed: {pollingSeconds.toFixed(1)}s</span>
                            <button
                                type="button"
                                onClick={() => setPollingActive(false)}
                                className="text-xs px-2 py-0.5 rounded border bg-background hover:bg-muted"
                            >
                                Stop polling
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className="rounded-xl border bg-card p-4 min-h-[180px]">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Safety Findings</h4>
                    {checking && <span className="text-xs text-muted-foreground">Checking...</span>}
                </div>

                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

                {!checking && checkResult && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border bg-background px-3 py-1 font-medium">
                            Interactions: {checkResult.interaction_findings_total ?? interactionFindings.length}
                        </span>
                        <span className="rounded-full border bg-background px-3 py-1 font-medium">
                            Single-drug effects: {checkResult.single_medication_findings_total ?? singleDrugFindings.length}
                        </span>
                        {checkResult.coverage_gap && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
                                Only 3-drug combos evaluated
                            </span>
                        )}
                        {checkResult.findings_truncated ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
                                Showing top {checkResult.visible_findings_count} of {checkResult.interaction_findings_total + checkResult.single_medication_findings_total}
                            </span>
                        ) : null}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!checking && limitedVisibleFindings.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-5 text-sm text-muted-foreground"
                        >
                            Add medicines to see single-med side effects and interaction side effects.
                        </motion.div>
                    ) : (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4">
                            <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                                <div className="flex flex-wrap gap-3">
                                    <span><strong className="text-foreground">{summary.totalFindings}</strong> findings</span>
                                    <span><strong className="text-foreground">{summary.totalCombos}</strong> combinations</span>
                                    {summary.topEffects.length > 0 && (
                                        <span className="text-foreground">Top effects: {summary.topEffects.join(', ')}</span>
                                    )}
                                </div>
                            </div>
                            {truncatedFindings && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    Showing the top {maxVisibleFindings} findings. Refine medications to narrow results.
                                </div>
                            )}
                            {groupedInteractionFindings.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                                        Combination Risks
                                    </p>
                                    {SEVERITY_TIERS.map((severity) => {
                                        const tierGroups = groupedInteractionFindings.filter(g => g.severity === severity);
                                        return (
                                            <SeverityTierSection
                                                key={severity}
                                                severity={severity}
                                                groups={tierGroups}
                                                isExpanded={expandedTiers.has(severity)}
                                                onToggle={() => toggleTier(severity)}
                                                severityTone={severityTone}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            {!hasInteractions && groupedSingleDrugFindings.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                                        Single Medication Effects
                                    </p>
                                    {SEVERITY_TIERS.map((severity) => {
                                        const tierGroups = groupedSingleDrugFindings.filter(g => g.severity === severity);
                                        return (
                                            <SeverityTierSection
                                                key={severity}
                                                severity={severity}
                                                groups={tierGroups}
                                                isExpanded={expandedTiers.has(severity)}
                                                onToggle={() => toggleTier(severity)}
                                                severityTone={severityTone}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!checking && selected.length > 1 && !hasInteractions && singleDrugFindings.length > 0 && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span className="text-sm text-emerald-800">No known multi-drug interaction side effects detected for current selection.</span>
                    </div>
                )}
                {selected.length > 3 && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
                        <AlertOctagon className="h-4 w-4 text-amber-700" />
                        <span className="text-sm text-amber-800">
                            Only up to 3-drug combinations are evaluated. Larger combinations may be incomplete.
                        </span>
                    </div>
                )}
                {!checking && hasInteractions && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2">
                        <AlertOctagon className="h-4 w-4 text-red-700" />
                        <span className="text-sm text-red-800">Interaction-related side effects found. Showing interaction findings first.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

const SEVERITY_TIERS = ['critical', 'high', 'moderate', 'low'] as const;

function SeverityTierSection({
    severity,
    groups,
    isExpanded,
    onToggle,
    severityTone,
}: {
    severity: string;
    groups: FindingGroup[];
    isExpanded: boolean;
    onToggle: () => void;
    severityTone: Record<string, string>;
}) {
    if (groups.length === 0) return null;
    const totalFindings = groups.reduce((sum, g) => sum + g.count, 0);
    return (
        <div className="rounded-lg border overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${severityTone[severity] || severityTone.moderate}`}>
                        {severity}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {totalFindings} finding{totalFindings !== 1 ? 's' : ''} across {groups.length} combination{groups.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-2 space-y-2 bg-background">
                    {groups.map((group, idx) => (
                        <FindingGroupCard
                            key={`${group.title}-${idx}`}
                            group={group}
                            severityTone={severityTone}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FindingGroupCard({
    group,
    severityTone,
}: {
    group: FindingGroup;
    severityTone: Record<string, string>;
}) {
    return (
        <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">{group.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {group.combinationSize === 1 ? 'Single medication profile' : `${group.combinationSize}-drug combination`} • {group.count} linked findings
                    </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded border ${severityTone[group.severity] || severityTone.moderate}`}>
                    {group.severity}
                </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
                {group.medications.join(' + ')}
            </p>
            <p className="mt-2 text-xs text-foreground">
                {group.effects.slice(0, 4).join(', ')}
                {group.effects.length > 4 ? `, +${group.effects.length - 4} more` : ''}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
                Source: {group.sourceLabel}
            </p>
        </div>
    );
}

function buildFindingGroups(findings: InteractionCheckResult['findings']): FindingGroup[] {
    const grouped = new Map<string, FindingGroup>();

    for (const finding of findings) {
        const medications = [...finding.medications].sort();
        const key = `${finding.severity}|${finding.combination_size}|${medications.join('|')}`;
        const existing = grouped.get(key);

        if (existing) {
            existing.count += 1;
            if (finding.side_effect && !existing.effects.includes(finding.side_effect)) {
                existing.effects.push(finding.side_effect);
            }
            continue;
        }

        grouped.set(key, {
            title: medications.join(' + '),
            severity: finding.severity,
            medications,
            combinationSize: finding.combination_size,
            count: 1,
            effects: finding.side_effect ? [finding.side_effect] : [],
            sourceLabel: finding.source_reference || finding.source || 'Unknown',
        });
    }

    return Array.from(grouped.values()).sort((left, right) => {
        const severityDelta = severityRank(left.severity) - severityRank(right.severity);
        if (severityDelta !== 0) return severityDelta;
        if (right.combinationSize !== left.combinationSize) return right.combinationSize - left.combinationSize;
        return right.count - left.count;
    });
}

function severityRank(severity: string) {
    switch (severity) {
        case 'critical':
            return 0;
        case 'high':
            return 1;
        case 'moderate':
            return 2;
        case 'low':
            return 3;
        default:
            return 9;
    }
}
