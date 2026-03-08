/**
 * Infection Tracking Service
 * API calls for the infection tracking system.
 */
import apiClient from '@/lib/api';

export interface GraphNode {
    id: string;
    label: string;
    type: 'Patient' | 'Doctor' | 'Room' | 'Equipment' | 'Department';
    properties: Record<string, string | number | boolean>;
}

export interface GraphLink {
    source: string;
    target: string;
    relationship: string;
    properties: Record<string, string | number>;
}

export interface GraphVisualization {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface GraphStats {
    nodes: Record<string, number>;
    relationships: Record<string, number>;
    total_nodes: number;
    total_relationships: number;
}

export interface InfectionTrace {
    id: number;
    trace_id: string;
    source_report: {
        report_id: string;
        patient: number;
        patient_name: string;
        infection_name: string;
        diagnosed_at: string;
        severity: string;
    };
    target_report: {
        report_id: string;
        patient: number;
        patient_name: string;
        infection_name: string;
        diagnosed_at: string;
        severity: string;
    };
    infection_name: string;
    transmission_path: {
        path: Array<{
            type?: string;
            id?: string;
            label?: string;
            relationship?: string;
        }>;
        length: number;
    };
    path_length: number;
    confidence_score: number;
    vector_type: string;
    status: string;
    detected_at: string;
}

export interface InfectionReport {
    id: number;
    report_id: string;
    patient: number;
    patient_name: string;
    infection_name: string;
    infection_code: string;
    category: string;
    diagnosed_at: string;
    severity: string;
    specimen_source: string;
    antibiotic_resistance: string[];
    notes: string;
}

export interface HighRiskRoom {
    room_id: string;
    room_name: string;
    room_type: string;
    risk_level: string;
    patient_count: number;
    doctor_count: number;
    score: number;
}

interface RequestOptions {
    signal?: AbortSignal;
}

function normalizeGraphVisualization(payload: unknown): GraphVisualization {
    const data = (payload ?? {}) as Record<string, unknown>;
    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawLinks = Array.isArray(data.links) ? data.links : [];

    const nodes: GraphNode[] = rawNodes.flatMap((item) => {
        const node = item as Record<string, unknown>;
        const id = typeof node.id === 'string' ? node.id : null;
        const type = typeof node.type === 'string' ? node.type as GraphNode['type'] : null;
        if (!id || !type) return [];
        const legacyProperties = (node.props ?? {}) as Record<string, string | number | boolean>;
        const nextProperties = (node.properties ?? legacyProperties) as Record<string, string | number | boolean>;
        return [{
            id,
            label: typeof node.label === 'string' ? node.label : id,
            type,
            properties: nextProperties,
        }];
    });

    const links: GraphLink[] = rawLinks.flatMap((item) => {
        const link = item as Record<string, unknown>;
        const source = typeof link.source === 'string' ? link.source : null;
        const target = typeof link.target === 'string' ? link.target : null;
        const relationship = typeof link.relationship === 'string'
            ? link.relationship
            : (typeof link.type === 'string' ? link.type : null);
        if (!source || !target || !relationship) return [];
        const legacyProperties = (link.props ?? {}) as Record<string, string | number>;
        const nextProperties = (link.properties ?? legacyProperties) as Record<string, string | number>;
        return [{
            source,
            target,
            relationship,
            properties: nextProperties,
        }];
    });

    return { nodes, links };
}

export const infectionTrackingService = {
    async getGraphVisualization(limit = 200, options?: RequestOptions): Promise<GraphVisualization> {
        const response = await apiClient.get(`/infection-tracking/graph/visualization/?limit=${limit}`, {
            signal: options?.signal,
        });
        return normalizeGraphVisualization(response.data);
    },

    async getGraphStats(options?: RequestOptions): Promise<GraphStats> {
        const response = await apiClient.get('/infection-tracking/graph/stats/', {
            signal: options?.signal,
        });
        return response.data;
    },

    async getTraces(options?: RequestOptions): Promise<InfectionTrace[]> {
        const response = await apiClient.get('/infection-tracking/traces/', {
            signal: options?.signal,
        });
        return response.data.results || response.data;
    },

    async getActiveTraces(): Promise<InfectionTrace[]> {
        const response = await apiClient.get('/infection-tracking/traces/active_clusters/');
        return response.data;
    },

    async getHighRiskRooms(days = 7): Promise<HighRiskRoom[]> {
        const response = await apiClient.get(`/infection-tracking/traces/high_risk_rooms/?days=${days}`);
        return response.data;
    },

    async getReports(): Promise<InfectionReport[]> {
        const response = await apiClient.get('/infection-tracking/reports/');
        return response.data.results || response.data;
    },
};

export default infectionTrackingService;
