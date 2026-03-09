'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertTriangle, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { REGION_LOOKUP } from '@/components/features/anatomy/region-map';
import {
  ConditionCatalogItem,
  ConditionVisualization,
  fetchConditionCatalog,
  fetchConditionVisualization,
} from '@/services/anatomy-content';

const BodyExplorer3D = dynamic(
  () => import('@/components/features/anatomy/body-explorer-3d'),
  { ssr: false }
);

export default function PatientAnatomyCard() {
  const [conditions, setConditions] = useState<ConditionCatalogItem[]>([]);
  const [activeConditionId, setActiveConditionId] = useState('');
  const [visualization, setVisualization] = useState<ConditionVisualization | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConditionCatalog('top20', 'doctor')
      .then(setConditions)
      .catch(() => setConditions([]));
  }, []);

  useEffect(() => {
    if (!activeConditionId) {
      setVisualization(null);
      setActiveRegion(null);
      return;
    }
    setLoading(true);
    fetchConditionVisualization(activeConditionId, 'doctor')
      .then((data) => {
        setVisualization(data);
        setActiveRegion(data.regions?.[0] || null);
      })
      .catch(() => {
        setVisualization(null);
        setActiveRegion(null);
      })
      .finally(() => setLoading(false));
  }, [activeConditionId]);

  const regionPain = visualization && activeRegion
    ? (visualization.region_pain_levels?.[activeRegion] ?? 5)
    : null;
  const interpretation = visualization && activeRegion
    ? (visualization.pain_interpretations?.[activeRegion] || []).find((rule) => {
      const min = Number(rule.min ?? 1);
      const max = Number(rule.max ?? 10);
      const pain = regionPain ?? 5;
      return pain >= min && pain <= max;
    }) || null
    : null;

  return (
    <Card className="p-5 rounded-2xl border border-border shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Condition Pain Map (Doctor View)</p>
      </div>

      <select
        value={activeConditionId}
        onChange={(e) => setActiveConditionId(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
      >
        <option value="">Select condition</option>
        {conditions.map((condition) => (
          <option key={condition.condition_id} value={condition.condition_id}>
            {condition.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-xs text-muted-foreground">Loading visualization...</p>}

      {visualization && (
        <div className="space-y-3">
          <BodyExplorer3D
            mode="condition"
            compact
            activeCondition={visualization}
            activeConditionRegion={activeRegion}
            onConditionRegionSelect={setActiveRegion}
          />
          <div className="flex flex-wrap gap-1.5">
            {visualization.regions.map((region) => (
              <button
                key={region}
                onClick={() => setActiveRegion(region)}
                className={`text-xs rounded-full px-2.5 py-1 border ${activeRegion === region
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white/5 border-border/50 text-muted-foreground hover:text-foreground'
                  }`}
              >
                {REGION_LOOKUP[region]?.label || region}
                {typeof visualization.region_pain_levels?.[region] === 'number' && (
                  <span className="ml-1.5 text-[10px]">
                    {visualization.region_pain_levels[region]}/10
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeRegion && interpretation && (
            <div className={`rounded-lg border p-3 ${interpretation.urgency === 'emergency' ? 'border-red-500/40 bg-red-500/10' : 'border-border/60 bg-white/5'}`}>
              <p className="text-xs font-semibold text-foreground">
                {REGION_LOOKUP[activeRegion]?.label || activeRegion}: {regionPain}/10
              </p>
              <p className="text-xs text-muted-foreground mt-1">{interpretation.message}</p>
            </div>
          )}

          {interpretation?.urgency === 'emergency' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                <p className="text-[11px] text-red-200">
                  Escalate urgently. Pain profile suggests a high-risk clinical pattern.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

