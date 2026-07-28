"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Stethoscope,
  FlaskConical,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/urls";
import { AnatomySelectionPayload } from "@/components/features/anatomy/region-map";
import {
  AnatomyRegionExplainer,
  ConditionCatalogItem,
  ConditionVisualization,
  fetchConditionCatalog,
  fetchConditionVisualization,
  fetchRegionExplainer,
} from "@/services/anatomy-content";

const BodyExplorer3D = dynamic(
  () => import("@/components/features/anatomy/body-explorer-3d"),
  { ssr: false },
);
const ENABLE_3D_BODY = process.env.NEXT_PUBLIC_ENABLE_3D_BODY !== "false";

// Backend API URL

// Common symptoms list
const commonSymptoms = [
  "Fever",
  "Cough",
  "Headache",
  "Chest pain",
  "Fatigue",
  "Shortness of breath",
  "Abdominal pain",
  "Joint pain",
  "Dizziness",
  "Nausea",
];

interface AIDiagnosisSuggestion {
  id: string;
  diagnosis: string;
  icdCode: string;
  confidence: number;
  matchedSymptoms: string[];
  description: string;
  recommendedTests?: string[];
  status?: "pending" | "accepted" | "rejected";
}

interface AIDecisionSupportProps {
  onAcceptSuggestion?: (suggestion: AIDiagnosisSuggestion) => void;
  onRejectSuggestion?: (suggestion: AIDiagnosisSuggestion) => void;
}

