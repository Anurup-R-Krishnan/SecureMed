import api from '@/lib/api';

export interface InteractionFinding {
    finding_type: 'interaction' | 'side_effect';
    medications: string[];
    combination_size: number;
    side_effect: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
    source: string;
    source_reference: string;
}

export interface InteractionCheckResult {
    medications: string[];
    pairs_checked: number;
    triplets_checked: number;
    findings: InteractionFinding[];
    interaction_findings_total: number;
    single_medication_findings_total: number;
    visible_findings_count: number;
    findings_truncated: boolean;
    limit_findings: number;
    totals: {
        critical: number;
        high: number;
        moderate: number;
        low: number;
    };
}

export interface InteractionReport {
    id: number;
    patient: number;
    total_findings: number;
    critical_count: number;
    high_count: number;
    moderate_count: number;
    low_count: number;
    created_at: string;
    items: InteractionFinding[];
}

export const drugInteractionService = {
    async searchMedications(query: string, patientId?: number): Promise<string[]> {
        const params: Record<string, string | number> = { q: query };
        if (patientId) params.patient_id = patientId;
        const response = await api.get('/medical-records/drug-interactions/search/', { params });
        return response.data?.results || [];
    },

    async checkInteractions(medications: string[], patientId?: number): Promise<InteractionCheckResult> {
        const response = await api.post('/medical-records/drug-interactions/check/', {
            medications,
            limit_findings: 80,
            ...(patientId ? { patient_id: patientId } : {}),
        });
        return response.data;
    },

    async getLatestReport(patientId?: number): Promise<InteractionReport | null> {
        const params: Record<string, string | number> = {};
        if (patientId) params.patient_id = patientId;
        const response = await api.get('/medical-records/drug-interactions/reports/latest/', { params });
        return response.data || null;
    },

    async getReportHistory(patientId?: number): Promise<InteractionReport[]> {
        const params: Record<string, string | number> = {};
        if (patientId) params.patient_id = patientId;
        const response = await api.get('/medical-records/drug-interactions/reports/', { params });
        return Array.isArray(response.data) ? response.data : [];
    },

    async regenerateReport(patientId?: number): Promise<InteractionReport> {
        const payload: Record<string, number> = {};
        if (patientId) payload.patient_id = patientId;
        const response = await api.post('/medical-records/drug-interactions/reports/generate/', payload);
        return response.data;
    },
};
