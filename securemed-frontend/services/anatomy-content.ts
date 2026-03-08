import api from '@/lib/api';

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
  typical_symptoms: string[];
  seek_care_rules: string[];
  pins: ConditionPin[];
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