export default function AIDecisionSupport({
  onAcceptSuggestion,
  onRejectSuggestion,
}: AIDecisionSupportProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AIDiagnosisSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symptomInput, setSymptomInput] = useState("");
  const [showSuggestionList, setShowSuggestionList] = useState(false);
  const [anatomySelection, setAnatomySelection] =
    useState<AnatomySelectionPayload>({
      selectedRegions: [],
      selectedSymptoms: [],
      intensityByRegion: {},
    });
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [explainer, setExplainer] = useState<AnatomyRegionExplainer | null>(
    null,
  );
  const [conditionCatalog, setConditionCatalog] = useState<
    ConditionCatalogItem[]
  >([]);
  const [activeConditionId, setActiveConditionId] = useState("");
  const [conditionVisualization, setConditionVisualization] =
    useState<ConditionVisualization | null>(null);
  const [conditionRegion, setConditionRegion] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const filteredSymptoms = commonSymptoms.filter(
    (symptom) =>
      symptom.toLowerCase().includes(symptomInput.toLowerCase()) &&
      !selectedSymptoms.includes(symptom),
  );

  const mergedSymptoms = Array.from(
    new Set([...selectedSymptoms, ...anatomySelection.selectedSymptoms]),
  );
  const patientFocusScore = Math.min(
    100,
    anatomySelection.selectedRegions.length * 20 + mergedSymptoms.length * 8,
  );

  React.useEffect(() => {
    fetchConditionCatalog("top20", "doctor")
      .then((items) => setConditionCatalog(items))
      .catch(() => setContentError("Unable to load condition catalog."));
  }, []);

  React.useEffect(() => {
    if (!activeRegion) {
      setExplainer(null);
      return;
    }
    fetchRegionExplainer(activeRegion, "doctor")
      .then((data) => {
        setExplainer(data);
        setContentError(null);
      })
      .catch(() => {
        setExplainer(null);
        setContentError("Unable to load anatomy explainer.");
      });
  }, [activeRegion]);

  React.useEffect(() => {
    if (!activeConditionId) {
      setConditionVisualization(null);
      setConditionRegion(null);
      return;
    }
    setContentLoading(true);
    fetchConditionVisualization(activeConditionId, "doctor")
      .then((data) => {
        setConditionVisualization(data);
        setConditionRegion(data.regions[0] ?? null);
        setContentError(null);
      })
      .catch(() => {
        setConditionVisualization(null);
        setConditionRegion(null);
        setContentError("Unable to load condition visualization.");
      })
      .finally(() => setContentLoading(false));
  }, [activeConditionId]);

  const handleAnatomySelectionChange = (payload: AnatomySelectionPayload) => {
    setAnatomySelection(payload);
    setActiveRegion(
      payload.selectedRegions[payload.selectedRegions.length - 1] || null,
    );
  };

  const handleAddSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
    setSymptomInput("");
    setShowSuggestionList(false);
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
  };

  const handleGetSuggestions = async () => {
    if (mergedSymptoms.length === 0) {
      setError("Please select at least one symptom");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call Django backend for AI suggestions
      const response = await fetch(`${API_BASE_URL}/doctor/ai-suggestions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symptoms: mergedSymptoms,
          regions: anatomySelection.selectedRegions,
          intensityByRegion: anatomySelection.intensityByRegion,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add pending status to all suggestions
      const suggestionsWithStatus = data.suggestions.map(
        (s: AIDiagnosisSuggestion) => ({
          ...s,
          status: "pending" as const,
        }),
      );

      setSuggestions(suggestionsWithStatus);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get AI suggestions",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (suggestion: AIDiagnosisSuggestion) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, status: "accepted" as const } : s,
      ),
    );
    onAcceptSuggestion?.(suggestion);
  };

  const handleReject = (suggestion: AIDiagnosisSuggestion) => {
    setSuggestions(
      suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, status: "rejected" as const } : s,
      ),
    );
    onRejectSuggestion?.(suggestion);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70)
      return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (confidence >= 50)
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              AI Clinical Decision Support - Disclaimer
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              AI suggestions are powered by Django backend and are for reference
              only. They do not replace clinical judgment. Final diagnosis
              remains under doctor control.
            </p>
          </div>
        </div>
      </Card>

      {/* Symptom Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Enter Symptoms
        </h3>

        <div className="mb-4 rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Active Patient Focus
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
              Focus Score {patientFocusScore}%
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Regions {anatomySelection.selectedRegions.length}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Symptoms {mergedSymptoms.length}
            </span>
            {activeConditionId && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Condition {activeConditionId}
              </span>
            )}
          </div>
        </div>

        {ENABLE_3D_BODY && (
          <div className="space-y-3 mb-4">
            <BodyExplorer3D onSelectionChange={handleAnatomySelectionChange} />
            {activeRegion && explainer && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {explainer.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {explainer.summary}
                </p>
                <div className="flex flex-wrap gap-1">
                  {explainer.warning_signals.map((signal) => (
                    <span
                      key={signal}
                      className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Condition Visualization
              </p>
              <select
                value={activeConditionId}
                onChange={(e) => setActiveConditionId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Select condition</option>
                {conditionCatalog.map((item) => (
                  <option key={item.condition_id} value={item.condition_id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {conditionVisualization && (
                <>
                  <BodyExplorer3D
                    mode="condition"
                    compact
                    activeCondition={conditionVisualization}
                    activeConditionRegion={conditionRegion}
                    onConditionRegionSelect={setConditionRegion}
                  />
                  <p className="text-xs text-muted-foreground">
                    {conditionVisualization.overview}
                  </p>
                </>
              )}
              {contentLoading && (
                <p className="text-xs text-muted-foreground">
                  Loading condition visualization...
                </p>
              )}
              {contentError && (
                <p className="text-xs text-destructive">{contentError}</p>
              )}
            </div>
          </div>
        )}

        {/* Selected Symptoms */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSymptoms.map((symptom) => (
            <span
              key={symptom}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {symptom}
              <button
                onClick={() => handleRemoveSymptom(symptom)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {anatomySelection.selectedSymptoms.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Region-Derived Symptoms
            </p>
            <div className="flex flex-wrap gap-2">
              {anatomySelection.selectedSymptoms.map((symptom) => (
                <span
                  key={symptom}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Symptom Input */}
        <div className="relative">
          <input
            type="text"
            value={symptomInput}
            onChange={(e) => {
              setSymptomInput(e.target.value);
              setShowSuggestionList(true);
            }}
            onFocus={() => setShowSuggestionList(true)}
            placeholder="Type to search symptoms..."
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Symptom Suggestions Dropdown */}
          {showSuggestionList &&
            (symptomInput || filteredSymptoms.length > 0) && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSymptoms.slice(0, 8).map((symptom) => (
                  <button
                    key={symptom}
                    onClick={() => handleAddSymptom(symptom)}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    {symptom}
                  </button>
                ))}
                {filteredSymptoms.length === 0 && symptomInput && (
                  <button
                    onClick={() => handleAddSymptom(symptomInput)}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    Add &quot;{symptomInput}&quot;
                  </button>
                )}
              </div>
            )}
        </div>

        {/* Get Suggestions Button */}
        <Button
          onClick={handleGetSuggestions}
          disabled={loading || mergedSymptoms.length === 0}
          className="mt-4 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing with AI backend...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Get AI Suggestions
            </>
          )}
        </Button>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Diagnosis Suggestions (from Backend)
          </h3>

          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 border rounded-lg transition-all ${
                  suggestion.status === "accepted"
                    ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                    : suggestion.status === "rejected"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20 opacity-60"
                      : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">
                            {suggestion.diagnosis}
                          </h4>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                          >
                            {suggestion.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mb-2">
                          ICD-10: {suggestion.icdCode}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {suggestion.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-xs text-muted-foreground">
                            Matched symptoms:
                          </span>
                          {suggestion.matchedSymptoms.map((symptom) => (
                            <span
                              key={symptom}
                              className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>

                        {suggestion.recommendedTests &&
                          suggestion.recommendedTests.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <FlaskConical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Recommended:
                              </span>
                              <span className="text-foreground">
                                {suggestion.recommendedTests.join(", ")}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Accept/Reject Buttons */}
                  <div className="flex gap-2">
                    {suggestion.status === "accepted" ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Accepted
                      </span>
                    ) : suggestion.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        Rejected
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(suggestion)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(suggestion)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
