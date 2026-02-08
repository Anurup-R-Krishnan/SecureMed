'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Brain,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    Sparkles,
    Stethoscope,
    FlaskConical,
} from 'lucide-react';

// Backend API URL
const API_BASE_URL = 'http://localhost:8000/api';

// Common symptoms list
const commonSymptoms = [
    'Fever', 'Cough', 'Headache', 'Chest pain', 'Fatigue',
    'Shortness of breath', 'Abdominal pain', 'Joint pain', 'Dizziness', 'Nausea',
];

interface AIDiagnosisSuggestion {
    id: string;
    diagnosis: string;
    icdCode: string;
    confidence: number;
    matchedSymptoms: string[];
    description: string;
    recommendedTests?: string[];
    status?: 'pending' | 'accepted' | 'rejected';
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
    const [symptomInput, setSymptomInput] = useState('');
    const [showSuggestionList, setShowSuggestionList] = useState(false);

    const filteredSymptoms = commonSymptoms.filter(
        (symptom) =>
            symptom.toLowerCase().includes(symptomInput.toLowerCase()) &&
            !selectedSymptoms.includes(symptom)
    );

    const handleAddSymptom = (symptom: string) => {
        if (!selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
        setSymptomInput('');
        setShowSuggestionList(false);
    };

    const handleRemoveSymptom = (symptom: string) => {
        setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    };

    const handleGetSuggestions = async () => {
        if (selectedSymptoms.length === 0) {
            setError('Please select at least one symptom');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call Django backend for AI suggestions
            const response = await fetch(`${API_BASE_URL}/doctor/ai-suggestions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symptoms: selectedSymptoms,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Add pending status to all suggestions
            const suggestionsWithStatus = data.suggestions.map((s: AIDiagnosisSuggestion) => ({
                ...s,
                status: 'pending' as const,
            }));

            setSuggestions(suggestionsWithStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
            console.error('AI suggestions error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = (suggestion: AIDiagnosisSuggestion) => {
        setSuggestions(
            suggestions.map((s) =>
                s.id === suggestion.id ? { ...s, status: 'accepted' as const } : s
            )
        );
        onAcceptSuggestion?.(suggestion);
    };

    const handleReject = (suggestion: AIDiagnosisSuggestion) => {
        setSuggestions(
            suggestions.map((s) =>
                s.id === suggestion.id ? { ...s, status: 'rejected' as const } : s
            )
        );
        onRejectSuggestion?.(suggestion);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 70) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
        if (confidence >= 50) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
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
                            AI suggestions are powered by Django backend and are for reference only.
                            They do not replace clinical judgment. Final diagnosis remains under doctor control.
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
                    {showSuggestionList && (symptomInput || filteredSymptoms.length > 0) && (
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
                                    Add "{symptomInput}"
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Get Suggestions Button */}
                <Button
                    onClick={handleGetSuggestions}
                    disabled={loading || selectedSymptoms.length === 0}
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

                {error && (
                    <p className="mt-2 text-sm text-destructive">{error}</p>
                )}
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
                                className={`p-4 border rounded-lg transition-all ${suggestion.status === 'accepted'
                                        ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                                        : suggestion.status === 'rejected'
                                            ? 'border-red-300 bg-red-50 dark:bg-red-950/20 opacity-60'
                                            : 'border-border hover:border-primary/50'
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
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
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
                                                    <span className="text-xs text-muted-foreground">Matched symptoms:</span>
                                                    {suggestion.matchedSymptoms.map((symptom) => (
                                                        <span
                                                            key={symptom}
                                                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                                                        >
                                                            {symptom}
                                                        </span>
                                                    ))}
                                                </div>

                                                {suggestion.recommendedTests && suggestion.recommendedTests.length > 0 && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Recommended:</span>
                                                        <span className="text-foreground">
                                                            {suggestion.recommendedTests.join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accept/Reject Buttons */}
                                    <div className="flex gap-2">
                                        {suggestion.status === 'accepted' ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                                                <CheckCircle className="h-4 w-4" />
                                                Accepted
                                            </span>
                                        ) : suggestion.status === 'rejected' ? (
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
