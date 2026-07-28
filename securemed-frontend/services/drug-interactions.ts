import { apiClient } from '@/lib/unified-api-client';

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
    summary?: {
        total_findings: number;
        total_combinations: number;
        top_effects: string[];
    };
    evaluated_combination_depth?: number;
    max_supported_combination_size?: number;
    not_evaluated_depths?: number[];
    coverage_gap?: boolean;
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

export interface ReportGenerationJob {
    task_id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed';
    patient_id: number;
    trigger_event: string;
    created_at: string;
}

export interface ReportJobStatus {
    task_id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed';
    patient_id: number;
    trigger_event: string;
    error_message?: string | null;
    report_id?: number | null;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
}

export const drugInteractionService = {
    async searchMedications(query: string, patientId?: number): Promise<string[]> {
        const params: Record<string, string | number> = { q: query };
        if (patientId) params.patient_id = patientId;
        const response = await apiClient.get<any>('/medical-records/drug-interactions/search/', { params });
        return response.results || [];
    },

    async checkInteractions(medications: string[], patientId?: number): Promise<InteractionCheckResult> {
        return await apiClient.post('/medical-records/drug-interactions/check/', {
            medications,
            limit_findings: 30,
            ...(patientId ? { patient_id: patientId } : {}),
        });
    },

    async getLatestReport(patientId?: number): Promise<InteractionReport | null> {
        const params: Record<string, string | number> = {};
        if (patientId) params.patient_id = patientId;
        try {
            return await apiClient.get('/medical-records/drug-interactions/reports/latest/', { params }) || null;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    async getReportHistory(patientId?: number): Promise<InteractionReport[]> {
        const params: Record<string, string | number> = {};
        if (patientId) params.patient_id = patientId;
        const response = await apiClient.get<any>('/medical-records/drug-interactions/reports/', { params });
        return Array.isArray(response) ? response : [];
    },

    async regenerateReport(patientId?: number): Promise<ReportGenerationJob> {
        const payload: Record<string, number> = {};
        if (patientId) payload.patient_id = patientId;
        return await apiClient.post('/medical-records/drug-interactions/reports/generate/', payload);
    },

    async getReportJobStatus(taskId: string): Promise<ReportJobStatus> {
        return await apiClient.get('/medical-records/drug-interactions/reports/status/', {
            params: { task_id: taskId },
        });
    },

    async downloadReportPDF(patientId?: number): Promise<Blob> {
        const params: Record<string, string | number> = {};
        if (patientId) params.patient_id = patientId;
        const response = await apiClient.get<Blob>('/medical-records/drug-interactions/reports/latest/pdf/', {
            params,
            responseType: 'blob',
        });
        return response as any;
    },

    async downloadReportPDFWithGeneration(
        patientId?: number,
        options?: { pollIntervalMs?: number; timeoutMs?: number }
    ): Promise<Blob> {
        const pollIntervalMs = options?.pollIntervalMs ?? 1500;
        const timeoutMs = options?.timeoutMs ?? 30000;
        const start = Date.now();

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        try {
            return await this.downloadReportPDF(patientId);
        } catch (error: any) {
            if (error?.response?.status !== 404) {
                throw error;
            }
        }

        const job = await this.regenerateReport(patientId);
        if (!job?.task_id) {
            return await this.downloadReportPDF(patientId);
        }

        while (Date.now() - start < timeoutMs) {
            const status = await this.getReportJobStatus(job.task_id);
            if (status.status === 'succeeded') {
                return await this.downloadReportPDF(patientId);
            }
            if (status.status === 'failed') {
                throw new Error(status.error_message || 'Report generation failed.');
            }
            await sleep(pollIntervalMs);
        }

        throw new Error('Report generation timed out.');
    },
};
