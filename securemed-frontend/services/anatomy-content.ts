import { apiClient } from '@/lib/unified-api-client';

export interface AnatomyRegionExplainer {
  region_id: string;
  title: string;
  summary: string;
  details: string[];
  common_symptoms: string[];
  related_condition_ids: string[];
  warning_signals: string[];
  updated_at: string;
}

export interface ConditionCatalogItem {
  condition_id: string;
  name: string;
  overview: string;
  regions: string[];
  typical_symptoms: string[];
}

export interface ConditionPin {
  id: string;
  conditionId: string;
  region_id: string;
  label: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
  sort_order: number;
}

export interface ConditionVisualization {
  condition_id: string;
  name: string;
  overview: string;
  regions: string[];
  region_pain_levels: Record<string, number>;
  pain_interpretations: Record<string, Array<{
    min: number;
    max: number;
    message: string;
    urgency?: 'routine' | 'soon' | 'emergency';
  }>>;
  typical_symptoms: string[];
  seek_care_rules: string[];
  pins: ConditionPin[];
}

export interface ConditionMatchResult {
  condition_id: string;
  name: string;
  confidence: number;
  matched_regions: string[];
  typical_symptoms: string[];
  reasoning: string;
}

export async function fetchRegionExplainer(regionId: string, role: 'patient' | 'doctor' = 'patient') {
  const response = await api.get<AnatomyRegionExplainer>('/telemedicine/anatomy/explainers/', {
    params: { region: regionId, role },
  });
  return response.data;
}

export async function fetchConditionCatalog(scope = 'top20', role: 'patient' | 'doctor' = 'patient') {
  const response = await api.get<ConditionCatalogItem[]>('/telemedicine/conditions/', {
    params: { scope, role },
  });
  return response.data;
}

export async function fetchConditionVisualization(conditionId: string, role: 'patient' | 'doctor' = 'patient') {
  const response = await api.get<ConditionVisualization>(`/telemedicine/conditions/${conditionId}/visualization/`, {
    params: { role },
  });
  return response.data;
}

export async function fetchConditionMatches(
  regions: string[],
  intensityByRegion: Record<string, number>
) {
  const response = await api.post<{ matches: ConditionMatchResult[] }>('/telemedicine/conditions/match/', {
    regions,
    intensityByRegion,
  });
  return response.data.matches || [];
}
